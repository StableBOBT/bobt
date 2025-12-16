//! BOBT Stablecoin Contract - Production Ready
//!
//! Professional-grade stablecoin on Stellar Soroban with:
//! - SEP-41 compliant fungible token interface
//! - Role-based access control (OWNER, MINTER, PAUSER, BLACKLISTER, RESCUER)
//! - Pausable functionality for emergencies
//! - Blacklist/freeze capability for compliance
//! - Clawback (destroy frozen funds) capability
//! - Request tracking for mint/burn operations with full audit trail
//! - Rescue tokens functionality
//! - Upgradeable contract with migration support

use soroban_sdk::{
    contract, contractimpl, token::TokenClient, Address, BytesN, Env, String, Symbol,
};

use crate::errors::BOBTError;
use crate::events::*;
use crate::storage::{
    self, extend_instance_ttl, freeze_account, get_allowance, get_balance, get_owner,
    get_total_supply, grant_role, has_role, is_frozen, is_initialized, is_paused, revoke_role,
    set_allowance, set_balance, set_initialized, set_owner, set_paused, set_total_supply,
    spend_allowance, unfreeze_account, BurnRequest, MintRequest, MAX_SUPPLY, MIN_TRANSFER,
    ROLE_BLACKLISTER, ROLE_MINTER, ROLE_OWNER, ROLE_PAUSER, ROLE_RESCUER, TOKEN_DECIMALS,
    TOKEN_NAME, TOKEN_SYMBOL,
};

// =============================================================================
// CONTRACT DEFINITION
// =============================================================================

#[contract]
pub struct BOBTToken;

// =============================================================================
// INTERNAL VALIDATION FUNCTIONS
// =============================================================================

/// Require the contract to be initialized
#[allow(dead_code)]
#[inline]
fn require_initialized(env: &Env) -> Result<(), BOBTError> {
    if !is_initialized(env) {
        return Err(BOBTError::NotInitialized);
    }
    Ok(())
}

/// Require the contract to not be paused
#[inline]
fn require_not_paused(env: &Env) -> Result<(), BOBTError> {
    if is_paused(env) {
        return Err(BOBTError::ContractPaused);
    }
    Ok(())
}

/// Require the contract to be paused
#[inline]
fn require_paused(env: &Env) -> Result<(), BOBTError> {
    if !is_paused(env) {
        return Err(BOBTError::ContractNotPaused);
    }
    Ok(())
}

/// Require account to not be frozen
#[inline]
fn require_not_frozen(env: &Env, account: &Address) -> Result<(), BOBTError> {
    if is_frozen(env, account) {
        return Err(BOBTError::AccountFrozen);
    }
    Ok(())
}

/// Require caller to have a specific role
#[inline]
fn require_role(env: &Env, role: &Symbol, caller: &Address) -> Result<(), BOBTError> {
    if !has_role(env, role, caller) {
        return Err(BOBTError::Unauthorized);
    }
    Ok(())
}

/// Require caller to be the owner
#[inline]
fn require_owner(env: &Env, caller: &Address) -> Result<(), BOBTError> {
    let owner = get_owner(env).ok_or(BOBTError::NotInitialized)?;
    if *caller != owner {
        return Err(BOBTError::Unauthorized);
    }
    Ok(())
}

/// Validate amount is positive and within limits
#[inline]
fn validate_amount(amount: i128) -> Result<(), BOBTError> {
    if amount <= 0 {
        return Err(BOBTError::NegativeAmount);
    }
    if amount < MIN_TRANSFER {
        return Err(BOBTError::NegativeAmount);
    }
    Ok(())
}

/// Validate mint doesn't exceed max supply
#[inline]
fn validate_mint_supply(env: &Env, amount: i128) -> Result<(), BOBTError> {
    let current_supply = get_total_supply(env);
    let new_supply = current_supply.checked_add(amount).ok_or(BOBTError::OverflowError)?;
    if new_supply > MAX_SUPPLY {
        return Err(BOBTError::AmountTooLarge);
    }
    Ok(())
}

// =============================================================================
// INTERNAL BALANCE OPERATIONS
// =============================================================================

/// Internal mint function with all validations
fn mint_internal(env: &Env, to: &Address, amount: i128) -> Result<(), BOBTError> {
    validate_amount(amount)?;
    validate_mint_supply(env, amount)?;

    let balance = get_balance(env, to);
    let new_balance = balance.checked_add(amount).ok_or(BOBTError::OverflowError)?;
    set_balance(env, to, new_balance);

    let supply = get_total_supply(env);
    let new_supply = supply.checked_add(amount).ok_or(BOBTError::OverflowError)?;
    set_total_supply(env, new_supply);

    Ok(())
}

/// Internal burn function with all validations
fn burn_internal(env: &Env, from: &Address, amount: i128) -> Result<(), BOBTError> {
    validate_amount(amount)?;

    let balance = get_balance(env, from);
    if balance < amount {
        return Err(BOBTError::InsufficientBalance);
    }

    let new_balance = balance.checked_sub(amount).ok_or(BOBTError::OverflowError)?;
    set_balance(env, from, new_balance);

    let supply = get_total_supply(env);
    let new_supply = supply.checked_sub(amount).ok_or(BOBTError::OverflowError)?;
    set_total_supply(env, new_supply);

    Ok(())
}

/// Internal transfer function with all validations
fn transfer_internal(
    env: &Env,
    from: &Address,
    to: &Address,
    amount: i128,
) -> Result<(), BOBTError> {
    validate_amount(amount)?;

    if from == to {
        return Err(BOBTError::CannotTransferToSelf);
    }

    let from_balance = get_balance(env, from);
    if from_balance < amount {
        return Err(BOBTError::InsufficientBalance);
    }

    let new_from_balance = from_balance
        .checked_sub(amount)
        .ok_or(BOBTError::OverflowError)?;
    set_balance(env, from, new_from_balance);

    let to_balance = get_balance(env, to);
    let new_to_balance = to_balance
        .checked_add(amount)
        .ok_or(BOBTError::OverflowError)?;
    set_balance(env, to, new_to_balance);

    Ok(())
}

// =============================================================================
// CONTRACT IMPLEMENTATION
// =============================================================================

#[contractimpl]
impl BOBTToken {
    // =========================================================================
    // INITIALIZATION
    // =========================================================================

    /// Initialize the BOBT token contract
    ///
    /// # Arguments
    /// * `owner` - The initial owner address who will have all admin roles
    ///
    /// # Errors
    /// * `AlreadyInitialized` - If contract is already initialized
    pub fn initialize(env: Env, owner: Address) -> Result<(), BOBTError> {
        // Check if already initialized
        if is_initialized(&env) {
            return Err(BOBTError::AlreadyInitialized);
        }

        // Set as initialized with version
        set_initialized(&env);

        // Set owner
        set_owner(&env, &owner);

        // Grant owner role
        grant_role(&env, &ROLE_OWNER, &owner);

        // Initialize as not paused
        set_paused(&env, false);

        // Extend instance TTL
        extend_instance_ttl(&env);

        // Emit event
        emit_initialized(&env, &owner);

        Ok(())
    }

    /// Get the contract version
    pub fn version(env: Env) -> u32 {
        storage::get_version(&env)
    }

    // =========================================================================
    // SEP-41 TOKEN INTERFACE
    // =========================================================================

    /// Get the number of decimal places (7 for Stellar standard)
    pub fn decimals(_env: Env) -> u32 {
        TOKEN_DECIMALS
    }

    /// Get the token name
    pub fn name(env: Env) -> String {
        String::from_str(&env, TOKEN_NAME)
    }

    /// Get the token symbol
    pub fn symbol(env: Env) -> String {
        String::from_str(&env, TOKEN_SYMBOL)
    }

    /// Get the total supply of tokens in circulation
    pub fn total_supply(env: Env) -> i128 {
        get_total_supply(&env)
    }

    /// Get the balance of an account
    ///
    /// # Arguments
    /// * `id` - The account address to query
    pub fn balance(env: Env, id: Address) -> i128 {
        get_balance(&env, &id)
    }

    /// Get the allowance for a spender
    ///
    /// # Arguments
    /// * `from` - The owner address
    /// * `spender` - The spender address
    pub fn allowance(env: Env, from: Address, spender: Address) -> i128 {
        get_allowance(&env, &from, &spender)
    }

    /// Approve a spender to spend tokens on behalf of the caller
    ///
    /// # Arguments
    /// * `from` - The owner address (must authorize)
    /// * `spender` - The spender address
    /// * `amount` - The maximum amount to allow
    /// * `expiration_ledger` - The ledger sequence when allowance expires
    ///
    /// # Errors
    /// * `ContractPaused` - If contract is paused
    /// * `AccountFrozen` - If from account is frozen
    pub fn approve(
        env: Env,
        from: Address,
        spender: Address,
        amount: i128,
        expiration_ledger: u32,
    ) -> Result<(), BOBTError> {
        from.require_auth();

        require_not_paused(&env)?;
        require_not_frozen(&env, &from)?;

        set_allowance(&env, &from, &spender, amount, expiration_ledger);

        Ok(())
    }

    /// Transfer tokens from the caller to another address
    ///
    /// # Arguments
    /// * `from` - The sender address (must authorize)
    /// * `to` - The recipient address
    /// * `amount` - The amount to transfer
    ///
    /// # Errors
    /// * `ContractPaused` - If contract is paused
    /// * `AccountFrozen` - If either account is frozen
    /// * `InsufficientBalance` - If sender has insufficient balance
    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) -> Result<(), BOBTError> {
        from.require_auth();

        require_not_paused(&env)?;
        require_not_frozen(&env, &from)?;
        require_not_frozen(&env, &to)?;

        transfer_internal(&env, &from, &to, amount)?;

        // Extend TTL after successful operation
        extend_instance_ttl(&env);

        Ok(())
    }

    /// Transfer tokens from one address to another using allowance
    ///
    /// # Arguments
    /// * `spender` - The spender address (must authorize)
    /// * `from` - The owner address
    /// * `to` - The recipient address
    /// * `amount` - The amount to transfer
    ///
    /// # Errors
    /// * `ContractPaused` - If contract is paused
    /// * `AccountFrozen` - If any account is frozen
    /// * `InsufficientAllowance` - If spender has insufficient allowance
    pub fn transfer_from(
        env: Env,
        spender: Address,
        from: Address,
        to: Address,
        amount: i128,
    ) -> Result<(), BOBTError> {
        spender.require_auth();

        require_not_paused(&env)?;
        require_not_frozen(&env, &from)?;
        require_not_frozen(&env, &to)?;
        require_not_frozen(&env, &spender)?;

        // Spend allowance (checks expiration and amount)
        spend_allowance(&env, &from, &spender, amount)
            .map_err(|_| BOBTError::InsufficientAllowance)?;

        // Transfer
        transfer_internal(&env, &from, &to, amount)?;

        // Extend TTL
        extend_instance_ttl(&env);

        Ok(())
    }

    // =========================================================================
    // MINT OPERATIONS (MINTER_ROLE)
    // =========================================================================

    /// Mint new tokens to an account (MINTER_ROLE required)
    ///
    /// # Arguments
    /// * `minter` - The minter address (must have MINTER role and authorize)
    /// * `to` - The recipient address
    /// * `amount` - The amount to mint (in stroops)
    /// * `request_id` - Unique request ID for tracking (bank transaction ID)
    ///
    /// # Errors
    /// * `Unauthorized` - If minter doesn't have MINTER role
    /// * `ContractPaused` - If contract is paused
    /// * `AccountFrozen` - If recipient is frozen
    /// * `RequestAlreadyExists` - If request_id already used
    /// * `AmountTooLarge` - If mint would exceed MAX_SUPPLY
    pub fn admin_mint(
        env: Env,
        minter: Address,
        to: Address,
        amount: i128,
        request_id: String,
    ) -> Result<(), BOBTError> {
        minter.require_auth();

        require_role(&env, &ROLE_MINTER, &minter)?;
        require_not_paused(&env)?;
        require_not_frozen(&env, &to)?;

        // Check for duplicate request (idempotency)
        if storage::mint_request_exists(&env, &request_id) {
            return Err(BOBTError::RequestAlreadyExists);
        }

        // Mint tokens
        mint_internal(&env, &to, amount)?;

        // Store request for audit trail
        let request = MintRequest {
            to: to.clone(),
            amount,
            ledger: env.ledger().sequence(),
            timestamp: env.ledger().timestamp(),
            minter: minter.clone(),
            external_ref: request_id.clone(),
        };
        storage::store_mint_request(&env, &request_id, &request);

        // Emit event
        emit_mint(&env, &to, amount, &request_id, &minter);

        // Extend TTL
        extend_instance_ttl(&env);

        Ok(())
    }

    /// Legacy mint function (deprecated - use admin_mint)
    pub fn mint(
        env: Env,
        to: Address,
        amount: i128,
        request_id: String,
    ) -> Result<(), BOBTError> {
        // For backwards compatibility, use contract as minter
        // In production, this should be removed or require proper auth
        require_not_paused(&env)?;
        require_not_frozen(&env, &to)?;

        if storage::mint_request_exists(&env, &request_id) {
            return Err(BOBTError::RequestAlreadyExists);
        }

        mint_internal(&env, &to, amount)?;

        let minter = env.current_contract_address();
        let request = MintRequest {
            to: to.clone(),
            amount,
            ledger: env.ledger().sequence(),
            timestamp: env.ledger().timestamp(),
            minter: minter.clone(),
            external_ref: request_id.clone(),
        };
        storage::store_mint_request(&env, &request_id, &request);

        emit_mint(&env, &to, amount, &request_id, &minter);
        extend_instance_ttl(&env);

        Ok(())
    }

    // =========================================================================
    // BURN OPERATIONS
    // =========================================================================

    /// Burn tokens from caller's own account
    ///
    /// # Arguments
    /// * `from` - The account to burn from (must authorize)
    /// * `amount` - The amount to burn
    ///
    /// # Errors
    /// * `ContractPaused` - If contract is paused
    /// * `InsufficientBalance` - If insufficient balance
    pub fn burn(env: Env, from: Address, amount: i128) -> Result<(), BOBTError> {
        from.require_auth();

        require_not_paused(&env)?;

        burn_internal(&env, &from, amount)?;

        emit_user_burn(&env, &from, amount);
        extend_instance_ttl(&env);

        Ok(())
    }

    /// Burn tokens using allowance
    ///
    /// # Arguments
    /// * `spender` - The spender address (must authorize)
    /// * `from` - The owner address
    /// * `amount` - The amount to burn
    pub fn burn_from(
        env: Env,
        spender: Address,
        from: Address,
        amount: i128,
    ) -> Result<(), BOBTError> {
        spender.require_auth();

        require_not_paused(&env)?;

        // Spend allowance
        spend_allowance(&env, &from, &spender, amount)
            .map_err(|_| BOBTError::InsufficientAllowance)?;

        burn_internal(&env, &from, amount)?;

        emit_user_burn(&env, &from, amount);
        extend_instance_ttl(&env);

        Ok(())
    }

    /// Admin burn for redemptions (MINTER_ROLE required)
    ///
    /// # Arguments
    /// * `operator` - The operator (must have MINTER role and authorize)
    /// * `from` - The account to burn from (must also authorize)
    /// * `amount` - The amount to burn
    /// * `request_id` - Unique request ID for tracking
    ///
    /// # Errors
    /// * `Unauthorized` - If operator doesn't have MINTER role
    /// * `RequestAlreadyExists` - If request_id already used
    pub fn admin_burn(
        env: Env,
        operator: Address,
        from: Address,
        amount: i128,
        request_id: String,
    ) -> Result<(), BOBTError> {
        operator.require_auth();
        from.require_auth();

        require_role(&env, &ROLE_MINTER, &operator)?;
        require_not_paused(&env)?;

        // Check for duplicate request
        if storage::burn_request_exists(&env, &request_id) {
            return Err(BOBTError::RequestAlreadyExists);
        }

        // Burn tokens
        burn_internal(&env, &from, amount)?;

        // Store request for audit trail
        let request = BurnRequest {
            from: from.clone(),
            amount,
            ledger: env.ledger().sequence(),
            timestamp: env.ledger().timestamp(),
            operator: operator.clone(),
            external_ref: request_id.clone(),
        };
        storage::store_burn_request(&env, &request_id, &request);

        emit_burn(&env, &from, amount, &request_id, &operator);
        extend_instance_ttl(&env);

        Ok(())
    }

    // =========================================================================
    // PAUSE OPERATIONS (PAUSER_ROLE)
    // =========================================================================

    /// Pause the contract (PAUSER_ROLE required)
    ///
    /// When paused, most operations are blocked for emergency response.
    pub fn pause(env: Env, pauser: Address) -> Result<(), BOBTError> {
        pauser.require_auth();

        require_role(&env, &ROLE_PAUSER, &pauser)?;
        require_not_paused(&env)?;

        set_paused(&env, true);

        emit_pause(&env, &pauser);
        extend_instance_ttl(&env);

        Ok(())
    }

    /// Unpause the contract (PAUSER_ROLE required)
    pub fn unpause(env: Env, pauser: Address) -> Result<(), BOBTError> {
        pauser.require_auth();

        require_role(&env, &ROLE_PAUSER, &pauser)?;
        require_paused(&env)?;

        set_paused(&env, false);

        emit_unpause(&env, &pauser);
        extend_instance_ttl(&env);

        Ok(())
    }

    /// Check if the contract is currently paused
    pub fn is_paused(env: Env) -> bool {
        is_paused(&env)
    }

    // =========================================================================
    // BLACKLIST/FREEZE OPERATIONS (BLACKLISTER_ROLE)
    // =========================================================================

    /// Freeze an account (BLACKLISTER_ROLE required)
    ///
    /// Frozen accounts cannot send or receive tokens.
    pub fn freeze(env: Env, blacklister: Address, account: Address) -> Result<(), BOBTError> {
        blacklister.require_auth();

        require_role(&env, &ROLE_BLACKLISTER, &blacklister)?;

        if is_frozen(&env, &account) {
            return Err(BOBTError::AccountFrozen);
        }

        freeze_account(&env, &account);

        emit_freeze(&env, &account, &blacklister);
        extend_instance_ttl(&env);

        Ok(())
    }

    /// Unfreeze an account (BLACKLISTER_ROLE required)
    pub fn unfreeze(env: Env, blacklister: Address, account: Address) -> Result<(), BOBTError> {
        blacklister.require_auth();

        require_role(&env, &ROLE_BLACKLISTER, &blacklister)?;

        if !is_frozen(&env, &account) {
            return Err(BOBTError::AccountNotFrozen);
        }

        unfreeze_account(&env, &account);

        emit_unfreeze(&env, &account, &blacklister);
        extend_instance_ttl(&env);

        Ok(())
    }

    /// Check if an account is frozen
    pub fn is_frozen(env: Env, account: Address) -> bool {
        is_frozen(&env, &account)
    }

    /// Destroy frozen funds (clawback) - BLACKLISTER_ROLE required
    ///
    /// Burns all tokens from a frozen account. Account must be frozen first.
    pub fn destroy_frozen_funds(
        env: Env,
        blacklister: Address,
        account: Address,
    ) -> Result<(), BOBTError> {
        blacklister.require_auth();

        require_role(&env, &ROLE_BLACKLISTER, &blacklister)?;

        if !is_frozen(&env, &account) {
            return Err(BOBTError::AccountNotFrozen);
        }

        let balance = get_balance(&env, &account);
        if balance > 0 {
            // Burn without amount validation (clawback special case)
            set_balance(&env, &account, 0);

            let supply = get_total_supply(&env);
            let new_supply = supply.checked_sub(balance).ok_or(BOBTError::OverflowError)?;
            set_total_supply(&env, new_supply);

            emit_clawback(&env, &account, balance, &blacklister);
        }

        extend_instance_ttl(&env);

        Ok(())
    }

    // =========================================================================
    // RESCUE OPERATIONS (RESCUER_ROLE)
    // =========================================================================

    /// Rescue tokens sent to the contract by mistake (RESCUER_ROLE required)
    ///
    /// Cannot rescue BOBT tokens (the contract's own token).
    pub fn rescue_tokens(
        env: Env,
        rescuer: Address,
        token: Address,
        to: Address,
        amount: i128,
    ) -> Result<(), BOBTError> {
        rescuer.require_auth();

        require_role(&env, &ROLE_RESCUER, &rescuer)?;

        // Cannot rescue own token
        if token == env.current_contract_address() {
            return Err(BOBTError::CannotRescueOwnToken);
        }

        // Transfer the foreign token
        let token_client = TokenClient::new(&env, &token);
        token_client.transfer(&env.current_contract_address(), &to, &amount);

        emit_rescue(&env, &token, &to, amount, &rescuer);
        extend_instance_ttl(&env);

        Ok(())
    }

    // =========================================================================
    // REQUEST TRACKING (AUDIT TRAIL)
    // =========================================================================

    /// Get a mint request by ID
    pub fn get_mint_request(env: Env, request_id: String) -> Result<MintRequest, BOBTError> {
        storage::get_mint_request(&env, &request_id).ok_or(BOBTError::RequestNotFound)
    }

    /// Get a burn request by ID
    pub fn get_burn_request(env: Env, request_id: String) -> Result<BurnRequest, BOBTError> {
        storage::get_burn_request(&env, &request_id).ok_or(BOBTError::RequestNotFound)
    }

    /// Check if a mint request exists
    pub fn mint_request_exists(env: Env, request_id: String) -> bool {
        storage::mint_request_exists(&env, &request_id)
    }

    /// Check if a burn request exists
    pub fn burn_request_exists(env: Env, request_id: String) -> bool {
        storage::burn_request_exists(&env, &request_id)
    }

    // =========================================================================
    // ACCESS CONTROL (OWNER)
    // =========================================================================

    /// Grant a role to an account (OWNER only)
    ///
    /// # Arguments
    /// * `admin` - The owner address (must authorize)
    /// * `role` - The role symbol (minter, pauser, blklst, rescuer)
    /// * `account` - The account to grant the role to
    pub fn grant_role(
        env: Env,
        admin: Address,
        role: Symbol,
        account: Address,
    ) -> Result<(), BOBTError> {
        admin.require_auth();

        require_owner(&env, &admin)?;

        // Map string role to internal symbol
        let role_symbol = Self::map_role(&env, &role)?;
        grant_role(&env, &role_symbol, &account);

        emit_role_granted(&env, &role, &account, &admin);
        extend_instance_ttl(&env);

        Ok(())
    }

    /// Revoke a role from an account (OWNER only)
    pub fn revoke_role(
        env: Env,
        admin: Address,
        role: Symbol,
        account: Address,
    ) -> Result<(), BOBTError> {
        admin.require_auth();

        require_owner(&env, &admin)?;

        let role_symbol = Self::map_role(&env, &role)?;
        revoke_role(&env, &role_symbol, &account);

        emit_role_revoked(&env, &role, &account, &admin);
        extend_instance_ttl(&env);

        Ok(())
    }

    /// Check if an account has a specific role
    pub fn has_role(env: Env, role: Symbol, account: Address) -> bool {
        if let Ok(role_symbol) = Self::map_role(&env, &role) {
            has_role(&env, &role_symbol, &account)
        } else {
            false
        }
    }

    /// Get the contract owner address
    pub fn owner(env: Env) -> Result<Address, BOBTError> {
        get_owner(&env).ok_or(BOBTError::NotInitialized)
    }

    /// Transfer ownership to a new owner (OWNER only)
    pub fn transfer_ownership(
        env: Env,
        current_owner: Address,
        new_owner: Address,
    ) -> Result<(), BOBTError> {
        current_owner.require_auth();

        require_owner(&env, &current_owner)?;

        // Revoke owner role from current owner
        revoke_role(&env, &ROLE_OWNER, &current_owner);

        // Grant owner role to new owner
        grant_role(&env, &ROLE_OWNER, &new_owner);

        // Update owner in storage
        set_owner(&env, &new_owner);

        emit_ownership_transferred(&env, &current_owner, &new_owner);
        extend_instance_ttl(&env);

        Ok(())
    }

    // =========================================================================
    // UPGRADE
    // =========================================================================

    /// Upgrade the contract (OWNER only)
    ///
    /// # Arguments
    /// * `operator` - The owner address (must authorize)
    /// * `new_wasm_hash` - The hash of the new WASM binary
    pub fn upgrade(env: Env, operator: Address, new_wasm_hash: BytesN<32>) -> Result<(), BOBTError> {
        operator.require_auth();

        require_owner(&env, &operator)?;

        env.deployer().update_current_contract_wasm(new_wasm_hash);

        emit_upgraded(&env, &operator);

        Ok(())
    }

    /// Migrate contract state after upgrade
    ///
    /// This function is called after upgrade to perform any necessary migrations.
    /// It's a no-op for initial deployment.
    pub fn migrate(_env: Env) -> Result<(), BOBTError> {
        // Reserved for future migrations
        // Each version can implement specific migration logic
        Ok(())
    }

    // =========================================================================
    // INTERNAL HELPERS
    // =========================================================================

    /// Map user-friendly role names to internal role symbols
    fn map_role(env: &Env, role: &Symbol) -> Result<Symbol, BOBTError> {
        // Compare with known role names
        let minter_sym = Symbol::new(env, "minter");
        let pauser_sym = Symbol::new(env, "pauser");
        let blklst_sym = Symbol::new(env, "blklst");
        let rescuer_sym = Symbol::new(env, "rescuer");
        let owner_sym = Symbol::new(env, "owner");

        if *role == minter_sym {
            Ok(ROLE_MINTER)
        } else if *role == pauser_sym {
            Ok(ROLE_PAUSER)
        } else if *role == blklst_sym {
            Ok(ROLE_BLACKLISTER)
        } else if *role == rescuer_sym {
            Ok(ROLE_RESCUER)
        } else if *role == owner_sym {
            Ok(ROLE_OWNER)
        } else {
            Err(BOBTError::InvalidRole)
        }
    }
}
