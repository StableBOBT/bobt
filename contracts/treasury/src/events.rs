//! Event emissions for BOBT Treasury
//!
//! All treasury operations emit events for off-chain monitoring.

use soroban_sdk::{Address, Env, String, Symbol};

use crate::storage::ProposalType;

// =============================================================================
// PROPOSAL EVENTS
// =============================================================================

/// Emitted when a new proposal is created
pub fn emit_proposal_created(
    env: &Env,
    proposal_id: u64,
    proposal_type: &ProposalType,
    proposer: &Address,
    target: &Address,
    amount: i128,
) {
    let topics = (
        Symbol::new(env, "proposal_created"),
        proposal_id,
        proposer.clone(),
    );
    env.events().publish(
        topics,
        (proposal_type.clone(), target.clone(), amount),
    );
}

/// Emitted when a signer approves a proposal
pub fn emit_proposal_approved(
    env: &Env,
    proposal_id: u64,
    signer: &Address,
    approval_count: u32,
    threshold: u32,
) {
    let topics = (
        Symbol::new(env, "proposal_approved"),
        proposal_id,
        signer.clone(),
    );
    env.events().publish(topics, (approval_count, threshold));
}

/// Emitted when a proposal is executed
pub fn emit_proposal_executed(
    env: &Env,
    proposal_id: u64,
    proposal_type: &ProposalType,
    executor: &Address,
) {
    let topics = (
        Symbol::new(env, "proposal_executed"),
        proposal_id,
        executor.clone(),
    );
    env.events().publish(topics, proposal_type.clone());
}

/// Emitted when a proposal is cancelled
pub fn emit_proposal_cancelled(env: &Env, proposal_id: u64, by: &Address) {
    let topics = (Symbol::new(env, "proposal_cancelled"), proposal_id);
    env.events().publish(topics, by.clone());
}

// =============================================================================
// TREASURY OPERATION EVENTS
// =============================================================================

/// Emitted when treasury mints tokens
pub fn emit_treasury_mint(
    env: &Env,
    to: &Address,
    amount: i128,
    proposal_id: u64,
    external_ref: &String,
) {
    let topics = (Symbol::new(env, "treasury_mint"), to.clone(), proposal_id);
    env.events().publish(topics, (amount, external_ref.clone()));
}

/// Emitted when treasury burns tokens
pub fn emit_treasury_burn(
    env: &Env,
    from: &Address,
    amount: i128,
    proposal_id: u64,
    external_ref: &String,
) {
    let topics = (Symbol::new(env, "treasury_burn"), from.clone(), proposal_id);
    env.events().publish(topics, (amount, external_ref.clone()));
}

// =============================================================================
// CONFIGURATION EVENTS
// =============================================================================

/// Emitted when a signer is added
pub fn emit_signer_added(env: &Env, signer: &Address, proposal_id: u64) {
    let topics = (Symbol::new(env, "signer_added"), signer.clone());
    env.events().publish(topics, proposal_id);
}

/// Emitted when a signer is removed
pub fn emit_signer_removed(env: &Env, signer: &Address, proposal_id: u64) {
    let topics = (Symbol::new(env, "signer_removed"), signer.clone());
    env.events().publish(topics, proposal_id);
}

/// Emitted when threshold is updated
pub fn emit_threshold_updated(env: &Env, old_threshold: u32, new_threshold: u32, proposal_id: u64) {
    let topics = (Symbol::new(env, "threshold_updated"), proposal_id);
    env.events().publish(topics, (old_threshold, new_threshold));
}

/// Emitted when rate limits are updated
pub fn emit_rate_limits_updated(
    env: &Env,
    daily_mint_limit: i128,
    daily_burn_limit: i128,
    single_op_limit: i128,
    proposal_id: u64,
) {
    let topics = (Symbol::new(env, "rate_limits_updated"), proposal_id);
    env.events()
        .publish(topics, (daily_mint_limit, daily_burn_limit, single_op_limit));
}

// =============================================================================
// ORACLE EVENTS
// =============================================================================

/// Emitted when Oracle address is updated
pub fn emit_oracle_updated(env: &Env, oracle_address: &Address, proposal_id: u64) {
    let topics = (Symbol::new(env, "oracle_updated"), proposal_id);
    env.events().publish(topics, oracle_address.clone());
}

// =============================================================================
// INITIALIZATION EVENTS
// =============================================================================

/// Emitted when treasury is initialized
pub fn emit_initialized(env: &Env, token_address: &Address, signers_count: u32, threshold: u32) {
    let topics = (Symbol::new(env, "treasury_initialized"),);
    env.events()
        .publish(topics, (token_address.clone(), signers_count, threshold));
}
