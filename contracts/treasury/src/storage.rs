//! Storage module for BOBT Treasury
//!
//! Multi-sig configuration, rate limiting, and proposal tracking.

use soroban_sdk::{contracttype, symbol_short, Address, Env, Symbol, Vec};

// =============================================================================
// STORAGE KEYS
// =============================================================================

pub const KEY_INITIALIZED: Symbol = symbol_short!("INIT");
pub const KEY_TOKEN: Symbol = symbol_short!("TOKEN");
pub const KEY_SIGNERS: Symbol = symbol_short!("SIGNERS");
pub const KEY_THRESHOLD: Symbol = symbol_short!("THRESH");
pub const KEY_PROPOSAL_COUNT: Symbol = symbol_short!("PROPCNT");

// Rate limiting keys
pub const KEY_DAILY_MINTED: Symbol = symbol_short!("DAYMINT");
pub const KEY_DAILY_BURNED: Symbol = symbol_short!("DAYBURN");
pub const KEY_LAST_RESET: Symbol = symbol_short!("LASTRST");

// =============================================================================
// CONFIGURATION CONSTANTS
// =============================================================================

/// Maximum number of signers
pub const MAX_SIGNERS: u32 = 10;
/// Minimum signers required
pub const MIN_SIGNERS: u32 = 1;
/// Proposal expiration: 7 days in ledgers (~17280 per day)
pub const PROPOSAL_EXPIRATION_LEDGERS: u32 = 17280 * 7;
/// One day in ledgers
pub const ONE_DAY_LEDGERS: u32 = 17280;
/// Contract version
pub const CONTRACT_VERSION: u32 = 1;

// =============================================================================
// RATE LIMIT DEFAULTS (can be configured)
// =============================================================================

/// 1 BOBT in stroops
pub const ONE_TOKEN: i128 = 10_000_000;
/// Default daily mint limit: 10 million BOBT
pub const DEFAULT_DAILY_MINT_LIMIT: i128 = 10_000_000 * ONE_TOKEN;
/// Default daily burn limit: 10 million BOBT
pub const DEFAULT_DAILY_BURN_LIMIT: i128 = 10_000_000 * ONE_TOKEN;
/// Default single operation limit: 1 million BOBT
pub const DEFAULT_SINGLE_OP_LIMIT: i128 = 1_000_000 * ONE_TOKEN;

// =============================================================================
// TTL CONFIGURATION
// =============================================================================

pub const INSTANCE_TTL_THRESHOLD: u32 = 17280 * 7;
pub const INSTANCE_TTL_EXTEND: u32 = 17280 * 7;
pub const PERSISTENT_TTL_THRESHOLD: u32 = 17280 * 30;
pub const PERSISTENT_TTL_EXTEND: u32 = 17280 * 30;

// =============================================================================
// DATA TYPES
// =============================================================================

/// Storage keys for different data types
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    /// Configuration
    Config,
    /// Proposal by ID
    Proposal(u64),
    /// Signer approval for proposal
    Approval(u64, Address),
    /// Executed proposal tracking
    Executed(u64),
    /// Rate limit config
    RateLimits,
}

/// Treasury configuration
#[contracttype]
#[derive(Clone, Debug)]
pub struct TreasuryConfig {
    /// BOBT token contract address
    pub token_address: Address,
    /// Oracle contract address (for P2P price feeds)
    pub oracle_address: Option<Address>,
    /// Required signatures for proposals
    pub threshold: u32,
    /// Daily mint limit
    pub daily_mint_limit: i128,
    /// Daily burn limit
    pub daily_burn_limit: i128,
    /// Single operation limit
    pub single_op_limit: i128,
}

/// Proposal types
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
#[repr(u32)]
pub enum ProposalType {
    /// Mint tokens to address
    Mint = 1,
    /// Burn tokens from address
    Burn = 2,
    /// Add new signer
    AddSigner = 3,
    /// Remove signer
    RemoveSigner = 4,
    /// Update threshold
    UpdateThreshold = 5,
    /// Update rate limits
    UpdateRateLimits = 6,
    /// Emergency pause token
    EmergencyPause = 7,
    /// Unpause token
    Unpause = 8,
    /// Freeze account on token
    FreezeAccount = 9,
    /// Unfreeze account on token
    UnfreezeAccount = 10,
    /// Mint BOBT based on USDT amount using Oracle price
    MintFromUsdt = 11,
    /// Set/Update Oracle address
    SetOracle = 12,
}

/// Proposal status
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
#[repr(u32)]
pub enum ProposalStatus {
    /// Pending approvals
    Pending = 1,
    /// Executed successfully
    Executed = 2,
    /// Cancelled
    Cancelled = 3,
    /// Expired
    Expired = 4,
}

/// Multi-sig proposal
#[contracttype]
#[derive(Clone, Debug)]
pub struct Proposal {
    /// Unique proposal ID
    pub id: u64,
    /// Type of proposal
    pub proposal_type: ProposalType,
    /// Proposer address
    pub proposer: Address,
    /// Target address (for mint/burn/freeze operations)
    pub target: Address,
    /// Amount (for mint/burn operations, or BOBT amount for MintFromUsdt)
    pub amount: i128,
    /// USDT amount (for MintFromUsdt - the original deposit amount)
    pub usdt_amount: i128,
    /// External reference (bank transaction ID)
    pub external_ref: soroban_sdk::String,
    /// Creation ledger
    pub created_at: u32,
    /// Expiration ledger
    pub expires_at: u32,
    /// Current approval count
    pub approval_count: u32,
    /// Status
    pub status: ProposalStatus,
}

/// Rate limit tracking
#[contracttype]
#[derive(Clone, Debug)]
pub struct RateLimitState {
    /// Amount minted today
    pub daily_minted: i128,
    /// Amount burned today
    pub daily_burned: i128,
    /// Ledger when limits were last reset
    pub last_reset_ledger: u32,
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

/// Get configuration
pub fn get_config(env: &Env) -> Option<TreasuryConfig> {
    env.storage().instance().get(&DataKey::Config)
}

/// Set configuration
pub fn set_config(env: &Env, config: &TreasuryConfig) {
    env.storage().instance().set(&DataKey::Config, config);
}

/// Get signers list
pub fn get_signers(env: &Env) -> Vec<Address> {
    env.storage()
        .instance()
        .get(&KEY_SIGNERS)
        .unwrap_or(Vec::new(env))
}

/// Set signers list
pub fn set_signers(env: &Env, signers: &Vec<Address>) {
    env.storage().instance().set(&KEY_SIGNERS, signers);
}

/// Check if address is a signer
pub fn is_signer(env: &Env, address: &Address) -> bool {
    let signers = get_signers(env);
    signers.iter().any(|s| s == *address)
}

/// Get threshold
pub fn get_threshold(env: &Env) -> u32 {
    env.storage()
        .instance()
        .get(&KEY_THRESHOLD)
        .unwrap_or(1)
}

/// Set threshold
pub fn set_threshold(env: &Env, threshold: u32) {
    env.storage().instance().set(&KEY_THRESHOLD, &threshold);
}

/// Get next proposal ID
pub fn get_next_proposal_id(env: &Env) -> u64 {
    let current: u64 = env.storage()
        .instance()
        .get(&KEY_PROPOSAL_COUNT)
        .unwrap_or(0);
    let next = current + 1;
    env.storage().instance().set(&KEY_PROPOSAL_COUNT, &next);
    next
}

/// Get proposal
pub fn get_proposal(env: &Env, id: u64) -> Option<Proposal> {
    env.storage().persistent().get(&DataKey::Proposal(id))
}

/// Set proposal
pub fn set_proposal(env: &Env, proposal: &Proposal) {
    env.storage()
        .persistent()
        .set(&DataKey::Proposal(proposal.id), proposal);
}

/// Check if signer approved proposal
pub fn has_approved(env: &Env, proposal_id: u64, signer: &Address) -> bool {
    env.storage()
        .persistent()
        .get(&DataKey::Approval(proposal_id, signer.clone()))
        .unwrap_or(false)
}

/// Record signer approval
pub fn set_approval(env: &Env, proposal_id: u64, signer: &Address) {
    env.storage()
        .persistent()
        .set(&DataKey::Approval(proposal_id, signer.clone()), &true);
}

/// Get rate limit state
pub fn get_rate_limit_state(env: &Env) -> RateLimitState {
    env.storage()
        .instance()
        .get(&DataKey::RateLimits)
        .unwrap_or(RateLimitState {
            daily_minted: 0,
            daily_burned: 0,
            last_reset_ledger: env.ledger().sequence(),
        })
}

/// Set rate limit state
pub fn set_rate_limit_state(env: &Env, state: &RateLimitState) {
    env.storage().instance().set(&DataKey::RateLimits, state);
}

/// Reset daily limits if new day
pub fn maybe_reset_daily_limits(env: &Env) -> RateLimitState {
    let mut state = get_rate_limit_state(env);
    let current_ledger = env.ledger().sequence();

    // Reset if more than one day has passed
    if current_ledger >= state.last_reset_ledger + ONE_DAY_LEDGERS {
        state.daily_minted = 0;
        state.daily_burned = 0;
        state.last_reset_ledger = current_ledger;
        set_rate_limit_state(env, &state);
    }

    state
}
