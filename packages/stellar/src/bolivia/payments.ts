// Bolivia Payments Service
// Integrates with CriptoYa API and provides payment infrastructure

import type {
  CryptoYaPrice,
  ExchangePrices,
  RampQuote,
  PaymentMethod,
  QRPaymentData,
} from './types';

export interface BoliviaPaymentsConfig {
  cryptoYaBaseUrl?: string;
  platformFeePercent?: number; // Fee in percentage (e.g., 0.5 for 0.5%)
  networkFeeUSDT?: number;     // Fixed network fee in USDT
}

const DEFAULT_CONFIG: Required<BoliviaPaymentsConfig> = {
  cryptoYaBaseUrl: 'https://criptoya.com/api',
  platformFeePercent: 0.5,
  networkFeeUSDT: 0.1,
};

const SUPPORTED_EXCHANGES = ['binance', 'bybit', 'bitget'] as const;
type SupportedExchange = typeof SUPPORTED_EXCHANGES[number];

export class BoliviaPayments {
  private config: Required<BoliviaPaymentsConfig>;
  private priceCache: Map<string, { price: CryptoYaPrice; timestamp: number }> = new Map();
  private readonly CACHE_TTL_MS = 30000; // 30 seconds

  constructor(config: BoliviaPaymentsConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // Fetch USDT/BOB price from a specific exchange via CriptoYa
  async getExchangePrice(exchange: SupportedExchange): Promise<CryptoYaPrice | null> {
    const cacheKey = `${exchange}-USDT-BOB`;
    const cached = this.priceCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.price;
    }

    try {
      const response = await fetch(
        `${this.config.cryptoYaBaseUrl}/${exchange}/USDT/BOB/0.1`
      );

      if (!response.ok) {
        console.error(`Failed to fetch ${exchange} price:`, response.status);
        return null;
      }

      const data = await response.json();
      const price: CryptoYaPrice = {
        ask: data.ask || data.totalAsk,
        bid: data.bid || data.totalBid,
        time: data.time || Date.now() / 1000,
      };

      this.priceCache.set(cacheKey, { price, timestamp: Date.now() });
      return price;
    } catch (error) {
      console.error(`Error fetching ${exchange} price:`, error);
      return null;
    }
  }

  // Fetch prices from all supported exchanges
  async getAllPrices(): Promise<ExchangePrices> {
    const [binance, bybit, bitget] = await Promise.all([
      this.getExchangePrice('binance'),
      this.getExchangePrice('bybit'),
      this.getExchangePrice('bitget'),
    ]);

    // Calculate average from available prices
    const validPrices = [binance, bybit, bitget].filter(p => p !== null) as CryptoYaPrice[];

    let average: ExchangePrices['average'] = null;
    if (validPrices.length > 0) {
      const sumAsk = validPrices.reduce((sum, p) => sum + p.ask, 0);
      const sumBid = validPrices.reduce((sum, p) => sum + p.bid, 0);
      average = {
        ask: sumAsk / validPrices.length,
        bid: sumBid / validPrices.length,
      };
    }

    return { binance, bybit, bitget, average };
  }

  // Get best price for buying USDT (lowest ask)
  async getBestBuyPrice(): Promise<{ exchange: string; price: number } | null> {
    const prices = await this.getAllPrices();
    const pricesArray: { exchange: string; price: number }[] = [];

    if (prices.binance) pricesArray.push({ exchange: 'binance', price: prices.binance.ask });
    if (prices.bybit) pricesArray.push({ exchange: 'bybit', price: prices.bybit.ask });
    if (prices.bitget) pricesArray.push({ exchange: 'bitget', price: prices.bitget.ask });

    if (pricesArray.length === 0) return null;

    return pricesArray.reduce((best, current) =>
      current.price < best.price ? current : best
    );
  }

  // Get best price for selling USDT (highest bid)
  async getBestSellPrice(): Promise<{ exchange: string; price: number } | null> {
    const prices = await this.getAllPrices();
    const pricesArray: { exchange: string; price: number }[] = [];

    if (prices.binance) pricesArray.push({ exchange: 'binance', price: prices.binance.bid });
    if (prices.bybit) pricesArray.push({ exchange: 'bybit', price: prices.bybit.bid });
    if (prices.bitget) pricesArray.push({ exchange: 'bitget', price: prices.bitget.bid });

    if (pricesArray.length === 0) return null;

    return pricesArray.reduce((best, current) =>
      current.price > best.price ? current : best
    );
  }

  // Create on-ramp quote (BOB -> USDT -> BOBT)
  async createOnRampQuote(
    bobAmount: number,
    paymentMethod: PaymentMethod = 'p2p_binance'
  ): Promise<RampQuote | null> {
    const bestPrice = await this.getBestBuyPrice();
    if (!bestPrice) return null;

    const usdtAmount = bobAmount / bestPrice.price;
    const platformFee = usdtAmount * (this.config.platformFeePercent / 100);
    const networkFee = this.config.networkFeeUSDT;
    const totalFees = platformFee + networkFee;
    const bobtAmount = usdtAmount - totalFees; // 1:1 USDT:BOBT

    return {
      type: 'on_ramp',
      inputAmount: bobAmount,
      inputCurrency: 'BOB',
      outputAmount: bobtAmount,
      outputCurrency: 'BOBT',
      exchangeRate: bestPrice.price,
      fees: {
        platformFee,
        networkFee,
        total: totalFees,
      },
      paymentMethod,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      estimatedTime: '5-15 min',
    };
  }

  // Create off-ramp quote (BOBT -> USDT -> BOB)
  async createOffRampQuote(
    bobtAmount: number,
    paymentMethod: PaymentMethod = 'p2p_binance'
  ): Promise<RampQuote | null> {
    const bestPrice = await this.getBestSellPrice();
    if (!bestPrice) return null;

    const platformFee = bobtAmount * (this.config.platformFeePercent / 100);
    const networkFee = this.config.networkFeeUSDT;
    const totalFees = platformFee + networkFee;
    const usdtAmount = bobtAmount - totalFees; // 1:1 BOBT:USDT
    const bobAmount = usdtAmount * bestPrice.price;

    return {
      type: 'off_ramp',
      inputAmount: bobtAmount,
      inputCurrency: 'BOBT',
      outputAmount: bobAmount,
      outputCurrency: 'BOB',
      exchangeRate: bestPrice.price,
      fees: {
        platformFee,
        networkFee,
        total: totalFees,
      },
      paymentMethod,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      estimatedTime: '5-30 min',
    };
  }

  // Generate QR payment data (simulating BCB QR Simple format)
  generateQRPayment(
    amount: number,
    reference: string,
    merchantName: string = 'BOBT Exchange'
  ): QRPaymentData {
    const qrData = {
      type: 'QR_SIMPLE',
      version: '1.0',
      merchantId: 'BOBT-001',
      merchantName,
      amount,
      currency: 'BOB',
      reference,
      timestamp: Date.now(),
    };

    // In production, this would follow the BCB QR specification
    const qrString = Buffer.from(JSON.stringify(qrData)).toString('base64');

    return {
      qrType: 'dynamic',
      merchantId: qrData.merchantId,
      merchantName: qrData.merchantName,
      amount,
      currency: 'BOB',
      reference,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      qrString,
      // In production: qrImageUrl would be generated by QR service
    };
  }

  // Get available payment methods
  getAvailablePaymentMethods(): { method: PaymentMethod; name: string; description: string }[] {
    return [
      {
        method: 'p2p_binance',
        name: 'Binance P2P',
        description: 'Compra/vende USDT via Binance P2P con vendedores verificados',
      },
      {
        method: 'p2p_bybit',
        name: 'Bybit P2P',
        description: 'Compra/vende USDT via Bybit P2P',
      },
      {
        method: 'p2p_bitget',
        name: 'Bitget P2P',
        description: 'Compra/vende USDT via Bitget P2P',
      },
      {
        method: 'bank_transfer',
        name: 'Transferencia Bancaria',
        description: 'Transferencia directa a cuenta bancaria (próximamente)',
      },
      {
        method: 'qr_simple',
        name: 'QR Simple BCB',
        description: 'Pago con QR Simple del BCB (próximamente)',
      },
      {
        method: 'tigo_money',
        name: 'Tigo Money',
        description: 'Pago con billetera Tigo Money (próximamente)',
      },
    ];
  }
}

// Singleton instance
let paymentsInstance: BoliviaPayments | null = null;

export const getBoliviaPayments = (config?: BoliviaPaymentsConfig): BoliviaPayments => {
  if (!paymentsInstance) {
    paymentsInstance = new BoliviaPayments(config);
  }
  return paymentsInstance;
};
