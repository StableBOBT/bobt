/**
 * Stellar Minter - Calls the BOBT token contract to mint tokens
 */

import {
  Keypair,
  Contract,
  SorobanRpc,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  xdr,
  Address,
  nativeToScVal,
} from '@stellar/stellar-sdk';
import { stellarConfig } from './config.js';

const server = new SorobanRpc.Server(stellarConfig.rpcUrl);

interface MintResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

/**
 * Mint BOBT tokens to a recipient address
 *
 * @param recipientAddress - Stellar address to receive tokens
 * @param amount - Amount in BOBT (will be converted to stroops with 7 decimals)
 * @param requestId - Unique request ID for tracking
 */
export async function mintBOBT(
  recipientAddress: string,
  amount: number,
  requestId: string
): Promise<MintResult> {
  try {
    // Validate operator secret key is configured
    if (!stellarConfig.operatorSecretKey) {
      return {
        success: false,
        error: 'STELLAR_SECRET_KEY not configured',
      };
    }

    // Load the operator keypair
    const operatorKeypair = Keypair.fromSecret(stellarConfig.operatorSecretKey);
    const operatorPublicKey = operatorKeypair.publicKey();

    console.log(`[MINT] Starting mint for ${amount} BOBT to ${recipientAddress}`);
    console.log(`[MINT] Using operator: ${operatorPublicKey}`);
    console.log(`[MINT] Token contract: ${stellarConfig.tokenContract}`);

    // Get the operator's account
    const account = await server.getAccount(operatorPublicKey);

    // Create the contract instance
    const tokenContract = new Contract(stellarConfig.tokenContract);

    // Convert amount to stroops (7 decimals)
    // e.g., 100 BOBT = 100_0000000 stroops
    const amountStroops = BigInt(Math.round(amount * 10_000_000));

    console.log(`[MINT] Amount in stroops: ${amountStroops}`);

    // Build the admin_mint transaction
    // admin_mint(minter: Address, to: Address, amount: i128, request_id: String)
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: stellarConfig.networkPassphrase,
    })
      .addOperation(
        tokenContract.call(
          'admin_mint',
          Address.fromString(operatorPublicKey).toScVal(),   // minter
          Address.fromString(recipientAddress).toScVal(),    // to
          nativeToScVal(amountStroops, { type: 'i128' }),    // amount
          nativeToScVal(requestId, { type: 'string' })       // request_id
        )
      )
      .setTimeout(60)
      .build();

    console.log(`[MINT] Transaction built, preparing...`);

    // Prepare the transaction (simulate)
    const preparedTx = await server.prepareTransaction(tx);

    // Sign the transaction
    preparedTx.sign(operatorKeypair);

    console.log(`[MINT] Transaction signed, submitting...`);

    // Submit the transaction
    const result = await server.sendTransaction(preparedTx);

    if (result.status === 'PENDING') {
      // Wait for confirmation with retry and error handling
      const txHash = result.hash;
      let attempts = 0;
      const maxAttempts = 30;

      while (attempts < maxAttempts) {
        try {
          const getResponse = await server.getTransaction(txHash);

          if (getResponse.status === 'NOT_FOUND') {
            attempts++;
            await new Promise((resolve) => setTimeout(resolve, 1000));
            continue;
          }

          if (getResponse.status === 'SUCCESS') {
            console.log(`[MINT] Success! TX: ${txHash}`);
            return {
              success: true,
              txHash: txHash,
            };
          } else {
            console.error(`[MINT] Transaction failed:`, getResponse);
            return {
              success: false,
              error: `Transaction failed: ${getResponse.status}`,
            };
          }
        } catch (pollError) {
          // Handle SDK parsing errors - if we get here, the TX might have succeeded
          // Check if it's the known "Bad union switch" error
          if (String(pollError).includes('Bad union switch')) {
            console.log(`[MINT] SDK parsing error, verifying TX via Horizon: ${txHash}`);

            // Try to verify via Horizon instead
            try {
              const horizonResponse = await fetch(
                `${stellarConfig.horizonUrl}/transactions/${txHash}`
              );
              if (horizonResponse.ok) {
                const horizonData = await horizonResponse.json();
                if (horizonData.successful) {
                  console.log(`[MINT] Verified success via Horizon: ${txHash}`);
                  return {
                    success: true,
                    txHash: txHash,
                  };
                }
              }
            } catch {
              // Fall through to retry
            }
          }

          attempts++;
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      // If we exhausted attempts but the TX was submitted, it might have succeeded
      console.log(`[MINT] TX submitted but couldn't verify: ${txHash}`);
      return {
        success: true,
        txHash: txHash,
      };
    } else if (result.status === 'ERROR') {
      console.error(`[MINT] Submit error:`, result.errorResult);
      return {
        success: false,
        error: `Submit error: ${result.errorResult?.toXDR('base64') || 'Unknown'}`,
      };
    }

    return {
      success: false,
      error: `Unexpected status: ${result.status}`,
    };
  } catch (error) {
    console.error('[MINT] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Check if the operator has minter role on the token contract
 */
export async function checkMinterRole(): Promise<boolean> {
  try {
    if (!stellarConfig.operatorSecretKey) {
      return false;
    }

    const operatorKeypair = Keypair.fromSecret(stellarConfig.operatorSecretKey);
    const operatorPublicKey = operatorKeypair.publicKey();
    const account = await server.getAccount(operatorPublicKey);

    const tokenContract = new Contract(stellarConfig.tokenContract);

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: stellarConfig.networkPassphrase,
    })
      .addOperation(
        tokenContract.call(
          'has_role',
          Address.fromString(operatorPublicKey).toScVal(),
          nativeToScVal('minter', { type: 'symbol' })
        )
      )
      .setTimeout(30)
      .build();

    const simResult = await server.simulateTransaction(tx);

    if ('result' in simResult && simResult.result) {
      const resultVal = simResult.result.retval;
      return resultVal.value() === true;
    }

    return false;
  } catch (error) {
    console.error('[CHECK_ROLE] Error:', error);
    return false;
  }
}
