// BOBT Type Definitions

// Oracle types
export interface OraclePrice {
  ask: bigint;
  bid: bigint;
  mid: bigint;
  spreadBps: bigint;
  numSources: number;
  timestamp: number;
  ledger: number;
}

export interface ExchangePrice {
  exchange: string;
  ask: bigint;
  bid: bigint;
  timestamp: number;
  ledger: number;
}

// Treasury types
export enum ProposalType {
  Mint = 1,
  Burn = 2,
  AddSigner = 3,
  RemoveSigner = 4,
  UpdateThreshold = 5,
  UpdateRateLimits = 6,
  EmergencyPause = 7,
  Unpause = 8,
  FreezeAccount = 9,
  UnfreezeAccount = 10,
  MintFromUsdt = 11,
  SetOracle = 12,
}

export enum ProposalStatus {
  Pending = 1,
  Executed = 2,
  Cancelled = 3,
  Expired = 4,
}

export interface Proposal {
  id: bigint;
  proposalType: ProposalType;
  proposer: string;
  target: string;
  amount: bigint;
  usdtAmount: bigint;
  externalRef: string;
  createdAt: number;
  expiresAt: number;
  approvalCount: number;
  status: ProposalStatus;
}

export interface TreasuryConfig {
  tokenAddress: string;
  oracleAddress: string | null;
  threshold: number;
  dailyMintLimit: bigint;
  dailyBurnLimit: bigint;
  singleOpLimit: bigint;
}

export interface RateLimitState {
  dailyMinted: bigint;
  dailyBurned: bigint;
  lastResetLedger: number;
}

// Token types
export interface TokenBalance {
  address: string;
  balance: bigint;
}

export interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
}

// Wallet types
export interface WalletState {
  isConnected: boolean;
  publicKey: string | null;
  network: string | null;
}

// Transaction types
export interface TransactionResult {
  success: boolean;
  txHash?: string;
  error?: string;
}
