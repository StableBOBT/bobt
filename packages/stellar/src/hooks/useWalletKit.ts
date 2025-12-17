// Multi-Wallet Hook using Stellar Wallets Kit
'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  StellarWalletsKit,
  WalletNetwork,
  allowAllModules,
  FREIGHTER_ID,
  ISupportedWallet,
} from '@creit.tech/stellar-wallets-kit';
import type { WalletState } from '../types';

// Storage keys
const STORAGE_KEY_WALLET = 'bobt_selected_wallet';
const STORAGE_KEY_ADDRESS = 'bobt_wallet_address';

export interface WalletKitOptions {
  network?: WalletNetwork;
  autoConnect?: boolean;
}

export interface UseWalletKitReturn extends WalletState {
  isLoading: boolean;
  error: string | null;
  selectedWallet: ISupportedWallet | null;
  availableWallets: ISupportedWallet[];
  connect: () => Promise<void>;
  connectWallet: (walletId: string) => Promise<void>;
  disconnect: () => void;
  openModal: () => Promise<void>;
  sign: (xdr: string) => Promise<string>;
  formatAddress: (address: string | null) => string;
  formattedAddress: string;
  kit: StellarWalletsKit | null;
}

export function useWalletKit(options: WalletKitOptions = {}): UseWalletKitReturn {
  const { network = WalletNetwork.TESTNET, autoConnect = true } = options;

  const kitRef = useRef<StellarWalletsKit | null>(null);
  const [wallet, setWallet] = useState<WalletState>({
    isConnected: false,
    publicKey: null,
    network: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWallet, setSelectedWallet] = useState<ISupportedWallet | null>(null);
  const [availableWallets, setAvailableWallets] = useState<ISupportedWallet[]>([]);

  // Initialize kit
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const kit = new StellarWalletsKit({
      network,
      selectedWalletId: FREIGHTER_ID,
      modules: allowAllModules(),
    });

    kitRef.current = kit;

    // Get available wallets
    kit.getSupportedWallets().then(wallets => {
      setAvailableWallets(wallets);
    });

    // Try to restore previous session
    if (autoConnect) {
      const savedWalletId = localStorage.getItem(STORAGE_KEY_WALLET);
      const savedAddress = localStorage.getItem(STORAGE_KEY_ADDRESS);

      if (savedWalletId && savedAddress) {
        kit.setWallet(savedWalletId);

        // Verify the connection is still valid
        kit.getAddress().then(({ address }) => {
          if (address === savedAddress) {
            const walletInfo = availableWallets.find(w => w.id === savedWalletId);
            setSelectedWallet(walletInfo || null);
            setWallet({
              isConnected: true,
              publicKey: address,
              network: network === WalletNetwork.TESTNET ? 'TESTNET' : 'PUBLIC',
            });
          } else {
            // Session expired or changed, clear storage
            localStorage.removeItem(STORAGE_KEY_WALLET);
            localStorage.removeItem(STORAGE_KEY_ADDRESS);
          }
        }).catch(() => {
          // Connection failed, clear storage
          localStorage.removeItem(STORAGE_KEY_WALLET);
          localStorage.removeItem(STORAGE_KEY_ADDRESS);
        }).finally(() => {
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, [network, autoConnect]);

  // Open wallet selection modal
  const openModal = useCallback(async () => {
    const kit = kitRef.current;
    if (!kit) {
      setError('Wallet kit not initialized');
      return;
    }

    setError(null);

    try {
      await kit.openModal({
        onWalletSelected: async (option: ISupportedWallet) => {
          await connectWallet(option.id);
        },
        modalTitle: 'Connect Wallet',
        notAvailableText: 'Not installed',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to open wallet modal';
      setError(message);
    }
  }, []);

  // Connect with a specific wallet
  const connectWallet = useCallback(async (walletId: string) => {
    const kit = kitRef.current;
    if (!kit) {
      setError('Wallet kit not initialized');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      kit.setWallet(walletId);
      const { address } = await kit.getAddress();

      if (!address) {
        throw new Error('Failed to get wallet address');
      }

      // Save to storage for persistence
      localStorage.setItem(STORAGE_KEY_WALLET, walletId);
      localStorage.setItem(STORAGE_KEY_ADDRESS, address);

      const walletInfo = availableWallets.find(w => w.id === walletId);
      setSelectedWallet(walletInfo || null);

      setWallet({
        isConnected: true,
        publicKey: address,
        network: network === WalletNetwork.TESTNET ? 'TESTNET' : 'PUBLIC',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect wallet';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [availableWallets, network]);

  // Quick connect (uses modal)
  const connect = useCallback(async () => {
    await openModal();
  }, [openModal]);

  // Disconnect wallet
  const disconnect = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_WALLET);
    localStorage.removeItem(STORAGE_KEY_ADDRESS);
    setSelectedWallet(null);
    setWallet({
      isConnected: false,
      publicKey: null,
      network: null,
    });
  }, []);

  // Sign transaction
  const sign = useCallback(async (xdr: string) => {
    const kit = kitRef.current;
    if (!kit) {
      throw new Error('Wallet kit not initialized');
    }

    if (!wallet.isConnected) {
      throw new Error('Wallet not connected');
    }

    try {
      const { signedTxXdr } = await kit.signTransaction(xdr, {
        address: wallet.publicKey!,
        networkPassphrase: network === WalletNetwork.TESTNET
          ? 'Test SDF Network ; September 2015'
          : 'Public Global Stellar Network ; September 2015',
      });

      return signedTxXdr;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sign transaction';
      setError(message);
      throw err;
    }
  }, [wallet, network]);

  // Format address for display
  const formatAddress = useCallback((address: string | null) => {
    if (!address) return '';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  }, []);

  return {
    ...wallet,
    isLoading,
    error,
    selectedWallet,
    availableWallets,
    connect,
    connectWallet,
    disconnect,
    openModal,
    sign,
    formatAddress,
    formattedAddress: formatAddress(wallet.publicKey),
    kit: kitRef.current,
  };
}
