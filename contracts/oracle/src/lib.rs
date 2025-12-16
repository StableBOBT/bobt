//! BOBT P2P Price Oracle Contract
//!
//! Aggregates BOB/USDT prices from multiple P2P exchanges:
//! - Binance P2P
//! - Bybit P2P
//! - Bitget P2P
//!
//! Data source: CriptoYa API (https://criptoya.com/api/)
//!
//! # Architecture
//!
//! ```text
//! CriptoYa API ──► Off-chain Bot ──► Oracle Contract ──► Treasury/BOBT
//!                 (updates prices)    (stores & aggregates)
//! ```
//!
//! # Price Format
//!
//! All prices are stored with 7 decimals (matching BOBT token).
//! Example: 9.18 BOB/USDT = 91_800_000

#![no_std]

mod errors;
mod events;
mod storage;

pub use errors::OracleError;
pub use storage::{AggregatedPrice, ExchangePrice};

use soroban_sdk::{contract, contractimpl, Address, Env, Symbol, Vec};

use errors::OracleError as Error;
use events::*;
use storage::*;

#[contract]
pub struct PriceOracle;

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

fn require_admin(env: &Env, caller: &Address) -> Result<(), Error> {
    let admin = get_admin(env).ok_or(Error::NotInitialized)?;
    if *caller != admin {
        return Err(Error::Unauthorized);
    }
    Ok(())
}

fn require_operator(env: &Env, caller: &Address) -> Result<(), Error> {
    // Admin is also an operator
    if let Some(admin) = get_admin(env) {
        if *caller == admin {
            return Ok(());
        }
    }

    if !is_operator(env, caller) {
        return Err(Error::NotAnOperator);
    }
    Ok(())
}

fn validate_exchange(_env: &Env, exchange: &Symbol) -> Result<(), Error> {
    if *exchange == EXCHANGE_BINANCE
        || *exchange == EXCHANGE_BYBIT
        || *exchange == EXCHANGE_BITGET
    {
        Ok(())
    } else {
        Err(Error::InvalidExchange)
    }
}

// =============================================================================
// CONTRACT IMPLEMENTATION
// =============================================================================

#[contractimpl]
impl PriceOracle {
    // =========================================================================
    // INITIALIZATION
    // =========================================================================

    /// Initialize the oracle contract
    ///
    /// # Arguments
    /// * `admin` - Admin address (can add/remove operators)
    /// * `operators` - Initial list of price update operators
    pub fn initialize(
        env: Env,
        admin: Address,
        operators: Vec<Address>,
    ) -> Result<(), Error> {
        if is_initialized(&env) {
            return Err(Error::AlreadyInitialized);
        }

        set_initialized(&env);
        set_admin(&env, &admin);
        set_operators(&env, &operators);

        extend_instance_ttl(&env);
        emit_initialized(&env, &admin);

        Ok(())
    }

    // =========================================================================
    // PRICE UPDATES (OPERATORS)
    // =========================================================================

    /// Update price for a specific exchange
    ///
    /// # Arguments
    /// * `operator` - Operator address (must be authorized)
    /// * `exchange` - Exchange symbol (BINANCE, BYBIT, BITGET)
    /// * `ask` - Ask price in 7 decimals (e.g., 91800000 = 9.18)
    /// * `bid` - Bid price in 7 decimals
    /// * `timestamp` - Unix timestamp from CriptoYa API
    ///
    /// # Example
    /// ```
    /// // CriptoYa returns: {"ask": 9.18, "bid": 9.15, "time": 1765857767}
    /// // Convert: 9.18 * 10^7 = 91_800_000
    /// oracle.update_price(operator, "BINANCE", 91_800_000, 91_500_000, 1765857767)
    /// ```
    pub fn update_price(
        env: Env,
        operator: Address,
        exchange: Symbol,
        ask: i128,
        bid: i128,
        timestamp: u64,
    ) -> Result<(), Error> {
        operator.require_auth();
        require_operator(&env, &operator)?;
        validate_exchange(&env, &exchange)?;

        // Validate prices
        if ask <= 0 || bid <= 0 {
            return Err(Error::InvalidPrice);
        }
        if ask < bid {
            return Err(Error::InvalidPrice); // Ask should be >= bid
        }

        // Check deviation from existing aggregated price
        if let Some(agg) = get_aggregated_price(&env) {
            if !validate_price_deviation(ask, agg.ask, MAX_PRICE_DEVIATION_BPS) {
                return Err(Error::PriceDeviationTooHigh);
            }
        }

        // Store exchange price
        let price = ExchangePrice {
            exchange: exchange.clone(),
            ask,
            bid,
            timestamp,
            ledger: env.ledger().sequence(),
        };
        set_exchange_price(&env, &price);

        // Recalculate aggregated price
        let current_timestamp = env.ledger().timestamp();
        let current_ledger = env.ledger().sequence();

        if let Some(aggregated) = calculate_aggregated_price(&env, current_timestamp, current_ledger)
        {
            set_aggregated_price(&env, &aggregated);
            emit_aggregated_price(
                &env,
                aggregated.ask,
                aggregated.bid,
                aggregated.mid,
                aggregated.num_sources,
            );
        }

        emit_price_updated(&env, &exchange, ask, bid, &operator);
        extend_instance_ttl(&env);

        Ok(())
    }

    /// Batch update prices from multiple exchanges
    ///
    /// More gas efficient when updating all exchanges at once.
    pub fn update_prices_batch(
        env: Env,
        operator: Address,
        binance_ask: i128,
        binance_bid: i128,
        bybit_ask: i128,
        bybit_bid: i128,
        bitget_ask: i128,
        bitget_bid: i128,
        timestamp: u64,
    ) -> Result<(), Error> {
        operator.require_auth();
        require_operator(&env, &operator)?;

        let current_ledger = env.ledger().sequence();

        // Update Binance
        if binance_ask > 0 && binance_bid > 0 {
            let price = ExchangePrice {
                exchange: EXCHANGE_BINANCE,
                ask: binance_ask,
                bid: binance_bid,
                timestamp,
                ledger: current_ledger,
            };
            set_exchange_price(&env, &price);
        }

        // Update Bybit
        if bybit_ask > 0 && bybit_bid > 0 {
            let price = ExchangePrice {
                exchange: EXCHANGE_BYBIT,
                ask: bybit_ask,
                bid: bybit_bid,
                timestamp,
                ledger: current_ledger,
            };
            set_exchange_price(&env, &price);
        }

        // Update Bitget
        if bitget_ask > 0 && bitget_bid > 0 {
            let price = ExchangePrice {
                exchange: EXCHANGE_BITGET,
                ask: bitget_ask,
                bid: bitget_bid,
                timestamp,
                ledger: current_ledger,
            };
            set_exchange_price(&env, &price);
        }

        // Recalculate aggregated price
        let current_timestamp = env.ledger().timestamp();
        if let Some(aggregated) = calculate_aggregated_price(&env, current_timestamp, current_ledger)
        {
            set_aggregated_price(&env, &aggregated);
            emit_aggregated_price(
                &env,
                aggregated.ask,
                aggregated.bid,
                aggregated.mid,
                aggregated.num_sources,
            );
        }

        extend_instance_ttl(&env);

        Ok(())
    }

    // =========================================================================
    // PRICE QUERIES (PUBLIC)
    // =========================================================================

    /// Get the current aggregated price
    ///
    /// Returns the average price from all active exchanges.
    pub fn get_price(env: Env) -> Result<AggregatedPrice, Error> {
        let price = get_aggregated_price(&env).ok_or(Error::InsufficientSources)?;

        // Check if price is stale
        let current_timestamp = env.ledger().timestamp();
        if current_timestamp - price.timestamp > MAX_PRICE_AGE_SECS {
            return Err(Error::PriceStale);
        }

        Ok(price)
    }

    /// Get price from a specific exchange
    pub fn get_exchange_price(env: Env, exchange: Symbol) -> Result<ExchangePrice, Error> {
        validate_exchange(&env, &exchange)?;
        get_exchange_price(&env, &exchange).ok_or(Error::InsufficientSources)
    }

    /// Get the mid price (average of ask and bid)
    ///
    /// This is the recommended price for BOBT calculations.
    pub fn get_mid_price(env: Env) -> Result<i128, Error> {
        let price = Self::get_price(env)?;
        Ok(price.mid)
    }

    /// Get the ask price (price to buy USDT with BOB)
    pub fn get_ask_price(env: Env) -> Result<i128, Error> {
        let price = Self::get_price(env)?;
        Ok(price.ask)
    }

    /// Get the bid price (price to sell USDT for BOB)
    pub fn get_bid_price(env: Env) -> Result<i128, Error> {
        let price = Self::get_price(env)?;
        Ok(price.bid)
    }

    /// Check if the oracle has valid, non-stale prices
    pub fn is_price_valid(env: Env) -> bool {
        Self::get_price(env).is_ok()
    }

    /// Get the number of active price sources
    pub fn get_num_sources(env: Env) -> u32 {
        if let Ok(price) = Self::get_price(env) {
            price.num_sources
        } else {
            0
        }
    }

    // =========================================================================
    // CONVERSION HELPERS
    // =========================================================================

    /// Convert USDT amount to BOBT amount using current price
    ///
    /// # Arguments
    /// * `usdt_amount` - Amount in USDT (7 decimals)
    ///
    /// # Returns
    /// Amount in BOBT (7 decimals)
    ///
    /// # Example
    /// ```
    /// // 100 USDT at 9.15 BOB/USDT = 915 BOBT
    /// let bobt = oracle.usdt_to_bobt(1_000_000_000); // 100 USDT
    /// // Returns: 9_150_000_000 (915 BOBT)
    /// ```
    pub fn usdt_to_bobt(env: Env, usdt_amount: i128) -> Result<i128, Error> {
        let price = Self::get_price(env)?;
        // Use bid price (what you get when selling USDT)
        // BOBT = USDT * price
        let bobt_amount = (usdt_amount * price.bid) / ONE_UNIT;
        Ok(bobt_amount)
    }

    /// Convert BOBT amount to USDT amount using current price
    ///
    /// # Arguments
    /// * `bobt_amount` - Amount in BOBT (7 decimals)
    ///
    /// # Returns
    /// Amount in USDT (7 decimals)
    pub fn bobt_to_usdt(env: Env, bobt_amount: i128) -> Result<i128, Error> {
        let price = Self::get_price(env)?;
        // Use ask price (what you pay when buying USDT)
        // USDT = BOBT / price
        let usdt_amount = (bobt_amount * ONE_UNIT) / price.ask;
        Ok(usdt_amount)
    }

    // =========================================================================
    // ADMIN FUNCTIONS
    // =========================================================================

    /// Add a new operator
    pub fn add_operator(env: Env, admin: Address, new_operator: Address) -> Result<(), Error> {
        admin.require_auth();
        require_admin(&env, &admin)?;

        let mut operators = get_operators(&env);

        // Check if already exists
        if operators.iter().any(|op| op == new_operator) {
            return Err(Error::OperatorAlreadyExists);
        }

        operators.push_back(new_operator.clone());
        set_operators(&env, &operators);

        emit_operator_added(&env, &new_operator, &admin);
        extend_instance_ttl(&env);

        Ok(())
    }

    /// Remove an operator
    pub fn remove_operator(env: Env, admin: Address, operator: Address) -> Result<(), Error> {
        admin.require_auth();
        require_admin(&env, &admin)?;

        let operators = get_operators(&env);
        let mut new_operators = Vec::new(&env);
        let mut found = false;

        for op in operators.iter() {
            if op != operator {
                new_operators.push_back(op);
            } else {
                found = true;
            }
        }

        if !found {
            return Err(Error::OperatorNotFound);
        }

        set_operators(&env, &new_operators);

        emit_operator_removed(&env, &operator, &admin);
        extend_instance_ttl(&env);

        Ok(())
    }

    /// Get list of operators
    pub fn get_operators(env: Env) -> Vec<Address> {
        get_operators(&env)
    }

    /// Get admin address
    pub fn get_admin(env: Env) -> Result<Address, Error> {
        get_admin(&env).ok_or(Error::NotInitialized)
    }

    /// Check if address is an operator
    pub fn is_operator(env: Env, address: Address) -> bool {
        is_operator(&env, &address)
    }
}

#[cfg(test)]
mod test;
