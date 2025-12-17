# BOBT Testing Guide

## Overview

This document covers the testing strategy for BOBT, including unit tests, integration tests, and the process for testing on testnet before mainnet deployment.

## Test Structure

```
/packages/stellar/src/__tests__/
├── useBalance.test.ts      # Balance formatting and validation
├── useTransfer.test.ts     # Address and amount validation
├── useTreasury.test.ts     # Mint/burn estimation and rate limits
├── ramp-client.test.ts     # On/off-ramp fee calculations
└── bolivia-prices.test.ts  # CriptoYa price handling

/scripts/
└── testnet-e2e.mjs         # End-to-end testnet verification
```

## Running Tests

### Unit Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run with coverage report
pnpm test:coverage

# Run with UI
pnpm test:ui
```

### E2E Testnet Tests

```bash
# Run testnet connectivity tests
pnpm testnet:e2e
```

### Smart Contract Tests

```bash
# Run Rust contract tests
pnpm contracts:test
```

## Test Coverage

Current test coverage includes:

| Module | Tests | Coverage |
|--------|-------|----------|
| Balance Formatting | 11 | Core logic |
| Transfer Validation | 10 | Address/amount validation |
| Treasury Logic | 10 | Rate limits, oracle |
| Ramp Client | 14 | Fees, status transitions |
| Bolivia Prices | 10 | Price aggregation |

**Total: 55 unit tests**

## Testnet Checklist

Before deploying to mainnet, complete this checklist:

### 1. Network Connectivity
- [ ] Soroban RPC is healthy
- [ ] Horizon API is accessible
- [ ] Friendbot is operational (for test accounts)

### 2. Contract Deployment
- [ ] Token contract deployed and verified
- [ ] Treasury contract deployed and verified
- [ ] Oracle contract deployed and verified
- [ ] All contracts linked correctly

### 3. Oracle Testing
- [ ] CriptoYa API returning valid prices
- [ ] Price update bot running successfully
- [ ] Oracle contract receiving updates
- [ ] Stale price detection working

### 4. Wallet Integration
- [ ] Freighter wallet connects
- [ ] xBull wallet connects
- [ ] Address display correct
- [ ] Transaction signing works

### 5. Core Flows
- [ ] Balance queries return correct values
- [ ] Mint BOBT with USDT works
- [ ] Burn BOBT to USDT works
- [ ] Transfer BOBT between wallets works

### 6. Ramp Service
- [ ] On-ramp quote generation
- [ ] QR code payment display
- [ ] Payment verification flow
- [ ] Off-ramp quote generation
- [ ] BOB bank transfer initiation

### 7. Admin Panel
- [ ] Request listing works
- [ ] Manual verification works
- [ ] Processing flow works
- [ ] Stats display correct

## Mainnet Deployment Checklist

### Pre-Deployment

1. **Code Freeze**
   - All features complete
   - All tests passing
   - No critical bugs open

2. **Security Audit**
   - Smart contracts audited
   - Frontend security review
   - API security review

3. **Configuration**
   - Update contract addresses for mainnet
   - Update RPC endpoints
   - Update Horizon endpoints
   - Configure production Oracle sources

4. **Infrastructure**
   - Production servers provisioned
   - SSL certificates configured
   - CDN configured
   - Monitoring set up

### Deployment Steps

1. **Deploy Contracts**
   ```bash
   # Set mainnet network
   export STELLAR_NETWORK=mainnet

   # Deploy contracts in order
   stellar contract deploy --wasm target/wasm32-unknown-unknown/release/bobt_token.wasm
   stellar contract deploy --wasm target/wasm32-unknown-unknown/release/bobt_oracle.wasm
   stellar contract deploy --wasm target/wasm32-unknown-unknown/release/bobt_treasury.wasm
   ```

2. **Initialize Contracts**
   ```bash
   # Initialize token
   stellar contract invoke --id $TOKEN_CONTRACT -- initialize ...

   # Initialize oracle
   stellar contract invoke --id $ORACLE_CONTRACT -- initialize ...

   # Initialize treasury
   stellar contract invoke --id $TREASURY_CONTRACT -- initialize ...
   ```

3. **Update Frontend**
   ```bash
   # Set environment variables
   export NEXT_PUBLIC_STELLAR_NETWORK=mainnet
   export NEXT_PUBLIC_TOKEN_CONTRACT=$TOKEN_CONTRACT
   export NEXT_PUBLIC_TREASURY_CONTRACT=$TREASURY_CONTRACT
   export NEXT_PUBLIC_ORACLE_CONTRACT=$ORACLE_CONTRACT

   # Build and deploy
   pnpm build
   ```

4. **Start Services**
   - Start Oracle price updater
   - Start Ramp service
   - Deploy frontend

### Post-Deployment

1. **Verification**
   - [ ] All contracts verified on stellar.expert
   - [ ] Frontend loads correctly
   - [ ] Wallet connection works
   - [ ] Small test transaction succeeds

2. **Monitoring**
   - [ ] Error tracking active
   - [ ] Performance monitoring active
   - [ ] Alerting configured

3. **Documentation**
   - [ ] Contract addresses published
   - [ ] API documentation updated
   - [ ] User guide updated

## Environment Variables

### Testnet
```env
STELLAR_NETWORK=testnet
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
HORIZON_URL=https://horizon-testnet.stellar.org
BOBT_TOKEN_CONTRACT=C...
BOBT_TREASURY_CONTRACT=C...
BOBT_ORACLE_CONTRACT=C...
```

### Mainnet
```env
STELLAR_NETWORK=mainnet
SOROBAN_RPC_URL=https://soroban-rpc.stellar.org
HORIZON_URL=https://horizon.stellar.org
BOBT_TOKEN_CONTRACT=C...
BOBT_TREASURY_CONTRACT=C...
BOBT_ORACLE_CONTRACT=C...
```

## Troubleshooting

### Common Issues

**Tests fail with "Cannot find module"**
```bash
# Reinstall dependencies
pnpm install
```

**E2E tests show "Contract not found"**
- Ensure contract environment variables are set
- Verify contracts are deployed to correct network

**Price API returns no data**
- CriptoYa may have rate limiting
- Check network connectivity
- Try again after a few minutes

### Getting Help

- Check logs in browser console
- Check Stellar Explorer for transaction details
- Review error messages in test output
- Contact team on Discord for support
