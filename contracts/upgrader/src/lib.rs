//! BOBT Upgrader Contract
//!
//! This auxiliary contract facilitates atomic upgrades with migration
//! for the BOBT stablecoin contract. It wraps both the upgrade and
//! migrate invocations in a single transaction.

#![no_std]

use soroban_sdk::{contract, contractimpl, symbol_short, Address, BytesN, Env, IntoVal, Val, Vec};

#[contract]
pub struct Upgrader;

#[contractimpl]
impl Upgrader {
    /// Performs an atomic upgrade and migration of a target contract.
    ///
    /// This function:
    /// 1. Calls the `upgrade` function on the target contract
    /// 2. Immediately calls the `migrate` function to apply any necessary migrations
    ///
    /// Both operations happen in the same transaction, ensuring atomicity.
    ///
    /// # Arguments
    /// * `contract_address` - The address of the contract to upgrade
    /// * `operator` - The address of the authorized operator
    /// * `wasm_hash` - The hash of the new WASM binary
    /// * `migration_data` - Data to pass to the migrate function
    ///
    /// # Authorization
    /// Requires authorization from the `operator`
    pub fn upgrade_and_migrate(
        env: Env,
        contract_address: Address,
        operator: Address,
        wasm_hash: BytesN<32>,
        migration_data: Vec<Val>,
    ) {
        operator.require_auth();

        // Call upgrade on the target contract
        let upgrade_args: Vec<Val> = Vec::from_array(
            &env,
            [operator.clone().into_val(&env), wasm_hash.into_val(&env)],
        );
        env.invoke_contract::<()>(&contract_address, &symbol_short!("upgrade"), upgrade_args);

        // Call migrate on the target contract
        env.invoke_contract::<()>(&contract_address, &symbol_short!("migrate"), migration_data);
    }

    /// Simple upgrade without migration
    ///
    /// # Arguments
    /// * `contract_address` - The address of the contract to upgrade
    /// * `operator` - The address of the authorized operator
    /// * `wasm_hash` - The hash of the new WASM binary
    pub fn upgrade_only(
        env: Env,
        contract_address: Address,
        operator: Address,
        wasm_hash: BytesN<32>,
    ) {
        operator.require_auth();

        let upgrade_args: Vec<Val> = Vec::from_array(
            &env,
            [operator.clone().into_val(&env), wasm_hash.into_val(&env)],
        );
        env.invoke_contract::<()>(&contract_address, &symbol_short!("upgrade"), upgrade_args);
    }
}

#[cfg(test)]
mod test;
