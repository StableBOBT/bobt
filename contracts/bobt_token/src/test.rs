#![cfg(test)]

//! Comprehensive test suite for BOBT Stablecoin
//!
//! Tests organized by functionality:
//! - Initialization
//! - Token operations (mint, transfer, burn)
//! - Pause functionality
//! - Freeze/Blacklist functionality
//! - Access control
//! - Request tracking
//! - Allowance and expiration

use crate::contract::BOBTTokenClient;
use crate::BOBTToken;
use soroban_sdk::{symbol_short, testutils::Address as _, Address, Env, String};

// =============================================================================
// TEST HELPERS
// =============================================================================

/// Helper function to set up the test environment
fn setup() -> (Env, Address, BOBTTokenClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();

    let owner = Address::generate(&env);
    let contract_id = env.register(BOBTToken, ());
    let client = BOBTTokenClient::new(&env, &contract_id);

    // Initialize the contract
    client.initialize(&owner);

    (env, owner, client)
}

/// Setup with minter role granted
fn setup_with_minter() -> (Env, Address, BOBTTokenClient<'static>) {
    let (env, owner, client) = setup();
    client.grant_role(&owner, &symbol_short!("minter"), &owner);
    (env, owner, client)
}

// =============================================================================
// INITIALIZATION TESTS
// =============================================================================

#[test]
fn test_initialize() {
    let (env, owner, client) = setup();

    assert_eq!(client.name(), String::from_str(&env, "BOBT Stablecoin"));
    assert_eq!(client.symbol(), String::from_str(&env, "BOBT"));
    assert_eq!(client.decimals(), 7);
    assert_eq!(client.total_supply(), 0);
    assert!(!client.is_paused());

    // Owner should have owner role
    assert!(client.has_role(&symbol_short!("owner"), &owner));
}

#[test]
fn test_version() {
    let (_env, _owner, client) = setup();
    assert_eq!(client.version(), 1);
}

#[test]
#[should_panic(expected = "Error(Contract, #81)")]
fn test_cannot_initialize_twice() {
    let (_env, owner, client) = setup();

    // Try to initialize again - should fail
    client.initialize(&owner);
}

// =============================================================================
// TOKEN OPERATION TESTS
// =============================================================================

#[test]
fn test_mint_and_balance() {
    let (env, owner, client) = setup_with_minter();
    let recipient = Address::generate(&env);

    // Mint tokens (1000 BOBT = 1000 * 10^7 stroops)
    let request_id = String::from_str(&env, "REQ001");
    client.admin_mint(&owner, &recipient, &1000_0000000, &request_id);

    assert_eq!(client.balance(&recipient), 1000_0000000);
    assert_eq!(client.total_supply(), 1000_0000000);
}

#[test]
fn test_transfer() {
    let (env, owner, client) = setup_with_minter();
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    // Mint tokens to alice
    let request_id = String::from_str(&env, "REQ002");
    client.admin_mint(&owner, &alice, &1000_0000000, &request_id);

    // Transfer from alice to bob
    client.transfer(&alice, &bob, &300_0000000);

    assert_eq!(client.balance(&alice), 700_0000000);
    assert_eq!(client.balance(&bob), 300_0000000);
    // Total supply unchanged
    assert_eq!(client.total_supply(), 1000_0000000);
}

#[test]
fn test_burn() {
    let (env, owner, client) = setup_with_minter();
    let alice = Address::generate(&env);

    // Mint tokens
    let request_id = String::from_str(&env, "REQ003");
    client.admin_mint(&owner, &alice, &1000_0000000, &request_id);

    // Burn 400 BOBT
    client.burn(&alice, &400_0000000);

    assert_eq!(client.balance(&alice), 600_0000000);
    assert_eq!(client.total_supply(), 600_0000000);
}

#[test]
fn test_admin_burn() {
    let (env, owner, client) = setup_with_minter();
    let alice = Address::generate(&env);

    // Mint tokens
    let mint_req = String::from_str(&env, "MINT001");
    client.admin_mint(&owner, &alice, &1000_0000000, &mint_req);

    // Admin burn (for redemptions)
    let burn_req = String::from_str(&env, "BURN001");
    client.admin_burn(&owner, &alice, &300_0000000, &burn_req);

    assert_eq!(client.balance(&alice), 700_0000000);
    assert_eq!(client.total_supply(), 700_0000000);

    // Verify burn request tracking
    let request = client.get_burn_request(&burn_req);
    assert_eq!(request.from, alice);
    assert_eq!(request.amount, 300_0000000);
    assert_eq!(request.operator, owner);
}

#[test]
fn test_approve_and_transfer_from() {
    let (env, owner, client) = setup_with_minter();
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);
    let spender = Address::generate(&env);

    // Mint to alice
    let request_id = String::from_str(&env, "REQ_APPROVE");
    client.admin_mint(&owner, &alice, &1000_0000000, &request_id);

    // Alice approves spender (expiration in 1000 ledgers)
    client.approve(&alice, &spender, &500_0000000, &1000);

    assert_eq!(client.allowance(&alice, &spender), 500_0000000);

    // Spender transfers from alice to bob
    client.transfer_from(&spender, &alice, &bob, &200_0000000);

    assert_eq!(client.balance(&alice), 800_0000000);
    assert_eq!(client.balance(&bob), 200_0000000);
    assert_eq!(client.allowance(&alice, &spender), 300_0000000);
}

#[test]
#[should_panic(expected = "Error(Contract, #31)")]
fn test_insufficient_balance() {
    let (env, owner, client) = setup_with_minter();
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    // Mint small amount
    let request_id = String::from_str(&env, "REQ_INSUF");
    client.admin_mint(&owner, &alice, &100_0000000, &request_id);

    // Try to transfer more than balance
    client.transfer(&alice, &bob, &200_0000000);
}

// =============================================================================
// PAUSE TESTS
// =============================================================================

#[test]
fn test_pause_unpause() {
    let (_env, owner, client) = setup();

    // Grant pauser role
    client.grant_role(&owner, &symbol_short!("pauser"), &owner);

    // Pause
    client.pause(&owner);
    assert!(client.is_paused());

    // Unpause
    client.unpause(&owner);
    assert!(!client.is_paused());
}

#[test]
#[should_panic(expected = "Error(Contract, #11)")]
fn test_cannot_transfer_when_paused() {
    let (env, owner, client) = setup_with_minter();
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    // Grant pauser role
    client.grant_role(&owner, &symbol_short!("pauser"), &owner);

    // Mint tokens
    let request_id = String::from_str(&env, "REQ004");
    client.admin_mint(&owner, &alice, &1000_0000000, &request_id);

    // Pause
    client.pause(&owner);

    // Try to transfer - should fail with ContractPaused (#11)
    client.transfer(&alice, &bob, &100_0000000);
}

#[test]
#[should_panic(expected = "Error(Contract, #11)")]
fn test_cannot_mint_when_paused() {
    let (env, owner, client) = setup_with_minter();
    let recipient = Address::generate(&env);

    // Grant pauser role
    client.grant_role(&owner, &symbol_short!("pauser"), &owner);

    // Pause
    client.pause(&owner);

    // Try to mint - should fail
    let request_id = String::from_str(&env, "REQ_PAUSED");
    client.admin_mint(&owner, &recipient, &1000_0000000, &request_id);
}

// =============================================================================
// FREEZE/BLACKLIST TESTS
// =============================================================================

#[test]
fn test_freeze_unfreeze() {
    let (env, owner, client) = setup();
    let bad_actor = Address::generate(&env);

    // Grant blacklister role
    client.grant_role(&owner, &symbol_short!("blklst"), &owner);

    // Freeze
    client.freeze(&owner, &bad_actor);
    assert!(client.is_frozen(&bad_actor));

    // Unfreeze
    client.unfreeze(&owner, &bad_actor);
    assert!(!client.is_frozen(&bad_actor));
}

#[test]
#[should_panic(expected = "Error(Contract, #21)")]
fn test_cannot_transfer_from_frozen_account() {
    let (env, owner, client) = setup_with_minter();
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    // Grant blacklister role
    client.grant_role(&owner, &symbol_short!("blklst"), &owner);

    // Mint tokens
    let request_id = String::from_str(&env, "REQ005");
    client.admin_mint(&owner, &alice, &1000_0000000, &request_id);

    // Freeze alice
    client.freeze(&owner, &alice);

    // Try to transfer from frozen account - should fail
    client.transfer(&alice, &bob, &100_0000000);
}

#[test]
#[should_panic(expected = "Error(Contract, #21)")]
fn test_cannot_transfer_to_frozen_account() {
    let (env, owner, client) = setup_with_minter();
    let alice = Address::generate(&env);
    let frozen_bob = Address::generate(&env);

    // Grant blacklister role
    client.grant_role(&owner, &symbol_short!("blklst"), &owner);

    // Mint tokens
    let request_id = String::from_str(&env, "REQ_TO_FROZEN");
    client.admin_mint(&owner, &alice, &1000_0000000, &request_id);

    // Freeze bob
    client.freeze(&owner, &frozen_bob);

    // Try to transfer to frozen account - should fail
    client.transfer(&alice, &frozen_bob, &100_0000000);
}

#[test]
fn test_clawback() {
    let (env, owner, client) = setup_with_minter();
    let bad_actor = Address::generate(&env);

    // Grant blacklister role
    client.grant_role(&owner, &symbol_short!("blklst"), &owner);

    // Mint tokens
    let request_id = String::from_str(&env, "REQ006");
    client.admin_mint(&owner, &bad_actor, &500_0000000, &request_id);
    assert_eq!(client.balance(&bad_actor), 500_0000000);

    // Freeze and destroy funds
    client.freeze(&owner, &bad_actor);
    client.destroy_frozen_funds(&owner, &bad_actor);

    assert_eq!(client.balance(&bad_actor), 0);
    assert_eq!(client.total_supply(), 0);
}

#[test]
#[should_panic(expected = "Error(Contract, #22)")]
fn test_cannot_clawback_unfrozen_account() {
    let (env, owner, client) = setup_with_minter();
    let alice = Address::generate(&env);

    // Grant blacklister role
    client.grant_role(&owner, &symbol_short!("blklst"), &owner);

    // Mint tokens
    let request_id = String::from_str(&env, "REQ_CLAWBACK");
    client.admin_mint(&owner, &alice, &500_0000000, &request_id);

    // Try to destroy funds without freezing first - should fail
    client.destroy_frozen_funds(&owner, &alice);
}

// =============================================================================
// ACCESS CONTROL TESTS
// =============================================================================

#[test]
fn test_role_management() {
    let (env, owner, client) = setup();
    let minter = Address::generate(&env);

    // Initially no minter role
    assert!(!client.has_role(&symbol_short!("minter"), &minter));

    // Grant minter role
    client.grant_role(&owner, &symbol_short!("minter"), &minter);
    assert!(client.has_role(&symbol_short!("minter"), &minter));

    // Revoke minter role
    client.revoke_role(&owner, &symbol_short!("minter"), &minter);
    assert!(!client.has_role(&symbol_short!("minter"), &minter));
}

#[test]
#[should_panic(expected = "Error(Contract, #1)")]
fn test_unauthorized_mint() {
    let (env, _owner, client) = setup();
    let attacker = Address::generate(&env);
    let recipient = Address::generate(&env);

    // Try to mint without minter role - should fail with Unauthorized (#1)
    let request_id = String::from_str(&env, "REQ007");
    client.admin_mint(&attacker, &recipient, &1000_0000000, &request_id);
}

#[test]
#[should_panic(expected = "Error(Contract, #1)")]
fn test_unauthorized_pause() {
    let (env, _owner, client) = setup();
    let attacker = Address::generate(&env);

    // Try to pause without pauser role
    client.pause(&attacker);
}

#[test]
#[should_panic(expected = "Error(Contract, #1)")]
fn test_unauthorized_freeze() {
    let (env, _owner, client) = setup();
    let attacker = Address::generate(&env);
    let victim = Address::generate(&env);

    // Try to freeze without blacklister role
    client.freeze(&attacker, &victim);
}

#[test]
fn test_transfer_ownership() {
    let (env, owner, client) = setup();
    let new_owner = Address::generate(&env);

    // Transfer ownership
    client.transfer_ownership(&owner, &new_owner);

    // Verify new owner
    assert_eq!(client.owner(), new_owner);
    assert!(client.has_role(&symbol_short!("owner"), &new_owner));
    assert!(!client.has_role(&symbol_short!("owner"), &owner));
}

#[test]
#[should_panic(expected = "Error(Contract, #1)")]
fn test_old_owner_cannot_grant_roles() {
    let (env, owner, client) = setup();
    let new_owner = Address::generate(&env);
    let minter = Address::generate(&env);

    // Transfer ownership
    client.transfer_ownership(&owner, &new_owner);

    // Old owner tries to grant role - should fail
    client.grant_role(&owner, &symbol_short!("minter"), &minter);
}

// =============================================================================
// REQUEST TRACKING TESTS
// =============================================================================

#[test]
fn test_mint_request_tracking() {
    let (env, owner, client) = setup_with_minter();
    let recipient = Address::generate(&env);

    // Mint tokens
    let request_id = String::from_str(&env, "REQ008");
    client.admin_mint(&owner, &recipient, &1000_0000000, &request_id);

    // Verify request tracking
    let request = client.get_mint_request(&request_id);
    assert_eq!(request.to, recipient);
    assert_eq!(request.amount, 1000_0000000);
    assert_eq!(request.minter, owner);
    // external_ref should match request_id
    assert_eq!(request.external_ref, request_id);
}

#[test]
fn test_request_exists() {
    let (env, owner, client) = setup_with_minter();
    let recipient = Address::generate(&env);

    let request_id = String::from_str(&env, "REQ_EXISTS");
    let non_existent = String::from_str(&env, "NONEXISTENT");

    // Before mint
    assert!(!client.mint_request_exists(&request_id));

    // After mint
    client.admin_mint(&owner, &recipient, &100_0000000, &request_id);
    assert!(client.mint_request_exists(&request_id));
    assert!(!client.mint_request_exists(&non_existent));
}

#[test]
#[should_panic(expected = "Error(Contract, #51)")]
fn test_duplicate_request_id() {
    let (env, owner, client) = setup_with_minter();
    let recipient = Address::generate(&env);

    // First mint
    let request_id = String::from_str(&env, "REQ009");
    client.admin_mint(&owner, &recipient, &1000_0000000, &request_id);

    // Try to use same request ID - should fail with RequestAlreadyExists (#51)
    client.admin_mint(&owner, &recipient, &500_0000000, &request_id);
}

#[test]
#[should_panic(expected = "Error(Contract, #52)")]
fn test_get_nonexistent_request() {
    let (env, _owner, client) = setup();

    let request_id = String::from_str(&env, "NONEXISTENT");
    client.get_mint_request(&request_id);
}

// =============================================================================
// EDGE CASE TESTS
// =============================================================================

#[test]
#[should_panic(expected = "Error(Contract, #38)")]
fn test_cannot_transfer_to_self() {
    let (env, owner, client) = setup_with_minter();
    let alice = Address::generate(&env);

    // Mint tokens
    let request_id = String::from_str(&env, "REQ_SELF");
    client.admin_mint(&owner, &alice, &1000_0000000, &request_id);

    // Try to transfer to self
    client.transfer(&alice, &alice, &100_0000000);
}

#[test]
fn test_zero_balance_query() {
    let (env, _owner, client) = setup();
    let unknown = Address::generate(&env);

    // Query balance of unknown address should return 0
    assert_eq!(client.balance(&unknown), 0);
}

#[test]
fn test_multiple_roles_same_account() {
    let (env, owner, client) = setup();
    let operator = Address::generate(&env);

    // Grant multiple roles to same account
    client.grant_role(&owner, &symbol_short!("minter"), &operator);
    client.grant_role(&owner, &symbol_short!("pauser"), &operator);
    client.grant_role(&owner, &symbol_short!("blklst"), &operator);

    assert!(client.has_role(&symbol_short!("minter"), &operator));
    assert!(client.has_role(&symbol_short!("pauser"), &operator));
    assert!(client.has_role(&symbol_short!("blklst"), &operator));

    // Revoke one role
    client.revoke_role(&owner, &symbol_short!("pauser"), &operator);

    assert!(client.has_role(&symbol_short!("minter"), &operator));
    assert!(!client.has_role(&symbol_short!("pauser"), &operator));
    assert!(client.has_role(&symbol_short!("blklst"), &operator));
}
