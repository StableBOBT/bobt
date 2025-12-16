// Wallet Connection Hook
'use client';

import { useState, useCallback, useEffect } from 'react';
import { isConnected, getAddress, getNetwork, signTransaction, requestAccess } from '@stellar/freighter-api';
import type { WalletState } from '../types';

export function useWallet() {
  const [wallet, setWallet] = useState<WalletState>({
    isConnected: false,
    publicKey: null,
    network: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check initial connection
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const connectedResult = await isConnected();
        if (connectedResult.isConnected) {
          const addressResult = await getAddress();
          const networkResult = await getNetwork();

          if (!addressResult.error && !networkResult.error) {
            setWallet({
              isConnected: true,
              publicKey: addressResult.address,
              network: networkResult.network,
            });
          }
        }
      } catch (err) {
        console.error('Failed to check wallet connection:', err);
      } finally {
        setIsLoading(false);
      }
    };

    checkConnection();
  }, []);

  // Connect wallet
  const connect = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const connectedResult = await isConnected();
      if (!connectedResult.isConnected) {
        throw new Error('Freighter wallet not found. Please install the extension.');
      }

      // Request access to the wallet
      const accessResult = await requestAccess();
      if (accessResult.error) {
        throw new Error(accessResult.error);
      }

      const networkResult = await getNetwork();
      if (networkResult.error) {
        throw new Error(networkResult.error);
      }

      setWallet({
        isConnected: true,
        publicKey: accessResult.address,
        network: networkResult.network,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect wallet';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Disconnect wallet (clear state)
  const disconnect = useCallback(() => {
    setWallet({
      isConnected: false,
      publicKey: null,
      network: null,
    });
  }, []);

  // Sign transaction
  const sign = useCallback(async (xdr: string, networkPassphrase: string) => {
    if (!wallet.isConnected) {
      throw new Error('Wallet not connected');
    }

    try {
      const result = await signTransaction(xdr, {
        networkPassphrase,
        address: wallet.publicKey!,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      return result.signedTxXdr;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sign transaction';
      setError(message);
      throw err;
    }
  }, [wallet]);

  // Format address for display
  const formatAddress = useCallback((address: string | null) => {
    if (!address) return '';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  }, []);

  return {
    ...wallet,
    isLoading,
    error,
    connect,
    disconnect,
    sign,
    formatAddress,
    formattedAddress: formatAddress(wallet.publicKey),
  };
}
