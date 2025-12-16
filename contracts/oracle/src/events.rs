//! Event emissions for BOBT P2P Oracle

use soroban_sdk::{Address, Env, Symbol};

/// Emitted when price is updated for an exchange
pub fn emit_price_updated(
    env: &Env,
    exchange: &Symbol,
    ask: i128,
    bid: i128,
    operator: &Address,
) {
    let topics = (Symbol::new(env, "price_updated"), exchange.clone());
    env.events().publish(topics, (ask, bid, operator.clone()));
}

/// Emitted when aggregated price is calculated
pub fn emit_aggregated_price(
    env: &Env,
    ask: i128,
    bid: i128,
    mid: i128,
    num_sources: u32,
) {
    let topics = (Symbol::new(env, "aggregated_price"),);
    env.events().publish(topics, (ask, bid, mid, num_sources));
}

/// Emitted when operator is added
pub fn emit_operator_added(env: &Env, operator: &Address, by: &Address) {
    let topics = (Symbol::new(env, "operator_added"), operator.clone());
    env.events().publish(topics, by.clone());
}

/// Emitted when operator is removed
pub fn emit_operator_removed(env: &Env, operator: &Address, by: &Address) {
    let topics = (Symbol::new(env, "operator_removed"), operator.clone());
    env.events().publish(topics, by.clone());
}

/// Emitted when oracle is initialized
pub fn emit_initialized(env: &Env, admin: &Address) {
    let topics = (Symbol::new(env, "oracle_initialized"),);
    env.events().publish(topics, admin.clone());
}
