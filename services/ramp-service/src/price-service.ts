// Price Service - Gets BOB/USD rate from Oracle
import * as StellarSdk from '@stellar/stellar-sdk';
import { stellarConfig, criptoYaConfig } from './config.js';

interface OraclePrice {
  ask: number;
  bid: number;
  mid: number;
  numSources: number;
  timestamp: number;
  isValid: boolean;
}

interface CriptoYaResponse {
  ask: number;
  bid: number;
  time: number;
}

class PriceService {
  private rpc: StellarSdk.SorobanRpc.Server;
  private lastPrice: OraclePrice | null = null;
  private lastFetch: number = 0;
  private cacheDuration = 30_000; // 30 seconds cache

  constructor() {
    this.rpc = new StellarSdk.SorobanRpc.Server(stellarConfig.rpcUrl);
  }

  // Get price from on-chain Oracle
  async getOraclePrice(): Promise<OraclePrice | null> {
    // Return cached price if fresh
    if (this.lastPrice && Date.now() - this.lastFetch < this.cacheDuration) {
      return this.lastPrice;
    }

    try {
      const contract = new StellarSdk.Contract(stellarConfig.oracleContract);
      const tx = new StellarSdk.TransactionBuilder(
        new StellarSdk.Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0'),
        {
          fee: '100',
          networkPassphrase: stellarConfig.networkPassphrase,
        }
      )
        .addOperation(contract.call('get_price'))
        .setTimeout(30)
        .build();

      const response = await this.rpc.simulateTransaction(tx);

      if ('result' in response && response.result) {
        const result = StellarSdk.scValToNative(response.result.retval);
        const decimals = 7;
        const divisor = 10 ** decimals;

        this.lastPrice = {
          ask: Number(result.ask) / divisor,
          bid: Number(result.bid) / divisor,
          mid: Number(result.mid) / divisor,
          numSources: result.num_sources,
          timestamp: result.timestamp,
          isValid: true,
        };
        this.lastFetch = Date.now();
        return this.lastPrice;
      }
    } catch (error) {
      console.error('Failed to get Oracle price:', error);
    }

    return this.lastPrice;
  }

  // Fallback: Get price directly from CriptoYa
  async getCriptoYaPrice(): Promise<OraclePrice | null> {
    try {
      const response = await fetch(`${criptoYaConfig.baseUrl}/usdt/bob`);
      if (!response.ok) return null;

      const data = await response.json() as Record<string, CriptoYaResponse>;

      // Average from available exchanges
      const exchanges = ['binance', 'bybit', 'bitget'];
      let totalAsk = 0, totalBid = 0, count = 0;

      for (const exchange of exchanges) {
        if (data[exchange]) {
          totalAsk += data[exchange].ask;
          totalBid += data[exchange].bid;
          count++;
        }
      }

      if (count === 0) return null;

      const avgAsk = totalAsk / count;
      const avgBid = totalBid / count;

      return {
        ask: avgAsk,
        bid: avgBid,
        mid: (avgAsk + avgBid) / 2,
        numSources: count,
        timestamp: Math.floor(Date.now() / 1000),
        isValid: true,
      };
    } catch (error) {
      console.error('Failed to get CriptoYa price:', error);
      return null;
    }
  }

  // Get best available price (Oracle first, then CriptoYa fallback)
  async getPrice(): Promise<OraclePrice> {
    // Try Oracle first
    const oraclePrice = await this.getOraclePrice();
    if (oraclePrice && oraclePrice.isValid) {
      return oraclePrice;
    }

    // Fallback to CriptoYa
    const criptoYaPrice = await this.getCriptoYaPrice();
    if (criptoYaPrice) {
      return criptoYaPrice;
    }

    // Last resort: use cached price even if stale
    if (this.lastPrice) {
      return { ...this.lastPrice, isValid: false };
    }

    // Default fallback (should not happen in production)
    return {
      ask: 6.96,
      bid: 6.94,
      mid: 6.95,
      numSources: 0,
      timestamp: Math.floor(Date.now() / 1000),
      isValid: false,
    };
  }

  // Calculate BOBT amount for BOB input (on-ramp)
  async bobToBobt(bobAmount: number): Promise<{
    bobtAmount: number;
    rate: number;
    isValid: boolean;
  }> {
    const price = await this.getPrice();
    // Using bid price (what you get when selling BOB for USD/USDT)
    // BOBT = BOB (1:1 with BOB)
    // But we need to convert through USD first:
    // USD = BOB / rate
    // BOBT = USD * rate = BOB (1:1 effectively)
    //
    // Actually for a BOB stablecoin, BOBT should be 1:1 with BOB
    // The rate is just for display/reference
    return {
      bobtAmount: bobAmount, // 1:1 ratio
      rate: price.mid,
      isValid: price.isValid,
    };
  }

  // Calculate BOB amount for BOBT input (off-ramp)
  async bobtToBob(bobtAmount: number): Promise<{
    bobAmount: number;
    rate: number;
    isValid: boolean;
  }> {
    const price = await this.getPrice();
    return {
      bobAmount: bobtAmount, // 1:1 ratio
      rate: price.mid,
      isValid: price.isValid,
    };
  }
}

export const priceService = new PriceService();
