//! Storage module for BOBT P2P Price Oracle
//!
//! Stores price data from multiple P2P exchanges (Binance, Bybit, Bitget)
//! and calculates aggregated prices for BOB/USDT pair.

use soroban_sdk::{contracttype, symbol_short, Address, Env, Symbol, Vec};

// =============================================================================
// STORAGE KEYS
// =============================================================================

pub const KEY_INITIALIZED: Symbol = symbol_short!("INIT");
pub const KEY_ADMIN: Symbol = symbol_short!("ADMIN");
pub const KEY_OPERATORS: Symbol = symbol_short!("OPS");
pub const KEY_AGGREGATED: Symbol = symbol_short!("AGGR");

// =============================================================================
// EXCHANGE IDENTIFIERS
// =============================================================================

pub const EXCHANGE_BINANCE: Symbol = symbol_short!("BINANCE");
pub const EXCHANGE_BYBIT: Symbol = symbol_short!("BYBIT");
pub const EXCHANGE_BITGET: Symbol = symbol_short!("BITGET");

// =============================================================================
// CONFIGURATION CONSTANTS
// =============================================================================

/// Maximum price age in seconds (15 minutes)
pub const MAX_PRICE_AGE_SECS: u64 = 900;
/// Maximum price deviation allowed (10%)
pub const MAX_PRICE_DEVIATION_BPS: i128 = 1000; // 10% = 1000 basis points
/// Price decimals (7 for consistency with BOBT)
pub const PRICE_DECIMALS: u32 = 7;
/// 1 unit with decimals
pub const ONE_UNIT: i128 = 10_000_000;
/// Minimum exchanges required for valid aggregation
pub const MIN_EXCHANGES_FOR_AGGREGATION: u32 = 2;

// =============================================================================
// TTL CONFIGURATION
// =============================================================================

pub const INSTANCE_TTL_THRESHOLD: u32 = 17280 * 7;
pub const INSTANCE_TTL_EXTEND: u32 = 17280 * 7;

// =============================================================================
// DATA TYPES
// =============================================================================

/// Storage keys
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    /// Price data for specific exchange
    ExchangePrice(Symbol),
    /// Historical price (for TWAP)
    PriceHistory(u32), // ledger sequence
}

/// Price data from a single exchange
#[contracttype]
#[derive(Clone, Debug)]
pub struct ExchangePrice {
    /// Exchange identifier (BINANCE, BYBIT, BITGET)
    pub exchange: Symbol,
    /// Ask price (buy USDT with BOB) - in 7 decimals
    /// Example: 9.18 BOB/USDT = 91_800_000
    pub ask: i128,
    /// Bid price (sell USDT for BOB) - in 7 decimals
    /// Example: 9.15 BOB/USDT = 91_500_000
    pub bid: i128,
    /// Unix timestamp of price update
    pub timestamp: u64,
    /// Ledger sequence when updated
    pub ledger: u32,
}

/// Aggregated price from all exchanges
#[contracttype]
#[derive(Clone, Debug)]
pub struct AggregatedPrice {
    /// Weighted average ask price
    pub ask: i128,
    /// Weighted average bid price
    pub bid: i128,
    /// Mid price (ask + bid) / 2
    pub mid: i128,
    /// Spread in basis points
    pub spread_bps: i128,
    /// Number of exchanges in aggregation
    pub num_sources: u32,
    /// Timestamp of aggregation
    pub timestamp: u64,
    /// Ledger sequence
    pub ledger: u32,
}

/// Oracle configuration
#[contracttype]
#[derive(Clone, Debug)]
pub struct OracleConfig {
    /// Maximum price age allowed
    pub max_price_age_secs: u64,
    /// Maximum deviation between exchanges
    pub max_deviation_bps: i128,
    /// Minimum sources required
    pub min_sources: u32,
}

// =============================================================================
// STORAGE HELPER FUNCTIONS
// =============================================================================

/// Extend instance TTL
pub fn extend_instance_ttl(env: &Env) {
    env.storage()
        .instance()
        .extend_ttl(INSTANCE_TTL_THRESHOLD, INSTANCE_TTL_EXTEND);
}

/// Check if initialized
pub fn is_initialized(env: &Env) -> bool {
    env.storage().instance().has(&KEY_INITIALIZED)
}

/// Set initialized
pub fn set_initialized(env: &Env) {
    env.storage().instance().set(&KEY_INITIALIZED, &true);
}

/// Get admin
pub fn get_admin(env: &Env) -> Option<Address> {
    env.storage().instance().get(&KEY_ADMIN)
}

/// Set admin
pub fn set_admin(env: &Env, admin: &Address) {
    env.storage().instance().set(&KEY_ADMIN, admin);
}

/// Get operators list
pub fn get_operators(env: &Env) -> Vec<Address> {
    env.storage()
        .instance()
        .get(&KEY_OPERATORS)
        .unwrap_or(Vec::new(env))
}

/// Set operators list
pub fn set_operators(env: &Env, operators: &Vec<Address>) {
    env.storage().instance().set(&KEY_OPERATORS, operators);
}

/// Check if address is an operator
pub fn is_operator(env: &Env, address: &Address) -> bool {
    let operators = get_operators(env);
    operators.iter().any(|op| op == *address)
}

/// Get exchange price
pub fn get_exchange_price(env: &Env, exchange: &Symbol) -> Option<ExchangePrice> {
    env.storage()
        .instance()
        .get(&DataKey::ExchangePrice(exchange.clone()))
}

/// Set exchange price
pub fn set_exchange_price(env: &Env, price: &ExchangePrice) {
    env.storage()
        .instance()
        .set(&DataKey::ExchangePrice(price.exchange.clone()), price);
}

/// Get aggregated price
pub fn get_aggregated_price(env: &Env) -> Option<AggregatedPrice> {
    env.storage().instance().get(&KEY_AGGREGATED)
}

/// Set aggregated price
pub fn set_aggregated_price(env: &Env, price: &AggregatedPrice) {
    env.storage().instance().set(&KEY_AGGREGATED, price);
}

// =============================================================================
// PRICE CALCULATION HELPERS
// =============================================================================

/// Calculate aggregated price from multiple exchanges
pub fn calculate_aggregated_price(
    env: &Env,
    current_timestamp: u64,
    current_ledger: u32,
) -> Option<AggregatedPrice> {
    let exchanges = [EXCHANGE_BINANCE, EXCHANGE_BYBIT, EXCHANGE_BITGET];
    let mut valid_prices: Vec<ExchangePrice> = Vec::new(env);

    // Collect valid (non-stale) prices
    for exchange in exchanges.iter() {
        if let Some(price) = get_exchange_price(env, &exchange) {
            // Check if price is not stale
            if current_timestamp - price.timestamp <= MAX_PRICE_AGE_SECS {
                valid_prices.push_back(price);
            }
        }
    }

    let num_sources = valid_prices.len();
    if num_sources < MIN_EXCHANGES_FOR_AGGREGATION {
        return None;
    }

    // Calculate simple average
    let mut total_ask: i128 = 0;
    let mut total_bid: i128 = 0;

    for price in valid_prices.iter() {
        total_ask += price.ask;
        total_bid += price.bid;
    }

    let avg_ask = total_ask / (num_sources as i128);
    let avg_bid = total_bid / (num_sources as i128);
    let mid = (avg_ask + avg_bid) / 2;

    // Calculate spread in basis points
    // spread = (ask - bid) / mid * 10000
    let spread_bps = if mid > 0 {
        ((avg_ask - avg_bid) * 10000) / mid
    } else {
        0
    };

    Some(AggregatedPrice {
        ask: avg_ask,
        bid: avg_bid,
        mid,
        spread_bps,
        num_sources,
        timestamp: current_timestamp,
        ledger: current_ledger,
    })
}

/// Validate price is within acceptable deviation
pub fn validate_price_deviation(
    new_price: i128,
    reference_price: i128,
    max_deviation_bps: i128,
) -> bool {
    if reference_price == 0 {
        return true; // No reference, accept any price
    }

    let deviation = if new_price > reference_price {
        ((new_price - reference_price) * 10000) / reference_price
    } else {
        ((reference_price - new_price) * 10000) / reference_price
    };

    deviation <= max_deviation_bps
}
