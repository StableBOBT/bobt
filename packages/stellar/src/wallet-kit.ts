// Stellar Wallets Kit Configuration
'use client';

import {
  StellarWalletsKit,
  WalletNetwork,
  allowAllModules,
  FreighterModule,
  xBullModule,
  FREIGHTER_ID,
  XBULL_ID,
  ISupportedWallet,
} from '@creit.tech/stellar-wallets-kit';

export type { ISupportedWallet };

export {
  WalletNetwork,
  FREIGHTER_ID,
  XBULL_ID,
};

// Wallet IDs for reference
export const WALLET_IDS = {
  FREIGHTER: FREIGHTER_ID,
  XBULL: XBULL_ID,
} as const;

// Create kit instance
let kitInstance: StellarWalletsKit | null = null;

export interface WalletKitConfig {
  network?: WalletNetwork;
  defaultWallet?: string;
}

export function getWalletKit(config?: WalletKitConfig): StellarWalletsKit {
  if (!kitInstance) {
    kitInstance = new StellarWalletsKit({
      network: config?.network ?? WalletNetwork.TESTNET,
      selectedWalletId: config?.defaultWallet ?? FREIGHTER_ID,
      modules: allowAllModules(),
    });
  }
  return kitInstance;
}

// Create a minimal kit with only Freighter and xBull (lighter bundle)
export function getMinimalWalletKit(config?: WalletKitConfig): StellarWalletsKit {
  if (!kitInstance) {
    kitInstance = new StellarWalletsKit({
      network: config?.network ?? WalletNetwork.TESTNET,
      selectedWalletId: config?.defaultWallet ?? FREIGHTER_ID,
      modules: [
        new FreighterModule(),
        new xBullModule(),
      ],
    });
  }
  return kitInstance;
}

// Reset kit instance (useful for testing or switching networks)
export function resetWalletKit(): void {
  kitInstance = null;
}

// Get available wallets from the kit
export async function getAvailableWallets(): Promise<ISupportedWallet[]> {
  const kit = getWalletKit();
  return kit.getSupportedWallets();
}
