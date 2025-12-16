# BOBT Stablecoin - Deployment Guide

## Testnet Deployment (Current)

### Contract Addresses

| Contract | Address | Explorer |
|----------|---------|----------|
| Oracle | `CBNL5SYNKPCKVESILEX457DL4RRE6NAUPWRKYO4WI2AOV733NRM2WAMI` | [View](https://stellar.expert/explorer/testnet/contract/CBNL5SYNKPCKVESILEX457DL4RRE6NAUPWRKYO4WI2AOV733NRM2WAMI) |
| BOBT Token | `CDWJIAIGSQBDKIGM22LOVX2FSP5R4K2FRF4FBIG3FZBPM2OH5IIJX65C` | [View](https://stellar.expert/explorer/testnet/contract/CDWJIAIGSQBDKIGM22LOVX2FSP5R4K2FRF4FBIG3FZBPM2OH5IIJX65C) |
| Treasury | `CBPSP452DQ5HEXID2JFGBUWZ3MODTEV43T7UO7YG5QYA2LY4FARBQOZV` | [View](https://stellar.expert/explorer/testnet/contract/CBPSP452DQ5HEXID2JFGBUWZ3MODTEV43T7UO7YG5QYA2LY4FARBQOZV) |

### Identities (Stellar CLI)

```bash
# List all BOBT identities
stellar keys ls | grep bobt

# Available identities:
# - bobt-owner-testnet      (Admin/Owner)
# - bobt-operator-testnet   (Oracle price updater)
# - bobt-signer1-testnet    (Treasury multi-sig)
# - bobt-signer2-testnet    (Treasury multi-sig)
```

### Configuration

Multi-sig: **2-of-3** (owner + signer1 + signer2)

---

## Deploy New Environment

### Prerequisites

```bash
# Stellar CLI
stellar --version  # >= 23.0.0

# Node.js
node --version  # >= 20.0.0

# Rust (for contract compilation)
rustc --version
```

### Step 1: Compile Contracts

```bash
cd /Users/munay/dev/BOBT
stellar contract build
```

### Step 2: Run Deployment Script

```bash
cd scripts/deploy
npm install
npm run deploy:testnet   # or deploy:mainnet
```

The script will:
1. Generate new identities (if not exist)
2. Fund accounts (testnet only)
3. Deploy Oracle, Token, Treasury contracts
4. Initialize all contracts
5. Configure Oracle in Treasury (multi-sig proposal)
6. Grant MINTER role to Treasury

### Step 3: Configure Price Updater

```bash
cd scripts/price-updater
npm install
cp .env.example .env
# Edit .env with values from deployments/testnet.json
npm run update-prices
```

---

## Manual Operations

### Update Oracle Prices

```bash
cd scripts/price-updater
npm run update-prices
```

### Check Oracle Status

```bash
stellar contract invoke \
  --id CBNL5SYNKPCKVESILEX457DL4RRE6NAUPWRKYO4WI2AOV733NRM2WAMI \
  --source bobt-operator-testnet \
  --network testnet \
  -- get_price
```

### Check Treasury Status

```bash
# Is Oracle configured?
stellar contract invoke \
  --id CBPSP452DQ5HEXID2JFGBUWZ3MODTEV43T7UO7YG5QYA2LY4FARBQOZV \
  --source bobt-owner-testnet \
  --network testnet \
  -- is_oracle_valid

# Estimate BOBT for 100 USDT
stellar contract invoke \
  --id CBPSP452DQ5HEXID2JFGBUWZ3MODTEV43T7UO7YG5QYA2LY4FARBQOZV \
  --source bobt-owner-testnet \
  --network testnet \
  -- estimate_bobt_for_usdt --usdt_amount 1000000000
```

### Check Token Roles

```bash
stellar contract invoke \
  --id CDWJIAIGSQBDKIGM22LOVX2FSP5R4K2FRF4FBIG3FZBPM2OH5IIJX65C \
  --source bobt-owner-testnet \
  --network testnet \
  -- has_role --role minter --account CBPSP452DQ5HEXID2JFGBUWZ3MODTEV43T7UO7YG5QYA2LY4FARBQOZV
```

---

## GitHub Actions Setup

### Required Secrets

Add these secrets in GitHub → Settings → Secrets → Actions:

| Secret | Value |
|--------|-------|
| `STELLAR_SECRET_KEY` | Oracle operator secret key |
| `ORACLE_CONTRACT_ID` | `CBNL5SYNKPCKVESILEX457DL4RRE6NAUPWRKYO4WI2AOV733NRM2WAMI` |

### Get Operator Secret Key

```bash
stellar keys show bobt-operator-testnet
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        OFF-CHAIN                                │
├─────────────────────────────────────────────────────────────────┤
│   CriptoYa API (Binance P2P, Bybit P2P, Bitget P2P)            │
│                              │                                  │
│                              ▼                                  │
│                    ┌─────────────────┐                          │
│                    │  Price Updater  │ ◄── GitHub Actions       │
│                    │   (cada 15min)  │     (gratis)             │
│                    └────────┬────────┘                          │
└─────────────────────────────┼───────────────────────────────────┘
                              │
┌─────────────────────────────┼───────────────────────────────────┐
│                        ON-CHAIN (Soroban)                       │
├─────────────────────────────┼───────────────────────────────────┤
│                             ▼                                   │
│                    ┌─────────────────┐                          │
│                    │     ORACLE      │                          │
│                    │ (precios P2P)   │                          │
│                    └────────┬────────┘                          │
│                             │                                   │
│              ┌──────────────┴──────────────┐                    │
│              │                             │                    │
│              ▼                             ▼                    │
│     ┌─────────────────┐           ┌─────────────────┐          │
│     │    TREASURY     │           │   BOBT TOKEN    │          │
│     │  (2-of-3 sig)   │──────────►│   (stablecoin)  │          │
│     │  (rate limits)  │   mint    │   (SEP-41)      │          │
│     └─────────────────┘           └─────────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Security Checklist

- [x] Multi-sig Treasury (2-of-3)
- [x] Oracle operator separate from admin
- [x] Rate limits on mint/burn
- [x] Price deviation checks
- [x] Pausable token
- [x] Blacklist capability
- [ ] External security audit (pre-mainnet)
- [ ] Bug bounty program

---

*Last updated: 2025-12-16*
