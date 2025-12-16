//! Event emission functions for BOBT Stablecoin
//!
//! This module defines all events that are emitted by the BOBT contract
//! for off-chain monitoring and indexing.

use soroban_sdk::{Address, Env, String, Symbol};

// =============================================================================
// MINT/BURN EVENTS
// =============================================================================

/// Emitted when new tokens are minted
///
/// Topics: ("mint", to, minter)
/// Data: (amount, request_id)
pub fn emit_mint(env: &Env, to: &Address, amount: i128, request_id: &String, minter: &Address) {
    let topics = (Symbol::new(env, "mint"), to.clone(), minter.clone());
    env.events().publish(topics, (amount, request_id.clone()));
}

/// Emitted when tokens are burned
///
/// Topics: ("burn", from, operator)
/// Data: (amount, request_id)
pub fn emit_burn(env: &Env, from: &Address, amount: i128, request_id: &String, operator: &Address) {
    let topics = (Symbol::new(env, "burn"), from.clone(), operator.clone());
    env.events().publish(topics, (amount, request_id.clone()));
}

/// Emitted when a user burns their own tokens
///
/// Topics: ("user_burn", from)
/// Data: amount
pub fn emit_user_burn(env: &Env, from: &Address, amount: i128) {
    let topics = (Symbol::new(env, "user_burn"), from.clone());
    env.events().publish(topics, amount);
}

// =============================================================================
// FREEZE/BLACKLIST EVENTS
// =============================================================================

/// Emitted when an account is frozen (added to blocklist)
///
/// Topics: ("freeze", account)
/// Data: blacklister
pub fn emit_freeze(env: &Env, account: &Address, blacklister: &Address) {
    let topics = (Symbol::new(env, "freeze"), account.clone());
    env.events().publish(topics, blacklister.clone());
}

/// Emitted when an account is unfrozen (removed from blocklist)
///
/// Topics: ("unfreeze", account)
/// Data: blacklister
pub fn emit_unfreeze(env: &Env, account: &Address, blacklister: &Address) {
    let topics = (Symbol::new(env, "unfreeze"), account.clone());
    env.events().publish(topics, blacklister.clone());
}

/// Emitted when frozen funds are destroyed (clawback)
///
/// Topics: ("clawback", account)
/// Data: (amount, blacklister)
pub fn emit_clawback(env: &Env, account: &Address, amount: i128, blacklister: &Address) {
    let topics = (Symbol::new(env, "clawback"), account.clone());
    env.events().publish(topics, (amount, blacklister.clone()));
}

// =============================================================================
// PAUSE EVENTS
// =============================================================================

/// Emitted when the contract is paused
///
/// Topics: ("pause",)
/// Data: pauser
pub fn emit_pause(env: &Env, pauser: &Address) {
    let topics = (Symbol::new(env, "pause"),);
    env.events().publish(topics, pauser.clone());
}

/// Emitted when the contract is unpaused
///
/// Topics: ("unpause",)
/// Data: pauser
pub fn emit_unpause(env: &Env, pauser: &Address) {
    let topics = (Symbol::new(env, "unpause"),);
    env.events().publish(topics, pauser.clone());
}

// =============================================================================
// RESCUE EVENTS
// =============================================================================

/// Emitted when tokens are rescued from the contract
///
/// Topics: ("rescue", token, to)
/// Data: (amount, rescuer)
pub fn emit_rescue(env: &Env, token: &Address, to: &Address, amount: i128, rescuer: &Address) {
    let topics = (Symbol::new(env, "rescue"), token.clone(), to.clone());
    env.events().publish(topics, (amount, rescuer.clone()));
}

// =============================================================================
// ACCESS CONTROL EVENTS
// =============================================================================

/// Emitted when a role is granted to an account
///
/// Topics: ("role_granted", role, account)
/// Data: admin
pub fn emit_role_granted(env: &Env, role: &Symbol, account: &Address, admin: &Address) {
    let topics = (Symbol::new(env, "role_granted"), role.clone(), account.clone());
    env.events().publish(topics, admin.clone());
}

/// Emitted when a role is revoked from an account
///
/// Topics: ("role_revoked", role, account)
/// Data: admin
pub fn emit_role_revoked(env: &Env, role: &Symbol, account: &Address, admin: &Address) {
    let topics = (Symbol::new(env, "role_revoked"), role.clone(), account.clone());
    env.events().publish(topics, admin.clone());
}

/// Emitted when ownership is transferred
///
/// Topics: ("ownership_transferred", previous_owner, new_owner)
/// Data: ()
pub fn emit_ownership_transferred(env: &Env, previous_owner: &Address, new_owner: &Address) {
    let topics = (
        Symbol::new(env, "ownership_transferred"),
        previous_owner.clone(),
        new_owner.clone(),
    );
    env.events().publish(topics, ());
}

// =============================================================================
// UPGRADE EVENTS
// =============================================================================

/// Emitted when the contract is upgraded
///
/// Topics: ("upgraded",)
/// Data: new_wasm_hash (as bytes)
pub fn emit_upgraded(env: &Env, operator: &Address) {
    let topics = (Symbol::new(env, "upgraded"),);
    env.events().publish(topics, operator.clone());
}

// =============================================================================
// INITIALIZATION EVENTS
// =============================================================================

/// Emitted when the contract is initialized
///
/// Topics: ("initialized",)
/// Data: owner
pub fn emit_initialized(env: &Env, owner: &Address) {
    let topics = (Symbol::new(env, "initialized"),);
    env.events().publish(topics, owner.clone());
}
