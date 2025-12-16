//! Error types for BOBT P2P Oracle

use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum OracleError {
    // Initialization (1-10)
    AlreadyInitialized = 1,
    NotInitialized = 2,

    // Authorization (11-20)
    Unauthorized = 11,
    NotAnOperator = 12,

    // Price errors (21-30)
    InvalidPrice = 21,
    PriceStale = 22,
    PriceDeviationTooHigh = 23,
    InsufficientSources = 24,
    InvalidExchange = 25,

    // Configuration (31-40)
    InvalidConfiguration = 31,
    OperatorAlreadyExists = 32,
    OperatorNotFound = 33,
}
