#![cfg(test)]

//! Treasury Contract Tests
//!
//! Tests for multi-sig proposals, rate limiting, token integration,
//! and Oracle integration for P2P price feeds.

use crate::{Treasury, ProposalStatus, ProposalType};
use soroban_sdk::{
    symbol_short,
    testutils::{Address as _, Ledger, LedgerInfo},
    vec, Address, Env, String,
};

// Import BOBT token for integration tests
use bobt_token::BOBTToken;

mod token_client {
    soroban_sdk::contractimport!(
        file = "../../target/wasm32v1-none/release/bobt_token.wasm"
    );
}

mod oracle_client {
    soroban_sdk::contractimport!(
        file = "../../target/wasm32v1-none/release/oracle.wasm"
    );
}

use token_client::Client as BOBTTokenClient;
use oracle_client::Client as OracleClient;

// =============================================================================
// TEST HELPERS
// =============================================================================

fn setup() -> (Env, Address, Address, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();

    // Deploy BOBT token
    let token_id = env.register(BOBTToken, ());
    let token_client = BOBTTokenClient::new(&env, &token_id);

    // Deploy Treasury
    let treasury_id = env.register(Treasury, ());
    let treasury_client = crate::TreasuryClient::new(&env, &treasury_id);

    // Create signers
    let signer1 = Address::generate(&env);
    let signer2 = Address::generate(&env);
    let signer3 = Address::generate(&env);

    // Initialize token with treasury as owner (so treasury can grant itself minter role)
    token_client.initialize(&treasury_id);

    // Initialize treasury with 2-of-3 multi-sig
    let signers = vec![&env, signer1.clone(), signer2.clone(), signer3.clone()];
    treasury_client.initialize(&token_id, &signers, &2);

    (env, treasury_id, signer1, signer2, signer3)
}

fn setup_with_minter_role() -> (Env, Address, Address, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();

    // Deploy BOBT token
    let token_id = env.register(BOBTToken, ());
    let token_client = BOBTTokenClient::new(&env, &token_id);

    // Deploy Treasury
    let treasury_id = env.register(Treasury, ());
    let treasury_client = crate::TreasuryClient::new(&env, &treasury_id);

    // Create owner for token (separate from treasury)
    let token_owner = Address::generate(&env);

    // Create signers
    let signer1 = Address::generate(&env);
    let signer2 = Address::generate(&env);

    // Initialize token with token_owner
    token_client.initialize(&token_owner);

    // Grant MINTER role to treasury
    token_client.grant_role(&token_owner, &soroban_sdk::symbol_short!("minter"), &treasury_id);

    // Grant PAUSER role to treasury
    token_client.grant_role(&token_owner, &soroban_sdk::symbol_short!("pauser"), &treasury_id);

    // Grant BLACKLISTER role to treasury
    token_client.grant_role(&token_owner, &soroban_sdk::symbol_short!("blklst"), &treasury_id);

    // Initialize treasury with 2-of-2 multi-sig
    let signers = vec![&env, signer1.clone(), signer2.clone()];
    treasury_client.initialize(&token_id, &signers, &2);

    (env, treasury_id, token_id, signer1, signer2)
}

// =============================================================================
// INITIALIZATION TESTS
// =============================================================================

#[test]
fn test_initialize() {
    let (env, treasury_id, signer1, signer2, signer3) = setup();
    let client = crate::TreasuryClient::new(&env, &treasury_id);

    let signers = client.get_signers();
    assert_eq!(signers.len(), 3);
    assert_eq!(client.get_threshold(), 2);
    assert!(client.is_signer(&signer1));
    assert!(client.is_signer(&signer2));
    assert!(client.is_signer(&signer3));
}

#[test]
#[should_panic(expected = "Error(Contract, #1)")]
fn test_cannot_initialize_twice() {
    let (env, treasury_id, signer1, _, _) = setup();
    let client = crate::TreasuryClient::new(&env, &treasury_id);

    // Try to initialize again
    let token_id = Address::generate(&env);
    let signers = vec![&env, signer1];
    client.initialize(&token_id, &signers, &1);
}

// =============================================================================
// PROPOSAL CREATION TESTS
// =============================================================================

#[test]
fn test_propose_mint() {
    let (env, treasury_id, signer1, _, _) = setup();
    let client = crate::TreasuryClient::new(&env, &treasury_id);

    let recipient = Address::generate(&env);
    let request_id = String::from_str(&env, "MINT001");

    let proposal_id = client.propose_mint(&signer1, &recipient, &1000_0000000, &request_id);

    assert_eq!(proposal_id, 1);

    let proposal = client.get_proposal(&proposal_id);
    assert_eq!(proposal.proposal_type, ProposalType::Mint);
    assert_eq!(proposal.target, recipient);
    assert_eq!(proposal.amount, 1000_0000000);
    assert_eq!(proposal.approval_count, 1); // Proposer auto-approves
    assert_eq!(proposal.status, ProposalStatus::Pending);
}

#[test]
fn test_propose_add_signer() {
    let (env, treasury_id, signer1, _, _) = setup();
    let client = crate::TreasuryClient::new(&env, &treasury_id);

    let new_signer = Address::generate(&env);

    let proposal_id = client.propose_add_signer(&signer1, &new_signer);

    let proposal = client.get_proposal(&proposal_id);
    assert_eq!(proposal.proposal_type, ProposalType::AddSigner);
    assert_eq!(proposal.target, new_signer);
}

#[test]
#[should_panic(expected = "Error(Contract, #11)")]
fn test_non_signer_cannot_propose() {
    let (env, treasury_id, _, _, _) = setup();
    let client = crate::TreasuryClient::new(&env, &treasury_id);

    let attacker = Address::generate(&env);
    let recipient = Address::generate(&env);
    let request_id = String::from_str(&env, "ATTACK");

    client.propose_mint(&attacker, &recipient, &1000_0000000, &request_id);
}

// =============================================================================
// APPROVAL TESTS
// =============================================================================

#[test]
fn test_approve_proposal() {
    let (env, treasury_id, signer1, signer2, _) = setup();
    let client = crate::TreasuryClient::new(&env, &treasury_id);

    let recipient = Address::generate(&env);
    let request_id = String::from_str(&env, "MINT002");

    // Signer1 proposes (auto-approves)
    let proposal_id = client.propose_mint(&signer1, &recipient, &1000_0000000, &request_id);

    // Check initial state
    let proposal = client.get_proposal(&proposal_id);
    assert_eq!(proposal.approval_count, 1);

    // Signer2 approves
    client.approve(&signer2, &proposal_id);

    // Check updated state
    let proposal = client.get_proposal(&proposal_id);
    assert_eq!(proposal.approval_count, 2);
}

#[test]
#[should_panic(expected = "Error(Contract, #12)")]
fn test_cannot_approve_twice() {
    let (env, treasury_id, signer1, _, _) = setup();
    let client = crate::TreasuryClient::new(&env, &treasury_id);

    let recipient = Address::generate(&env);
    let request_id = String::from_str(&env, "MINT003");

    let proposal_id = client.propose_mint(&signer1, &recipient, &1000_0000000, &request_id);

    // Signer1 tries to approve again (already approved as proposer)
    client.approve(&signer1, &proposal_id);
}

// =============================================================================
// EXECUTION TESTS
// =============================================================================

#[test]
fn test_execute_mint_proposal() {
    let (env, treasury_id, token_id, signer1, signer2) = setup_with_minter_role();
    let treasury_client = crate::TreasuryClient::new(&env, &treasury_id);
    let token_client = BOBTTokenClient::new(&env, &token_id);

    let recipient = Address::generate(&env);
    let request_id = String::from_str(&env, "MINT_EXEC");

    // Create and approve proposal
    let proposal_id = treasury_client.propose_mint(&signer1, &recipient, &1000_0000000, &request_id);
    treasury_client.approve(&signer2, &proposal_id);

    // Check can execute
    assert!(treasury_client.can_execute(&proposal_id));

    // Execute
    treasury_client.execute(&signer1, &proposal_id);

    // Verify tokens minted
    assert_eq!(token_client.balance(&recipient), 1000_0000000);

    // Verify proposal status
    let proposal = treasury_client.get_proposal(&proposal_id);
    assert_eq!(proposal.status, ProposalStatus::Executed);
}

#[test]
fn test_execute_add_signer() {
    let (env, treasury_id, signer1, signer2, _) = setup();
    let client = crate::TreasuryClient::new(&env, &treasury_id);

    let new_signer = Address::generate(&env);

    // Initially not a signer
    assert!(!client.is_signer(&new_signer));

    // Create and approve proposal
    let proposal_id = client.propose_add_signer(&signer1, &new_signer);
    client.approve(&signer2, &proposal_id);

    // Execute
    client.execute(&signer1, &proposal_id);

    // Verify new signer added
    assert!(client.is_signer(&new_signer));
    assert_eq!(client.get_signers().len(), 4);
}

#[test]
fn test_execute_remove_signer() {
    let (env, treasury_id, signer1, signer2, signer3) = setup();
    let client = crate::TreasuryClient::new(&env, &treasury_id);

    // Create proposal to remove signer3
    let proposal_id = client.propose_remove_signer(&signer1, &signer3);
    client.approve(&signer2, &proposal_id);

    // Execute
    client.execute(&signer1, &proposal_id);

    // Verify signer removed
    assert!(!client.is_signer(&signer3));
    assert_eq!(client.get_signers().len(), 2);
}

#[test]
#[should_panic(expected = "Error(Contract, #13)")]
fn test_cannot_execute_without_enough_approvals() {
    let (env, treasury_id, signer1, _, _) = setup();
    let client = crate::TreasuryClient::new(&env, &treasury_id);

    let recipient = Address::generate(&env);
    let request_id = String::from_str(&env, "MINT_FAIL");

    // Only proposer approved (1 of 2 required)
    let proposal_id = client.propose_mint(&signer1, &recipient, &1000_0000000, &request_id);

    // Try to execute - should fail
    client.execute(&signer1, &proposal_id);
}

// =============================================================================
// CANCELLATION TESTS
// =============================================================================

#[test]
fn test_cancel_proposal() {
    let (env, treasury_id, signer1, _, _) = setup();
    let client = crate::TreasuryClient::new(&env, &treasury_id);

    let recipient = Address::generate(&env);
    let request_id = String::from_str(&env, "CANCEL_ME");

    let proposal_id = client.propose_mint(&signer1, &recipient, &1000_0000000, &request_id);

    // Cancel
    client.cancel(&signer1, &proposal_id);

    // Verify cancelled
    let proposal = client.get_proposal(&proposal_id);
    assert_eq!(proposal.status, ProposalStatus::Cancelled);
}

#[test]
#[should_panic(expected = "Error(Contract, #14)")]
fn test_only_proposer_can_cancel() {
    let (env, treasury_id, signer1, signer2, _) = setup();
    let client = crate::TreasuryClient::new(&env, &treasury_id);

    let recipient = Address::generate(&env);
    let request_id = String::from_str(&env, "NO_CANCEL");

    let proposal_id = client.propose_mint(&signer1, &recipient, &1000_0000000, &request_id);

    // Signer2 tries to cancel - should fail
    client.cancel(&signer2, &proposal_id);
}

// =============================================================================
// RATE LIMITING TESTS
// =============================================================================

#[test]
fn test_rate_limit_tracking() {
    let (env, treasury_id, token_id, signer1, signer2) = setup_with_minter_role();
    let treasury_client = crate::TreasuryClient::new(&env, &treasury_id);

    let recipient = Address::generate(&env);

    // Check initial capacity (10 million BOBT default)
    let initial_capacity = treasury_client.remaining_mint_capacity();
    assert_eq!(initial_capacity, 10_000_000 * 10_000_000); // 10M * 10^7 stroops

    // Mint 1 million
    let request_id = String::from_str(&env, "RATE_TEST");
    let proposal_id = treasury_client.propose_mint(&signer1, &recipient, &1_000_000_0000000, &request_id);
    treasury_client.approve(&signer2, &proposal_id);
    treasury_client.execute(&signer1, &proposal_id);

    // Check remaining capacity
    let remaining = treasury_client.remaining_mint_capacity();
    assert_eq!(remaining, 9_000_000 * 10_000_000); // 9M remaining
}

#[test]
#[should_panic(expected = "Error(Contract, #33)")]
fn test_single_operation_limit() {
    let (env, treasury_id, _, signer1, signer2) = setup_with_minter_role();
    let treasury_client = crate::TreasuryClient::new(&env, &treasury_id);

    let recipient = Address::generate(&env);

    // Try to mint more than single op limit (1 million default)
    let request_id = String::from_str(&env, "TOO_BIG");
    let proposal_id = treasury_client.propose_mint(&signer1, &recipient, &2_000_000_0000000, &request_id);
    treasury_client.approve(&signer2, &proposal_id);
    treasury_client.execute(&signer1, &proposal_id);
}

// =============================================================================
// THRESHOLD UPDATE TESTS
// =============================================================================

#[test]
fn test_update_threshold() {
    let (env, treasury_id, signer1, signer2, _) = setup();
    let client = crate::TreasuryClient::new(&env, &treasury_id);

    // Initial threshold is 2
    assert_eq!(client.get_threshold(), 2);

    // Propose changing to 3
    let proposal_id = client.propose_update_threshold(&signer1, &3);
    client.approve(&signer2, &proposal_id);
    client.execute(&signer1, &proposal_id);

    // Verify new threshold
    assert_eq!(client.get_threshold(), 3);
}

// =============================================================================
// QUERY TESTS
// =============================================================================

#[test]
fn test_get_config() {
    let (env, treasury_id, _, _, _) = setup();
    let client = crate::TreasuryClient::new(&env, &treasury_id);

    let config = client.get_config();

    assert_eq!(config.threshold, 2);
    assert_eq!(config.daily_mint_limit, 10_000_000 * 10_000_000);
    assert_eq!(config.daily_burn_limit, 10_000_000 * 10_000_000);
    assert_eq!(config.single_op_limit, 1_000_000 * 10_000_000);
}

// =============================================================================
// ORACLE INTEGRATION TESTS
// =============================================================================

// Sample prices from CriptoYa API (converted to 7 decimals)
// Example: 9.18 BOB/USDT = 91_800_000
const BINANCE_ASK: i128 = 91_800_000;  // 9.18
const BINANCE_BID: i128 = 91_500_000;  // 9.15
const BYBIT_ASK: i128 = 92_000_000;    // 9.20
const BYBIT_BID: i128 = 91_500_000;    // 9.15
const TIMESTAMP: u64 = 1_700_000_000;

/// Setup Treasury with Oracle integration
fn setup_with_oracle() -> (Env, Address, Address, Address, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();

    // Set ledger timestamp
    env.ledger().set(LedgerInfo {
        timestamp: TIMESTAMP,
        protocol_version: 22,
        sequence_number: 100,
        network_id: Default::default(),
        base_reserve: 10,
        min_temp_entry_ttl: 100,
        min_persistent_entry_ttl: 100,
        max_entry_ttl: 10_000_000,
    });

    // Deploy BOBT token
    let token_id = env.register(BOBTToken, ());
    let token_client = BOBTTokenClient::new(&env, &token_id);

    // Deploy Oracle using WASM bytes
    let oracle_id = env.register(oracle_client::WASM, ());
    let oracle_client = OracleClient::new(&env, &oracle_id);

    // Deploy Treasury
    let treasury_id = env.register(Treasury, ());
    let treasury_client = crate::TreasuryClient::new(&env, &treasury_id);

    // Create owner for token
    let token_owner = Address::generate(&env);

    // Create signers
    let signer1 = Address::generate(&env);
    let signer2 = Address::generate(&env);

    // Create oracle operator
    let oracle_operator = Address::generate(&env);

    // Initialize token
    token_client.initialize(&token_owner);

    // Grant MINTER role to treasury
    token_client.grant_role(&token_owner, &symbol_short!("minter"), &treasury_id);

    // Initialize Oracle with operator
    let operators = vec![&env, oracle_operator.clone()];
    oracle_client.initialize(&token_owner, &operators);

    // Set up Oracle prices (need at least 2 sources)
    oracle_client.update_price(
        &oracle_operator,
        &symbol_short!("BINANCE"),
        &BINANCE_ASK,
        &BINANCE_BID,
        &TIMESTAMP,
    );
    oracle_client.update_price(
        &oracle_operator,
        &symbol_short!("BYBIT"),
        &BYBIT_ASK,
        &BYBIT_BID,
        &TIMESTAMP,
    );

    // Initialize treasury with 2-of-2 multi-sig
    let signers = vec![&env, signer1.clone(), signer2.clone()];
    treasury_client.initialize(&token_id, &signers, &2);

    (env, treasury_id, token_id, oracle_id, signer1, signer2)
}

#[test]
fn test_propose_set_oracle() {
    let (env, treasury_id, _token_id, oracle_id, signer1, signer2) = setup_with_oracle();
    let treasury_client = crate::TreasuryClient::new(&env, &treasury_id);

    // Initially Oracle is not configured
    assert!(!treasury_client.is_oracle_valid());

    // Propose setting Oracle
    let proposal_id = treasury_client.propose_set_oracle(&signer1, &oracle_id);

    // Check proposal type
    let proposal = treasury_client.get_proposal(&proposal_id);
    assert_eq!(proposal.proposal_type, ProposalType::SetOracle);
    assert_eq!(proposal.target, oracle_id);

    // Approve and execute
    treasury_client.approve(&signer2, &proposal_id);
    treasury_client.execute(&signer1, &proposal_id);

    // Verify Oracle is now configured
    let configured_oracle = treasury_client.get_oracle();
    assert_eq!(configured_oracle, oracle_id);

    // Oracle should now be valid
    assert!(treasury_client.is_oracle_valid());
}

#[test]
fn test_get_current_price() {
    let (env, treasury_id, _token_id, oracle_id, signer1, signer2) = setup_with_oracle();
    let treasury_client = crate::TreasuryClient::new(&env, &treasury_id);

    // Set Oracle first
    let proposal_id = treasury_client.propose_set_oracle(&signer1, &oracle_id);
    treasury_client.approve(&signer2, &proposal_id);
    treasury_client.execute(&signer1, &proposal_id);

    // Get current price (mid price)
    let price = treasury_client.get_current_price();

    // Expected mid: ((91_800_000 + 92_000_000) / 2 + (91_500_000 + 91_500_000) / 2) / 2
    // = (91_900_000 + 91_500_000) / 2 = 91_700_000
    assert_eq!(price, 91_700_000);
}

#[test]
fn test_estimate_bobt_for_usdt() {
    let (env, treasury_id, _token_id, oracle_id, signer1, signer2) = setup_with_oracle();
    let treasury_client = crate::TreasuryClient::new(&env, &treasury_id);

    // Set Oracle
    let proposal_id = treasury_client.propose_set_oracle(&signer1, &oracle_id);
    treasury_client.approve(&signer2, &proposal_id);
    treasury_client.execute(&signer1, &proposal_id);

    // Estimate BOBT for 100 USDT
    let usdt_amount: i128 = 1_000_000_000; // 100 USDT (7 decimals)
    let estimated_bobt = treasury_client.estimate_bobt_for_usdt(&usdt_amount);

    // With bid price avg of 91_500_000 (9.15 BOB/USDT)
    // 100 USDT * 9.15 = 915 BOBT = 9_150_000_000
    assert_eq!(estimated_bobt, 9_150_000_000);
}

#[test]
fn test_estimate_usdt_for_bobt() {
    let (env, treasury_id, _token_id, oracle_id, signer1, signer2) = setup_with_oracle();
    let treasury_client = crate::TreasuryClient::new(&env, &treasury_id);

    // Set Oracle
    let proposal_id = treasury_client.propose_set_oracle(&signer1, &oracle_id);
    treasury_client.approve(&signer2, &proposal_id);
    treasury_client.execute(&signer1, &proposal_id);

    // Estimate USDT for 915 BOBT
    let bobt_amount: i128 = 9_150_000_000; // 915 BOBT
    let estimated_usdt = treasury_client.estimate_usdt_for_bobt(&bobt_amount);

    // With ask price avg of 91_900_000 (9.19 BOB/USDT)
    // 915 BOBT / 9.19 = ~99.56 USDT
    // Allow small rounding difference
    assert!((estimated_usdt - 995_647_442).abs() <= 1);
}

#[test]
fn test_propose_mint_from_usdt() {
    let (env, treasury_id, token_id, oracle_id, signer1, signer2) = setup_with_oracle();
    let treasury_client = crate::TreasuryClient::new(&env, &treasury_id);
    let token_client = BOBTTokenClient::new(&env, &token_id);

    // Set Oracle first
    let oracle_proposal = treasury_client.propose_set_oracle(&signer1, &oracle_id);
    treasury_client.approve(&signer2, &oracle_proposal);
    treasury_client.execute(&signer1, &oracle_proposal);

    // Create recipient
    let recipient = Address::generate(&env);

    // Propose mint from 100 USDT
    let usdt_amount: i128 = 1_000_000_000; // 100 USDT
    let external_ref = String::from_str(&env, "USDT_DEPOSIT_001");

    let proposal_id = treasury_client.propose_mint_from_usdt(
        &signer1,
        &recipient,
        &usdt_amount,
        &external_ref,
    );

    // Check proposal
    let proposal = treasury_client.get_proposal(&proposal_id);
    assert_eq!(proposal.proposal_type, ProposalType::MintFromUsdt);
    assert_eq!(proposal.target, recipient);
    assert_eq!(proposal.usdt_amount, usdt_amount);
    // BOBT amount calculated at proposal time
    assert_eq!(proposal.amount, 9_150_000_000); // 915 BOBT

    // Approve and execute
    treasury_client.approve(&signer2, &proposal_id);
    treasury_client.execute(&signer1, &proposal_id);

    // Verify tokens minted (recalculated at execution time)
    let balance = token_client.balance(&recipient);
    assert_eq!(balance, 9_150_000_000); // 915 BOBT

    // Verify proposal executed
    let proposal = treasury_client.get_proposal(&proposal_id);
    assert_eq!(proposal.status, ProposalStatus::Executed);
}

#[test]
fn test_mint_from_usdt_large_amount() {
    let (env, treasury_id, token_id, oracle_id, signer1, signer2) = setup_with_oracle();
    let treasury_client = crate::TreasuryClient::new(&env, &treasury_id);
    let token_client = BOBTTokenClient::new(&env, &token_id);

    // Set Oracle
    let oracle_proposal = treasury_client.propose_set_oracle(&signer1, &oracle_id);
    treasury_client.approve(&signer2, &oracle_proposal);
    treasury_client.execute(&signer1, &oracle_proposal);

    let recipient = Address::generate(&env);

    // Deposit 10,000 USDT (close to single op limit when converted)
    // 10,000 USDT * 9.15 = 91,500 BOBT (under 1M limit)
    let usdt_amount: i128 = 100_000_000_000; // 10,000 USDT
    let external_ref = String::from_str(&env, "LARGE_DEPOSIT");

    let proposal_id = treasury_client.propose_mint_from_usdt(
        &signer1,
        &recipient,
        &usdt_amount,
        &external_ref,
    );

    treasury_client.approve(&signer2, &proposal_id);
    treasury_client.execute(&signer1, &proposal_id);

    // 10,000 * 9.15 = 91,500 BOBT
    let balance = token_client.balance(&recipient);
    assert_eq!(balance, 915_000_000_000); // 91,500 BOBT
}

#[test]
#[should_panic(expected = "Error(Contract, #51)")] // OracleNotConfigured
fn test_propose_mint_from_usdt_without_oracle() {
    let (env, treasury_id, _token_id, _oracle_id, signer1, _signer2) = setup_with_oracle();
    let treasury_client = crate::TreasuryClient::new(&env, &treasury_id);

    let recipient = Address::generate(&env);
    let external_ref = String::from_str(&env, "NO_ORACLE");

    // Try to propose without Oracle configured - should fail
    treasury_client.propose_mint_from_usdt(
        &signer1,
        &recipient,
        &1_000_000_000,
        &external_ref,
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #53)")] // InvalidUsdtAmount
fn test_propose_mint_from_usdt_zero_amount() {
    let (env, treasury_id, _token_id, oracle_id, signer1, signer2) = setup_with_oracle();
    let treasury_client = crate::TreasuryClient::new(&env, &treasury_id);

    // Set Oracle
    let oracle_proposal = treasury_client.propose_set_oracle(&signer1, &oracle_id);
    treasury_client.approve(&signer2, &oracle_proposal);
    treasury_client.execute(&signer1, &oracle_proposal);

    let recipient = Address::generate(&env);
    let external_ref = String::from_str(&env, "ZERO_USDT");

    // Try with zero amount - should fail
    treasury_client.propose_mint_from_usdt(
        &signer1,
        &recipient,
        &0,
        &external_ref,
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #51)")] // OracleNotConfigured
fn test_get_oracle_not_configured() {
    let (env, treasury_id, _, _, _, _) = setup_with_oracle();
    let treasury_client = crate::TreasuryClient::new(&env, &treasury_id);

    // Try to get Oracle when not configured - should fail
    treasury_client.get_oracle();
}

#[test]
#[should_panic(expected = "Error(Contract, #51)")] // OracleNotConfigured
fn test_get_current_price_without_oracle() {
    let (env, treasury_id, _, _, _, _) = setup_with_oracle();
    let treasury_client = crate::TreasuryClient::new(&env, &treasury_id);

    // Try to get price when Oracle not configured - should fail
    treasury_client.get_current_price();
}

#[test]
fn test_is_oracle_valid_without_oracle() {
    let (env, treasury_id, _, _, _, _) = setup_with_oracle();
    let treasury_client = crate::TreasuryClient::new(&env, &treasury_id);

    // Should return false, not panic
    assert!(!treasury_client.is_oracle_valid());
}

#[test]
fn test_oracle_validity_with_stale_prices() {
    let (env, treasury_id, _token_id, oracle_id, signer1, signer2) = setup_with_oracle();
    let treasury_client = crate::TreasuryClient::new(&env, &treasury_id);

    // Set Oracle
    let oracle_proposal = treasury_client.propose_set_oracle(&signer1, &oracle_id);
    treasury_client.approve(&signer2, &oracle_proposal);
    treasury_client.execute(&signer1, &oracle_proposal);

    // Oracle should be valid now
    assert!(treasury_client.is_oracle_valid());

    // Advance time past staleness threshold (15 minutes = 900 seconds)
    env.ledger().set(LedgerInfo {
        timestamp: TIMESTAMP + 1000, // 16+ minutes later
        protocol_version: 22,
        sequence_number: 200,
        network_id: Default::default(),
        base_reserve: 10,
        min_temp_entry_ttl: 100,
        min_persistent_entry_ttl: 100,
        max_entry_ttl: 10_000_000,
    });

    // Oracle should now be invalid (stale prices)
    assert!(!treasury_client.is_oracle_valid());
}

#[test]
fn test_full_usdt_deposit_flow() {
    let (env, treasury_id, token_id, oracle_id, signer1, signer2) = setup_with_oracle();
    let treasury_client = crate::TreasuryClient::new(&env, &treasury_id);
    let token_client = BOBTTokenClient::new(&env, &token_id);

    // Step 1: Configure Oracle
    let oracle_proposal = treasury_client.propose_set_oracle(&signer1, &oracle_id);
    treasury_client.approve(&signer2, &oracle_proposal);
    treasury_client.execute(&signer1, &oracle_proposal);

    // Step 2: Verify Oracle is working
    assert!(treasury_client.is_oracle_valid());
    let current_price = treasury_client.get_current_price();
    assert!(current_price > 0);

    // Step 3: Check estimate before deposit
    let usdt_amount: i128 = 5_000_000_000; // 500 USDT
    let estimated_bobt = treasury_client.estimate_bobt_for_usdt(&usdt_amount);
    // 500 USDT * 9.15 = 4,575 BOBT
    assert_eq!(estimated_bobt, 45_750_000_000);

    // Step 4: User makes USDT deposit (off-chain)
    // Treasury receives confirmation and creates proposal

    let user = Address::generate(&env);
    let bank_ref = String::from_str(&env, "BANK_TX_12345");

    let mint_proposal = treasury_client.propose_mint_from_usdt(
        &signer1,
        &user,
        &usdt_amount,
        &bank_ref,
    );

    // Step 5: Second signer approves
    treasury_client.approve(&signer2, &mint_proposal);

    // Step 6: Execute mint
    treasury_client.execute(&signer1, &mint_proposal);

    // Step 7: Verify user received BOBT
    let user_balance = token_client.balance(&user);
    assert_eq!(user_balance, 45_750_000_000); // 4,575 BOBT

    // Step 8: Check rate limits were updated
    let remaining = treasury_client.remaining_mint_capacity();
    // 10M - 4,575 = 9,995,425 BOBT remaining
    let expected_remaining = (10_000_000 * 10_000_000) - 45_750_000_000;
    assert_eq!(remaining, expected_remaining);
}

#[test]
fn test_multiple_usdt_deposits() {
    let (env, treasury_id, token_id, oracle_id, signer1, signer2) = setup_with_oracle();
    let treasury_client = crate::TreasuryClient::new(&env, &treasury_id);
    let token_client = BOBTTokenClient::new(&env, &token_id);

    // Configure Oracle
    let oracle_proposal = treasury_client.propose_set_oracle(&signer1, &oracle_id);
    treasury_client.approve(&signer2, &oracle_proposal);
    treasury_client.execute(&signer1, &oracle_proposal);

    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);

    // User 1 deposits 100 USDT
    let proposal1 = treasury_client.propose_mint_from_usdt(
        &signer1,
        &user1,
        &1_000_000_000, // 100 USDT
        &String::from_str(&env, "DEPOSIT_001"),
    );
    treasury_client.approve(&signer2, &proposal1);
    treasury_client.execute(&signer1, &proposal1);

    // User 2 deposits 200 USDT
    let proposal2 = treasury_client.propose_mint_from_usdt(
        &signer1,
        &user2,
        &2_000_000_000, // 200 USDT
        &String::from_str(&env, "DEPOSIT_002"),
    );
    treasury_client.approve(&signer2, &proposal2);
    treasury_client.execute(&signer1, &proposal2);

    // Verify balances
    // User1: 100 * 9.15 = 915 BOBT
    assert_eq!(token_client.balance(&user1), 9_150_000_000);
    // User2: 200 * 9.15 = 1,830 BOBT
    assert_eq!(token_client.balance(&user2), 18_300_000_000);

    // Total supply should be 2,745 BOBT
    assert_eq!(token_client.total_supply(), 27_450_000_000);
}
