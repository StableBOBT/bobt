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
    // Deployed 2024-12-16 by bobt-deployer (GAHDQEBNI2NISCTQEAGJAO57QZI75736S6XDDEQSIQKKCY4LQOHA3EGO)
    oracle: 'CAIVJPXLLIJVSSO67Z4V44B2JHYK323GWRG7OCA7IE7DL3IUZC6JL7Q7',
    bobtToken: 'CBFNIREQSJR7EM5QXALVV6JUY3BTYP2G5VRPKB2UIXUJRSUW2TIJHD55',
    treasury: 'CAAXLHDBYDBQLSPBMW4OF42UGBGT6DU5HM2BWZXUVTAIQYPGU74PSJS5',
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
