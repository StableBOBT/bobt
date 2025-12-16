//! BOBT Treasury Contract
//!
//! Multi-signature treasury for managing BOBT stablecoin operations:
//! - Multi-sig proposals for all critical operations
//! - Rate limiting on mints and burns
//! - Integration with BOBT token contract
//! - Complete audit trail
//!
//! # Architecture
//!
//! The Treasury acts as an authorized minter for the BOBT token.
//! All mint/burn operations go through a proposal system requiring
//! M-of-N signer approvals before execution.

#![no_std]

mod errors;
mod events;
mod storage;

pub use errors::TreasuryError;
pub use storage::{Proposal, ProposalStatus, ProposalType, TreasuryConfig};

use soroban_sdk::{contract, contractimpl, Address, Env, String, Symbol, Vec};

use errors::TreasuryError as Error;
use events::*;
use storage::*;

#[contract]
pub struct Treasury;

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

/// Require caller to be a signer
fn require_signer(env: &Env, caller: &Address) -> Result<(), Error> {
    if !is_signer(env, caller) {
        return Err(Error::NotASigner);
    }
    Ok(())
}

/// Require contract to be initialized
fn require_initialized(env: &Env) -> Result<(), Error> {
    if !is_initialized(env) {
        return Err(Error::NotInitialized);
    }
    Ok(())
}

/// Check and update rate limits for mint
fn check_mint_rate_limit(env: &Env, amount: i128) -> Result<(), Error> {
    let config = get_config(env).ok_or(Error::NotInitialized)?;
    let mut state = maybe_reset_daily_limits(env);

    // Check single operation limit
    if amount > config.single_op_limit {
        return Err(Error::SingleOpLimitExceeded);
    }

    // Check daily limit
    let new_daily = state.daily_minted.checked_add(amount).ok_or(Error::InvalidAmount)?;
    if new_daily > config.daily_mint_limit {
        return Err(Error::DailyMintLimitExceeded);
    }

    // Update state
    state.daily_minted = new_daily;
    set_rate_limit_state(env, &state);

    Ok(())
}

/// Check and update rate limits for burn
fn check_burn_rate_limit(env: &Env, amount: i128) -> Result<(), Error> {
    let config = get_config(env).ok_or(Error::NotInitialized)?;
    let mut state = maybe_reset_daily_limits(env);

    // Check single operation limit
    if amount > config.single_op_limit {
        return Err(Error::SingleOpLimitExceeded);
    }

    // Check daily limit
    let new_daily = state.daily_burned.checked_add(amount).ok_or(Error::InvalidAmount)?;
    if new_daily > config.daily_burn_limit {
        return Err(Error::DailyBurnLimitExceeded);
    }

    // Update state
    state.daily_burned = new_daily;
    set_rate_limit_state(env, &state);

    Ok(())
}

/// Check if proposal can be executed
fn check_proposal_executable(env: &Env, proposal: &Proposal) -> Result<(), Error> {
    // Check status
    if proposal.status == ProposalStatus::Executed {
        return Err(Error::ProposalAlreadyExecuted);
    }
    if proposal.status == ProposalStatus::Cancelled {
        return Err(Error::ProposalCancelled);
    }

    // Check expiration
    if env.ledger().sequence() > proposal.expires_at {
        return Err(Error::ProposalExpired);
    }

    // Check approvals
    let threshold = get_threshold(env);
    if proposal.approval_count < threshold {
        return Err(Error::InsufficientApprovals);
    }

    Ok(())
}

// =============================================================================
// CONTRACT IMPLEMENTATION
// =============================================================================

#[contractimpl]
impl Treasury {
    // =========================================================================
    // INITIALIZATION
    // =========================================================================

    /// Initialize the treasury contract
    ///
    /// # Arguments
    /// * `token_address` - Address of the BOBT token contract
    /// * `signers` - Initial list of authorized signers
    /// * `threshold` - Number of approvals required
    pub fn initialize(
        env: Env,
        token_address: Address,
        signers: Vec<Address>,
        threshold: u32,
    ) -> Result<(), Error> {
        // Check not already initialized
        if is_initialized(&env) {
            return Err(Error::AlreadyInitialized);
        }

        // Validate signers
        let signers_count = signers.len();
        if signers_count == 0 {
            return Err(Error::InvalidThreshold);
        }
        if signers_count > MAX_SIGNERS {
            return Err(Error::TooManySigners);
        }

        // Validate threshold
        if threshold == 0 || threshold > signers_count {
            return Err(Error::InvalidThreshold);
        }

        // Store configuration
        let config = TreasuryConfig {
            token_address: token_address.clone(),
            oracle_address: None,
            threshold,
            daily_mint_limit: DEFAULT_DAILY_MINT_LIMIT,
            daily_burn_limit: DEFAULT_DAILY_BURN_LIMIT,
            single_op_limit: DEFAULT_SINGLE_OP_LIMIT,
        };
        set_config(&env, &config);
        set_signers(&env, &signers);
        set_threshold(&env, threshold);
        set_initialized(&env);

        // Initialize rate limit state
        let initial_state = RateLimitState {
            daily_minted: 0,
            daily_burned: 0,
            last_reset_ledger: env.ledger().sequence(),
        };
        set_rate_limit_state(&env, &initial_state);

        extend_instance_ttl(&env);

        emit_initialized(&env, &token_address, signers_count, threshold);

        Ok(())
    }

    // =========================================================================
    // PROPOSAL CREATION
    // =========================================================================

    /// Create a mint proposal
    pub fn propose_mint(
        env: Env,
        proposer: Address,
        to: Address,
        amount: i128,
        external_ref: String,
    ) -> Result<u64, Error> {
        proposer.require_auth();
        require_initialized(&env)?;
        require_signer(&env, &proposer)?;

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let proposal_id = get_next_proposal_id(&env);
        let current_ledger = env.ledger().sequence();

        let proposal = Proposal {
            id: proposal_id,
            proposal_type: ProposalType::Mint,
            proposer: proposer.clone(),
            target: to.clone(),
            amount,
            usdt_amount: 0,
            external_ref,
            created_at: current_ledger,
            expires_at: current_ledger + PROPOSAL_EXPIRATION_LEDGERS,
            approval_count: 1, // Proposer auto-approves
            status: ProposalStatus::Pending,
        };

        set_proposal(&env, &proposal);
        set_approval(&env, proposal_id, &proposer);

        emit_proposal_created(&env, proposal_id, &ProposalType::Mint, &proposer, &to, amount);
        extend_instance_ttl(&env);

        Ok(proposal_id)
    }

    /// Create a burn proposal
    pub fn propose_burn(
        env: Env,
        proposer: Address,
        from: Address,
        amount: i128,
        external_ref: String,
    ) -> Result<u64, Error> {
        proposer.require_auth();
        require_initialized(&env)?;
        require_signer(&env, &proposer)?;

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let proposal_id = get_next_proposal_id(&env);
        let current_ledger = env.ledger().sequence();

        let proposal = Proposal {
            id: proposal_id,
            proposal_type: ProposalType::Burn,
            proposer: proposer.clone(),
            target: from.clone(),
            amount,
            usdt_amount: 0,
            external_ref,
            created_at: current_ledger,
            expires_at: current_ledger + PROPOSAL_EXPIRATION_LEDGERS,
            approval_count: 1,
            status: ProposalStatus::Pending,
        };

        set_proposal(&env, &proposal);
        set_approval(&env, proposal_id, &proposer);

        emit_proposal_created(&env, proposal_id, &ProposalType::Burn, &proposer, &from, amount);
        extend_instance_ttl(&env);

        Ok(proposal_id)
    }

    /// Create a proposal to add a new signer
    pub fn propose_add_signer(
        env: Env,
        proposer: Address,
        new_signer: Address,
    ) -> Result<u64, Error> {
        proposer.require_auth();
        require_initialized(&env)?;
        require_signer(&env, &proposer)?;

        // Check signer doesn't already exist
        if is_signer(&env, &new_signer) {
            return Err(Error::SignerAlreadyExists);
        }

        // Check max signers
        if get_signers(&env).len() >= MAX_SIGNERS {
            return Err(Error::TooManySigners);
        }

        let proposal_id = get_next_proposal_id(&env);
        let current_ledger = env.ledger().sequence();

        let proposal = Proposal {
            id: proposal_id,
            proposal_type: ProposalType::AddSigner,
            proposer: proposer.clone(),
            target: new_signer.clone(),
            amount: 0,
            usdt_amount: 0,
            external_ref: String::from_str(&env, ""),
            created_at: current_ledger,
            expires_at: current_ledger + PROPOSAL_EXPIRATION_LEDGERS,
            approval_count: 1,
            status: ProposalStatus::Pending,
        };

        set_proposal(&env, &proposal);
        set_approval(&env, proposal_id, &proposer);

        emit_proposal_created(&env, proposal_id, &ProposalType::AddSigner, &proposer, &new_signer, 0);
        extend_instance_ttl(&env);

        Ok(proposal_id)
    }

    /// Create a proposal to remove a signer
    pub fn propose_remove_signer(
        env: Env,
        proposer: Address,
        signer_to_remove: Address,
    ) -> Result<u64, Error> {
        proposer.require_auth();
        require_initialized(&env)?;
        require_signer(&env, &proposer)?;

        // Check signer exists
        if !is_signer(&env, &signer_to_remove) {
            return Err(Error::SignerNotFound);
        }

        // Cannot remove if only one signer left
        if get_signers(&env).len() <= 1 {
            return Err(Error::CannotRemoveLastSigner);
        }

        let proposal_id = get_next_proposal_id(&env);
        let current_ledger = env.ledger().sequence();

        let proposal = Proposal {
            id: proposal_id,
            proposal_type: ProposalType::RemoveSigner,
            proposer: proposer.clone(),
            target: signer_to_remove.clone(),
            amount: 0,
            usdt_amount: 0,
            external_ref: String::from_str(&env, ""),
            created_at: current_ledger,
            expires_at: current_ledger + PROPOSAL_EXPIRATION_LEDGERS,
            approval_count: 1,
            status: ProposalStatus::Pending,
        };

        set_proposal(&env, &proposal);
        set_approval(&env, proposal_id, &proposer);

        emit_proposal_created(&env, proposal_id, &ProposalType::RemoveSigner, &proposer, &signer_to_remove, 0);
        extend_instance_ttl(&env);

        Ok(proposal_id)
    }

    /// Create a proposal to update threshold
    pub fn propose_update_threshold(
        env: Env,
        proposer: Address,
        new_threshold: u32,
    ) -> Result<u64, Error> {
        proposer.require_auth();
        require_initialized(&env)?;
        require_signer(&env, &proposer)?;

        let signers_count = get_signers(&env).len();
        if new_threshold == 0 || new_threshold > signers_count {
            return Err(Error::InvalidThreshold);
        }

        let proposal_id = get_next_proposal_id(&env);
        let current_ledger = env.ledger().sequence();

        // Store new threshold in amount field
        let proposal = Proposal {
            id: proposal_id,
            proposal_type: ProposalType::UpdateThreshold,
            proposer: proposer.clone(),
            target: env.current_contract_address(),
            amount: new_threshold as i128,
            usdt_amount: 0,
            external_ref: String::from_str(&env, ""),
            created_at: current_ledger,
            expires_at: current_ledger + PROPOSAL_EXPIRATION_LEDGERS,
            approval_count: 1,
            status: ProposalStatus::Pending,
        };

        set_proposal(&env, &proposal);
        set_approval(&env, proposal_id, &proposer);

        emit_proposal_created(&env, proposal_id, &ProposalType::UpdateThreshold, &proposer, &env.current_contract_address(), new_threshold as i128);
        extend_instance_ttl(&env);

        Ok(proposal_id)
    }

    /// Create emergency pause proposal
    pub fn propose_emergency_pause(env: Env, proposer: Address) -> Result<u64, Error> {
        proposer.require_auth();
        require_initialized(&env)?;
        require_signer(&env, &proposer)?;

        let proposal_id = get_next_proposal_id(&env);
        let current_ledger = env.ledger().sequence();

        let proposal = Proposal {
            id: proposal_id,
            proposal_type: ProposalType::EmergencyPause,
            proposer: proposer.clone(),
            target: env.current_contract_address(),
            amount: 0,
            usdt_amount: 0,
            external_ref: String::from_str(&env, ""),
            created_at: current_ledger,
            expires_at: current_ledger + PROPOSAL_EXPIRATION_LEDGERS,
            approval_count: 1,
            status: ProposalStatus::Pending,
        };

        set_proposal(&env, &proposal);
        set_approval(&env, proposal_id, &proposer);

        emit_proposal_created(&env, proposal_id, &ProposalType::EmergencyPause, &proposer, &env.current_contract_address(), 0);
        extend_instance_ttl(&env);

        Ok(proposal_id)
    }

    /// Create a mint proposal based on USDT amount using Oracle price
    ///
    /// This converts the USDT deposit to BOBT using the current P2P rate.
    /// The BOBT amount is calculated at proposal execution time using the Oracle.
    ///
    /// # Arguments
    /// * `proposer` - Signer proposing the mint
    /// * `to` - Recipient address
    /// * `usdt_amount` - USDT amount deposited (7 decimals, e.g., 100 USDT = 1_000_000_000)
    /// * `external_ref` - Bank/exchange transaction reference
    ///
    /// # Example
    /// ```
    /// // User deposits 100 USDT, at rate 9.15 BOB/USD gets 915 BOBT
    /// treasury.propose_mint_from_usdt(signer, user, 1_000_000_000, "TX123")
    /// ```
    pub fn propose_mint_from_usdt(
        env: Env,
        proposer: Address,
        to: Address,
        usdt_amount: i128,
        external_ref: String,
    ) -> Result<u64, Error> {
        proposer.require_auth();
        require_initialized(&env)?;
        require_signer(&env, &proposer)?;

        if usdt_amount <= 0 {
            return Err(Error::InvalidUsdtAmount);
        }

        // Verify Oracle is configured
        let config = get_config(&env).ok_or(Error::NotInitialized)?;
        let oracle_address = config.oracle_address.ok_or(Error::OracleNotConfigured)?;

        // Get current BOBT amount from Oracle (at proposal time for reference)
        let oracle = OracleClient::new(&env, &oracle_address);
        let bobt_amount = oracle.usdt_to_bobt(&usdt_amount);

        let proposal_id = get_next_proposal_id(&env);
        let current_ledger = env.ledger().sequence();

        let proposal = Proposal {
            id: proposal_id,
            proposal_type: ProposalType::MintFromUsdt,
            proposer: proposer.clone(),
            target: to.clone(),
            amount: bobt_amount,        // BOBT amount (calculated at proposal time)
            usdt_amount,                // Original USDT deposit
            external_ref,
            created_at: current_ledger,
            expires_at: current_ledger + PROPOSAL_EXPIRATION_LEDGERS,
            approval_count: 1,
            status: ProposalStatus::Pending,
        };

        set_proposal(&env, &proposal);
        set_approval(&env, proposal_id, &proposer);

        emit_proposal_created(&env, proposal_id, &ProposalType::MintFromUsdt, &proposer, &to, bobt_amount);
        extend_instance_ttl(&env);

        Ok(proposal_id)
    }

    /// Create a proposal to set/update the Oracle address
    pub fn propose_set_oracle(
        env: Env,
        proposer: Address,
        oracle_address: Address,
    ) -> Result<u64, Error> {
        proposer.require_auth();
        require_initialized(&env)?;
        require_signer(&env, &proposer)?;

        let proposal_id = get_next_proposal_id(&env);
        let current_ledger = env.ledger().sequence();

        let proposal = Proposal {
            id: proposal_id,
            proposal_type: ProposalType::SetOracle,
            proposer: proposer.clone(),
            target: oracle_address.clone(),
            amount: 0,
            usdt_amount: 0,
            external_ref: String::from_str(&env, ""),
            created_at: current_ledger,
            expires_at: current_ledger + PROPOSAL_EXPIRATION_LEDGERS,
            approval_count: 1,
            status: ProposalStatus::Pending,
        };

        set_proposal(&env, &proposal);
        set_approval(&env, proposal_id, &proposer);

        emit_proposal_created(&env, proposal_id, &ProposalType::SetOracle, &proposer, &oracle_address, 0);
        extend_instance_ttl(&env);

        Ok(proposal_id)
    }

    // =========================================================================
    // PROPOSAL APPROVAL
    // =========================================================================

    /// Approve a proposal
    pub fn approve(env: Env, signer: Address, proposal_id: u64) -> Result<(), Error> {
        signer.require_auth();
        require_initialized(&env)?;
        require_signer(&env, &signer)?;

        // Get proposal
        let mut proposal = get_proposal(&env, proposal_id).ok_or(Error::ProposalNotFound)?;

        // Check status
        if proposal.status != ProposalStatus::Pending {
            if proposal.status == ProposalStatus::Executed {
                return Err(Error::ProposalAlreadyExecuted);
            }
            return Err(Error::ProposalCancelled);
        }

        // Check not expired
        if env.ledger().sequence() > proposal.expires_at {
            return Err(Error::ProposalExpired);
        }

        // Check not already approved by this signer
        if has_approved(&env, proposal_id, &signer) {
            return Err(Error::AlreadyApproved);
        }

        // Record approval
        set_approval(&env, proposal_id, &signer);
        proposal.approval_count += 1;
        set_proposal(&env, &proposal);

        let threshold = get_threshold(&env);
        emit_proposal_approved(&env, proposal_id, &signer, proposal.approval_count, threshold);
        extend_instance_ttl(&env);

        Ok(())
    }

    /// Cancel a proposal (only proposer can cancel)
    pub fn cancel(env: Env, proposer: Address, proposal_id: u64) -> Result<(), Error> {
        proposer.require_auth();
        require_initialized(&env)?;

        let mut proposal = get_proposal(&env, proposal_id).ok_or(Error::ProposalNotFound)?;

        // Only proposer can cancel
        if proposal.proposer != proposer {
            return Err(Error::NotProposer);
        }

        // Cannot cancel if already executed
        if proposal.status == ProposalStatus::Executed {
            return Err(Error::ProposalAlreadyExecuted);
        }

        proposal.status = ProposalStatus::Cancelled;
        set_proposal(&env, &proposal);

        emit_proposal_cancelled(&env, proposal_id, &proposer);
        extend_instance_ttl(&env);

        Ok(())
    }

    // =========================================================================
    // PROPOSAL EXECUTION
    // =========================================================================

    /// Execute an approved proposal
    pub fn execute(env: Env, executor: Address, proposal_id: u64) -> Result<(), Error> {
        executor.require_auth();
        require_initialized(&env)?;
        require_signer(&env, &executor)?;

        let mut proposal = get_proposal(&env, proposal_id).ok_or(Error::ProposalNotFound)?;

        // Check can execute
        check_proposal_executable(&env, &proposal)?;

        let config = get_config(&env).ok_or(Error::NotInitialized)?;

        // Execute based on type
        match proposal.proposal_type {
            ProposalType::Mint => {
                // Check rate limits
                check_mint_rate_limit(&env, proposal.amount)?;

                // Call BOBT token mint
                // Note: Treasury must have MINTER role on BOBT token
                let token = BOBTTokenClient::new(&env, &config.token_address);
                token.admin_mint(
                    &env.current_contract_address(),
                    &proposal.target,
                    &proposal.amount,
                    &proposal.external_ref,
                );

                emit_treasury_mint(&env, &proposal.target, proposal.amount, proposal_id, &proposal.external_ref);
            }
            ProposalType::Burn => {
                // Check rate limits
                check_burn_rate_limit(&env, proposal.amount)?;

                // Call BOBT token burn
                let token = BOBTTokenClient::new(&env, &config.token_address);
                token.admin_burn(
                    &env.current_contract_address(),
                    &proposal.target,
                    &proposal.amount,
                    &proposal.external_ref,
                );

                emit_treasury_burn(&env, &proposal.target, proposal.amount, proposal_id, &proposal.external_ref);
            }
            ProposalType::AddSigner => {
                let mut signers = get_signers(&env);
                signers.push_back(proposal.target.clone());
                set_signers(&env, &signers);

                emit_signer_added(&env, &proposal.target, proposal_id);
            }
            ProposalType::RemoveSigner => {
                let signers = get_signers(&env);
                let mut new_signers = Vec::new(&env);
                for s in signers.iter() {
                    if s != proposal.target {
                        new_signers.push_back(s);
                    }
                }

                // Ensure threshold is still valid
                let threshold = get_threshold(&env);
                if threshold > new_signers.len() {
                    // Auto-adjust threshold
                    set_threshold(&env, new_signers.len());
                }

                set_signers(&env, &new_signers);
                emit_signer_removed(&env, &proposal.target, proposal_id);
            }
            ProposalType::UpdateThreshold => {
                let old_threshold = get_threshold(&env);
                let new_threshold = proposal.amount as u32;
                set_threshold(&env, new_threshold);

                // Update config
                let mut config = config;
                config.threshold = new_threshold;
                set_config(&env, &config);

                emit_threshold_updated(&env, old_threshold, new_threshold, proposal_id);
            }
            ProposalType::EmergencyPause => {
                let token = BOBTTokenClient::new(&env, &config.token_address);
                token.pause(&env.current_contract_address());
            }
            ProposalType::Unpause => {
                let token = BOBTTokenClient::new(&env, &config.token_address);
                token.unpause(&env.current_contract_address());
            }
            ProposalType::FreezeAccount => {
                let token = BOBTTokenClient::new(&env, &config.token_address);
                token.freeze(&env.current_contract_address(), &proposal.target);
            }
            ProposalType::UnfreezeAccount => {
                let token = BOBTTokenClient::new(&env, &config.token_address);
                token.unfreeze(&env.current_contract_address(), &proposal.target);
            }
            ProposalType::UpdateRateLimits => {
                // Rate limits stored encoded in proposal
                // For simplicity, this would need a separate proposal type or data field
                return Err(Error::InvalidProposalType);
            }
            ProposalType::MintFromUsdt => {
                // Get Oracle address
                let oracle_address = config.oracle_address.clone().ok_or(Error::OracleNotConfigured)?;
                let oracle = OracleClient::new(&env, &oracle_address);

                // Recalculate BOBT amount at execution time for latest price
                let bobt_amount = oracle.usdt_to_bobt(&proposal.usdt_amount);

                // Check rate limits
                check_mint_rate_limit(&env, bobt_amount)?;

                // Call BOBT token mint
                let token = BOBTTokenClient::new(&env, &config.token_address);
                token.admin_mint(
                    &env.current_contract_address(),
                    &proposal.target,
                    &bobt_amount,
                    &proposal.external_ref,
                );

                emit_treasury_mint(&env, &proposal.target, bobt_amount, proposal_id, &proposal.external_ref);
            }
            ProposalType::SetOracle => {
                // Update Oracle address in config
                let mut config = config;
                config.oracle_address = Some(proposal.target.clone());
                set_config(&env, &config);

                // Emit event for Oracle update
                emit_oracle_updated(&env, &proposal.target, proposal_id);
            }
        }

        // Mark as executed
        proposal.status = ProposalStatus::Executed;
        set_proposal(&env, &proposal);

        emit_proposal_executed(&env, proposal_id, &proposal.proposal_type, &executor);
        extend_instance_ttl(&env);

        Ok(())
    }

    // =========================================================================
    // QUERIES
    // =========================================================================

    /// Get proposal details
    pub fn get_proposal(env: Env, proposal_id: u64) -> Result<Proposal, Error> {
        get_proposal(&env, proposal_id).ok_or(Error::ProposalNotFound)
    }

    /// Get all signers
    pub fn get_signers(env: Env) -> Vec<Address> {
        get_signers(&env)
    }

    /// Get current threshold
    pub fn get_threshold(env: Env) -> u32 {
        get_threshold(&env)
    }

    /// Get treasury configuration
    pub fn get_config(env: Env) -> Result<TreasuryConfig, Error> {
        get_config(&env).ok_or(Error::NotInitialized)
    }

    /// Get rate limit state
    pub fn get_rate_limits(env: Env) -> RateLimitState {
        maybe_reset_daily_limits(&env)
    }

    /// Check if address is a signer
    pub fn is_signer(env: Env, address: Address) -> bool {
        is_signer(&env, &address)
    }

    /// Check if proposal is executable
    pub fn can_execute(env: Env, proposal_id: u64) -> bool {
        if let Some(proposal) = get_proposal(&env, proposal_id) {
            check_proposal_executable(&env, &proposal).is_ok()
        } else {
            false
        }
    }

    /// Get remaining daily mint capacity
    pub fn remaining_mint_capacity(env: Env) -> Result<i128, Error> {
        let config = get_config(&env).ok_or(Error::NotInitialized)?;
        let state = maybe_reset_daily_limits(&env);
        Ok(config.daily_mint_limit - state.daily_minted)
    }

    /// Get remaining daily burn capacity
    pub fn remaining_burn_capacity(env: Env) -> Result<i128, Error> {
        let config = get_config(&env).ok_or(Error::NotInitialized)?;
        let state = maybe_reset_daily_limits(&env);
        Ok(config.daily_burn_limit - state.daily_burned)
    }

    // =========================================================================
    // ORACLE QUERIES
    // =========================================================================

    /// Get configured Oracle address
    pub fn get_oracle(env: Env) -> Result<Address, Error> {
        let config = get_config(&env).ok_or(Error::NotInitialized)?;
        config.oracle_address.ok_or(Error::OracleNotConfigured)
    }

    /// Get current P2P price from Oracle (mid price)
    pub fn get_current_price(env: Env) -> Result<i128, Error> {
        let config = get_config(&env).ok_or(Error::NotInitialized)?;
        let oracle_address = config.oracle_address.ok_or(Error::OracleNotConfigured)?;
        let oracle = OracleClient::new(&env, &oracle_address);
        Ok(oracle.get_mid_price())
    }

    /// Calculate BOBT amount for given USDT amount using current Oracle price
    ///
    /// Useful for UI to show estimated BOBT before creating a proposal.
    pub fn estimate_bobt_for_usdt(env: Env, usdt_amount: i128) -> Result<i128, Error> {
        let config = get_config(&env).ok_or(Error::NotInitialized)?;
        let oracle_address = config.oracle_address.ok_or(Error::OracleNotConfigured)?;
        let oracle = OracleClient::new(&env, &oracle_address);
        Ok(oracle.usdt_to_bobt(&usdt_amount))
    }

    /// Calculate USDT amount for given BOBT amount using current Oracle price
    ///
    /// Useful for redemption calculations.
    pub fn estimate_usdt_for_bobt(env: Env, bobt_amount: i128) -> Result<i128, Error> {
        let config = get_config(&env).ok_or(Error::NotInitialized)?;
        let oracle_address = config.oracle_address.ok_or(Error::OracleNotConfigured)?;
        let oracle = OracleClient::new(&env, &oracle_address);
        Ok(oracle.bobt_to_usdt(&bobt_amount))
    }

    /// Check if Oracle has valid (non-stale) prices
    pub fn is_oracle_valid(env: Env) -> bool {
        if let Some(config) = get_config(&env) {
            if let Some(oracle_address) = config.oracle_address {
                let oracle = OracleClient::new(&env, &oracle_address);
                return oracle.is_price_valid();
            }
        }
        false
    }
}

// =============================================================================
// BOBT TOKEN CLIENT (for calling token contract)
// =============================================================================

mod token_client {
    soroban_sdk::contractimport!(
        file = "../../target/wasm32v1-none/release/bobt_token.wasm"
    );
}

use token_client::Client as BOBTTokenClient;

// =============================================================================
// ORACLE CLIENT (for P2P price feeds)
// =============================================================================

mod oracle_client {
    soroban_sdk::contractimport!(
        file = "../../target/wasm32v1-none/release/oracle.wasm"
    );
}

use oracle_client::Client as OracleClient;

#[cfg(test)]
mod test;
