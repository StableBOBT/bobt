// Transfer Hook for sending BOBT between wallets
'use client';

import { useState, useCallback } from 'react';
import * as StellarSdk from '@stellar/stellar-sdk';
import { getBOBTClient } from '../client';
import { NETWORKS, CONTRACTS, toStroops, BOBT_DECIMALS } from '../config';
import { getWalletKit } from '../wallet-kit';
import type { TransactionResult } from '../types';

export interface UseTransferReturn {
  isProcessing: boolean;
  error: string | null;
  lastTxHash: string | null;
  transfer: (toAddress: string, amount: number, memo?: string) => Promise<TransactionResult>;
  validateAddress: (address: string) => boolean;
}

export function useTransfer(publicKey: string | null): UseTransferReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);

  // Validate Stellar address
  const validateAddress = useCallback((address: string): boolean => {
    try {
      StellarSdk.StrKey.decodeEd25519PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }, []);

  // Transfer BOBT to another address
  const transfer = useCallback(async (
    toAddress: string,
    amount: number,
    memo?: string
  ): Promise<TransactionResult> => {
    if (!publicKey) {
      return { success: false, error: 'Wallet not connected' };
    }

    if (!validateAddress(toAddress)) {
      return { success: false, error: 'Invalid destination address' };
    }

    if (toAddress === publicKey) {
      return { success: false, error: 'Cannot send to yourself' };
    }

    if (amount <= 0) {
      return { success: false, error: 'Amount must be greater than 0' };
    }

    setIsProcessing(true);
    setError(null);
    setLastTxHash(null);

    try {
      const client = getBOBTClient();
      const rpc = client.getRpc();
      const contracts = client.getContracts();
      const networkConfig = client.getNetworkConfig();

      // Get account
      const account = await rpc.getAccount(publicKey);

      // Build transfer transaction
      const contract = new StellarSdk.Contract(contracts.bobtToken);
      const amountStroops = toStroops(amount, BOBT_DECIMALS);

      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: '100000',
        networkPassphrase: networkConfig.networkPassphrase,
      })
        .addOperation(
          contract.call(
            'transfer',
            StellarSdk.Address.fromString(publicKey).toScVal(),
            StellarSdk.Address.fromString(toAddress).toScVal(),
            StellarSdk.nativeToScVal(amountStroops, { type: 'i128' })
          )
        );

      // Add memo if provided
      if (memo) {
        tx.addMemo(StellarSdk.Memo.text(memo.slice(0, 28))); // Max 28 chars
      }

      const builtTx = tx.setTimeout(30).build();

      // Prepare transaction
      const preparedTx = await rpc.prepareTransaction(builtTx);

      // Sign with wallet
      const kit = getWalletKit();
      const { signedTxXdr } = await kit.signTransaction(preparedTx.toXDR());

      // Submit transaction
      const result = await client.submitTransaction(signedTxXdr);

      if (result.success) {
        setLastTxHash(result.txHash || null);
      } else {
        setError(result.error || 'Transaction failed');
      }

      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsProcessing(false);
    }
  }, [publicKey, validateAddress]);

  return {
    isProcessing,
    error,
    lastTxHash,
    transfer,
    validateAddress,
  };
}
