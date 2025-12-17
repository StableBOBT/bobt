"use client"

import { WalletProvider as StellarWalletProvider } from "@bobt/stellar"

// Network is determined by NEXT_PUBLIC_STELLAR_NETWORK env var
// The provider defaults to TESTNET, which matches our current setup
export function WalletProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <StellarWalletProvider autoConnect={true}>
      {children}
    </StellarWalletProvider>
  )
}
