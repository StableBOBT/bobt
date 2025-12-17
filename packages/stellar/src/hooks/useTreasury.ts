// Treasury Hook for Mint/Burn operations
'use client';

import { useState, useCallback } from 'react';
import { getBOBTClient } from '../client';
import { fromStroops, toStroops, BOBT_DECIMALS, USDT_DECIMALS } from '../config';
import type { TransactionResult } from '../types';
import { getWalletKit } from '../wallet-kit';

export interface UseTreasuryReturn {
  // State
  isProcessing: boolean;
  error: string | null;
  lastTxHash: string | null;

  // Estimate functions
  estimateBOBTForUSDT: (usdtAmount: number) => Promise<number | null>;
  estimateUSDTForBOBT: (bobtAmount: number) => Promise<number | null>;

  // Trade functions
  mint: (usdtAmount: number, externalRef?: string) => Promise<TransactionResult>;
  burn: (bobtAmount: number, externalRef?: string) => Promise<TransactionResult>;

  // Oracle
  isOracleValid: () => Promise<boolean>;
  getCurrentPrice: () => Promise<number | null>;
}

export function useTreasury(publicKey: string | null): UseTreasuryReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);

  // Estimate BOBT for USDT amount (mint)
  const estimateBOBTForUSDT = useCallback(async (usdtAmount: number): Promise<number | null> => {
    try {
      const client = getBOBTClient();
      const usdtStroops = toStroops(usdtAmount, USDT_DECIMALS);
      const bobtStroops = await client.estimateBOBTForUSDT(usdtStroops);

      if (bobtStroops === null) return null;
      return fromStroops(bobtStroops, BOBT_DECIMALS);
    } catch (err) {
      console.error('Failed to estimate BOBT:', err);
      return null;
    }
  }, []);

  // Estimate USDT for BOBT amount (burn)
  const estimateUSDTForBOBT = useCallback(async (bobtAmount: number): Promise<number | null> => {
    try {
      const client = getBOBTClient();
      const bobtStroops = toStroops(bobtAmount, BOBT_DECIMALS);
      const usdtStroops = await client.estimateUSDTForBOBT(bobtStroops);

      if (usdtStroops === null) return null;
      return fromStroops(usdtStroops, USDT_DECIMALS);
    } catch (err) {
      console.error('Failed to estimate USDT:', err);
      return null;
    }
  }, []);

  // Check if oracle is valid
  const isOracleValid = useCallback(async (): Promise<boolean> => {
    try {
      const client = getBOBTClient();
      return await client.isTreasuryOracleValid();
    } catch {
      return false;
    }
  }, []);

  // Get current price from treasury
  const getCurrentPrice = useCallback(async (): Promise<number | null> => {
    try {
      const client = getBOBTClient();
      const price = await client.getTreasuryPrice();
      if (price === null) return null;
      return fromStroops(price, BOBT_DECIMALS);
    } catch {
      return null;
    }
  }, []);

  // Mint BOBT (propose mint from USDT)
  const mint = useCallback(async (
    usdtAmount: number,
    externalRef: string = `mint-${Date.now()}`
  ): Promise<TransactionResult> => {
    if (!publicKey) {
      return { success: false, error: 'Wallet not connected' };
    }

    setIsProcessing(true);
    setError(null);
    setLastTxHash(null);

    try {
      const client = getBOBTClient();

      // Check oracle validity first
      const oracleValid = await client.isTreasuryOracleValid();
      if (!oracleValid) {
        const err = 'Oracle price is stale. Cannot proceed with mint.';
        setError(err);
        return { success: false, error: err };
      }

      // Build the transaction
      const tx = await client.buildMintProposalTx(
        publicKey,
        publicKey, // mint to self
        usdtAmount,
        externalRef
      );

      if (!tx) {
        const err = 'Failed to build mint transaction';
        setError(err);
        return { success: false, error: err };
      }

      // Sign with wallet
      const kit = getWalletKit();
      const { signedTxXdr } = await kit.signTransaction(tx.toXDR());

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
  }, [publicKey]);

  // Burn BOBT (propose burn)
  const burn = useCallback(async (
    bobtAmount: number,
    externalRef: string = `burn-${Date.now()}`
  ): Promise<TransactionResult> => {
    if (!publicKey) {
      return { success: false, error: 'Wallet not connected' };
    }

    setIsProcessing(true);
    setError(null);
    setLastTxHash(null);

    try {
      const client = getBOBTClient();

      // Check oracle validity first
      const oracleValid = await client.isTreasuryOracleValid();
      if (!oracleValid) {
        const err = 'Oracle price is stale. Cannot proceed with burn.';
        setError(err);
        return { success: false, error: err };
      }

      // Build the transaction
      const tx = await client.buildBurnProposalTx(
        publicKey,
        publicKey, // burn from self
        bobtAmount,
        externalRef
      );

      if (!tx) {
        const err = 'Failed to build burn transaction';
        setError(err);
        return { success: false, error: err };
      }

      // Sign with wallet
      const kit = getWalletKit();
      const { signedTxXdr } = await kit.signTransaction(tx.toXDR());

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
  }, [publicKey]);

  return {
    isProcessing,
    error,
    lastTxHash,
    estimateBOBTForUSDT,
    estimateUSDTForBOBT,
    mint,
    burn,
    isOracleValid,
    getCurrentPrice,
  };
}
