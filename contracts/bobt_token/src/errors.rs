//! Custom error types for BOBT Stablecoin
//!
//! This module defines all error codes that can be returned by the
//! BOBT stablecoin contract operations.

use soroban_sdk::contracterror;

/// BOBT Stablecoin error codes
///
/// Error codes are organized by category:
/// - 1-10: Access Control errors
/// - 11-20: Pausable errors
/// - 21-30: Blocklist/Freeze errors
/// - 31-50: Token operation errors
/// - 51-60: Request tracking errors
/// - 61-70: Rescue operation errors
/// - 71-80: Upgrade errors
/// - 81-90: Initialization errors
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum BOBTError {
    // =========================================================================
    // ACCESS CONTROL ERRORS (1-10)
    // =========================================================================

    /// Caller is not authorized to perform this operation
    Unauthorized = 1,

    /// Invalid role specified
    InvalidRole = 2,

    /// Role has already been granted to this account
    RoleAlreadyGranted = 3,

    /// Role has not been granted to this account
    RoleNotGranted = 4,

    /// Cannot transfer ownership to zero address
    InvalidNewOwner = 5,

    // =========================================================================
    // PAUSABLE ERRORS (11-20)
    // =========================================================================

    /// Contract is currently paused
    ContractPaused = 11,

    /// Contract is not currently paused
    ContractNotPaused = 12,

    // =========================================================================
    // BLOCKLIST/FREEZE ERRORS (21-30)
    // =========================================================================

    /// Account is frozen and cannot perform operations
    AccountFrozen = 21,

    /// Account is not frozen
    AccountNotFrozen = 22,

    /// Cannot freeze the zero address
    CannotFreezeZeroAddress = 23,

    /// Cannot perform operation on frozen account
    OperationOnFrozenAccount = 24,

    // =========================================================================
    // TOKEN OPERATION ERRORS (31-50)
    // =========================================================================

    /// Insufficient balance for this operation
    InsufficientBalance = 31,

    /// Insufficient allowance for this operation
    InsufficientAllowance = 32,

    /// Amount must be positive
    NegativeAmount = 33,

    /// Arithmetic overflow occurred
    OverflowError = 34,

    /// Invalid recipient address
    InvalidRecipient = 35,

    /// Invalid sender address
    InvalidSender = 36,

    /// Amount exceeds maximum allowed
    AmountTooLarge = 37,

    /// Cannot transfer to self
    CannotTransferToSelf = 38,

    // =========================================================================
    // REQUEST TRACKING ERRORS (51-60)
    // =========================================================================

    /// A request with this ID already exists
    RequestAlreadyExists = 51,

    /// Request not found
    RequestNotFound = 52,

    /// Invalid request ID format
    InvalidRequestId = 53,

    // =========================================================================
    // RESCUE OPERATION ERRORS (61-70)
    // =========================================================================

    /// Cannot rescue the contract's own token
    CannotRescueOwnToken = 61,

    /// Rescue amount exceeds available balance
    InsufficientRescueBalance = 62,

    // =========================================================================
    // UPGRADE ERRORS (71-80)
    // =========================================================================

    /// Migration failed during upgrade
    MigrationFailed = 71,

    /// Invalid WASM hash provided
    InvalidWasmHash = 72,

    // =========================================================================
    // INITIALIZATION ERRORS (81-90)
    // =========================================================================

    /// Contract has already been initialized
    AlreadyInitialized = 81,

    /// Contract has not been initialized
    NotInitialized = 82,
}
