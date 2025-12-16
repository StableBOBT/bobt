# BOBT Stablecoin

Professional-grade stablecoin on Stellar Soroban, similar to USDC/USDT with full security features.

## Features

- **SEP-41 Compliant** - Standard Stellar fungible token interface
- **Role-Based Access Control** - OWNER, MINTER, PAUSER, BLACKLISTER, RESCUER
- **Pausable** - Emergency pause functionality
- **Blacklist/Freeze** - Compliance-ready account freezing
- **Clawback** - Destroy frozen funds capability
- **Request Tracking** - On-chain audit trail for mint/burn operations
- **Upgradeable** - Contract upgrade support
- **Rescue Tokens** - Recover tokens sent by mistake

## Project Structure

```
.
├── contracts/
│   ├── bobt_token/          # Main stablecoin contract
│   │   └── src/
│   │       ├── lib.rs       # Entry point
│   │       ├── contract.rs  # Main logic
│   │       ├── storage.rs   # Storage keys & types
│   │       ├── errors.rs    # Error codes
│   │       ├── events.rs    # Event emissions
│   │       └── test.rs      # Unit tests
│   └── upgrader/            # Atomic upgrade helper
├── scripts/
│   ├── setup.sh             # Environment setup
│   └── deploy.sh            # Deployment script
├── Cargo.toml               # Workspace config
└── README.md
```

## Quick Start

### Prerequisites

1. **Accept Xcode License** (macOS only):
   ```bash
   sudo xcodebuild -license accept
   ```

2. **Install Rust** (if not installed):
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   rustup target add wasm32-unknown-unknown
   ```

3. **Install Stellar CLI** (if not installed):
   ```bash
   cargo install --locked stellar-cli
   ```

### Build

```bash
stellar contract build
```

### Test

```bash
cargo test
```

### Deploy to Testnet

```bash
# Create and fund testnet identity
stellar keys generate --global bobt_owner --network testnet
stellar keys fund bobt_owner --network testnet

# Deploy
./scripts/deploy.sh
```

## Roles

| Role | Symbol | Permissions |
|------|--------|-------------|
| OWNER | `owner` | Manage all roles, upgrade contract |
| MINTER | `minter` | Mint and burn tokens |
| PAUSER | `pauser` | Pause/unpause operations |
| BLACKLISTER | `blklst` | Freeze accounts, clawback |
| RESCUER | `rescuer` | Rescue stuck tokens |

## API Reference

### Token Operations (SEP-41)
- `balance(id)` - Get account balance
- `transfer(from, to, amount)` - Transfer tokens
- `approve(from, spender, amount, expiration)` - Approve allowance
- `allowance(from, spender)` - Get allowance

### Admin Operations
- `admin_mint(minter, to, amount, request_id)` - Mint tokens (MINTER)
- `admin_burn(operator, from, amount, request_id)` - Burn tokens (MINTER)
- `pause(pauser)` / `unpause(pauser)` - Pause control (PAUSER)
- `freeze(blacklister, account)` / `unfreeze(...)` - Freeze accounts (BLACKLISTER)
- `destroy_frozen_funds(blacklister, account)` - Clawback (BLACKLISTER)
- `rescue_tokens(rescuer, token, to, amount)` - Rescue tokens (RESCUER)
- `grant_role(admin, role, account)` / `revoke_role(...)` - Role management (OWNER)

## Example Usage

```bash
# Mint 1000 BOBT (with 7 decimals = 10000000000 stroops)
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source-account bobt_owner \
  --network testnet \
  -- \
  admin_mint \
  --minter <MINTER_ADDRESS> \
  --to <RECIPIENT_ADDRESS> \
  --amount 10000000000 \
  --request_id "MINT_001"
```

## Security Considerations

1. Use multi-sig for OWNER in production
2. Implement rate limiting in your backend
3. Audit before mainnet deployment
4. Set up monitoring for critical events (freeze, pause, large mints)

## License

MIT
