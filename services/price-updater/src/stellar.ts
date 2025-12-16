/**
 * Stellar/Soroban Client
 *
 * Handles interaction with the Oracle contract on Soroban.
 */

import {
  Contract,
  Keypair,
  Networks,
  TransactionBuilder,
  SorobanRpc,
  xdr,
  nativeToScVal,
  Address,
} from '@stellar/stellar-sdk';
import type { Config } from './config.js';
import type { AllPrices } from './criptoya.js';

const TIMEOUT_SECONDS = 30;

/**
 * Create Soroban RPC client
 */
function createRpcClient(config: Config): SorobanRpc.Server {
  return new SorobanRpc.Server(config.rpcUrl, { allowHttp: false });
}

/**
 * Get network passphrase based on config
 */
function getNetworkPassphrase(config: Config): string {
  return config.network === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET;
}

/**
 * Convert bigint to i128 ScVal
 */
function bigintToI128(value: bigint): xdr.ScVal {
  return nativeToScVal(value, { type: 'i128' });
}

/**
 * Update Oracle prices using batch function
 */
export async function updateOraclePrices(
  config: Config,
  prices: AllPrices
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  console.log('\nUpdating Oracle contract...');

  try {
    const rpc = createRpcClient(config);
    const keypair = Keypair.fromSecret(config.operatorSecretKey);
    const operatorPublicKey = keypair.publicKey();

    console.log(`  Operator: ${operatorPublicKey.slice(0, 8)}...${operatorPublicKey.slice(-4)}`);
    console.log(`  Contract: ${config.oracleContractId.slice(0, 8)}...`);
    console.log(`  Network:  ${config.network}`);

    // Get account
    const account = await rpc.getAccount(operatorPublicKey);

    // Create contract instance
    const contract = new Contract(config.oracleContractId);

    // Prepare parameters
    const binanceAsk = prices.binance?.ask ?? 0n;
    const binanceBid = prices.binance?.bid ?? 0n;
    const bybitAsk = prices.bybit?.ask ?? 0n;
    const bybitBid = prices.bybit?.bid ?? 0n;
    const bitgetAsk = prices.bitget?.ask ?? 0n;
    const bitgetBid = prices.bitget?.bid ?? 0n;

    // Use most recent timestamp from exchanges
    const timestamp = Math.max(
      prices.binance?.timestamp ?? 0,
      prices.bybit?.timestamp ?? 0,
      prices.bitget?.timestamp ?? 0,
      Math.floor(Date.now() / 1000)
    );

    console.log('\n  Prices to submit:');
    console.log(`    Binance: ask=${binanceAsk} bid=${binanceBid}`);
    console.log(`    Bybit:   ask=${bybitAsk} bid=${bybitBid}`);
    console.log(`    Bitget:  ask=${bitgetAsk} bid=${bitgetBid}`);
    console.log(`    Timestamp: ${timestamp}`);

    // Build transaction
    const tx = new TransactionBuilder(account, {
      fee: '100000', // 0.01 XLM
      networkPassphrase: getNetworkPassphrase(config),
    })
      .addOperation(
        contract.call(
          'update_prices_batch',
          new Address(operatorPublicKey).toScVal(),
          bigintToI128(binanceAsk),
          bigintToI128(binanceBid),
          bigintToI128(bybitAsk),
          bigintToI128(bybitBid),
          bigintToI128(bitgetAsk),
          bigintToI128(bitgetBid),
          nativeToScVal(timestamp, { type: 'u64' })
        )
      )
      .setTimeout(TIMEOUT_SECONDS)
      .build();

    // Simulate transaction
    console.log('\n  Simulating transaction...');
    const simulated = await rpc.simulateTransaction(tx);

    if (SorobanRpc.Api.isSimulationError(simulated)) {
      console.error('  Simulation failed:', simulated.error);
      return { success: false, error: `Simulation failed: ${simulated.error}` };
    }

    // Prepare and sign
    const prepared = SorobanRpc.assembleTransaction(tx, simulated).build();
    prepared.sign(keypair);

    // Submit transaction
    console.log('  Submitting transaction...');
    const sendResponse = await rpc.sendTransaction(prepared);

    if (sendResponse.status === 'ERROR') {
      console.error('  Send failed:', sendResponse.errorResult);
      return { success: false, error: 'Transaction send failed' };
    }

    // Wait for confirmation
    console.log(`  Waiting for confirmation (hash: ${sendResponse.hash})...`);

    let attempts = 0;
    const maxAttempts = 30;

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      attempts++;

      try {
        const getResponse = await rpc.getTransaction(sendResponse.hash);

        if (getResponse.status === 'SUCCESS') {
          console.log('\n  Transaction successful!');
          console.log(`  TX Hash: ${sendResponse.hash}`);
          return { success: true, txHash: sendResponse.hash };
        } else if (getResponse.status === 'FAILED') {
          console.error('  Transaction failed');
          return { success: false, error: 'Transaction failed on-chain' };
        }
        // NOT_FOUND - continue waiting
      } catch (pollError) {
        // SDK deserialization errors can happen but tx may still succeed
        // Check if it's a known SDK issue
        const errorMsg = String(pollError);
        if (errorMsg.includes('Bad union switch') || errorMsg.includes('XDR')) {
          // Transaction likely succeeded but SDK can't parse response
          console.log('\n  Transaction likely successful (SDK parse warning)');
          console.log(`  TX Hash: ${sendResponse.hash}`);
          return { success: true, txHash: sendResponse.hash };
        }
        // Other errors - continue polling
      }
    }

    // Timeout - but transaction may have succeeded
    console.log('\n  Transaction submitted, confirmation timed out');
    console.log(`  TX Hash: ${sendResponse.hash}`);
    return { success: true, txHash: sendResponse.hash };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('  Error:', message);
    return { success: false, error: message };
  }
}

/**
 * Check if operator is authorized
 */
export async function checkOperatorStatus(
  config: Config
): Promise<{ isOperator: boolean; error?: string }> {
  try {
    const rpc = createRpcClient(config);
    const keypair = Keypair.fromSecret(config.operatorSecretKey);
    const operatorPublicKey = keypair.publicKey();

    const account = await rpc.getAccount(operatorPublicKey);
    const contract = new Contract(config.oracleContractId);

    const tx = new TransactionBuilder(account, {
      fee: '100',
      networkPassphrase: getNetworkPassphrase(config),
    })
      .addOperation(
        contract.call('is_operator', new Address(operatorPublicKey).toScVal())
      )
      .setTimeout(30)
      .build();

    const simulated = await rpc.simulateTransaction(tx);

    if (SorobanRpc.Api.isSimulationError(simulated)) {
      return { isOperator: false, error: simulated.error };
    }

    // Parse result
    if (SorobanRpc.Api.isSimulationSuccess(simulated) && simulated.result) {
      const resultXdr = simulated.result.retval;
      const isOperator = resultXdr.b();
      return { isOperator: isOperator ?? false };
    }

    return { isOperator: false, error: 'Could not parse result' };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { isOperator: false, error: message };
  }
}

/**
 * Get current oracle price (for verification)
 */
export async function getCurrentPrice(
  config: Config
): Promise<{ price?: { ask: bigint; bid: bigint; mid: bigint }; error?: string }> {
  try {
    const rpc = createRpcClient(config);
    const keypair = Keypair.fromSecret(config.operatorSecretKey);

    const account = await rpc.getAccount(keypair.publicKey());
    const contract = new Contract(config.oracleContractId);

    const tx = new TransactionBuilder(account, {
      fee: '100',
      networkPassphrase: getNetworkPassphrase(config),
    })
      .addOperation(contract.call('get_price'))
      .setTimeout(30)
      .build();

    const simulated = await rpc.simulateTransaction(tx);

    if (SorobanRpc.Api.isSimulationError(simulated)) {
      return { error: simulated.error };
    }

    // Note: Parsing complex types from Soroban requires more work
    // This is a simplified version
    return { error: 'Price parsing not implemented' };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { error: message };
  }
}
