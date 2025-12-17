// Bolivia Payment Integration Types

// CriptoYa API Types
export interface CryptoYaPrice {
  ask: number;  // Sell price (to buy USDT)
  bid: number;  // Buy price (to sell USDT)
  time: number; // Timestamp
}

export interface ExchangePrices {
  binance: CryptoYaPrice | null;
  bybit: CryptoYaPrice | null;
  bitget: CryptoYaPrice | null;
  average: {
    ask: number;
    bid: number;
  } | null;
}

// Payment Methods available in Bolivia
export type PaymentMethod =
  | 'qr_simple'      // QR Simple (BCB standard)
  | 'bank_transfer'  // Transferencia bancaria
  | 'tigo_money'     // Tigo Money
  | 'p2p_binance'    // P2P Binance
  | 'p2p_bybit'      // P2P Bybit
  | 'p2p_bitget';    // P2P Bitget

// Ramp Quote (on-ramp/off-ramp)
export interface RampQuote {
  type: 'on_ramp' | 'off_ramp';
  inputAmount: number;
  inputCurrency: 'BOB' | 'USDT' | 'BOBT';
  outputAmount: number;
  outputCurrency: 'BOB' | 'USDT' | 'BOBT';
  exchangeRate: number;
  fees: {
    platformFee: number;
    networkFee: number;
    total: number;
  };
  paymentMethod: PaymentMethod;
  expiresAt: Date;
  estimatedTime: string;
}

// QR Payment Data (BCB/BNB format)
export interface QRPaymentData {
  qrType: 'static' | 'dynamic';
  merchantId: string;
  merchantName: string;
  amount?: number;
  currency: string;
  reference: string;
  expiresAt?: Date;
  qrString: string;
  qrImageUrl?: string;
}

// Bank Account for transfers
export interface BankAccount {
  bankCode: string;
  bankName: string;
  accountType: 'savings' | 'checking';
  accountNumber: string;
  holderName: string;
  holderId: string; // CI or NIT
}

// Payment Status
export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'expired'
  | 'refunded';

// Payment Record
export interface PaymentRecord {
  id: string;
  type: 'on_ramp' | 'off_ramp';
  status: PaymentStatus;
  quote: RampQuote;
  paymentMethod: PaymentMethod;
  bobAmount: number;
  usdtAmount: number;
  bobtAmount: number;
  txHash?: string;
  paymentProof?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}
