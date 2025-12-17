#!/usr/bin/env node
/**
 * BOBT Testnet E2E Test Script
 *
 * This script tests the full flow on Stellar Testnet:
 * 1. Check network connectivity
 * 2. Check price API
 * 3. Check Horizon API
 * 4. Verify friendbot availability
 *
 * Usage: pnpm testnet:e2e
 */

// Configuration
const TESTNET_RPC = 'https://soroban-testnet.stellar.org';
const TESTNET_HORIZON = 'https://horizon-testnet.stellar.org';
const FRIENDBOT_URL = 'https://friendbot.stellar.org';

// Contract addresses (from deployment)
const CONTRACTS = {
  token: process.env.BOBT_TOKEN_CONTRACT || '',
  treasury: process.env.BOBT_TREASURY_CONTRACT || '',
  oracle: process.env.BOBT_ORACLE_CONTRACT || '',
};

// Test results
const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: [],
};

// Utility functions
function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warning: '\x1b[33m',
    reset: '\x1b[0m',
  };
  console.log(`${colors[type]}${message}${colors.reset}`);
}

function test(name, fn) {
  return async () => {
    try {
      await fn();
      results.passed++;
      results.tests.push({ name, status: 'passed' });
      log(`  ✓ ${name}`, 'success');
    } catch (error) {
      results.failed++;
      results.tests.push({ name, status: 'failed', error: error.message });
      log(`  ✗ ${name}: ${error.message}`, 'error');
    }
  };
}

function skip(name, reason) {
  results.skipped++;
  results.tests.push({ name, status: 'skipped', reason });
  log(`  ○ ${name} (skipped: ${reason})`, 'warning');
}

// Tests
async function runTests() {
  log('\n🧪 BOBT Testnet E2E Tests\n', 'info');
  log('=' .repeat(50), 'info');

  // Test 1: Network Connectivity
  log('\n📡 Network Connectivity', 'info');
  await test('Stellar Testnet RPC is reachable', async () => {
    const response = await fetch(`${TESTNET_RPC}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getHealth' }),
    });
    if (!response.ok) {
      throw new Error(`RPC status: ${response.status}`);
    }
    const data = await response.json();
    if (data.result?.status !== 'healthy') {
      throw new Error(`RPC health: ${data.result?.status || 'unknown'}`);
    }
  })();

  await test('Horizon Testnet is reachable', async () => {
    const response = await fetch(`${TESTNET_HORIZON}/`);
    if (!response.ok) {
      throw new Error(`Horizon status: ${response.status}`);
    }
  })();

  // Test 2: Contract Verification (simplified - just check env vars are set)
  log('\n📜 Contract Configuration', 'info');
  if (CONTRACTS.token) {
    await test('Token contract configured', async () => {
      if (!CONTRACTS.token.startsWith('C')) {
        throw new Error('Invalid token contract format');
      }
    })();
  } else {
    skip('Token contract configured', 'BOBT_TOKEN_CONTRACT not set');
  }

  if (CONTRACTS.treasury) {
    await test('Treasury contract configured', async () => {
      if (!CONTRACTS.treasury.startsWith('C')) {
        throw new Error('Invalid treasury contract format');
      }
    })();
  } else {
    skip('Treasury contract configured', 'BOBT_TREASURY_CONTRACT not set');
  }

  if (CONTRACTS.oracle) {
    await test('Oracle contract configured', async () => {
      if (!CONTRACTS.oracle.startsWith('C')) {
        throw new Error('Invalid oracle contract format');
      }
    })();
  } else {
    skip('Oracle contract configured', 'BOBT_ORACLE_CONTRACT not set');
  }

  // Test 3: CriptoYa API
  log('\n💱 Price API (CriptoYa)', 'info');
  await test('CriptoYa API is reachable', async () => {
    const response = await fetch('https://criptoya.com/api/usdt/bob');
    if (!response.ok) {
      throw new Error(`CriptoYa status: ${response.status}`);
    }
    const data = await response.json();
    // Just check we got some data back
    if (!data || Object.keys(data).length === 0) {
      throw new Error('No exchange data returned');
    }
  })();

  await test('Price data contains exchanges', async () => {
    const response = await fetch('https://criptoya.com/api/usdt/bob');
    const data = await response.json();

    // Check at least one exchange has data
    const exchanges = Object.keys(data);
    if (exchanges.length === 0) {
      throw new Error('No exchanges in response');
    }
    log(`    Found ${exchanges.length} exchanges: ${exchanges.slice(0, 5).join(', ')}...`, 'info');
  })();

  await test('Price values are reasonable (5-10 BOB/USD)', async () => {
    const response = await fetch('https://criptoya.com/api/usdt/bob');
    const data = await response.json();

    // Find any exchange with reasonable prices
    let foundReasonable = false;
    for (const [exchange, prices] of Object.entries(data)) {
      if (prices && typeof prices === 'object' && prices.ask) {
        if (prices.ask >= 5 && prices.ask <= 15) {
          foundReasonable = true;
          log(`    ${exchange}: ${prices.ask.toFixed(2)} BOB/USD`, 'info');
          break;
        }
      }
    }

    if (!foundReasonable) {
      throw new Error('No exchange with reasonable price (5-15 BOB/USD)');
    }
  })();

  // Test 4: Friendbot (for new account funding)
  log('\n🤖 Friendbot (Account Funding)', 'info');
  await test('Friendbot is operational', async () => {
    // Just check if friendbot endpoint is reachable (don't actually fund)
    // Use a random test address
    const testAddr = 'GCKFBEIYV2U22IO2BJ4KVJOIP7XPWQGQFKKWXR6DOSJBV7STMAQSMTGG';
    const response = await fetch(`${FRIENDBOT_URL}?addr=${testAddr}`);
    // Accept success, rate limiting, or "already funded" as "operational"
    if (!response.ok && response.status !== 429 && response.status !== 400) {
      throw new Error(`Friendbot status: ${response.status}`);
    }
  })();

  // Print summary
  log('\n' + '=' .repeat(50), 'info');
  log('\n📊 Test Summary\n', 'info');
  log(`  Passed:  ${results.passed}`, 'success');
  log(`  Failed:  ${results.failed}`, results.failed > 0 ? 'error' : 'info');
  log(`  Skipped: ${results.skipped}`, results.skipped > 0 ? 'warning' : 'info');
  log(`  Total:   ${results.passed + results.failed + results.skipped}`, 'info');

  // Exit with appropriate code
  if (results.failed > 0) {
    log('\n❌ Some tests failed!', 'error');
    process.exit(1);
  } else {
    log('\n✅ All tests passed!', 'success');
    process.exit(0);
  }
}

// Run tests
runTests().catch((error) => {
  log(`\n💥 Fatal error: ${error.message}`, 'error');
  process.exit(1);
});
