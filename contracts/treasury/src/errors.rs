//! Error types for BOBT Treasury
//!
//! Error codes organized by category:
//! - 1-10: Initialization errors
//! - 11-20: Authorization errors
//! - 21-30: Proposal errors
//! - 31-40: Rate limiting errors
//! - 41-50: Configuration errors

use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum TreasuryError {
    // =========================================================================
    // INITIALIZATION ERRORS (1-10)
    // =========================================================================

    /// Contract already initialized
    AlreadyInitialized = 1,
    /// Contract not initialized
    NotInitialized = 2,

    // =========================================================================
    // AUTHORIZATION ERRORS (11-20)
    // =========================================================================

    /// Caller is not a signer
    NotASigner = 11,
    /// Caller already approved this proposal
    AlreadyApproved = 12,
    /// Not enough approvals
    InsufficientApprovals = 13,
    /// Only proposer can cancel
    NotProposer = 14,

    // =========================================================================
    // PROPOSAL ERRORS (21-30)
    // =========================================================================

    /// Proposal not found
    ProposalNotFound = 21,
    /// Proposal already executed
    ProposalAlreadyExecuted = 22,
    /// Proposal expired
    ProposalExpired = 23,
    /// Proposal cancelled
    ProposalCancelled = 24,
    /// Invalid proposal type
    InvalidProposalType = 25,
    /// Proposal still pending
    ProposalStillPending = 26,

    // =========================================================================
    // RATE LIMITING ERRORS (31-40)
    // =========================================================================

    /// Daily mint limit exceeded
    DailyMintLimitExceeded = 31,
    /// Daily burn limit exceeded
    DailyBurnLimitExceeded = 32,
    /// Single operation limit exceeded
    SingleOpLimitExceeded = 33,
    /// Amount must be positive
    InvalidAmount = 34,

    // =========================================================================
    // CONFIGURATION ERRORS (41-50)
    // =========================================================================

    /// Invalid threshold (must be > 0 and <= signers count)
    InvalidThreshold = 41,
    /// Too many signers
    TooManySigners = 42,
    /// Signer already exists
    SignerAlreadyExists = 43,
    /// Signer not found
    SignerNotFound = 44,
    /// Cannot remove last signer
    CannotRemoveLastSigner = 45,
    /// Invalid rate limit
    InvalidRateLimit = 46,
    /// Token address required
    TokenAddressRequired = 47,

    // =========================================================================
    // ORACLE ERRORS (51-60)
    // =========================================================================

    /// Oracle not configured
    OracleNotConfigured = 51,
    /// Oracle price invalid or stale
    OraclePriceInvalid = 52,
    /// USDT amount must be positive
    InvalidUsdtAmount = 53,
}
