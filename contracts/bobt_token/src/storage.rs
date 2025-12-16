//! Storage module for BOBT Stablecoin
//!
//! Production-ready storage keys, roles, data types, and TTL configuration.
//! Designed for scalability and gas efficiency.

use soroban_sdk::{contracttype, symbol_short, Address, Env, String, Symbol};

// =============================================================================
// STORAGE KEYS - Using short symbols for gas efficiency
// =============================================================================

/// Contract metadata keys
pub const KEY_INITIALIZED: Symbol = symbol_short!("INIT");
pub const KEY_OWNER: Symbol = symbol_short!("OWNER");
pub const KEY_PAUSED: Symbol = symbol_short!("PAUSED");
pub const KEY_TOTAL_SUPPLY: Symbol = symbol_short!("TOTSUP");
pub const KEY_VERSION: Symbol = symbol_short!("VERSION");

// =============================================================================
// ROLE DEFINITIONS - Using 6-char symbols for consistency
// =============================================================================

/// Super admin role - manages all other roles and upgrades
pub const ROLE_OWNER: Symbol = symbol_short!("R_OWN");
/// Minter role - can mint/burn tokens for bank operations
pub const ROLE_MINTER: Symbol = symbol_short!("R_MNT");
/// Pauser role - can pause/unpause in emergencies
pub const ROLE_PAUSER: Symbol = symbol_short!("R_PSR");
/// Blacklister role - can freeze accounts and clawback
pub const ROLE_BLACKLISTER: Symbol = symbol_short!("R_BLK");
/// Rescuer role - can rescue stuck tokens
pub const ROLE_RESCUER: Symbol = symbol_short!("R_RSC");

// =============================================================================
// STORAGE KEY TYPES - Structured for efficient lookups
// =============================================================================

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    /// Balance of an account: DataKey::Balance(address) -> i128
    Balance(Address),
    /// Allowance: DataKey::Allowance(owner, spender) -> AllowanceData
    Allowance(Address, Address),
    /// Role assignment: DataKey::Role(role, account) -> bool
    Role(Symbol, Address),
    /// Account frozen status: DataKey::Frozen(address) -> bool
    Frozen(Address),
    /// Mint request tracking: DataKey::MintReq(id) -> MintRequest
    MintReq(String),
    /// Burn request tracking: DataKey::BurnReq(id) -> BurnRequest
    BurnReq(String),
    /// Nonce for replay protection: DataKey::Nonce(address) -> u64
    Nonce(Address),
}

// =============================================================================
// DATA STRUCTURES - Production-ready with full metadata
// =============================================================================

/// Allowance data with expiration support
#[contracttype]
#[derive(Clone, Debug)]
pub struct AllowanceData {
    pub amount: i128,
    pub expiration_ledger: u32,
}

/// Mint request with complete audit trail
#[contracttype]
#[derive(Clone, Debug)]
pub struct MintRequest {
    /// Recipient address
    pub to: Address,
    /// Amount minted (in stroops)
    pub amount: i128,
    /// Ledger sequence when minted
    pub ledger: u32,
    /// Timestamp when minted
    pub timestamp: u64,
    /// Minter who executed
    pub minter: Address,
    /// External reference ID (bank transaction ID)
    pub external_ref: String,
}

/// Burn request with complete audit trail
#[contracttype]
#[derive(Clone, Debug)]
pub struct BurnRequest {
    /// Address tokens burned from
    pub from: Address,
    /// Amount burned (in stroops)
    pub amount: i128,
    /// Ledger sequence when burned
    pub ledger: u32,
    /// Timestamp when burned
    pub timestamp: u64,
    /// Operator who executed
    pub operator: Address,
    /// External reference ID (bank transaction ID)
    pub external_ref: String,
}

/// Contract configuration
#[contracttype]
#[derive(Clone, Debug)]
pub struct ContractConfig {
    /// Maximum single mint amount (anti-exploit)
    pub max_mint_amount: i128,
    /// Maximum single burn amount
    pub max_burn_amount: i128,
    /// Minimum transfer amount
    pub min_transfer_amount: i128,
    /// Whether new accounts need whitelisting
    pub require_whitelist: bool,
}

// =============================================================================
// TOKEN CONSTANTS - SEP-41 compliant
// =============================================================================

/// Token decimals (7 for Stellar standard)
pub const TOKEN_DECIMALS: u32 = 7;
/// Token name
pub const TOKEN_NAME: &str = "BOBT Stablecoin";
/// Token symbol
pub const TOKEN_SYMBOL: &str = "BOBT";
/// Contract version for upgrades
pub const CONTRACT_VERSION: u32 = 1;

// =============================================================================
// AMOUNT CONSTANTS - Production limits
// =============================================================================

/// 1 BOBT in stroops (10^7)
pub const ONE_TOKEN: i128 = 10_000_000;
/// Maximum supply: 1 trillion BOBT
pub const MAX_SUPPLY: i128 = 1_000_000_000_000 * ONE_TOKEN;
/// Default max mint per transaction: 100 million BOBT (reserved for future use)
#[allow(dead_code)]
pub const DEFAULT_MAX_MINT: i128 = 100_000_000 * ONE_TOKEN;
/// Default max burn per transaction: 100 million BOBT (reserved for future use)
#[allow(dead_code)]
pub const DEFAULT_MAX_BURN: i128 = 100_000_000 * ONE_TOKEN;
/// Minimum transfer: 0.0000001 BOBT (1 stroop)
pub const MIN_TRANSFER: i128 = 1;

// =============================================================================
// STORAGE TTL CONFIGURATION - Optimized for production
// =============================================================================

/// Instance storage (contract state): 7 days
pub const INSTANCE_TTL_THRESHOLD: u32 = 17280 * 7;  // ~7 days in ledgers
pub const INSTANCE_TTL_EXTEND: u32 = 17280 * 7;

/// Persistent storage (balances, roles): 30 days
pub const PERSISTENT_TTL_THRESHOLD: u32 = 17280 * 30;  // ~30 days
pub const PERSISTENT_TTL_EXTEND: u32 = 17280 * 30;

/// Temporary storage (allowances): 7 days max
pub const TEMPORARY_TTL_THRESHOLD: u32 = 17280 * 7;
pub const TEMPORARY_TTL_EXTEND: u32 = 17280 * 7;

// =============================================================================
// STORAGE HELPER FUNCTIONS
// =============================================================================

/// Extend instance storage TTL
pub fn extend_instance_ttl(env: &Env) {
    env.storage()
        .instance()
        .extend_ttl(INSTANCE_TTL_THRESHOLD, INSTANCE_TTL_EXTEND);
}

/// Extend persistent storage TTL for a DataKey
pub fn extend_persistent_ttl(env: &Env, key: &DataKey) {
    if env.storage().persistent().has(key) {
        env.storage()
            .persistent()
            .extend_ttl(key, PERSISTENT_TTL_THRESHOLD, PERSISTENT_TTL_EXTEND);
    }
}

/// Extend temporary storage TTL for a DataKey
pub fn extend_temporary_ttl(env: &Env, key: &DataKey) {
    if env.storage().temporary().has(key) {
        env.storage()
            .temporary()
            .extend_ttl(key, TEMPORARY_TTL_THRESHOLD, TEMPORARY_TTL_EXTEND);
    }
}

// =============================================================================
// BALANCE OPERATIONS - Gas optimized
// =============================================================================

/// Get balance with TTL extension
pub fn get_balance(env: &Env, account: &Address) -> i128 {
    let key = DataKey::Balance(account.clone());
    if let Some(balance) = env.storage().persistent().get::<_, i128>(&key) {
        extend_persistent_ttl(env, &key);
        balance
    } else {
        0
    }
}

/// Set balance with TTL extension
pub fn set_balance(env: &Env, account: &Address, amount: i128) {
    let key = DataKey::Balance(account.clone());
    env.storage().persistent().set(&key, &amount);
    extend_persistent_ttl(env, &key);
}

/// Get total supply
pub fn get_total_supply(env: &Env) -> i128 {
    env.storage()
        .instance()
        .get(&KEY_TOTAL_SUPPLY)
        .unwrap_or(0)
}

/// Set total supply
pub fn set_total_supply(env: &Env, amount: i128) {
    env.storage().instance().set(&KEY_TOTAL_SUPPLY, &amount);
}

// =============================================================================
// ALLOWANCE OPERATIONS - With expiration support
// =============================================================================

/// Get allowance with expiration check
pub fn get_allowance(env: &Env, from: &Address, spender: &Address) -> i128 {
    let key = DataKey::Allowance(from.clone(), spender.clone());
    if let Some(data) = env.storage().temporary().get::<_, AllowanceData>(&key) {
        // Check if expired
        if data.expiration_ledger < env.ledger().sequence() {
            return 0;
        }
        extend_temporary_ttl(env, &key);
        data.amount
    } else {
        0
    }
}

/// Set allowance with expiration
pub fn set_allowance(
    env: &Env,
    from: &Address,
    spender: &Address,
    amount: i128,
    expiration_ledger: u32,
) {
    let key = DataKey::Allowance(from.clone(), spender.clone());

    if amount > 0 && expiration_ledger > env.ledger().sequence() {
        let data = AllowanceData {
            amount,
            expiration_ledger,
        };
        env.storage().temporary().set(&key, &data);

        // Set TTL to match expiration
        let ttl = expiration_ledger - env.ledger().sequence();
        env.storage().temporary().extend_ttl(&key, ttl, ttl);
    } else {
        // Remove if zero or expired
        env.storage().temporary().remove(&key);
    }
}

/// Spend allowance (decrease by amount)
pub fn spend_allowance(
    env: &Env,
    from: &Address,
    spender: &Address,
    amount: i128,
) -> Result<(), ()> {
    let key = DataKey::Allowance(from.clone(), spender.clone());

    if let Some(mut data) = env.storage().temporary().get::<_, AllowanceData>(&key) {
        // Check expiration
        if data.expiration_ledger < env.ledger().sequence() {
            return Err(());
        }
        // Check sufficient allowance
        if data.amount < amount {
            return Err(());
        }

        data.amount -= amount;

        if data.amount > 0 {
            env.storage().temporary().set(&key, &data);
        } else {
            env.storage().temporary().remove(&key);
        }
        Ok(())
    } else {
        Err(())
    }
}

// =============================================================================
// ROLE OPERATIONS
// =============================================================================

/// Check if account has role
pub fn has_role(env: &Env, role: &Symbol, account: &Address) -> bool {
    let key = DataKey::Role(role.clone(), account.clone());
    env.storage().persistent().get(&key).unwrap_or(false)
}

/// Grant role to account
pub fn grant_role(env: &Env, role: &Symbol, account: &Address) {
    let key = DataKey::Role(role.clone(), account.clone());
    env.storage().persistent().set(&key, &true);
    extend_persistent_ttl(env, &key);
}

/// Revoke role from account
pub fn revoke_role(env: &Env, role: &Symbol, account: &Address) {
    let key = DataKey::Role(role.clone(), account.clone());
    env.storage().persistent().remove(&key);
}

// =============================================================================
// FREEZE OPERATIONS
// =============================================================================

/// Check if account is frozen
pub fn is_frozen(env: &Env, account: &Address) -> bool {
    let key = DataKey::Frozen(account.clone());
    env.storage().persistent().get(&key).unwrap_or(false)
}

/// Freeze account
pub fn freeze_account(env: &Env, account: &Address) {
    let key = DataKey::Frozen(account.clone());
    env.storage().persistent().set(&key, &true);
    extend_persistent_ttl(env, &key);
}

/// Unfreeze account
pub fn unfreeze_account(env: &Env, account: &Address) {
    let key = DataKey::Frozen(account.clone());
    env.storage().persistent().remove(&key);
}

// =============================================================================
// REQUEST TRACKING
// =============================================================================

/// Check if mint request exists
pub fn mint_request_exists(env: &Env, request_id: &String) -> bool {
    let key = DataKey::MintReq(request_id.clone());
    env.storage().persistent().has(&key)
}

/// Store mint request
pub fn store_mint_request(env: &Env, request_id: &String, request: &MintRequest) {
    let key = DataKey::MintReq(request_id.clone());
    env.storage().persistent().set(&key, request);
    extend_persistent_ttl(env, &key);
}

/// Get mint request
pub fn get_mint_request(env: &Env, request_id: &String) -> Option<MintRequest> {
    let key = DataKey::MintReq(request_id.clone());
    env.storage().persistent().get(&key)
}

/// Check if burn request exists
pub fn burn_request_exists(env: &Env, request_id: &String) -> bool {
    let key = DataKey::BurnReq(request_id.clone());
    env.storage().persistent().has(&key)
}

/// Store burn request
pub fn store_burn_request(env: &Env, request_id: &String, request: &BurnRequest) {
    let key = DataKey::BurnReq(request_id.clone());
    env.storage().persistent().set(&key, request);
    extend_persistent_ttl(env, &key);
}

/// Get burn request
pub fn get_burn_request(env: &Env, request_id: &String) -> Option<BurnRequest> {
    let key = DataKey::BurnReq(request_id.clone());
    env.storage().persistent().get(&key)
}

// =============================================================================
// CONTRACT STATE
// =============================================================================

/// Check if contract is initialized
pub fn is_initialized(env: &Env) -> bool {
    env.storage().instance().has(&KEY_INITIALIZED)
}

/// Mark contract as initialized
pub fn set_initialized(env: &Env) {
    env.storage().instance().set(&KEY_INITIALIZED, &true);
    env.storage().instance().set(&KEY_VERSION, &CONTRACT_VERSION);
}

/// Get contract owner
pub fn get_owner(env: &Env) -> Option<Address> {
    env.storage().instance().get(&KEY_OWNER)
}

/// Set contract owner
pub fn set_owner(env: &Env, owner: &Address) {
    env.storage().instance().set(&KEY_OWNER, owner);
}

/// Check if contract is paused
pub fn is_paused(env: &Env) -> bool {
    env.storage().instance().get(&KEY_PAUSED).unwrap_or(false)
}

/// Set paused state
pub fn set_paused(env: &Env, paused: bool) {
    env.storage().instance().set(&KEY_PAUSED, &paused);
}

/// Get contract version
pub fn get_version(env: &Env) -> u32 {
    env.storage().instance().get(&KEY_VERSION).unwrap_or(0)
}
