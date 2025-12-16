#!/bin/bash
# BOBT Stablecoin - Setup Script
# This script sets up the development environment and builds the project

set -e

echo "================================================"
echo "  BOBT Stablecoin - Setup Script"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    echo -e "${GREEN}[OK]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Xcode license is accepted
echo "Checking Xcode license..."
if ! xcodebuild -checkFirstLaunchStatus 2>/dev/null; then
    print_warning "Xcode license not accepted. Please run:"
    echo "    sudo xcodebuild -license accept"
    echo ""
    exit 1
fi
print_status "Xcode license accepted"

# Check Rust installation
echo ""
echo "Checking Rust installation..."
if ! command -v rustc &> /dev/null; then
    print_error "Rust not found. Installing..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "$HOME/.cargo/env"
fi
print_status "Rust $(rustc --version | cut -d' ' -f2) installed"

# Check WASM target
echo ""
echo "Checking WASM target..."
if ! rustup target list | grep -q "wasm32-unknown-unknown (installed)"; then
    print_warning "Adding wasm32-unknown-unknown target..."
    rustup target add wasm32-unknown-unknown
fi
print_status "WASM target available"

# Check Stellar CLI
echo ""
echo "Checking Stellar CLI..."
if ! command -v stellar &> /dev/null; then
    print_warning "Stellar CLI not found. Installing..."
    cargo install --locked stellar-cli
fi
print_status "Stellar CLI $(stellar --version | head -1 | cut -d' ' -f2) installed"

# Build the project
echo ""
echo "================================================"
echo "  Building BOBT Stablecoin Contracts"
echo "================================================"
echo ""

cd "$(dirname "$0")/.."

echo "Building contracts..."
stellar contract build

if [ $? -eq 0 ]; then
    print_status "Build successful!"
    echo ""
    echo "WASM files generated:"
    ls -la target/wasm32-unknown-unknown/release/*.wasm 2>/dev/null || ls -la target/wasm32v1-none/release/*.wasm 2>/dev/null
else
    print_error "Build failed!"
    exit 1
fi

# Run tests
echo ""
echo "================================================"
echo "  Running Tests"
echo "================================================"
echo ""

cargo test

if [ $? -eq 0 ]; then
    print_status "All tests passed!"
else
    print_error "Some tests failed!"
    exit 1
fi

echo ""
echo "================================================"
echo "  Setup Complete!"
echo "================================================"
echo ""
echo "Next steps:"
echo "  1. Configure testnet identity:"
echo "     stellar keys generate --global bobt_owner --network testnet"
echo "     stellar keys fund bobt_owner --network testnet"
echo ""
echo "  2. Deploy the contract:"
echo "     ./scripts/deploy.sh"
echo ""
