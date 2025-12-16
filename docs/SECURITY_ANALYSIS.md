# BOBT Stablecoin - Security Analysis

## Executive Summary

This document presents the results of adversarial testing performed on the BOBT Stablecoin system deployed on Stellar Testnet. All critical attack vectors were tested and **all were successfully blocked** by the system's built-in protections.

**Test Date:** 2025-12-16
**Network:** Stellar Testnet
**Contracts Tested:**
- Oracle: `CBNL5SYNKPCKVESILEX457DL4RRE6NAUPWRKYO4WI2AOV733NRM2WAMI`
- BOBT Token: `CDWJIAIGSQBDKIGM22LOVX2FSP5R4K2FRF4FBIG3FZBPM2OH5IIJX65C`
- Treasury: `CBPSP452DQ5HEXID2JFGBUWZ3MODTEV43T7UO7YG5QYA2LY4FARBQOZV`

---

## Attack Vectors Tested

### 1. Oracle Manipulation

| Attack | Result | Error Code | Description |
|--------|--------|------------|-------------|
| Price manipulation (>10% change) | **BLOCKED** | #23 `PriceDeviationTooHigh` | Cannot change price more than 10% per update |
| Stale price usage | **BLOCKED** | #22 `PriceStale` | Prices >15 minutes are rejected |
| Insufficient sources | **BLOCKED** | #24 `InsufficientSources` | Requires minimum 2 exchanges |

**Protection Limits:**
- `MAX_PRICE_DEVIATION_BPS`: 1000 (10%)
- `MAX_PRICE_AGE_SECS`: 900 (15 minutes)
- `MIN_EXCHANGES_FOR_AGGREGATION`: 2

### 2. Treasury Attacks

| Attack | Result | Error Code | Description |
|--------|--------|------------|-------------|
| Unauthorized mint (non-signer) | **BLOCKED** | #11 `NotASigner` | Only signers can create proposals |
| Exceed single operation limit | **BLOCKED** | #33 `SingleOpLimitExceeded` | Max 1M BOBT per operation |
| Exceed daily limit | **BLOCKED** | #31 `DailyMintLimitExceeded` | Max 10M BOBT per day |

**Protection Limits:**
- `DEFAULT_SINGLE_OP_LIMIT`: 1,000,000 BOBT
- `DEFAULT_DAILY_MINT_LIMIT`: 10,000,000 BOBT
- `DEFAULT_DAILY_BURN_LIMIT`: 10,000,000 BOBT
- `PROPOSAL_EXPIRATION_LEDGERS`: 7 days (~120,960 ledgers)

### 3. Token Attacks

| Attack | Result | Error Code | Description |
|--------|--------|------------|-------------|
| Transfer while paused | **BLOCKED** | #11 `ContractPaused` | No transfers during pause |
| Transfer to/from frozen | **BLOCKED** | #21 `AccountFrozen` | Frozen accounts cannot transact |
| Replay attack (same request_id) | **BLOCKED** | #51 `RequestAlreadyExists` | Request IDs are unique |

### 4. Economic Attacks (Depeg Scenarios)

| Scenario | System Response | Risk Level |
|----------|-----------------|------------|
| BOB flash crash (-50%) | Oracle rejects updates → becomes stale → all operations stop | **LOW** |
| BOB gradual decline | Oracle tracks within 10% bands, system operates normally | **LOW** |
| USDT depeg | No direct protection, but Treasury multi-sig can pause | **MEDIUM** |

---

## System Behavior During Flash Crash

```
Scenario: BOB drops 50% in minutes

T+0min:  Real market price: 9.15 → 4.57 BOB/USD (-50%)
T+0min:  Oracle update attempt → Error #23 (>10% deviation)
T+15min: All exchange prices become stale
T+15min: Any mint/burn attempt → Error #22 (PriceStale)

Result: System SELF-STOPS automatically
        No arbitrage possible
        Treasury signers can intervene manually
```

---

## Security Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     SECURITY LAYERS                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Layer 1: Oracle Protection                                      │
│  ├── Price deviation check (max 10% per update)                 │
│  ├── Price staleness check (max 15 min)                         │
│  └── Multi-source requirement (min 2 exchanges)                 │
│                                                                  │
│  Layer 2: Treasury Multi-sig                                     │
│  ├── 2-of-3 signature requirement                               │
│  ├── Proposal expiration (7 days)                               │
│  └── Rate limiting (daily/single op)                            │
│                                                                  │
│  Layer 3: Token Controls                                         │
│  ├── Pause capability (emergency stop)                          │
│  ├── Freeze/blacklist (compliance)                              │
│  ├── Request ID tracking (replay protection)                    │
│  └── Role-based access (MINTER, PAUSER, BLACKLISTER)           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Recommendations

### Current Strengths
1. **Defense in Depth**: Multiple security layers protect against various attack vectors
2. **Automatic Circuit Breaker**: Oracle staleness acts as automatic pause during volatility
3. **Multi-sig Governance**: Critical operations require multiple approvals
4. **Comprehensive Audit Trail**: All mint/burn operations tracked with external references

### Recommendations for Production

1. **External Audit**
   - Engage professional security firm before mainnet deployment
   - Focus on: oracle manipulation, multi-sig bypass, rate limit circumvention

2. **Monitoring Infrastructure**
   - Real-time alerts for unusual price movements
   - Dashboard for Treasury rate limit usage
   - Automated Oracle health checks

3. **Emergency Procedures**
   - Document step-by-step pause procedure
   - Define criteria for emergency pause activation
   - Test emergency recovery on testnet periodically

4. **Rate Limit Tuning**
   - Consider lowering initial limits for mainnet launch
   - Gradually increase as system proves stable
   - Implement dynamic limits based on market conditions

5. **Oracle Improvements** (Future)
   - Add more price sources when available
   - Consider weighted average by source reliability
   - Implement TWAP (Time-Weighted Average Price) for large operations

---

## Error Code Reference

### Oracle Errors (1-40)
| Code | Name | Description |
|------|------|-------------|
| 1 | AlreadyInitialized | Contract already initialized |
| 2 | NotInitialized | Contract not initialized |
| 11 | Unauthorized | Caller not authorized |
| 12 | NotAnOperator | Caller is not an operator |
| 21 | InvalidPrice | Price is invalid (negative or zero) |
| 22 | PriceStale | Price data is too old |
| 23 | PriceDeviationTooHigh | Price change exceeds 10% |
| 24 | InsufficientSources | Not enough price sources |
| 25 | InvalidExchange | Unknown exchange identifier |

### Treasury Errors (1-60)
| Code | Name | Description |
|------|------|-------------|
| 11 | NotASigner | Caller is not a signer |
| 12 | AlreadyApproved | Signer already approved |
| 13 | InsufficientApprovals | Not enough approvals |
| 21 | ProposalNotFound | Proposal doesn't exist |
| 22 | ProposalAlreadyExecuted | Already executed |
| 23 | ProposalExpired | Proposal has expired |
| 31 | DailyMintLimitExceeded | Daily mint limit reached |
| 33 | SingleOpLimitExceeded | Single operation too large |
| 51 | OracleNotConfigured | Oracle address not set |
| 52 | OraclePriceInvalid | Oracle returned invalid price |

### Token Errors (1-90)
| Code | Name | Description |
|------|------|-------------|
| 1 | Unauthorized | Not authorized |
| 11 | ContractPaused | Contract is paused |
| 21 | AccountFrozen | Account is frozen |
| 31 | InsufficientBalance | Not enough balance |
| 51 | RequestAlreadyExists | Duplicate request ID |

---

## Conclusion

The BOBT Stablecoin system demonstrates robust security with multiple layers of protection. All tested attack vectors were successfully blocked by the system's built-in safeguards. The automatic circuit-breaker behavior during extreme price movements provides an important safety mechanism for black swan events.

**Overall Security Rating: STRONG** (with recommendation for external audit before mainnet)

---

*Document generated from adversarial testing on Stellar Testnet - 2025-12-16*
