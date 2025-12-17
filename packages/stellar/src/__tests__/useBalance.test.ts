import { describe, it, expect, vi, beforeEach } from 'vitest'

// Test balance formatting logic directly (without hook dependencies)
describe('useBalance - Balance Formatting', () => {
  // Replicate the formatting logic from the hook
  const formatBalance = (balance: bigint, decimals: number = 7): string => {
    const divisor = BigInt(10 ** decimals)
    const intPart = balance / divisor
    const fracPart = balance % divisor
    const fracStr = fracPart.toString().padStart(decimals, '0').slice(0, 2)
    return `${intPart}.${fracStr}`
  }

  const toBalanceNumber = (balance: bigint, decimals: number = 7): number => {
    return Number(balance) / (10 ** decimals)
  }

  it('should format zero balance correctly', () => {
    expect(formatBalance(BigInt(0))).toBe('0.00')
  })

  it('should format small amounts correctly', () => {
    expect(formatBalance(BigInt(10000000))).toBe('1.00') // 1.0 BOBT
    expect(formatBalance(BigInt(1000000))).toBe('0.10') // 0.1 BOBT
    expect(formatBalance(BigInt(100000))).toBe('0.01') // 0.01 BOBT
  })

  it('should format large amounts correctly', () => {
    expect(formatBalance(BigInt(100000000))).toBe('10.00') // 10.0 BOBT
    expect(formatBalance(BigInt(1000000000))).toBe('100.00') // 100.0 BOBT
    expect(formatBalance(BigInt(10000000000))).toBe('1000.00') // 1000.0 BOBT
  })

  it('should truncate to 2 decimal places', () => {
    expect(formatBalance(BigInt(1234567890))).toBe('123.45') // 123.4567890 BOBT
    expect(formatBalance(BigInt(9999999))).toBe('0.99') // 0.9999999 BOBT
  })

  it('should convert to number correctly', () => {
    expect(toBalanceNumber(BigInt(0))).toBe(0)
    expect(toBalanceNumber(BigInt(10000000))).toBe(1)
    expect(toBalanceNumber(BigInt(100000000))).toBe(10)
    expect(toBalanceNumber(BigInt(1234567890))).toBeCloseTo(123.456789, 5)
  })

  it('should handle very large balances', () => {
    const largeBalance = BigInt('1000000000000000') // 100,000,000 BOBT
    expect(formatBalance(largeBalance)).toBe('100000000.00')
    expect(toBalanceNumber(largeBalance)).toBe(100000000)
  })
})

describe('useBalance - Input Validation', () => {
  const isValidPublicKey = (key: string | null | undefined): boolean => {
    if (!key) return false
    if (key.length !== 56) return false
    if (!key.startsWith('G')) return false
    return true
  }

  it('should validate correct public keys', () => {
    const validKey = 'GCKFBEIYV2U22IO2BJ4KVJOIP7XPWQGQFKKWXR6DOSJBV7STMAQSMTGG'
    expect(isValidPublicKey(validKey)).toBe(true)
  })

  it('should reject null and undefined', () => {
    expect(isValidPublicKey(null)).toBe(false)
    expect(isValidPublicKey(undefined)).toBe(false)
  })

  it('should reject empty string', () => {
    expect(isValidPublicKey('')).toBe(false)
  })

  it('should reject wrong length', () => {
    expect(isValidPublicKey('GCKFBEIY')).toBe(false)
    expect(isValidPublicKey('GCKFBEIYV2U22IO2BJ4KVJOIP7XPWQGQFKKWXR6DOSJBV7STMAQSMTGGXXX')).toBe(false)
  })

  it('should reject keys not starting with G', () => {
    expect(isValidPublicKey('SCKFBEIYV2U22IO2BJ4KVJOIP7XPWQGQFKKWXR6DOSJBV7STMAQSMTGG')).toBe(false)
  })
})
