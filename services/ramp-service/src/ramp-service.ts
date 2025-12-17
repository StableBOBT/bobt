// Ramp Service - Main business logic for on-ramp/off-ramp
import { nanoid } from 'nanoid';
import { config } from './config.js';
import { store } from './store.js';
import { priceService } from './price-service.js';
import type {
  RampRequest,
  RampQuote,
  CreateOnRampRequest,
  CreateOffRampRequest,
  PaymentInstructions,
} from './types.js';

class RampService {
  // Create a quote for on-ramp (BOB -> BOBT)
  async createOnRampQuote(bobAmount: number): Promise<RampQuote | null> {
    // Validate amount
    if (bobAmount < config.minOnRampBOB || bobAmount > config.maxOnRampBOB) {
      return null;
    }

    // Get current price
    const { bobtAmount, rate, isValid } = await priceService.bobToBobt(bobAmount);

    if (!isValid) {
      console.warn('Creating quote with stale price');
    }

    // Calculate fee
    const feeAmount = bobAmount * (config.onRampFeePercent / 100);
    const netBobtAmount = bobtAmount - feeAmount;

    // Generate unique reference for payment
    const paymentRef = `BOBT-${nanoid(8).toUpperCase()}`;

    // Payment instructions
    const treasury = config.treasuryAccounts[0];
    const paymentInstructions: PaymentInstructions = {
      bankName: treasury.bankName,
      accountNumber: treasury.accountNumber,
      accountName: treasury.accountName,
      reference: paymentRef,
    };

    const quote: RampQuote = {
      id: nanoid(),
      type: 'on_ramp',
      inputAmount: bobAmount,
      inputCurrency: 'BOB',
      outputAmount: netBobtAmount,
      outputCurrency: 'BOBT',
      exchangeRate: rate,
      feeAmount,
      feePercent: config.onRampFeePercent,
      validUntil: Date.now() + config.quoteValidityMinutes * 60 * 1000,
      paymentInstructions,
    };

    store.createQuote(quote);
    return quote;
  }

  // Create a quote for off-ramp (BOBT -> BOB)
  async createOffRampQuote(bobtAmount: number): Promise<RampQuote | null> {
    // Validate amount
    if (bobtAmount < config.minOffRampBOBT || bobtAmount > config.maxOffRampBOBT) {
      return null;
    }

    // Get current price
    const { bobAmount, rate, isValid } = await priceService.bobtToBob(bobtAmount);

    if (!isValid) {
      console.warn('Creating quote with stale price');
    }

    // Calculate fee
    const feeAmount = bobAmount * (config.offRampFeePercent / 100);
    const netBobAmount = bobAmount - feeAmount;

    const quote: RampQuote = {
      id: nanoid(),
      type: 'off_ramp',
      inputAmount: bobtAmount,
      inputCurrency: 'BOBT',
      outputAmount: netBobAmount,
      outputCurrency: 'BOB',
      exchangeRate: rate,
      feeAmount,
      feePercent: config.offRampFeePercent,
      validUntil: Date.now() + config.quoteValidityMinutes * 60 * 1000,
    };

    store.createQuote(quote);
    return quote;
  }

  // Create on-ramp request (user wants to buy BOBT with BOB)
  async createOnRampRequest(req: CreateOnRampRequest): Promise<RampRequest | null> {
    // Validate
    if (req.bobAmount < config.minOnRampBOB || req.bobAmount > config.maxOnRampBOB) {
      return null;
    }

    // Get current conversion
    const { bobtAmount, rate } = await priceService.bobToBobt(req.bobAmount);
    const feeAmount = req.bobAmount * (config.onRampFeePercent / 100);

    // Generate payment reference
    const paymentRef = `BOBT-${nanoid(8).toUpperCase()}`;

    const now = Date.now();
    const request: RampRequest = {
      id: nanoid(),
      type: 'on_ramp',
      status: 'pending_payment',
      userAddress: req.userAddress,
      bobAmount: req.bobAmount,
      bobtAmount: bobtAmount - feeAmount,
      exchangeRate: rate,
      feeAmount,
      bankReference: paymentRef,
      createdAt: now,
      updatedAt: now,
      expiresAt: now + config.paymentTimeoutMinutes * 60 * 1000,
    };

    store.createRequest(request);
    return request;
  }

  // Create off-ramp request (user wants to sell BOBT for BOB)
  async createOffRampRequest(req: CreateOffRampRequest): Promise<RampRequest | null> {
    // Validate
    if (req.bobtAmount < config.minOffRampBOBT || req.bobtAmount > config.maxOffRampBOBT) {
      return null;
    }

    // Get current conversion
    const { bobAmount, rate } = await priceService.bobtToBob(req.bobtAmount);
    const feeAmount = bobAmount * (config.offRampFeePercent / 100);

    const now = Date.now();
    const request: RampRequest = {
      id: nanoid(),
      type: 'off_ramp',
      status: 'pending_payment', // User needs to burn BOBT first
      userAddress: req.userAddress,
      userBankAccount: req.bankAccount,
      userBankName: req.bankName,
      bobAmount: bobAmount - feeAmount,
      bobtAmount: req.bobtAmount,
      exchangeRate: rate,
      feeAmount,
      createdAt: now,
      updatedAt: now,
      expiresAt: now + config.paymentTimeoutMinutes * 60 * 1000,
    };

    store.createRequest(request);
    return request;
  }

  // Mark payment as received (manual verification by operator)
  markPaymentReceived(requestId: string, bankReference: string): RampRequest | null {
    const request = store.getRequest(requestId);
    if (!request) return null;

    if (request.status !== 'pending_payment') {
      return null;
    }

    return store.updateRequest(requestId, {
      status: 'payment_received',
      bankReference: bankReference || request.bankReference,
    }) || null;
  }

  // Submit for verification (after payment detected)
  submitForVerification(requestId: string): RampRequest | null {
    const request = store.getRequest(requestId);
    if (!request) return null;

    if (request.status !== 'payment_received') {
      return null;
    }

    return store.updateRequest(requestId, {
      status: 'pending_verification',
    }) || null;
  }

  // Verify request (operator confirms payment is valid)
  verifyRequest(requestId: string, verifiedBy: string): RampRequest | null {
    const request = store.getRequest(requestId);
    if (!request) return null;

    if (request.status !== 'pending_verification') {
      return null;
    }

    return store.updateRequest(requestId, {
      status: 'verified',
      verifiedBy,
    }) || null;
  }

  // Mark as processing (Treasury proposal being created)
  markProcessing(requestId: string): RampRequest | null {
    const request = store.getRequest(requestId);
    if (!request) return null;

    if (request.status !== 'verified') {
      return null;
    }

    return store.updateRequest(requestId, {
      status: 'processing',
    }) || null;
  }

  // Set proposal ID (Treasury proposal created)
  setProposalId(requestId: string, proposalId: number): RampRequest | null {
    const request = store.getRequest(requestId);
    if (!request) return null;

    return store.updateRequest(requestId, {
      status: 'pending_approval',
      proposalId,
    }) || null;
  }

  // Mark as completed (after Treasury executes)
  markCompleted(requestId: string, txHash: string): RampRequest | null {
    const request = store.getRequest(requestId);
    if (!request) return null;

    return store.updateRequest(requestId, {
      status: 'completed',
      txHash,
      completedAt: Date.now(),
    }) || null;
  }

  // Mark as failed
  markFailed(requestId: string, notes: string): RampRequest | null {
    const request = store.getRequest(requestId);
    if (!request) return null;

    return store.updateRequest(requestId, {
      status: 'failed',
      notes,
    }) || null;
  }

  // Cancel request (by user, only if still pending payment)
  cancelRequest(requestId: string, userAddress: string): RampRequest | null {
    const request = store.getRequest(requestId);
    if (!request) return null;

    // Only the owner can cancel
    if (request.userAddress !== userAddress) {
      return null;
    }

    // Can only cancel if pending payment
    if (request.status !== 'pending_payment') {
      return null;
    }

    return store.updateRequest(requestId, {
      status: 'cancelled',
    }) || null;
  }

  // Get request by ID
  getRequest(requestId: string): RampRequest | undefined {
    return store.getRequest(requestId);
  }

  // Get user's requests
  getUserRequests(userAddress: string): RampRequest[] {
    return store.getRequestsByUser(userAddress);
  }

  // Get all requests (for admin/testing)
  getAllRequests(): RampRequest[] {
    return store.getAllRequests();
  }

  // Get requests pending verification (for operators)
  getPendingVerification(): RampRequest[] {
    return store.getPendingVerificationRequests();
  }

  // Get payment instructions for an on-ramp request
  getPaymentInstructions(requestId: string): PaymentInstructions | null {
    const request = store.getRequest(requestId);
    if (!request || request.type !== 'on_ramp') return null;

    const treasury = config.treasuryAccounts[0];
    return {
      bankName: treasury.bankName,
      accountNumber: treasury.accountNumber,
      accountName: treasury.accountName,
      reference: request.bankReference || '',
    };
  }

  // Get stats
  getStats() {
    return store.getStats();
  }
}

export const rampService = new RampService();
