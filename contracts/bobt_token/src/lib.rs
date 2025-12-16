//! BOBT Stablecoin - Professional grade stablecoin on Stellar Soroban
//!
//! This crate implements a fully-featured stablecoin with:
//! - SEP-41 compliant token interface
//! - Role-based access control
//! - Pausable functionality
//! - Blacklist/freeze capability
//! - Clawback support
//! - Request tracking
//! - Upgradeable contract
//!
//! # Architecture
//!
//! The contract is organized into several modules:
//! - `contract`: Main contract implementation
//! - `storage`: Storage keys, roles, and data types
//! - `errors`: Custom error types
//! - `events`: Event emission functions

#![no_std]

mod contract;
mod errors;
mod events;
mod storage;

pub use contract::BOBTToken;
pub use errors::BOBTError;
pub use storage::{BurnRequest, MintRequest};

#[cfg(test)]
mod test;
