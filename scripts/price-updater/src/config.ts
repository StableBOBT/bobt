/**
 * Configuration for the BOBT Price Updater
 */

// Network configuration
export type NetworkType = 'testnet' | 'mainnet';

export interface Config {
  // Stellar Network
  network: NetworkType;
  rpcUrl: string;
  networkPassphrase: string;

  // Contract
  oracleContractId: string;

  // Operator (signs transactions)
  operatorSecretKey: string;

  // CriptoYa API
  criptoYaBaseUrl: string;

  // Price decimals (matching BOBT token)
  priceDecimals: number;
}

// Network configurations
const NETWORKS = {
  testnet: {
    rpcUrl: 'https://soroban-testnet.stellar.org',
    networkPassphrase: 'Test SDF Network ; September 2015',
  },
  mainnet: {
    rpcUrl: 'https://soroban.stellar.org',
    networkPassphrase: 'Public Global Stellar Network ; September 2015',
  },
} as const;

/**
 * Load configuration from environment variables
 */
export function loadConfig(): Config {
  const network = (process.env.NETWORK || 'testnet') as NetworkType;

  if (network !== 'testnet' && network !== 'mainnet') {
    throw new Error(`Invalid network: ${network}. Must be 'testnet' or 'mainnet'`);
  }

  const oracleContractId = process.env.ORACLE_CONTRACT_ID;
  if (!oracleContractId) {
    throw new Error('ORACLE_CONTRACT_ID environment variable is required');
  }

  const operatorSecretKey = process.env.STELLAR_SECRET_KEY;
  if (!operatorSecretKey) {
    throw new Error('STELLAR_SECRET_KEY environment variable is required');
  }

  return {
    network,
    rpcUrl: process.env.RPC_URL || NETWORKS[network].rpcUrl,
    networkPassphrase: NETWORKS[network].networkPassphrase,
    oracleContractId,
    operatorSecretKey,
    criptoYaBaseUrl: 'https://criptoya.com/api',
    priceDecimals: 7,
  };
}

/**
 * Supported exchanges
 */
export const EXCHANGES = {
  BINANCE: 'binancep2p',
  BYBIT: 'bybitp2p',
  BITGET: 'bitgetp2p',
} as const;

export type ExchangeKey = keyof typeof EXCHANGES;
