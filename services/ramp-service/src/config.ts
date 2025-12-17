// BOBT Ramp Service Configuration
import 'dotenv/config';
import type { RampConfig, TreasuryAccount } from './types.js';

// Default treasury accounts (production should use env vars)
const TREASURY_ACCOUNTS: TreasuryAccount[] = [
  {
    bankName: 'Banco Unión',
    accountNumber: process.env.TREASURY_BANK_ACCOUNT || '1234567890',
    accountName: process.env.TREASURY_BANK_NAME || 'BOBT Treasury',
    currency: 'BOB',
  },
];

export const config: RampConfig = {
  // Límites (en BOB/BOBT con 7 decimales internamente)
  minOnRampBOB: Number(process.env.MIN_ON_RAMP_BOB) || 100,      // 100 BOB mínimo
  maxOnRampBOB: Number(process.env.MAX_ON_RAMP_BOB) || 50000,    // 50,000 BOB máximo
  minOffRampBOBT: Number(process.env.MIN_OFF_RAMP_BOBT) || 100,  // 100 BOBT mínimo
  maxOffRampBOBT: Number(process.env.MAX_OFF_RAMP_BOBT) || 50000,// 50,000 BOBT máximo

  // Comisiones
  onRampFeePercent: Number(process.env.ON_RAMP_FEE_PERCENT) || 0.5,   // 0.5%
  offRampFeePercent: Number(process.env.OFF_RAMP_FEE_PERCENT) || 0.5, // 0.5%

  // Tiempos
  quoteValidityMinutes: Number(process.env.QUOTE_VALIDITY_MINUTES) || 15,    // 15 min
  paymentTimeoutMinutes: Number(process.env.PAYMENT_TIMEOUT_MINUTES) || 60,  // 1 hora

  // Treasury
  treasuryAccounts: TREASURY_ACCOUNTS,
};

// Stellar/Soroban config
export const stellarConfig = {
  network: (process.env.STELLAR_NETWORK || 'testnet') as 'testnet' | 'mainnet',
  rpcUrl: process.env.STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org',
  horizonUrl: process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org',
  networkPassphrase: process.env.STELLAR_NETWORK_PASSPHRASE ||
    'Test SDF Network ; September 2015',

  // Contract addresses
  oracleContract: process.env.ORACLE_CONTRACT_ID ||
    'CBNL5SYNKPCKVESILEX457DL4RRE6NAUPWRKYO4WI2AOV733NRM2WAMI',
  tokenContract: process.env.TOKEN_CONTRACT_ID ||
    'CDWJIAIGSQBDKIGM22LOVX2FSP5R4K2FRF4FBIG3FZBPM2OH5IIJX65C',
  treasuryContract: process.env.TREASURY_CONTRACT_ID ||
    'CBPSP452DQ5HEXID2JFGBUWZ3MODTEV43T7UO7YG5QYA2LY4FARBQOZV',

  // Operator key for signing transactions
  operatorSecretKey: process.env.STELLAR_SECRET_KEY || '',
};

// CriptoYa API for price data
export const criptoYaConfig = {
  baseUrl: process.env.CRIPTOYA_BASE_URL || 'https://criptoya.com/api',
};

// Server config
export const serverConfig = {
  port: Number(process.env.PORT) || 3002,
  host: process.env.HOST || '0.0.0.0',
};

export function validateConfig(): void {
  const errors: string[] = [];

  if (!stellarConfig.operatorSecretKey) {
    errors.push('STELLAR_SECRET_KEY is required');
  }

  if (config.treasuryAccounts.length === 0) {
    errors.push('At least one treasury account is required');
  }

  if (errors.length > 0) {
    console.error('Configuration errors:');
    errors.forEach(e => console.error(`  - ${e}`));
    console.warn('Some features may not work correctly.');
  }
}
