#!/bin/bash
# BOBT Stablecoin - Deployment Script
# This script deploys the BOBT stablecoin to Stellar testnet

set -e

echo "================================================"
echo "  BOBT Stablecoin - Deployment Script"
echo "================================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

print_status() { echo -e "${GREEN}[OK]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_info() { echo -e "${CYAN}[INFO]${NC} $1"; }

# Configuration
NETWORK="testnet"
SOURCE_ACCOUNT="${SOURCE_ACCOUNT:-bobt_owner}"

cd "$(dirname "$0")/.."

# Check if identity exists
echo "Checking identity..."
if ! stellar keys address "$SOURCE_ACCOUNT" --network "$NETWORK" 2>/dev/null; then
    print_warning "Identity '$SOURCE_ACCOUNT' not found. Creating..."
    stellar keys generate --global "$SOURCE_ACCOUNT" --network "$NETWORK"
    print_info "Funding account with testnet XLM..."
    stellar keys fund "$SOURCE_ACCOUNT" --network "$NETWORK"
fi
OWNER_ADDRESS=$(stellar keys address "$SOURCE_ACCOUNT")
print_status "Using identity: $SOURCE_ACCOUNT"
print_info "Address: $OWNER_ADDRESS"

# Build if necessary
echo ""
echo "Checking for WASM files..."
WASM_FILE="target/wasm32-unknown-unknown/release/bobt_token.wasm"
if [ ! -f "$WASM_FILE" ]; then
    WASM_FILE="target/wasm32v1-none/release/bobt_token.wasm"
fi

if [ ! -f "$WASM_FILE" ]; then
    print_warning "WASM file not found. Building..."
    stellar contract build
fi
print_status "WASM file ready: $WASM_FILE"

# Deploy BOBT Token
echo ""
echo "================================================"
echo "  Deploying BOBT Token Contract"
echo "================================================"
echo ""

print_info "Deploying to $NETWORK..."

CONTRACT_ID=$(stellar contract deploy \
    --wasm "$WASM_FILE" \
    --source-account "$SOURCE_ACCOUNT" \
    --network "$NETWORK" \
    --alias bobt_token 2>&1 | tail -1)

print_status "Contract deployed!"
print_info "Contract ID: $CONTRACT_ID"

# Initialize the contract
echo ""
echo "Initializing contract..."
stellar contract invoke \
    --id "$CONTRACT_ID" \
    --source-account "$SOURCE_ACCOUNT" \
    --network "$NETWORK" \
    -- \
    initialize \
    --owner "$OWNER_ADDRESS"

print_status "Contract initialized!"

# Grant roles to owner
echo ""
echo "Setting up roles..."

# Grant MINTER role
stellar contract invoke \
    --id "$CONTRACT_ID" \
    --source-account "$SOURCE_ACCOUNT" \
    --network "$NETWORK" \
    -- \
    grant_role \
    --admin "$OWNER_ADDRESS" \
    --role minter \
    --account "$OWNER_ADDRESS"
print_status "MINTER role granted"

# Grant PAUSER role
stellar contract invoke \
    --id "$CONTRACT_ID" \
    --source-account "$SOURCE_ACCOUNT" \
    --network "$NETWORK" \
    -- \
    grant_role \
    --admin "$OWNER_ADDRESS" \
    --role pauser \
    --account "$OWNER_ADDRESS"
print_status "PAUSER role granted"

# Grant BLACKLISTER role
stellar contract invoke \
    --id "$CONTRACT_ID" \
    --source-account "$SOURCE_ACCOUNT" \
    --network "$NETWORK" \
    -- \
    grant_role \
    --admin "$OWNER_ADDRESS" \
    --role blklst \
    --account "$OWNER_ADDRESS"
print_status "BLACKLISTER role granted"

# Grant RESCUER role
stellar contract invoke \
    --id "$CONTRACT_ID" \
    --source-account "$SOURCE_ACCOUNT" \
    --network "$NETWORK" \
    -- \
    grant_role \
    --admin "$OWNER_ADDRESS" \
    --role rescuer \
    --account "$OWNER_ADDRESS"
print_status "RESCUER role granted"

# Verify deployment
echo ""
echo "================================================"
echo "  Verifying Deployment"
echo "================================================"
echo ""

NAME=$(stellar contract invoke \
    --id "$CONTRACT_ID" \
    --source-account "$SOURCE_ACCOUNT" \
    --network "$NETWORK" \
    -- \
    name 2>&1 | tail -1)

SYMBOL=$(stellar contract invoke \
    --id "$CONTRACT_ID" \
    --source-account "$SOURCE_ACCOUNT" \
    --network "$NETWORK" \
    -- \
    symbol 2>&1 | tail -1)

DECIMALS=$(stellar contract invoke \
    --id "$CONTRACT_ID" \
    --source-account "$SOURCE_ACCOUNT" \
    --network "$NETWORK" \
    -- \
    decimals 2>&1 | tail -1)

echo "Token Name: $NAME"
echo "Token Symbol: $SYMBOL"
echo "Decimals: $DECIMALS"

echo ""
echo "================================================"
echo "  Deployment Complete!"
echo "================================================"
echo ""
echo "Contract Details:"
echo "  Network:     $NETWORK"
echo "  Contract ID: $CONTRACT_ID"
echo "  Owner:       $OWNER_ADDRESS"
echo ""
echo "Save these values for future operations!"
echo ""
echo "Example mint command:"
echo "  stellar contract invoke \\"
echo "    --id $CONTRACT_ID \\"
echo "    --source-account $SOURCE_ACCOUNT \\"
echo "    --network $NETWORK \\"
echo "    -- \\"
echo "    admin_mint \\"
echo "    --minter $OWNER_ADDRESS \\"
echo "    --to <RECIPIENT_ADDRESS> \\"
echo "    --amount 1000000000 \\"
echo "    --request_id \"REQ001\""
echo ""
