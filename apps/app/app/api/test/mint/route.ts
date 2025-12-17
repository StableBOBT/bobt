import { NextRequest, NextResponse } from 'next/server';
import {
  Keypair,
  Contract,
  SorobanRpc,
  TransactionBuilder,
  BASE_FEE,
  Address,
  nativeToScVal,
} from '@stellar/stellar-sdk';

const STELLAR_CONFIG = {
  rpcUrl: process.env.STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org',
  networkPassphrase: process.env.STELLAR_NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015',
  tokenContract: process.env.NEXT_PUBLIC_TOKEN_CONTRACT || process.env.TOKEN_CONTRACT_ID || '',
  secretKey: process.env.STELLAR_SECRET_KEY || '',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userAddress, amount } = body;

    if (!userAddress || !amount) {
      return NextResponse.json(
        { success: false, error: 'userAddress and amount are required' },
        { status: 400 }
      );
    }

    if (!STELLAR_CONFIG.secretKey) {
      return NextResponse.json(
        { success: false, error: 'STELLAR_SECRET_KEY not configured on server' },
        { status: 500 }
      );
    }

    if (!STELLAR_CONFIG.tokenContract) {
      return NextResponse.json(
        { success: false, error: 'TOKEN_CONTRACT_ID not configured' },
        { status: 500 }
      );
    }

    // Initialize Stellar
    const server = new SorobanRpc.Server(STELLAR_CONFIG.rpcUrl);
    const operatorKeypair = Keypair.fromSecret(STELLAR_CONFIG.secretKey);
    const operatorPublicKey = operatorKeypair.publicKey();

    console.log(`[MINT] Starting mint for ${amount} BOBT to ${userAddress}`);

    // Get the operator's account
    const account = await server.getAccount(operatorPublicKey);

    // Create the contract instance
    const tokenContract = new Contract(STELLAR_CONFIG.tokenContract);

    // Convert amount to stroops (7 decimals)
    const amountStroops = BigInt(Math.round(Number(amount) * 10_000_000));
    const requestId = `vercel-${Date.now()}`;

    // Build the admin_mint transaction
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: STELLAR_CONFIG.networkPassphrase,
    })
      .addOperation(
        tokenContract.call(
          'admin_mint',
          Address.fromString(operatorPublicKey).toScVal(),
          Address.fromString(userAddress).toScVal(),
          nativeToScVal(amountStroops, { type: 'i128' }),
          nativeToScVal(requestId, { type: 'string' })
        )
      )
      .setTimeout(30)
      .build();

    // Simulate to get resource estimates
    const simResult = await server.simulateTransaction(tx);

    if (SorobanRpc.Api.isSimulationError(simResult)) {
      console.error('[MINT] Simulation error:', simResult.error);
      return NextResponse.json(
        { success: false, error: `Simulation failed: ${simResult.error}` },
        { status: 500 }
      );
    }

    // Prepare and sign the transaction
    const preparedTx = SorobanRpc.assembleTransaction(tx, simResult).build();
    preparedTx.sign(operatorKeypair);

    // Submit the transaction
    const sendResult = await server.sendTransaction(preparedTx);
    const txHash = sendResult.hash;

    console.log(`[MINT] Transaction submitted: ${txHash}`);

    // Wait for confirmation
    if (sendResult.status === 'PENDING') {
      let attempts = 0;
      const maxAttempts = 30;

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const txStatus = await server.getTransaction(txHash);
        attempts++;

        if (txStatus.status === 'SUCCESS') {
          console.log(`[MINT] Transaction confirmed: ${txHash}`);
          return NextResponse.json({
            success: true,
            data: {
              txHash,
              amount,
              userAddress,
              stellarExplorer: `https://stellar.expert/explorer/testnet/tx/${txHash}`,
            },
          });
        }

        if (txStatus.status === 'FAILED') {
          return NextResponse.json(
            { success: false, error: 'Transaction failed on-chain' },
            { status: 500 }
          );
        }

        // NOT_FOUND means still processing, continue waiting
        if (txStatus.status !== 'NOT_FOUND') {
          break;
        }
      }
    }

    // Return success with pending status if we couldn't confirm
    return NextResponse.json({
      success: true,
      data: {
        txHash,
        amount,
        userAddress,
        status: 'submitted',
        message: 'Transaction submitted, check explorer for final status',
        stellarExplorer: `https://stellar.expert/explorer/testnet/tx/${txHash}`,
      },
    });

  } catch (error) {
    console.error('[MINT] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Mint failed' },
      { status: 500 }
    );
  }
}
