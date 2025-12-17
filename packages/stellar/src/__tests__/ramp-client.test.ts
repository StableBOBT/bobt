import { describe, it, expect, vi, beforeEach } from 'vitest'

// Test the ramp service request validation
describe('RampClient - Request Validation', () => {
  interface RampQuote {
    bobAmount: number
    bobtAmount: number
    feeAmount: number
    exchangeRate: number
    expiresAt: number
  }

  const calculateOnRampFee = (bobAmount: number, feePercent: number = 0.5): RampQuote => {
    const feeAmount = bobAmount * (feePercent / 100)
    const bobtAmount = bobAmount - feeAmount
    return {
      bobAmount,
      bobtAmount,
      feeAmount,
      exchangeRate: 1, // 1:1 for BOB to BOBT
      expiresAt: Date.now() + 30 * 60 * 1000, // 30 minutes
    }
  }

  const calculateOffRampFee = (bobtAmount: number, feePercent: number = 0.5): RampQuote => {
    const feeAmount = bobtAmount * (feePercent / 100)
    const bobAmount = bobtAmount - feeAmount
    return {
      bobAmount,
      bobtAmount,
      feeAmount,
      exchangeRate: 1,
      expiresAt: Date.now() + 30 * 60 * 1000,
    }
  }

  it('should calculate on-ramp fees correctly', () => {
    const quote = calculateOnRampFee(1000)

    expect(quote.bobAmount).toBe(1000)
    expect(quote.feeAmount).toBe(5) // 0.5% of 1000
    expect(quote.bobtAmount).toBe(995) // 1000 - 5
  })

  it('should calculate off-ramp fees correctly', () => {
    const quote = calculateOffRampFee(1000)

    expect(quote.bobtAmount).toBe(1000)
    expect(quote.feeAmount).toBe(5)
    expect(quote.bobAmount).toBe(995)
  })

  it('should handle different fee percentages', () => {
    const quote1 = calculateOnRampFee(1000, 1.0) // 1% fee
    expect(quote1.feeAmount).toBe(10)
    expect(quote1.bobtAmount).toBe(990)

    const quote2 = calculateOnRampFee(1000, 0.0) // 0% fee
    expect(quote2.feeAmount).toBe(0)
    expect(quote2.bobtAmount).toBe(1000)
  })

  it('should handle small amounts', () => {
    const quote = calculateOnRampFee(10)

    expect(quote.bobAmount).toBe(10)
    expect(quote.feeAmount).toBe(0.05)
    expect(quote.bobtAmount).toBe(9.95)
  })

  it('should set correct expiration time', () => {
    const before = Date.now()
    const quote = calculateOnRampFee(1000)
    const after = Date.now()

    const thirtyMinutes = 30 * 60 * 1000
    expect(quote.expiresAt).toBeGreaterThanOrEqual(before + thirtyMinutes)
    expect(quote.expiresAt).toBeLessThanOrEqual(after + thirtyMinutes + 1000)
  })
})

describe('RampClient - Status Transitions', () => {
  type RequestStatus =
    | 'pending_payment'
    | 'payment_received'
    | 'pending_verification'
    | 'verified'
    | 'processing'
    | 'completed'
    | 'cancelled'
    | 'failed'
    | 'expired'

  const validTransitions: Record<RequestStatus, RequestStatus[]> = {
    pending_payment: ['payment_received', 'cancelled', 'expired'],
    payment_received: ['pending_verification', 'failed'],
    pending_verification: ['verified', 'failed'],
    verified: ['processing', 'failed'],
    processing: ['completed', 'failed'],
    completed: [],
    cancelled: [],
    failed: [],
    expired: [],
  }

  const canTransition = (from: RequestStatus, to: RequestStatus): boolean => {
    return validTransitions[from]?.includes(to) ?? false
  }

  it('should allow valid status transitions', () => {
    expect(canTransition('pending_payment', 'payment_received')).toBe(true)
    expect(canTransition('payment_received', 'pending_verification')).toBe(true)
    expect(canTransition('verified', 'processing')).toBe(true)
    expect(canTransition('processing', 'completed')).toBe(true)
  })

  it('should reject invalid status transitions', () => {
    expect(canTransition('pending_payment', 'completed')).toBe(false)
    expect(canTransition('completed', 'pending_payment')).toBe(false)
    expect(canTransition('cancelled', 'processing')).toBe(false)
  })

  it('should allow cancellation from pending_payment', () => {
    expect(canTransition('pending_payment', 'cancelled')).toBe(true)
  })

  it('should allow expiration from pending_payment', () => {
    expect(canTransition('pending_payment', 'expired')).toBe(true)
  })

  it('should not allow transitions from terminal states', () => {
    expect(canTransition('completed', 'failed')).toBe(false)
    expect(canTransition('cancelled', 'completed')).toBe(false)
    expect(canTransition('expired', 'pending_payment')).toBe(false)
  })
})

describe('RampClient - Bank Reference Validation', () => {
  const generateBankReference = (requestId: string): string => {
    // Format: BOBT-XXXXX (where XXXXX is first 5 chars of request ID)
    return `BOBT-${requestId.slice(0, 5).toUpperCase()}`
  }

  const validateBankReference = (reference: string, requestId: string): boolean => {
    const expected = generateBankReference(requestId)
    return reference.toUpperCase() === expected.toUpperCase()
  }

  it('should generate correct bank reference format', () => {
    const reference = generateBankReference('abc123def456')
    expect(reference).toBe('BOBT-ABC12')
    expect(reference).toMatch(/^BOBT-[A-Z0-9]{5}$/)
  })

  it('should validate matching references', () => {
    const requestId = 'abc123def456'
    const reference = 'BOBT-ABC12'
    expect(validateBankReference(reference, requestId)).toBe(true)
  })

  it('should validate case-insensitive', () => {
    const requestId = 'abc123def456'
    expect(validateBankReference('bobt-abc12', requestId)).toBe(true)
    expect(validateBankReference('BOBT-abc12', requestId)).toBe(true)
  })

  it('should reject non-matching references', () => {
    const requestId = 'abc123def456'
    expect(validateBankReference('BOBT-XXXXX', requestId)).toBe(false)
    expect(validateBankReference('WRONG-ABC12', requestId)).toBe(false)
  })
})
