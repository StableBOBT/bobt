import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('Bolivia Prices - CriptoYa Integration', () => {
  interface P2PPrice {
    ask: number
    bid: number
    time: number
  }

  interface ExchangePrices {
    binance?: P2PPrice
    bybit?: P2PPrice
    bitget?: P2PPrice
  }

  const findBestBuyPrice = (prices: ExchangePrices): { exchange: string; price: number } | null => {
    const exchanges = Object.entries(prices)
      .filter(([_, p]) => p !== undefined)
      .map(([name, p]) => ({ exchange: name, price: p!.ask }))

    if (exchanges.length === 0) return null

    // Best buy price is the lowest ask (what you pay when buying)
    return exchanges.reduce((best, current) =>
      current.price < best.price ? current : best
    )
  }

  const findBestSellPrice = (prices: ExchangePrices): { exchange: string; price: number } | null => {
    const exchanges = Object.entries(prices)
      .filter(([_, p]) => p !== undefined)
      .map(([name, p]) => ({ exchange: name, price: p!.bid }))

    if (exchanges.length === 0) return null

    // Best sell price is the highest bid (what you receive when selling)
    return exchanges.reduce((best, current) =>
      current.price > best.price ? current : best
    )
  }

  it('should find the best buy price (lowest ask)', () => {
    const prices: ExchangePrices = {
      binance: { ask: 6.96, bid: 6.90, time: Date.now() },
      bybit: { ask: 6.98, bid: 6.92, time: Date.now() },
      bitget: { ask: 6.95, bid: 6.89, time: Date.now() },
    }

    const best = findBestBuyPrice(prices)
    expect(best?.exchange).toBe('bitget')
    expect(best?.price).toBe(6.95)
  })

  it('should find the best sell price (highest bid)', () => {
    const prices: ExchangePrices = {
      binance: { ask: 6.96, bid: 6.90, time: Date.now() },
      bybit: { ask: 6.98, bid: 6.92, time: Date.now() },
      bitget: { ask: 6.95, bid: 6.89, time: Date.now() },
    }

    const best = findBestSellPrice(prices)
    expect(best?.exchange).toBe('bybit')
    expect(best?.price).toBe(6.92)
  })

  it('should handle missing exchange data', () => {
    const prices: ExchangePrices = {
      binance: { ask: 6.96, bid: 6.90, time: Date.now() },
      bybit: undefined,
      bitget: undefined,
    }

    const bestBuy = findBestBuyPrice(prices)
    expect(bestBuy?.exchange).toBe('binance')

    const bestSell = findBestSellPrice(prices)
    expect(bestSell?.exchange).toBe('binance')
  })

  it('should return null for empty prices', () => {
    const prices: ExchangePrices = {}

    expect(findBestBuyPrice(prices)).toBeNull()
    expect(findBestSellPrice(prices)).toBeNull()
  })
})

describe('Bolivia Prices - Price Staleness', () => {
  const isPriceStale = (priceTime: number, maxAge: number = 300000): boolean => {
    return (Date.now() - priceTime) > maxAge
  }

  it('should detect fresh prices', () => {
    const recentTime = Date.now() - 60000 // 1 minute ago
    expect(isPriceStale(recentTime)).toBe(false)
  })

  it('should detect stale prices', () => {
    const oldTime = Date.now() - 600000 // 10 minutes ago
    expect(isPriceStale(oldTime)).toBe(true)
  })

  it('should respect custom max age', () => {
    const time = Date.now() - 120000 // 2 minutes ago

    expect(isPriceStale(time, 60000)).toBe(true) // 1 min max age
    expect(isPriceStale(time, 180000)).toBe(false) // 3 min max age
  })
})

describe('Bolivia Prices - Spread Calculation', () => {
  const calculateSpread = (ask: number, bid: number): number => {
    // Spread as percentage
    return ((ask - bid) / bid) * 100
  }

  it('should calculate spread correctly', () => {
    const spread = calculateSpread(6.96, 6.90)
    expect(spread).toBeCloseTo(0.87, 1) // ~0.87%
  })

  it('should handle zero spread', () => {
    const spread = calculateSpread(7.00, 7.00)
    expect(spread).toBe(0)
  })

  it('should detect high spreads', () => {
    const normalSpread = calculateSpread(6.96, 6.90)
    const highSpread = calculateSpread(7.50, 6.50)

    expect(normalSpread).toBeLessThan(2) // Normal < 2%
    expect(highSpread).toBeGreaterThan(10) // High > 10%
  })
})
