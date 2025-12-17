// Transaction History Hook using Horizon API
'use client';

import { useState, useEffect, useCallback } from 'react';
import { getBOBTClient } from '../client';

export interface Transaction {
  id: string;
  hash: string;
  createdAt: string;
  type: 'mint' | 'burn' | 'transfer' | 'other';
  amount?: string;
  asset?: string;
  from?: string;
  to?: string;
  memo?: string;
  successful: boolean;
  ledger: number;
}

export interface UseTransactionHistoryReturn {
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  hasMore: boolean;
  loadMore: () => Promise<void>;
}

// Helper to parse operation type
function parseOperationType(op: any): Transaction['type'] {
  if (op.type === 'invoke_host_function') {
    // Check if it's a mint or burn based on contract function
    const func = op.function;
    if (func?.includes('mint')) return 'mint';
    if (func?.includes('burn')) return 'burn';
  }

  if (op.type === 'payment' || op.type === 'path_payment_strict_receive') {
    return 'transfer';
  }

  return 'other';
}

// Helper to format transaction from Horizon response
function formatTransaction(record: any): Transaction {
  return {
    id: record.id,
    hash: record.transaction_hash || record.hash,
    createdAt: record.created_at,
    type: parseOperationType(record),
    amount: record.amount,
    asset: record.asset_code || record.asset_type,
    from: record.from || record.source_account,
    to: record.to,
    memo: record.memo,
    successful: record.transaction_successful !== false,
    ledger: record.ledger || 0,
  };
}

export function useTransactionHistory(
  address: string | null,
  limit: number = 20
): UseTransactionHistoryReturn {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);

  const fetchTransactions = useCallback(async (page: number = 0, append: boolean = false) => {
    if (!address) {
      setTransactions([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const client = getBOBTClient();

      // Fetch operations (more detailed than transactions)
      const operations = await client.getAccountOperations(address, limit);

      const formattedTxs = operations.map(formatTransaction);

      if (append) {
        setTransactions(prev => [...prev, ...formattedTxs]);
      } else {
        setTransactions(formattedTxs);
      }

      setHasMore(operations.length === limit);
      setCurrentPage(page);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch transactions';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [address, limit]);

  // Fetch on mount and address change
  useEffect(() => {
    fetchTransactions(0, false);
  }, [fetchTransactions]);

  const refetch = useCallback(async () => {
    await fetchTransactions(0, false);
  }, [fetchTransactions]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return;
    await fetchTransactions(currentPage + 1, true);
  }, [fetchTransactions, currentPage, hasMore, isLoading]);

  return {
    transactions,
    isLoading,
    error,
    refetch,
    hasMore,
    loadMore,
  };
}
