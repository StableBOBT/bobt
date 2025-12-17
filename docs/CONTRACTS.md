# BOBT Smart Contracts - Stellar Testnet

## Overview

BOBT is a Bolivian Peso (BOB) stablecoin built on Stellar's Soroban smart contract platform. The system consists of three main contracts that work together to provide a secure, transparent, and auditable stablecoin infrastructure.

## Contract Addresses (Testnet)

| Contract | Address | Explorer |
|----------|---------|----------|
| **BOBT Token** | `CBFNIREQSJR7EM5QXALVV6JUY3BTYP2G5VRPKB2UIXUJRSUW2TIJHD55` | [View](https://stellar.expert/explorer/testnet/contract/CBFNIREQSJR7EM5QXALVV6JUY3BTYP2G5VRPKB2UIXUJRSUW2TIJHD55) |
| **Price Oracle** | `CAIVJPXLLIJVSSO67Z4V44B2JHYK323GWRG7OCA7IE7DL3IUZC6JL7Q7` | [View](https://stellar.expert/explorer/testnet/contract/CAIVJPXLLIJVSSO67Z4V44B2JHYK323GWRG7OCA7IE7DL3IUZC6JL7Q7) |
| **Treasury** | `CAAXLHDBYDBQLSPBMW4OF42UGBGT6DU5HM2BWZXUVTAIQYPGU74PSJS5` | [View](https://stellar.expert/explorer/testnet/contract/CAAXLHDBYDBQLSPBMW4OF42UGBGT6DU5HM2BWZXUVTAIQYPGU74PSJS5) |

**Deployer Account:** `GAHDQEBNI2NISCTQEAGJAO57QZI75736S6XDDEQSIQKKCY4LQOHA3EGO`

**Deployment Date:** December 16, 2024

---

## Contract Details

### 1. BOBT Token Contract

**Purpose:** ERC-20 compatible token with enhanced compliance features for regulatory requirements.

**Key Features:**
- **SEP-41 Compliant:** Standard Stellar token interface (transfer, approve, balance, etc.)
- **Role-Based Access Control:**
  - `OWNER`: Full admin control, can grant/revoke roles
  - `MINTER`: Can mint new tokens (granted to Treasury)
  - `PAUSER`: Can pause/unpause contract in emergencies
  - `BLACKLISTER`: Can freeze accounts for compliance
  - `RESCUER`: Can recover tokens sent to contract by mistake
- **Pausable:** Emergency circuit breaker to halt all operations
- **Freezable Accounts:** Compliance feature to freeze suspicious accounts
- **Request ID Tracking:** Each mint/burn has unique ID for audit trail

**Functions:**
```
// Standard Token
transfer(from, to, amount)
approve(from, spender, amount, expiration)
balance(id) -> i128
total_supply() -> i128
decimals() -> u32  // Returns 7

// Admin Functions
admin_mint(minter, to, amount, request_id)
grant_role(admin, role, account)
revoke_role(admin, role, account)
pause(pauser) / unpause(pauser)
freeze(blacklister, account) / unfreeze(blacklister, account)
```

---

### 2. Price Oracle Contract

**Purpose:** Provides reliable USD/BOB exchange rate from multiple P2P exchanges.

**Key Features:**
- **Multi-Source Aggregation:** Collects prices from Binance P2P, Bybit P2P, Bitget P2P
- **Staleness Detection:** Prices older than 5 minutes marked as stale
- **Spread Calculation:** Tracks bid/ask spread for transparency
- **Operator System:** Only authorized operators can update prices

**Data Sources:**
- CriptoYa API (aggregates P2P data)
- Updates every 60 seconds via automated bot

**Functions:**
```
// Read Functions
get_price() -> OraclePrice { ask, bid, mid, spread_bps, num_sources, timestamp }
is_price_valid() -> bool
get_exchange_price(exchange: Symbol) -> ExchangePrice

// Write Functions (Operator only)
update_price(operator, exchange, ask, bid, timestamp)
add_operator(admin, operator)
remove_operator(admin, operator)
```

**Price Format:** 7 decimal places (e.g., 69500000 = 6.95 BOB/USD)

---

### 3. Treasury Contract

**Purpose:** Multi-signature control for mint/burn operations with rate limiting.

**Key Features:**
- **Multi-Sig Required:** Configurable threshold (currently 1-of-1 for testnet)
- **Rate Limiting:** Daily limits on mint/burn to prevent abuse
- **Oracle Integration:** Uses Oracle price for USDT → BOBT conversions
- **Proposal System:** All operations go through propose → approve → execute flow

**Functions:**
```
// Proposals
propose_mint(signer, target, bobt_amount, external_ref) -> proposal_id
propose_mint_from_usdt(signer, target, usdt_amount, external_ref) -> proposal_id
propose_burn(signer, target, bobt_amount, external_ref) -> proposal_id

// Approval & Execution
approve_proposal(signer, proposal_id)
execute_proposal(executor, proposal_id)

// Read Functions
get_proposal(id) -> Proposal
get_signers() -> Vec<Address>
get_threshold() -> u32
estimate_bobt_for_usdt(usdt_amount) -> i128
estimate_usdt_for_bobt(bobt_amount) -> i128
is_oracle_valid() -> bool
```

---

## Security Model

### Access Control Hierarchy

```
OWNER (Deployer)
  ├── Can grant/revoke all roles
  ├── Can upgrade contracts
  └── Can transfer ownership

MINTER (Treasury Contract)
  └── Can mint tokens with request_id tracking

PAUSER
  └── Can pause/unpause in emergencies

BLACKLISTER
  ├── Can freeze accounts
  └── Can destroy frozen funds (clawback)

RESCUER
  └── Can recover non-BOBT tokens sent to contract
```

### Current Role Assignments

| Role | Assigned To |
|------|-------------|
| OWNER | `GAHDQEBNI2NISCTQEAGJAO57QZI75736S6XDDEQSIQKKCY4LQOHA3EGO` |
| MINTER | Treasury Contract + Deployer (for testing) |
| Oracle Operator | Deployer Account |
| Treasury Signer | Deployer Account |

---

## Audit Information

### Contract Source Code
- Repository: https://github.com/StableBOBT/bobt
- Contracts Location: `/contracts/`

### WASM Hashes (Testnet Deployment)
```
bobt_token.wasm:  9c0d1ece43791311a859031401453ab5291b56c63eebe5c8eeff0d16933bc1f5
oracle.wasm:      904a9b93a366d89ed178c82e903f726644c1af41c98c0b181f4c2367ce9b67d5
treasury.wasm:    2016ab68039847cadf9142d246aa09f7d604e47cf44aff3717777ea12cff55f8
```

### Verification Steps
1. Clone repository
2. Run `stellar contract build` in `/contracts/`
3. Compare WASM hashes with deployed contracts
4. Use `stellar contract fetch` to get deployed WASM and compare

---

## Integration Guide

### For Wallets
```javascript
// Check BOBT balance
const balance = await client.getBalance(userAddress);

// Token contract for trustline
const tokenContract = 'CBFNIREQSJR7EM5QXALVV6JUY3BTYP2G5VRPKB2UIXUJRSUW2TIJHD55';
```

### For Exchanges
```javascript
// Get current price
const price = await client.getOraclePrice();
// price.mid = mid-market rate in 7 decimals

// Check if price is fresh (< 5 min old)
const isValid = await client.isPriceValid();
```

### For DApps
```javascript
import { BOBTClient } from '@bobt/stellar';

const client = new BOBTClient('testnet');
const balance = await client.getBalance(address);
const price = await client.getOraclePriceDetails();
```

---

## Contact & Support

- **GitHub Issues:** https://github.com/StableBOBT/bobt/issues
- **Documentation:** https://github.com/StableBOBT/bobt/docs

---

*Last Updated: December 16, 2024*
