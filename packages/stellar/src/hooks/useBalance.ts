// Balance Hook
'use client';

import { useState, useEffect, useCallback } from 'react';
import { getBOBTClient } from '../client';
import { fromStroops, formatBOBT, BOBT_DECIMALS } from '../config';

export interface UseBalanceReturn {
  balance: bigint;
  balanceNumber: number;
  balanceFormatted: string;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useBalance(address: string | null): UseBalanceReturn {
  const [balance, setBalance] = useState<bigint>(BigInt(0));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!address) {
      setBalance(BigInt(0));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const client = getBOBTClient();
      const bal = await client.getBalance(address);
      setBalance(bal);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch balance';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  // Fetch on address change
  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return {
    balance,
    balanceNumber: fromStroops(balance, BOBT_DECIMALS),
    balanceFormatted: formatBOBT(balance),
    isLoading,
    error,
    refetch: fetchBalance,
  };
}
