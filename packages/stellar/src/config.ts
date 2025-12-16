// BOBT Contract Configuration

export type NetworkType = 'testnet' | 'mainnet';

export interface NetworkConfig {
  networkPassphrase: string;
  rpcUrl: string;
  horizonUrl: string;
}

export interface ContractAddresses {
  oracle: string;
  bobtToken: string;
  treasury: string;
}

export const NETWORKS: Record<NetworkType, NetworkConfig> = {
  testnet: {
    networkPassphrase: 'Test SDF Network ; September 2015',
    rpcUrl: 'https://soroban-testnet.stellar.org',
    horizonUrl: 'https://horizon-testnet.stellar.org',
  },
  mainnet: {
    networkPassphrase: 'Public Global Stellar Network ; September 2015',
    rpcUrl: 'https://soroban-rpc.stellar.org',
    horizonUrl: 'https://horizon.stellar.org',
  },
};

export const CONTRACTS: Record<NetworkType, ContractAddresses> = {
  testnet: {
    oracle: 'CBNL5SYNKPCKVESILEX457DL4RRE6NAUPWRKYO4WI2AOV733NRM2WAMI',
    bobtToken: 'CDWJIAIGSQBDKIGM22LOVX2FSP5R4K2FRF4FBIG3FZBPM2OH5IIJX65C',
    treasury: 'CBPSP452DQ5HEXID2JFGBUWZ3MODTEV43T7UO7YG5QYA2LY4FARBQOZV',
  },
  mainnet: {
    oracle: '', // To be deployed
    bobtToken: '', // To be deployed
    treasury: '', // To be deployed
  },
};

// Token decimals
export const BOBT_DECIMALS = 7;
export const USDT_DECIMALS = 7;

// Helper to convert human readable to stroops
export const toStroops = (amount: number, decimals: number = BOBT_DECIMALS): bigint => {
  return BigInt(Math.floor(amount * Math.pow(10, decimals)));
};

// Helper to convert stroops to human readable
export const fromStroops = (stroops: bigint, decimals: number = BOBT_DECIMALS): number => {
  return Number(stroops) / Math.pow(10, decimals);
};

// Format BOBT amount for display
export const formatBOBT = (stroops: bigint): string => {
  const amount = fromStroops(stroops);
  return new Intl.NumberFormat('es-BO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Format USD amount for display
export const formatUSD = (stroops: bigint): string => {
  const amount = fromStroops(stroops, USDT_DECIMALS);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};
