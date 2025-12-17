#!/usr/bin/env node
/**
 * BOBT Ramp Service
 *
 * API for on-ramp (BOB -> BOBT) and off-ramp (BOBT -> BOB) operations.
 *
 * Endpoints:
 *   POST /api/quote/on-ramp   - Get quote for buying BOBT with BOB
 *   POST /api/quote/off-ramp  - Get quote for selling BOBT for BOB
 *   POST /api/ramp/on-ramp    - Create on-ramp request
 *   POST /api/ramp/off-ramp   - Create off-ramp request
 *   GET  /api/ramp/:id        - Get request details
 *   GET  /api/ramp/user/:addr - Get user's requests
 *   POST /api/ramp/:id/cancel - Cancel pending request
 *   GET  /api/price           - Get current BOB/USD price
 *   GET  /api/stats           - Get service stats
 *
 * Operator endpoints:
 *   GET  /api/admin/pending   - Get requests pending verification
 *   POST /api/admin/verify    - Verify a payment
 */

import express from 'express';
import { z } from 'zod';
import { serverConfig, validateConfig, stellarConfig } from './config.js';
import { rampService } from './ramp-service.js';
import { priceService } from './price-service.js';
import { bnbSimulator, getBNBClient } from './bnb-client.js';
import { mintBOBT, checkMinterRole } from './stellar-minter.js';
import type { ApiResponse } from './types.js';

// Validate configuration on startup
validateConfig();

// In-memory cache for CryptoYa prices (to avoid 429 rate limiting)
interface PriceCache {
  data: Record<string, { ask: number; bid: number; time: number } | null>;
  bestBuy: { exchange: string; price: number } | null;
  timestamp: number;
}

let priceCache: PriceCache | null = null;
const PRICE_CACHE_TTL_MS = 60000; // 60 seconds

const app = express();
app.use(express.json());

// CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================================================
// Price endpoints
// ============================================================================

app.get('/api/price', async (req, res) => {
  try {
    const price = await priceService.getPrice();
    res.json({
      success: true,
      data: {
        ask: price.ask,
        bid: price.bid,
        mid: price.mid,
        numSources: price.numSources,
        timestamp: price.timestamp,
        isValid: price.isValid,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get price',
    });
  }
});

// Proxy for CryptoYa prices (to avoid CORS issues in browser)
app.get('/api/prices/exchanges', async (req, res) => {
  try {
    const now = Date.now();

    // Return cached data if still valid
    if (priceCache && (now - priceCache.timestamp) < PRICE_CACHE_TTL_MS) {
      return res.json({
        success: true,
        data: {
          prices: priceCache.data,
          bestBuy: priceCache.bestBuy,
          timestamp: priceCache.timestamp,
          cached: true,
        },
      });
    }

    // CryptoYa API returns all exchanges in one call
    const response = await fetch('https://criptoya.com/api/usdt/bob');

    if (!response.ok) {
      // If rate limited but we have stale cache, return it
      if (response.status === 429 && priceCache) {
        console.log('[CACHE] Rate limited, returning stale cache');
        return res.json({
          success: true,
          data: {
            prices: priceCache.data,
            bestBuy: priceCache.bestBuy,
            timestamp: priceCache.timestamp,
            cached: true,
            stale: true,
          },
        });
      }
      throw new Error(`CryptoYa API error: ${response.status}`);
    }

    const data = await response.json() as Record<string, { ask?: number; bid?: number; totalAsk?: number; totalBid?: number; time?: number }>;

    // Map exchange names (CryptoYa uses 'binancep2p', 'bybitp2p', 'bitgetp2p')
    const results: Record<string, { ask: number; bid: number; time: number } | null> = {
      binance: data.binancep2p ? {
        ask: data.binancep2p.ask || data.binancep2p.totalAsk || 0,
        bid: data.binancep2p.bid || data.binancep2p.totalBid || 0,
        time: data.binancep2p.time || Date.now() / 1000,
      } : null,
      bybit: data.bybitp2p ? {
        ask: data.bybitp2p.ask || data.bybitp2p.totalAsk || 0,
        bid: data.bybitp2p.bid || data.bybitp2p.totalBid || 0,
        time: data.bybitp2p.time || Date.now() / 1000,
      } : null,
      bitget: data.bitgetp2p ? {
        ask: data.bitgetp2p.ask || data.bitgetp2p.totalAsk || 0,
        bid: data.bitgetp2p.bid || data.bitgetp2p.totalBid || 0,
        time: data.bitgetp2p.time || Date.now() / 1000,
      } : null,
    };

    // Calculate best buy (lowest ask)
    let bestBuy: { exchange: string; price: number } | null = null;
    for (const [exchange, priceData] of Object.entries(results)) {
      if (priceData && priceData.ask > 0 && (!bestBuy || priceData.ask < bestBuy.price)) {
        bestBuy = { exchange, price: priceData.ask };
      }
    }

    // Update cache
    priceCache = {
      data: results,
      bestBuy,
      timestamp: now,
    };

    res.json({
      success: true,
      data: {
        prices: results,
        bestBuy,
        timestamp: now,
        cached: false,
      },
    });
  } catch (error) {
    console.error('Error fetching exchange prices:', error);

    // If we have any cache, return it on error
    if (priceCache) {
      return res.json({
        success: true,
        data: {
          prices: priceCache.data,
          bestBuy: priceCache.bestBuy,
          timestamp: priceCache.timestamp,
          cached: true,
          stale: true,
        },
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to get exchange prices',
    });
  }
});

// ============================================================================
// Quote endpoints
// ============================================================================

// Accept both number and string (coerce to number)
const onRampQuoteSchema = z.object({
  bobAmount: z.coerce.number().positive({ message: "El monto debe ser mayor a 0" }),
});

app.post('/api/quote/on-ramp', async (req, res) => {
  try {
    console.log('[QUOTE] on-ramp request body:', JSON.stringify(req.body));
    const { bobAmount } = onRampQuoteSchema.parse(req.body);
    const quote = await rampService.createOnRampQuote(bobAmount);

    if (!quote) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount or out of limits',
      });
    }

    res.json({ success: true, data: quote });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.log('[QUOTE] on-ramp validation error:', JSON.stringify(error.errors));
      return res.status(400).json({
        success: false,
        error: 'Invalid request body',
        details: error.errors,
      });
    }
    console.log('[QUOTE] on-ramp error:', String(error));
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});

// Accept both number and string (coerce to number)
const offRampQuoteSchema = z.object({
  bobtAmount: z.coerce.number().positive({ message: "El monto debe ser mayor a 0" }),
});

app.post('/api/quote/off-ramp', async (req, res) => {
  try {
    const { bobtAmount } = offRampQuoteSchema.parse(req.body);
    const quote = await rampService.createOffRampQuote(bobtAmount);

    if (!quote) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount or out of limits',
      });
    }

    res.json({ success: true, data: quote });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request body',
      });
    }
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});

// ============================================================================
// Ramp request endpoints
// ============================================================================

const onRampRequestSchema = z.object({
  userAddress: z.string().min(56).max(56),
  bobAmount: z.number().positive(),
});

app.post('/api/ramp/on-ramp', async (req, res) => {
  try {
    const data = onRampRequestSchema.parse(req.body);
    const request = await rampService.createOnRampRequest(data);

    if (!request) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request or amount out of limits',
      });
    }

    // Get payment instructions
    const paymentInstructions = rampService.getPaymentInstructions(request.id);

    res.json({
      success: true,
      data: {
        ...request,
        paymentInstructions,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request body',
      });
    }
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});

const offRampRequestSchema = z.object({
  userAddress: z.string().min(56).max(56),
  bobtAmount: z.number().positive(),
  bankAccount: z.string().min(1),
  bankName: z.string().min(1),
});

app.post('/api/ramp/off-ramp', async (req, res) => {
  try {
    const data = offRampRequestSchema.parse(req.body);
    const request = await rampService.createOffRampRequest(data);

    if (!request) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request or amount out of limits',
      });
    }

    res.json({ success: true, data: request });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request body',
      });
    }
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});

// Get request by ID
app.get('/api/ramp/:id', (req, res) => {
  const request = rampService.getRequest(req.params.id);

  if (!request) {
    return res.status(404).json({
      success: false,
      error: 'Request not found',
    });
  }

  res.json({ success: true, data: request });
});

// Get user's requests
app.get('/api/ramp/user/:address', (req, res) => {
  const requests = rampService.getUserRequests(req.params.address);
  res.json({ success: true, data: requests });
});

// Cancel request
app.post('/api/ramp/:id/cancel', (req, res) => {
  const { userAddress } = req.body;

  if (!userAddress) {
    return res.status(400).json({
      success: false,
      error: 'userAddress is required',
    });
  }

  const request = rampService.cancelRequest(req.params.id, userAddress);

  if (!request) {
    return res.status(400).json({
      success: false,
      error: 'Cannot cancel request (not found, not owner, or not pending)',
    });
  }

  res.json({ success: true, data: request });
});

// ============================================================================
// Admin/Operator endpoints
// ============================================================================

// Get pending verification requests
app.get('/api/admin/pending', (req, res) => {
  // TODO: Add authentication
  const requests = rampService.getPendingVerification();
  res.json({ success: true, data: requests });
});

// Get all requests (for testing)
app.get('/api/admin/all', (req, res) => {
  // TODO: Add authentication
  const requests = rampService.getAllRequests();
  res.json({ success: true, data: requests });
});

// Verify a payment
const verifySchema = z.object({
  requestId: z.string(),
  bankReference: z.string(),
  verifiedBy: z.string(),
});

app.post('/api/admin/verify', (req, res) => {
  try {
    // TODO: Add authentication
    const { requestId, bankReference, verifiedBy } = verifySchema.parse(req.body);

    // First mark payment received
    let request = rampService.markPaymentReceived(requestId, bankReference);
    if (!request) {
      return res.status(400).json({
        success: false,
        error: 'Cannot mark payment received',
      });
    }

    // Then submit for verification
    request = rampService.submitForVerification(requestId);
    if (!request) {
      return res.status(400).json({
        success: false,
        error: 'Cannot submit for verification',
      });
    }

    // Then verify
    request = rampService.verifyRequest(requestId, verifiedBy);
    if (!request) {
      return res.status(400).json({
        success: false,
        error: 'Cannot verify request',
      });
    }

    res.json({ success: true, data: request });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request body',
      });
    }
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});

// ============================================================================
// Stats endpoint
// ============================================================================

app.get('/api/stats', (req, res) => {
  const stats = rampService.getStats();
  res.json({ success: true, data: stats });
});

// ============================================================================
// Testing/Simulation endpoints (for development without real bank access)
// ============================================================================

// Simulate a bank deposit (for testing)
const simulateDepositSchema = z.object({
  requestId: z.string(),
});

app.post('/api/test/simulate-deposit', async (req, res) => {
  try {
    const { requestId } = simulateDepositSchema.parse(req.body);

    // Get the request
    const request = rampService.getRequest(requestId);
    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Request not found',
      });
    }

    if (request.status !== 'pending_payment') {
      return res.status(400).json({
        success: false,
        error: `Request is not pending payment (status: ${request.status})`,
      });
    }

    // Simulate the deposit in BNB simulator
    const deposit = bnbSimulator.simulateDeposit(
      request.bankReference || `REF-${requestId}`,
      request.bobAmount,
      request.userAddress
    );

    res.json({
      success: true,
      data: {
        message: 'Deposit simulated successfully',
        deposit,
        request: {
          id: request.id,
          bobAmount: request.bobAmount,
          bobtAmount: request.bobtAmount,
          reference: request.bankReference,
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request body',
      });
    }
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});

// Auto-verify a request using BNB simulator or real BNB API
const autoVerifySchema = z.object({
  requestId: z.string(),
  useRealBNB: z.boolean().optional().default(false),
});

app.post('/api/test/auto-verify', async (req, res) => {
  try {
    const { requestId, useRealBNB } = autoVerifySchema.parse(req.body);

    const request = rampService.getRequest(requestId);
    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Request not found',
      });
    }

    if (request.status !== 'pending_payment') {
      return res.status(400).json({
        success: false,
        error: `Request is not pending payment (status: ${request.status})`,
      });
    }

    let verified = false;
    let verificationResult: { verified: boolean; error?: string } = { verified: false };

    if (useRealBNB) {
      // Use real BNB API
      const bnbClient = getBNBClient();
      verificationResult = await bnbClient.verifyDeposit(
        request.bankReference || '',
        request.bobAmount
      );
      verified = verificationResult.verified;
    } else {
      // Use simulator
      verificationResult = bnbSimulator.verifyDeposit(
        request.bankReference || '',
        request.bobAmount
      );
      verified = verificationResult.verified;
    }

    if (!verified) {
      return res.status(400).json({
        success: false,
        error: `Deposit not verified: ${verificationResult.error || 'Not found'}`,
        hint: 'Use POST /api/test/simulate-deposit first to simulate the bank deposit',
      });
    }

    // Now proceed with the verification flow
    let updatedRequest = rampService.markPaymentReceived(requestId, request.bankReference || '');
    if (!updatedRequest) {
      return res.status(400).json({ success: false, error: 'Failed to mark payment received' });
    }

    updatedRequest = rampService.submitForVerification(requestId);
    if (!updatedRequest) {
      return res.status(400).json({ success: false, error: 'Failed to submit for verification' });
    }

    updatedRequest = rampService.verifyRequest(requestId, useRealBNB ? 'bnb-api' : 'simulator');
    if (!updatedRequest) {
      return res.status(400).json({ success: false, error: 'Failed to verify request' });
    }

    res.json({
      success: true,
      data: {
        message: 'Request verified successfully',
        request: updatedRequest,
        verificationMethod: useRealBNB ? 'BNB API' : 'Simulator',
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request body',
      });
    }
    console.error('Auto-verify error:', error);
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});

// Process verified request (mint BOBT) - For testing the full flow
const processRequestSchema = z.object({
  requestId: z.string(),
});

app.post('/api/test/process', async (req, res) => {
  try {
    const { requestId } = processRequestSchema.parse(req.body);

    const request = rampService.getRequest(requestId);
    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Request not found',
      });
    }

    if (request.status !== 'verified') {
      return res.status(400).json({
        success: false,
        error: `Request is not verified (status: ${request.status})`,
      });
    }

    // Mark as processing
    let updatedRequest = rampService.markProcessing(requestId);
    if (!updatedRequest) {
      return res.status(400).json({ success: false, error: 'Failed to mark as processing' });
    }

    // Mint BOBT tokens on Stellar
    console.log(`[PROCESS] Minting ${updatedRequest.bobtAmount} BOBT to ${updatedRequest.userAddress}`);

    const mintResult = await mintBOBT(
      updatedRequest.userAddress,
      updatedRequest.bobtAmount,
      requestId
    );

    if (!mintResult.success) {
      // Revert to verified status on failure
      console.error(`[PROCESS] Mint failed: ${mintResult.error}`);
      return res.status(500).json({
        success: false,
        error: `Mint failed: ${mintResult.error}`,
        hint: 'Check STELLAR_SECRET_KEY configuration and minter role',
      });
    }

    updatedRequest = rampService.markCompleted(requestId, mintResult.txHash!);
    if (!updatedRequest) {
      return res.status(400).json({ success: false, error: 'Failed to mark as completed' });
    }

    res.json({
      success: true,
      data: {
        message: 'Request processed successfully - BOBT minted on Stellar!',
        request: updatedRequest,
        stellarTx: `https://stellar.expert/explorer/testnet/tx/${mintResult.txHash}`,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request body',
      });
    }
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});

// Full flow test - Create request, simulate deposit, verify, and process
const fullFlowSchema = z.object({
  userAddress: z.string().min(56).max(56),
  bobAmount: z.number().positive(),
});

app.post('/api/test/full-flow', async (req, res) => {
  try {
    const { userAddress, bobAmount } = fullFlowSchema.parse(req.body);

    console.log(`[TEST] Starting full flow for ${userAddress}, amount: Bs. ${bobAmount}`);

    // Step 1: Create on-ramp request
    const request = await rampService.createOnRampRequest({ userAddress, bobAmount });
    if (!request) {
      return res.status(400).json({
        success: false,
        error: 'Failed to create request',
      });
    }
    console.log(`[TEST] Created request: ${request.id}`);

    // Step 2: Simulate bank deposit
    const deposit = bnbSimulator.simulateDeposit(
      request.bankReference || `REF-${request.id}`,
      request.bobAmount,
      request.userAddress
    );
    console.log(`[TEST] Simulated deposit: ${deposit.reference}`);

    // Step 3: Verify the deposit
    const verification = bnbSimulator.verifyDeposit(
      request.bankReference || '',
      request.bobAmount
    );

    if (!verification.verified) {
      return res.status(400).json({
        success: false,
        error: 'Deposit verification failed',
      });
    }

    // Step 4: Update request status
    rampService.markPaymentReceived(request.id, request.bankReference || '');
    rampService.submitForVerification(request.id);
    rampService.verifyRequest(request.id, 'full-flow-test');
    console.log(`[TEST] Request verified`);

    // Step 5: Process (real mint on Stellar)
    rampService.markProcessing(request.id);

    const mintResult = await mintBOBT(
      userAddress,
      request.bobtAmount,
      request.id
    );

    if (!mintResult.success) {
      return res.status(500).json({
        success: false,
        error: `Mint failed: ${mintResult.error}`,
        hint: 'Check STELLAR_SECRET_KEY configuration and minter role',
      });
    }

    const completedRequest = rampService.markCompleted(request.id, mintResult.txHash!);

    console.log(`[TEST] Request completed: ${mintResult.txHash}`);

    res.json({
      success: true,
      data: {
        message: 'Full flow completed - BOBT minted on Stellar testnet!',
        steps: [
          { step: 1, action: 'Created on-ramp request', requestId: request.id },
          { step: 2, action: 'Simulated bank deposit', reference: deposit.reference, amount: `Bs. ${deposit.amount}` },
          { step: 3, action: 'Verified deposit', verified: true },
          { step: 4, action: 'Updated request status', status: 'verified' },
          { step: 5, action: 'Minted BOBT on Stellar', txHash: mintResult.txHash },
        ],
        request: completedRequest,
        stellarTx: `https://stellar.expert/explorer/testnet/tx/${mintResult.txHash}`,
        summary: {
          input: `Bs. ${bobAmount} BOB`,
          output: `${completedRequest?.bobtAmount} BOBT`,
          fee: `Bs. ${completedRequest?.feeAmount}`,
          toAddress: userAddress,
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request body',
      });
    }
    console.error('Full flow error:', error);
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});

// List simulated deposits
app.get('/api/test/deposits', (req, res) => {
  const deposits = bnbSimulator.listDeposits();
  res.json({
    success: true,
    data: {
      count: deposits.length,
      deposits,
    },
  });
});

// Clear simulated deposits
app.post('/api/test/clear-deposits', (req, res) => {
  bnbSimulator.clearDeposits();
  res.json({
    success: true,
    data: { message: 'All simulated deposits cleared' },
  });
});

// ============================================================================
// Start server
// ============================================================================

app.listen(serverConfig.port, serverConfig.host, () => {
  console.log('='.repeat(60));
  console.log('BOBT Ramp Service');
  console.log('='.repeat(60));
  console.log(`Server running at http://${serverConfig.host}:${serverConfig.port}`);
  console.log('');
  console.log('User Endpoints:');
  console.log('  GET  /health             - Health check');
  console.log('  GET  /api/price          - Current BOB/USD price');
  console.log('  POST /api/quote/on-ramp  - Get on-ramp quote');
  console.log('  POST /api/quote/off-ramp - Get off-ramp quote');
  console.log('  POST /api/ramp/on-ramp   - Create on-ramp request');
  console.log('  POST /api/ramp/off-ramp  - Create off-ramp request');
  console.log('  GET  /api/ramp/:id       - Get request details');
  console.log('  GET  /api/stats          - Service stats');
  console.log('');
  console.log('Admin Endpoints:');
  console.log('  GET  /api/admin/pending  - Get pending verification requests');
  console.log('  POST /api/admin/verify   - Verify a payment');
  console.log('');
  console.log('Test Endpoints (for development):');
  console.log('  POST /api/test/full-flow        - Run complete BOB→BOBT flow');
  console.log('  POST /api/test/simulate-deposit - Simulate bank deposit');
  console.log('  POST /api/test/auto-verify      - Auto-verify with simulator');
  console.log('  POST /api/test/process          - Process verified request');
  console.log('  GET  /api/test/deposits         - List simulated deposits');
  console.log('  POST /api/test/clear-deposits   - Clear simulated deposits');
  console.log('='.repeat(60));
});
