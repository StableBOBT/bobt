//! Tests for BOBT P2P Price Oracle Contract

#![cfg(test)]

use super::*;
use soroban_sdk::{
    symbol_short,
    testutils::{Address as _, Ledger, LedgerInfo},
    Address, Env,
};

// =============================================================================
// TEST HELPERS
// =============================================================================

fn create_test_env() -> Env {
    let env = Env::default();
    env.mock_all_auths();

    // Set initial ledger
    env.ledger().set(LedgerInfo {
        timestamp: 1_700_000_000,
        protocol_version: 22,
        sequence_number: 100,
        network_id: Default::default(),
        base_reserve: 10,
        min_temp_entry_ttl: 100,
        min_persistent_entry_ttl: 100,
        max_entry_ttl: 10_000_000,
    });

    env
}

fn setup_oracle(env: &Env) -> (Address, Address, Address) {
    let admin = Address::generate(env);
    let operator1 = Address::generate(env);
    let operator2 = Address::generate(env);

    let operators = soroban_sdk::vec![env, operator1.clone(), operator2.clone()];

    let client = PriceOracleClient::new(env, &env.register(PriceOracle, ()));
    client.initialize(&admin, &operators);

    (client.address, admin, operator1)
}

fn get_client<'a>(env: &'a Env, contract_id: &Address) -> PriceOracleClient<'a> {
    PriceOracleClient::new(env, contract_id)
}

// Sample prices from CriptoYa API (converted to 7 decimals)
// Example: 9.18 BOB/USDT = 91_800_000
const BINANCE_ASK: i128 = 91_800_000;  // 9.18
const BINANCE_BID: i128 = 91_500_000;  // 9.15
const BYBIT_ASK: i128 = 92_000_000;    // 9.20
const BYBIT_BID: i128 = 91_500_000;    // 9.15
const BITGET_ASK: i128 = 91_700_000;   // 9.17
const BITGET_BID: i128 = 91_400_000;   // 9.14
const TIMESTAMP: u64 = 1_700_000_000;

// =============================================================================
// INITIALIZATION TESTS
// =============================================================================

#[test]
fn test_initialize() {
    let env = create_test_env();
    let (contract_id, admin, operator) = setup_oracle(&env);
    let client = get_client(&env, &contract_id);

    // Check admin
    assert_eq!(client.get_admin(), admin);

    // Check operators
    let operators = client.get_operators();
    assert_eq!(operators.len(), 2);
    assert!(client.is_operator(&operator));
}

#[test]
#[should_panic(expected = "Error(Contract, #1)")] // AlreadyInitialized
fn test_cannot_initialize_twice() {
    let env = create_test_env();
    let (contract_id, admin, _) = setup_oracle(&env);
    let client = get_client(&env, &contract_id);

    // Try to initialize again
    let operators = soroban_sdk::vec![&env, Address::generate(&env)];
    client.initialize(&admin, &operators);
}

// =============================================================================
// PRICE UPDATE TESTS
// =============================================================================

#[test]
fn test_update_single_price() {
    let env = create_test_env();
    let (contract_id, _, operator) = setup_oracle(&env);
    let client = get_client(&env, &contract_id);

    // Update Binance price
    client.update_price(
        &operator,
        &symbol_short!("BINANCE"),
        &BINANCE_ASK,
        &BINANCE_BID,
        &TIMESTAMP,
    );

    // Check exchange price
    let price = client.get_exchange_price(&symbol_short!("BINANCE"));
    assert_eq!(price.ask, BINANCE_ASK);
    assert_eq!(price.bid, BINANCE_BID);
    assert_eq!(price.timestamp, TIMESTAMP);
}

#[test]
fn test_update_multiple_exchanges() {
    let env = create_test_env();
    let (contract_id, _, operator) = setup_oracle(&env);
    let client = get_client(&env, &contract_id);

    // Update all exchanges
    client.update_price(&operator, &symbol_short!("BINANCE"), &BINANCE_ASK, &BINANCE_BID, &TIMESTAMP);
    client.update_price(&operator, &symbol_short!("BYBIT"), &BYBIT_ASK, &BYBIT_BID, &TIMESTAMP);
    client.update_price(&operator, &symbol_short!("BITGET"), &BITGET_ASK, &BITGET_BID, &TIMESTAMP);

    // Check individual prices
    let binance = client.get_exchange_price(&symbol_short!("BINANCE"));
    let bybit = client.get_exchange_price(&symbol_short!("BYBIT"));
    let bitget = client.get_exchange_price(&symbol_short!("BITGET"));

    assert_eq!(binance.ask, BINANCE_ASK);
    assert_eq!(bybit.ask, BYBIT_ASK);
    assert_eq!(bitget.ask, BITGET_ASK);
}

#[test]
fn test_update_prices_batch() {
    let env = create_test_env();
    let (contract_id, _, operator) = setup_oracle(&env);
    let client = get_client(&env, &contract_id);

    // Batch update all exchanges
    client.update_prices_batch(
        &operator,
        &BINANCE_ASK, &BINANCE_BID,
        &BYBIT_ASK, &BYBIT_BID,
        &BITGET_ASK, &BITGET_BID,
        &TIMESTAMP,
    );

    // Check all prices were updated
    let binance = client.get_exchange_price(&symbol_short!("BINANCE"));
    let bybit = client.get_exchange_price(&symbol_short!("BYBIT"));
    let bitget = client.get_exchange_price(&symbol_short!("BITGET"));

    assert_eq!(binance.ask, BINANCE_ASK);
    assert_eq!(bybit.ask, BYBIT_ASK);
    assert_eq!(bitget.ask, BITGET_ASK);
}

#[test]
#[should_panic(expected = "Error(Contract, #12)")] // NotAnOperator
fn test_unauthorized_price_update() {
    let env = create_test_env();
    let (contract_id, _, _) = setup_oracle(&env);
    let client = get_client(&env, &contract_id);

    let unauthorized = Address::generate(&env);
    client.update_price(
        &unauthorized,
        &symbol_short!("BINANCE"),
        &BINANCE_ASK,
        &BINANCE_BID,
        &TIMESTAMP,
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #25)")] // InvalidExchange
fn test_invalid_exchange() {
    let env = create_test_env();
    let (contract_id, _, operator) = setup_oracle(&env);
    let client = get_client(&env, &contract_id);

    client.update_price(
        &operator,
        &symbol_short!("INVALID"),
        &BINANCE_ASK,
        &BINANCE_BID,
        &TIMESTAMP,
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #21)")] // InvalidPrice
fn test_invalid_price_negative() {
    let env = create_test_env();
    let (contract_id, _, operator) = setup_oracle(&env);
    let client = get_client(&env, &contract_id);

    client.update_price(
        &operator,
        &symbol_short!("BINANCE"),
        &(-100_i128),  // Negative ask
        &BINANCE_BID,
        &TIMESTAMP,
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #21)")] // InvalidPrice
fn test_invalid_price_ask_less_than_bid() {
    let env = create_test_env();
    let (contract_id, _, operator) = setup_oracle(&env);
    let client = get_client(&env, &contract_id);

    client.update_price(
        &operator,
        &symbol_short!("BINANCE"),
        &90_000_000_i128,  // Ask less than bid
        &91_000_000_i128,
        &TIMESTAMP,
    );
}

// =============================================================================
// AGGREGATED PRICE TESTS
// =============================================================================

#[test]
fn test_aggregated_price_two_sources() {
    let env = create_test_env();
    let (contract_id, _, operator) = setup_oracle(&env);
    let client = get_client(&env, &contract_id);

    // Update two exchanges (minimum required)
    client.update_price(&operator, &symbol_short!("BINANCE"), &BINANCE_ASK, &BINANCE_BID, &TIMESTAMP);
    client.update_price(&operator, &symbol_short!("BYBIT"), &BYBIT_ASK, &BYBIT_BID, &TIMESTAMP);

    // Get aggregated price
    let price = client.get_price();

    // Expected average: (91_800_000 + 92_000_000) / 2 = 91_900_000
    assert_eq!(price.ask, 91_900_000);
    // Expected average: (91_500_000 + 91_500_000) / 2 = 91_500_000
    assert_eq!(price.bid, 91_500_000);
    // Mid: (91_900_000 + 91_500_000) / 2 = 91_700_000
    assert_eq!(price.mid, 91_700_000);
    assert_eq!(price.num_sources, 2);
}

#[test]
fn test_aggregated_price_three_sources() {
    let env = create_test_env();
    let (contract_id, _, operator) = setup_oracle(&env);
    let client = get_client(&env, &contract_id);

    // Update all three exchanges
    client.update_price(&operator, &symbol_short!("BINANCE"), &BINANCE_ASK, &BINANCE_BID, &TIMESTAMP);
    client.update_price(&operator, &symbol_short!("BYBIT"), &BYBIT_ASK, &BYBIT_BID, &TIMESTAMP);
    client.update_price(&operator, &symbol_short!("BITGET"), &BITGET_ASK, &BITGET_BID, &TIMESTAMP);

    let price = client.get_price();

    // Expected average ask: (91_800_000 + 92_000_000 + 91_700_000) / 3 = 91_833_333
    assert_eq!(price.ask, 91_833_333);
    // Expected average bid: (91_500_000 + 91_500_000 + 91_400_000) / 3 = 91_466_666
    assert_eq!(price.bid, 91_466_666);
    assert_eq!(price.num_sources, 3);
}

#[test]
#[should_panic(expected = "Error(Contract, #24)")] // InsufficientSources
fn test_aggregated_price_insufficient_sources() {
    let env = create_test_env();
    let (contract_id, _, operator) = setup_oracle(&env);
    let client = get_client(&env, &contract_id);

    // Update only one exchange (need at least 2)
    client.update_price(&operator, &symbol_short!("BINANCE"), &BINANCE_ASK, &BINANCE_BID, &TIMESTAMP);

    // This should fail - not enough sources
    client.get_price();
}

#[test]
fn test_price_staleness() {
    let env = create_test_env();
    let (contract_id, _, operator) = setup_oracle(&env);
    let client = get_client(&env, &contract_id);

    // Update prices
    client.update_price(&operator, &symbol_short!("BINANCE"), &BINANCE_ASK, &BINANCE_BID, &TIMESTAMP);
    client.update_price(&operator, &symbol_short!("BYBIT"), &BYBIT_ASK, &BYBIT_BID, &TIMESTAMP);

    // Price should be valid
    assert!(client.is_price_valid());

    // Advance time by 16 minutes (past MAX_PRICE_AGE_SECS = 900)
    env.ledger().set(LedgerInfo {
        timestamp: TIMESTAMP + 960, // 16 minutes later
        protocol_version: 22,
        sequence_number: 200,
        network_id: Default::default(),
        base_reserve: 10,
        min_temp_entry_ttl: 100,
        min_persistent_entry_ttl: 100,
        max_entry_ttl: 10_000_000,
    });

    // Price should now be stale
    assert!(!client.is_price_valid());
}

// =============================================================================
// HELPER FUNCTION TESTS
// =============================================================================

#[test]
fn test_get_mid_price() {
    let env = create_test_env();
    let (contract_id, _, operator) = setup_oracle(&env);
    let client = get_client(&env, &contract_id);

    client.update_price(&operator, &symbol_short!("BINANCE"), &BINANCE_ASK, &BINANCE_BID, &TIMESTAMP);
    client.update_price(&operator, &symbol_short!("BYBIT"), &BYBIT_ASK, &BYBIT_BID, &TIMESTAMP);

    let mid = client.get_mid_price();
    let price = client.get_price();

    assert_eq!(mid, price.mid);
}

#[test]
fn test_get_ask_and_bid() {
    let env = create_test_env();
    let (contract_id, _, operator) = setup_oracle(&env);
    let client = get_client(&env, &contract_id);

    client.update_price(&operator, &symbol_short!("BINANCE"), &BINANCE_ASK, &BINANCE_BID, &TIMESTAMP);
    client.update_price(&operator, &symbol_short!("BYBIT"), &BYBIT_ASK, &BYBIT_BID, &TIMESTAMP);

    let ask = client.get_ask_price();
    let bid = client.get_bid_price();
    let price = client.get_price();

    assert_eq!(ask, price.ask);
    assert_eq!(bid, price.bid);
}

#[test]
fn test_num_sources() {
    let env = create_test_env();
    let (contract_id, _, operator) = setup_oracle(&env);
    let client = get_client(&env, &contract_id);

    // No sources initially
    assert_eq!(client.get_num_sources(), 0);

    // One source (still 0 because need 2 minimum for valid aggregation)
    client.update_price(&operator, &symbol_short!("BINANCE"), &BINANCE_ASK, &BINANCE_BID, &TIMESTAMP);
    assert_eq!(client.get_num_sources(), 0);

    // Two sources
    client.update_price(&operator, &symbol_short!("BYBIT"), &BYBIT_ASK, &BYBIT_BID, &TIMESTAMP);
    assert_eq!(client.get_num_sources(), 2);

    // Three sources
    client.update_price(&operator, &symbol_short!("BITGET"), &BITGET_ASK, &BITGET_BID, &TIMESTAMP);
    assert_eq!(client.get_num_sources(), 3);
}

// =============================================================================
// CONVERSION TESTS
// =============================================================================

#[test]
fn test_usdt_to_bobt_conversion() {
    let env = create_test_env();
    let (contract_id, _, operator) = setup_oracle(&env);
    let client = get_client(&env, &contract_id);

    // Set up prices
    client.update_price(&operator, &symbol_short!("BINANCE"), &BINANCE_ASK, &BINANCE_BID, &TIMESTAMP);
    client.update_price(&operator, &symbol_short!("BYBIT"), &BYBIT_ASK, &BYBIT_BID, &TIMESTAMP);

    // Convert 100 USDT to BOBT
    // 100 USDT = 100 * 10^7 = 1_000_000_000
    let usdt_amount: i128 = 1_000_000_000; // 100 USDT
    let bobt_amount = client.usdt_to_bobt(&usdt_amount);

    // With bid price of 91_500_000 (9.15 BOB/USDT)
    // 100 USDT * 9.15 = 915 BOBT = 9_150_000_000
    // Calculation: (1_000_000_000 * 91_500_000) / 10_000_000 = 9_150_000_000
    assert_eq!(bobt_amount, 9_150_000_000);
}

#[test]
fn test_bobt_to_usdt_conversion() {
    let env = create_test_env();
    let (contract_id, _, operator) = setup_oracle(&env);
    let client = get_client(&env, &contract_id);

    // Set up prices
    client.update_price(&operator, &symbol_short!("BINANCE"), &BINANCE_ASK, &BINANCE_BID, &TIMESTAMP);
    client.update_price(&operator, &symbol_short!("BYBIT"), &BYBIT_ASK, &BYBIT_BID, &TIMESTAMP);

    // Convert 915 BOBT to USDT
    let bobt_amount: i128 = 9_150_000_000; // 915 BOBT
    let usdt_amount = client.bobt_to_usdt(&bobt_amount);

    // With ask price of 91_900_000 (9.19 BOB/USDT avg)
    // 915 BOBT / 9.19 = ~99.56 USDT
    // Calculation: (9_150_000_000 * 10_000_000) / 91_900_000 = ~995_647_442
    // Allow small rounding difference
    assert!((usdt_amount - 995_647_442).abs() <= 1);
}

#[test]
fn test_conversion_roundtrip() {
    let env = create_test_env();
    let (contract_id, _, operator) = setup_oracle(&env);
    let client = get_client(&env, &contract_id);

    // Use same ask/bid to minimize spread effect
    let price: i128 = 91_500_000; // 9.15
    client.update_price(&operator, &symbol_short!("BINANCE"), &price, &price, &TIMESTAMP);
    client.update_price(&operator, &symbol_short!("BYBIT"), &price, &price, &TIMESTAMP);

    let initial_usdt: i128 = 1_000_000_000; // 100 USDT
    let bobt = client.usdt_to_bobt(&initial_usdt);
    let final_usdt = client.bobt_to_usdt(&bobt);

    // Should be approximately equal (small rounding differences)
    assert!((final_usdt - initial_usdt).abs() < 100); // Less than 0.00001 USDT difference
}

// =============================================================================
// ADMIN TESTS
// =============================================================================

#[test]
fn test_add_operator() {
    let env = create_test_env();
    let (contract_id, admin, _) = setup_oracle(&env);
    let client = get_client(&env, &contract_id);

    let new_operator = Address::generate(&env);

    // Initially not an operator
    assert!(!client.is_operator(&new_operator));

    // Add operator
    client.add_operator(&admin, &new_operator);

    // Now is an operator
    assert!(client.is_operator(&new_operator));

    // Can update prices
    client.update_price(
        &new_operator,
        &symbol_short!("BINANCE"),
        &BINANCE_ASK,
        &BINANCE_BID,
        &TIMESTAMP,
    );
}

#[test]
fn test_remove_operator() {
    let env = create_test_env();
    let (contract_id, admin, operator) = setup_oracle(&env);
    let client = get_client(&env, &contract_id);

    // Operator exists
    assert!(client.is_operator(&operator));

    // Remove operator
    client.remove_operator(&admin, &operator);

    // No longer an operator
    assert!(!client.is_operator(&operator));
}

#[test]
#[should_panic(expected = "Error(Contract, #11)")] // Unauthorized
fn test_add_operator_unauthorized() {
    let env = create_test_env();
    let (contract_id, _, operator) = setup_oracle(&env);
    let client = get_client(&env, &contract_id);

    let new_operator = Address::generate(&env);

    // Try to add operator as non-admin
    client.add_operator(&operator, &new_operator);
}

#[test]
#[should_panic(expected = "Error(Contract, #32)")] // OperatorAlreadyExists
fn test_add_duplicate_operator() {
    let env = create_test_env();
    let (contract_id, admin, operator) = setup_oracle(&env);
    let client = get_client(&env, &contract_id);

    // Try to add existing operator
    client.add_operator(&admin, &operator);
}

#[test]
#[should_panic(expected = "Error(Contract, #33)")] // OperatorNotFound
fn test_remove_nonexistent_operator() {
    let env = create_test_env();
    let (contract_id, admin, _) = setup_oracle(&env);
    let client = get_client(&env, &contract_id);

    let nonexistent = Address::generate(&env);
    client.remove_operator(&admin, &nonexistent);
}

#[test]
fn test_admin_can_update_prices() {
    let env = create_test_env();
    let (contract_id, admin, _) = setup_oracle(&env);
    let client = get_client(&env, &contract_id);

    // Admin should also be able to update prices (treated as operator)
    client.update_price(
        &admin,
        &symbol_short!("BINANCE"),
        &BINANCE_ASK,
        &BINANCE_BID,
        &TIMESTAMP,
    );

    let price = client.get_exchange_price(&symbol_short!("BINANCE"));
    assert_eq!(price.ask, BINANCE_ASK);
}

// =============================================================================
// PRICE DEVIATION TESTS
// =============================================================================

#[test]
fn test_price_deviation_within_limit() {
    let env = create_test_env();
    let (contract_id, _, operator) = setup_oracle(&env);
    let client = get_client(&env, &contract_id);

    // First, establish a base price
    client.update_price(&operator, &symbol_short!("BINANCE"), &BINANCE_ASK, &BINANCE_BID, &TIMESTAMP);
    client.update_price(&operator, &symbol_short!("BYBIT"), &BYBIT_ASK, &BYBIT_BID, &TIMESTAMP);

    // Update with price within 10% deviation
    let new_ask = BINANCE_ASK + (BINANCE_ASK / 20); // +5%
    let new_bid = BINANCE_BID + (BINANCE_BID / 20); // +5%

    // This should succeed
    client.update_price(&operator, &symbol_short!("BINANCE"), &new_ask, &new_bid, &TIMESTAMP);
}

#[test]
#[should_panic(expected = "Error(Contract, #23)")] // PriceDeviationTooHigh
fn test_price_deviation_exceeds_limit() {
    let env = create_test_env();
    let (contract_id, _, operator) = setup_oracle(&env);
    let client = get_client(&env, &contract_id);

    // First, establish a base price
    client.update_price(&operator, &symbol_short!("BINANCE"), &BINANCE_ASK, &BINANCE_BID, &TIMESTAMP);
    client.update_price(&operator, &symbol_short!("BYBIT"), &BYBIT_ASK, &BYBIT_BID, &TIMESTAMP);

    // Try to update with price >10% deviation
    let new_ask = BINANCE_ASK + (BINANCE_ASK / 5); // +20%
    let new_bid = BINANCE_BID;

    // This should fail
    client.update_price(&operator, &symbol_short!("BITGET"), &new_ask, &new_bid, &TIMESTAMP);
}

// =============================================================================
// SPREAD CALCULATION TESTS
// =============================================================================

#[test]
fn test_spread_calculation() {
    let env = create_test_env();
    let (contract_id, _, operator) = setup_oracle(&env);
    let client = get_client(&env, &contract_id);

    // Set prices with known spread
    // Ask: 92_000_000 (9.20), Bid: 91_000_000 (9.10)
    // Spread = (9.20 - 9.10) / ((9.20 + 9.10) / 2) * 10000
    // Spread = 0.10 / 9.15 * 10000 = ~109 bps
    let ask: i128 = 92_000_000;
    let bid: i128 = 91_000_000;

    client.update_price(&operator, &symbol_short!("BINANCE"), &ask, &bid, &TIMESTAMP);
    client.update_price(&operator, &symbol_short!("BYBIT"), &ask, &bid, &TIMESTAMP);

    let price = client.get_price();

    // Mid = (92_000_000 + 91_000_000) / 2 = 91_500_000
    assert_eq!(price.mid, 91_500_000);

    // Spread = (92_000_000 - 91_000_000) * 10000 / 91_500_000 = 109 bps
    assert_eq!(price.spread_bps, 109);
}

// =============================================================================
// EDGE CASE TESTS
// =============================================================================

#[test]
fn test_batch_update_partial() {
    let env = create_test_env();
    let (contract_id, _, operator) = setup_oracle(&env);
    let client = get_client(&env, &contract_id);

    // Batch update with some zeros (should skip those)
    client.update_prices_batch(
        &operator,
        &BINANCE_ASK, &BINANCE_BID,
        &0, &0,  // Skip Bybit
        &BITGET_ASK, &BITGET_BID,
        &TIMESTAMP,
    );

    // Binance and Bitget should be updated
    let binance = client.get_exchange_price(&symbol_short!("BINANCE"));
    let bitget = client.get_exchange_price(&symbol_short!("BITGET"));

    assert_eq!(binance.ask, BINANCE_ASK);
    assert_eq!(bitget.ask, BITGET_ASK);

    // Aggregated price should work with 2 sources
    let price = client.get_price();
    assert_eq!(price.num_sources, 2);
}

#[test]
fn test_stale_source_excluded_from_aggregation() {
    let env = create_test_env();
    let (contract_id, _, operator) = setup_oracle(&env);
    let client = get_client(&env, &contract_id);

    // Update all prices
    client.update_price(&operator, &symbol_short!("BINANCE"), &BINANCE_ASK, &BINANCE_BID, &TIMESTAMP);
    client.update_price(&operator, &symbol_short!("BYBIT"), &BYBIT_ASK, &BYBIT_BID, &TIMESTAMP);
    client.update_price(&operator, &symbol_short!("BITGET"), &BITGET_ASK, &BITGET_BID, &TIMESTAMP);

    // Advance time so old prices become stale (MAX_PRICE_AGE_SECS = 900)
    let new_timestamp = TIMESTAMP + 1000; // 16+ minutes later (past 15 min threshold)
    env.ledger().set(LedgerInfo {
        timestamp: new_timestamp,
        protocol_version: 22,
        sequence_number: 200,
        network_id: Default::default(),
        base_reserve: 10,
        min_temp_entry_ttl: 100,
        min_persistent_entry_ttl: 100,
        max_entry_ttl: 10_000_000,
    });

    // Update only two exchanges with new timestamp
    client.update_price(&operator, &symbol_short!("BINANCE"), &BINANCE_ASK, &BINANCE_BID, &new_timestamp);
    client.update_price(&operator, &symbol_short!("BYBIT"), &BYBIT_ASK, &BYBIT_BID, &new_timestamp);

    // Bitget should be excluded (stale) - only 2 sources
    let price = client.get_price();
    assert_eq!(price.num_sources, 2);
}
