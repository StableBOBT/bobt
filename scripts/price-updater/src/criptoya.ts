/**
 * CriptoYa API Client
 *
 * Fetches P2P prices for BOB/USDT from multiple exchanges.
 * API Documentation: https://criptoya.com/api/
 */

import { EXCHANGES, type ExchangeKey } from './config.js';

/**
 * Raw response from CriptoYa API
 */
export interface CriptoYaResponse {
  ask: number;
  bid: number;
  time: number;
}

/**
 * Processed exchange price with 7 decimals
 */
export interface ExchangePrice {
  exchange: ExchangeKey;
  ask: bigint; // 7 decimals (9.18 -> 91_800_000n)
  bid: bigint; // 7 decimals
  timestamp: number;
  rawAsk: number;
  rawBid: number;
}

/**
 * All exchange prices
 */
export interface AllPrices {
  binance: ExchangePrice | null;
  bybit: ExchangePrice | null;
  bitget: ExchangePrice | null;
  fetchedAt: number;
}

const DECIMALS = 7;
const MULTIPLIER = BigInt(10 ** DECIMALS);

/**
 * Convert float price to 7-decimal integer
 * Example: 9.18 -> 91_800_000n
 */
function toDecimals(price: number): bigint {
  // Multiply first to avoid precision loss
  const scaled = Math.round(price * Number(MULTIPLIER));
  return BigInt(scaled);
}

/**
 * Fetch price from a single exchange
 */
async function fetchExchangePrice(
  baseUrl: string,
  exchange: ExchangeKey
): Promise<ExchangePrice | null> {
  const endpoint = EXCHANGES[exchange];
  const url = `${baseUrl}/${endpoint}/USDT/BOB/0.1`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'BOBT-Price-Updater/1.0',
      },
    });

    if (!response.ok) {
      console.error(`[${exchange}] HTTP ${response.status}: ${response.statusText}`);
      return null;
    }

    const data = (await response.json()) as CriptoYaResponse;

    // Validate response
    if (!data.ask || !data.bid || !data.time) {
      console.error(`[${exchange}] Invalid response:`, data);
      return null;
    }

    // Validate price sanity (BOB/USDT should be between 5 and 15)
    if (data.ask < 5 || data.ask > 15 || data.bid < 5 || data.bid > 15) {
      console.error(`[${exchange}] Price out of range: ask=${data.ask}, bid=${data.bid}`);
      return null;
    }

    // Ask should be >= bid (spread)
    if (data.ask < data.bid) {
      console.error(`[${exchange}] Invalid spread: ask=${data.ask} < bid=${data.bid}`);
      return null;
    }

    return {
      exchange,
      ask: toDecimals(data.ask),
      bid: toDecimals(data.bid),
      timestamp: data.time,
      rawAsk: data.ask,
      rawBid: data.bid,
    };
  } catch (error) {
    console.error(`[${exchange}] Fetch error:`, error);
    return null;
  }
}

/**
 * Fetch prices from all exchanges
 */
export async function fetchAllPrices(baseUrl: string): Promise<AllPrices> {
  console.log('Fetching prices from CriptoYa...');

  // Fetch all exchanges in parallel
  const [binance, bybit, bitget] = await Promise.all([
    fetchExchangePrice(baseUrl, 'BINANCE'),
    fetchExchangePrice(baseUrl, 'BYBIT'),
    fetchExchangePrice(baseUrl, 'BITGET'),
  ]);

  // Log results
  const results: AllPrices = {
    binance,
    bybit,
    bitget,
    fetchedAt: Math.floor(Date.now() / 1000),
  };

  console.log('\nPrices fetched:');
  if (binance) {
    console.log(`  Binance: ask=${binance.rawAsk} bid=${binance.rawBid} BOB/USDT`);
  } else {
    console.log('  Binance: FAILED');
  }
  if (bybit) {
    console.log(`  Bybit:   ask=${bybit.rawAsk} bid=${bybit.rawBid} BOB/USDT`);
  } else {
    console.log('  Bybit:   FAILED');
  }
  if (bitget) {
    console.log(`  Bitget:  ask=${bitget.rawAsk} bid=${bitget.rawBid} BOB/USDT`);
  } else {
    console.log('  Bitget:  FAILED');
  }

  return results;
}

/**
 * Get the most recent timestamp from all prices
 */
export function getMostRecentTimestamp(prices: AllPrices): number {
  const timestamps = [
    prices.binance?.timestamp,
    prices.bybit?.timestamp,
    prices.bitget?.timestamp,
  ].filter((t): t is number => t !== undefined);

  if (timestamps.length === 0) {
    return Math.floor(Date.now() / 1000);
  }

  return Math.max(...timestamps);
}

/**
 * Count successful price fetches
 */
export function countSuccessfulFetches(prices: AllPrices): number {
  return [prices.binance, prices.bybit, prices.bitget].filter((p) => p !== null).length;
}
