#!/usr/bin/env node
/**
 * BOBT Price Updater
 *
 * Fetches BOB/USDT P2P prices from CriptoYa and updates the Oracle contract.
 *
 * Usage:
 *   npm run update-prices
 *
 * Environment variables:
 *   STELLAR_SECRET_KEY  - Operator's secret key
 *   ORACLE_CONTRACT_ID  - Oracle contract address
 *   NETWORK             - 'testnet' or 'mainnet'
 *
 * Data flow:
 *   CriptoYa API -> This Script -> Oracle Contract -> Treasury/BOBT
 */

import 'dotenv/config';
import { loadConfig } from './config.js';
import { fetchAllPrices, countSuccessfulFetches, getMostRecentTimestamp } from './criptoya.js';
import { updateOraclePrices, checkOperatorStatus } from './stellar.js';

// Minimum number of exchanges required to update
const MIN_EXCHANGES = 1;

async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log('BOBT Price Updater');
  console.log('='.repeat(60));
  console.log(`Started at: ${new Date().toISOString()}`);

  try {
    // Load configuration
    const config = loadConfig();
    console.log(`\nConfiguration:`);
    console.log(`  Network: ${config.network}`);
    console.log(`  RPC URL: ${config.rpcUrl}`);
    console.log(`  Oracle:  ${config.oracleContractId.slice(0, 12)}...`);

    // Check operator status
    console.log('\nChecking operator authorization...');
    const operatorStatus = await checkOperatorStatus(config);
    if (!operatorStatus.isOperator) {
      console.error(`ERROR: Not authorized as operator. ${operatorStatus.error || ''}`);
      console.log('Make sure the STELLAR_SECRET_KEY is for an authorized operator.');
      process.exit(1);
    }
    console.log('  Operator is authorized');

    // Fetch prices from CriptoYa
    const prices = await fetchAllPrices(config.criptoYaBaseUrl);

    // Check minimum exchanges
    const successCount = countSuccessfulFetches(prices);
    console.log(`\nSuccessfully fetched: ${successCount}/3 exchanges`);

    if (successCount < MIN_EXCHANGES) {
      console.error(`ERROR: Need at least ${MIN_EXCHANGES} exchange(s), got ${successCount}`);
      process.exit(1);
    }

    // Update Oracle contract
    const result = await updateOraclePrices(config, prices);

    if (result.success) {
      console.log('\n' + '='.repeat(60));
      console.log('SUCCESS');
      console.log('='.repeat(60));
      console.log(`Transaction: ${result.txHash}`);
      console.log(`Timestamp:   ${getMostRecentTimestamp(prices)}`);
      console.log(`Exchanges:   ${successCount}`);

      // Explorer link
      const explorerBase =
        config.network === 'mainnet'
          ? 'https://stellar.expert/explorer/public'
          : 'https://stellar.expert/explorer/testnet';
      console.log(`\nExplorer: ${explorerBase}/tx/${result.txHash}`);
    } else {
      console.error('\n' + '='.repeat(60));
      console.error('FAILED');
      console.error('='.repeat(60));
      console.error(`Error: ${result.error}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('\nFATAL ERROR:', error);
    process.exit(1);
  }

  console.log(`\nCompleted at: ${new Date().toISOString()}`);
}

// Run
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
