#!/usr/bin/env node
/**
 * BOBT Contract Deployment Script
 *
 * Deploys and initializes all BOBT contracts in the correct order:
 * 1. Oracle (price feed)
 * 2. BOBT Token (stablecoin)
 * 3. Treasury (mint/burn management)
 * 4. Configure Oracle in Treasury (via proposal)
 * 5. Grant MINTER role to Treasury
 *
 * Usage:
 *   npm run deploy:testnet
 *   npm run deploy:mainnet
 */

import 'dotenv/config';
import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..', '..', '..');

// =============================================================================
// CONFIGURATION
// =============================================================================

interface DeploymentConfig {
  network: 'testnet' | 'mainnet';
  identities: {
    owner: string;
    oracleOperator: string;
    treasurySigner1: string;
    treasurySigner2: string;
  };
  publicKeys: {
    owner?: string;
    oracleOperator?: string;
    treasurySigner1?: string;
    treasurySigner2?: string;
  };
  contracts: {
    oracle?: string;
    bobtToken?: string;
    treasury?: string;
  };
  initialized: {
    oracle?: boolean;
    bobtToken?: boolean;
    treasury?: boolean;
    treasuryOracle?: boolean;
    treasuryMinter?: boolean;
  };
}

const WASM_FILES = {
  oracle: join(PROJECT_ROOT, 'target/wasm32v1-none/release/oracle.wasm'),
  bobtToken: join(PROJECT_ROOT, 'target/wasm32v1-none/release/bobt_token.wasm'),
  treasury: join(PROJECT_ROOT, 'target/wasm32v1-none/release/treasury.wasm'),
};

// =============================================================================
// HELPERS
// =============================================================================

function log(message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info'): void {
  const prefix = {
    info: '\x1b[36m[INFO]\x1b[0m',
    success: '\x1b[32m[OK]\x1b[0m',
    error: '\x1b[31m[ERROR]\x1b[0m',
    warn: '\x1b[33m[WARN]\x1b[0m',
  };
  console.log(`${prefix[type]} ${message}`);
}

function exec(command: string, silent = false): string {
  try {
    const output = execSync(command, {
      encoding: 'utf-8',
      stdio: silent ? 'pipe' : 'inherit',
      cwd: PROJECT_ROOT,
    });
    return output?.trim() || '';
  } catch (error) {
    if (error instanceof Error && 'stdout' in error) {
      return (error as any).stdout?.toString().trim() || '';
    }
    throw error;
  }
}

function execCapture(command: string): string {
  try {
    return execSync(command, {
      encoding: 'utf-8',
      stdio: 'pipe',
      cwd: PROJECT_ROOT,
    }).trim();
  } catch (error) {
    if (error instanceof Error && 'stderr' in error) {
      const stderr = (error as any).stderr?.toString() || '';
      const stdout = (error as any).stdout?.toString() || '';
      throw new Error(stderr || stdout || (error as Error).message);
    }
    throw error;
  }
}

function getPublicKey(identity: string): string {
  return execCapture(`stellar keys address ${identity}`);
}

function keyExists(identity: string): boolean {
  try {
    execCapture(`stellar keys address ${identity}`);
    return true;
  } catch {
    return false;
  }
}

function loadDeployment(network: string): DeploymentConfig | null {
  const path = join(PROJECT_ROOT, 'deployments', `${network}.json`);
  if (existsSync(path)) {
    return JSON.parse(readFileSync(path, 'utf-8'));
  }
  return null;
}

function saveDeployment(config: DeploymentConfig): void {
  const dir = join(PROJECT_ROOT, 'deployments');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const path = join(dir, `${config.network}.json`);
  writeFileSync(path, JSON.stringify(config, null, 2));
  log(`Deployment saved to ${path}`, 'success');
}

// =============================================================================
// DEPLOYMENT FUNCTIONS
// =============================================================================

async function generateIdentities(config: DeploymentConfig): Promise<void> {
  log('Generating/checking identities...');

  const identities = [
    { key: 'owner' as const, name: config.identities.owner, desc: 'Owner (admin)' },
    { key: 'oracleOperator' as const, name: config.identities.oracleOperator, desc: 'Oracle Operator' },
    { key: 'treasurySigner1' as const, name: config.identities.treasurySigner1, desc: 'Treasury Signer 1' },
    { key: 'treasurySigner2' as const, name: config.identities.treasurySigner2, desc: 'Treasury Signer 2' },
  ];

  for (const { key, name, desc } of identities) {
    if (keyExists(name)) {
      const pubkey = getPublicKey(name);
      config.publicKeys[key] = pubkey;
      log(`  ${desc}: ${pubkey.slice(0, 8)}...${pubkey.slice(-4)} (exists)`, 'info');
    } else {
      exec(`stellar keys generate --global ${name} --network ${config.network}`, true);
      const pubkey = getPublicKey(name);
      config.publicKeys[key] = pubkey;
      log(`  ${desc}: ${pubkey.slice(0, 8)}...${pubkey.slice(-4)} (created)`, 'success');
    }
  }
}

async function fundAccounts(config: DeploymentConfig): Promise<void> {
  log('Funding accounts on testnet...');

  if (config.network !== 'testnet') {
    log('  Skipping funding on mainnet (manual funding required)', 'warn');
    return;
  }

  const identities = [
    config.identities.owner,
    config.identities.oracleOperator,
    config.identities.treasurySigner1,
    config.identities.treasurySigner2,
  ];

  for (const identity of identities) {
    try {
      log(`  Funding ${identity}...`);
      exec(`stellar keys fund ${identity} --network testnet`, true);
      log(`  ${identity} funded`, 'success');
    } catch (error) {
      log(`  ${identity} already funded or error`, 'warn');
    }
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

async function deployContract(
  name: string,
  wasmPath: string,
  source: string,
  network: string
): Promise<string> {
  log(`Deploying ${name}...`);

  if (!existsSync(wasmPath)) {
    throw new Error(`WASM file not found: ${wasmPath}`);
  }

  const output = execCapture(
    `stellar contract deploy --wasm "${wasmPath}" --source ${source} --network ${network}`
  );

  const contractId = output.trim();
  if (!contractId.startsWith('C')) {
    throw new Error(`Invalid contract ID: ${output}`);
  }

  log(`  ${name} deployed: ${contractId}`, 'success');
  return contractId;
}

async function initializeOracle(config: DeploymentConfig): Promise<void> {
  log('Initializing Oracle contract...');

  const oracleId = config.contracts.oracle!;
  const adminPubkey = config.publicKeys.owner!;
  const operatorPubkey = config.publicKeys.oracleOperator!;

  try {
    execCapture(
      `stellar contract invoke \
        --id ${oracleId} \
        --source ${config.identities.owner} \
        --network ${config.network} \
        -- \
        initialize \
        --admin ${adminPubkey} \
        --operators '["${operatorPubkey}"]'`
    );
    config.initialized.oracle = true;
    log('  Oracle initialized', 'success');
  } catch (error) {
    if (String(error).includes('AlreadyInitialized')) {
      config.initialized.oracle = true;
      log('  Oracle already initialized', 'warn');
    } else {
      throw error;
    }
  }
}

async function initializeToken(config: DeploymentConfig): Promise<void> {
  log('Initializing BOBT Token contract...');

  const tokenId = config.contracts.bobtToken!;
  const ownerPubkey = config.publicKeys.owner!;

  try {
    execCapture(
      `stellar contract invoke \
        --id ${tokenId} \
        --source ${config.identities.owner} \
        --network ${config.network} \
        -- \
        initialize \
        --owner ${ownerPubkey}`
    );
    config.initialized.bobtToken = true;
    log('  BOBT Token initialized', 'success');
  } catch (error) {
    if (String(error).includes('AlreadyInitialized')) {
      config.initialized.bobtToken = true;
      log('  BOBT Token already initialized', 'warn');
    } else {
      throw error;
    }
  }
}

async function initializeTreasury(config: DeploymentConfig): Promise<void> {
  log('Initializing Treasury contract...');

  const treasuryId = config.contracts.treasury!;
  const tokenId = config.contracts.bobtToken!;
  const signer1Pubkey = config.publicKeys.treasurySigner1!;
  const signer2Pubkey = config.publicKeys.treasurySigner2!;
  const ownerPubkey = config.publicKeys.owner!;

  // 2-of-3 multi-sig with owner + 2 signers
  const signersArray = `["${ownerPubkey}","${signer1Pubkey}","${signer2Pubkey}"]`;

  try {
    execCapture(
      `stellar contract invoke \
        --id ${treasuryId} \
        --source ${config.identities.owner} \
        --network ${config.network} \
        -- \
        initialize \
        --token_address ${tokenId} \
        --signers '${signersArray}' \
        --threshold 2`
    );
    config.initialized.treasury = true;
    log('  Treasury initialized (2-of-3 multi-sig)', 'success');
  } catch (error) {
    if (String(error).includes('AlreadyInitialized')) {
      config.initialized.treasury = true;
      log('  Treasury already initialized', 'warn');
    } else {
      throw error;
    }
  }
}

async function configureOracleInTreasury(config: DeploymentConfig): Promise<void> {
  log('Configuring Oracle in Treasury (multi-sig proposal)...');

  const treasuryId = config.contracts.treasury!;
  const oracleId = config.contracts.oracle!;

  try {
    // Step 1: Create proposal (signer1)
    log('  Creating proposal to set Oracle...');
    const proposalOutput = execCapture(
      `stellar contract invoke \
        --id ${treasuryId} \
        --source ${config.identities.treasurySigner1} \
        --network ${config.network} \
        -- \
        propose_set_oracle \
        --proposer ${config.publicKeys.treasurySigner1} \
        --oracle_address ${oracleId}`
    );

    // Parse proposal ID from output (it's a u64)
    const proposalId = proposalOutput.replace(/"/g, '').trim();
    log(`  Proposal created: ID ${proposalId}`, 'success');

    // Step 2: Approve (signer2)
    log('  Approving proposal (signer2)...');
    execCapture(
      `stellar contract invoke \
        --id ${treasuryId} \
        --source ${config.identities.treasurySigner2} \
        --network ${config.network} \
        -- \
        approve \
        --signer ${config.publicKeys.treasurySigner2} \
        --proposal_id ${proposalId}`
    );
    log('  Proposal approved', 'success');

    // Step 3: Execute (signer1)
    log('  Executing proposal...');
    execCapture(
      `stellar contract invoke \
        --id ${treasuryId} \
        --source ${config.identities.treasurySigner1} \
        --network ${config.network} \
        -- \
        execute \
        --executor ${config.publicKeys.treasurySigner1} \
        --proposal_id ${proposalId}`
    );
    config.initialized.treasuryOracle = true;
    log('  Oracle configured in Treasury', 'success');
  } catch (error) {
    if (String(error).includes('OracleNotConfigured') === false) {
      log(`  Oracle configuration may already be done or failed: ${error}`, 'warn');
    }
  }
}

async function grantMinterRole(config: DeploymentConfig): Promise<void> {
  log('Granting MINTER role to Treasury...');

  const tokenId = config.contracts.bobtToken!;
  const treasuryId = config.contracts.treasury!;

  try {
    execCapture(
      `stellar contract invoke \
        --id ${tokenId} \
        --source ${config.identities.owner} \
        --network ${config.network} \
        -- \
        grant_role \
        --caller ${config.publicKeys.owner} \
        --role '"MINTER"' \
        --account ${treasuryId}`
    );
    config.initialized.treasuryMinter = true;
    log('  Treasury granted MINTER role', 'success');
  } catch (error) {
    if (String(error).includes('RoleAlreadyGranted') || String(error).includes('already')) {
      config.initialized.treasuryMinter = true;
      log('  Treasury already has MINTER role', 'warn');
    } else {
      log(`  Grant MINTER role failed: ${error}`, 'warn');
    }
  }
}

// =============================================================================
// MAIN
// =============================================================================

async function main(): Promise<void> {
  console.log('');
  console.log('='.repeat(60));
  console.log('BOBT Contract Deployment');
  console.log('='.repeat(60));
  console.log('');

  const network = (process.env.NETWORK || 'testnet') as 'testnet' | 'mainnet';
  log(`Network: ${network}`);

  if (network === 'mainnet') {
    log('MAINNET deployment - please confirm you want to proceed', 'warn');
    log('Press Ctrl+C to cancel, or wait 5 seconds to continue...', 'warn');
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  let config = loadDeployment(network);

  if (!config) {
    config = {
      network,
      identities: {
        owner: `bobt-owner-${network}`,
        oracleOperator: `bobt-operator-${network}`,
        treasurySigner1: `bobt-signer1-${network}`,
        treasurySigner2: `bobt-signer2-${network}`,
      },
      publicKeys: {},
      contracts: {},
      initialized: {},
    };
  }

  // Step 1: Generate identities
  console.log('\n--- Step 1: Identities ---\n');
  await generateIdentities(config);
  saveDeployment(config);

  // Step 2: Fund accounts
  console.log('\n--- Step 2: Funding ---\n');
  await fundAccounts(config);

  // Step 3: Deploy contracts
  console.log('\n--- Step 3: Deploy Contracts ---\n');

  if (!config.contracts.oracle) {
    config.contracts.oracle = await deployContract(
      'Oracle',
      WASM_FILES.oracle,
      config.identities.owner,
      network
    );
    saveDeployment(config);
  } else {
    log(`Oracle already deployed: ${config.contracts.oracle}`, 'info');
  }

  if (!config.contracts.bobtToken) {
    config.contracts.bobtToken = await deployContract(
      'BOBT Token',
      WASM_FILES.bobtToken,
      config.identities.owner,
      network
    );
    saveDeployment(config);
  } else {
    log(`BOBT Token already deployed: ${config.contracts.bobtToken}`, 'info');
  }

  if (!config.contracts.treasury) {
    config.contracts.treasury = await deployContract(
      'Treasury',
      WASM_FILES.treasury,
      config.identities.owner,
      network
    );
    saveDeployment(config);
  } else {
    log(`Treasury already deployed: ${config.contracts.treasury}`, 'info');
  }

  // Step 4: Initialize contracts
  console.log('\n--- Step 4: Initialize Contracts ---\n');

  if (!config.initialized.oracle) {
    await initializeOracle(config);
    saveDeployment(config);
  } else {
    log('Oracle already initialized', 'info');
  }

  if (!config.initialized.bobtToken) {
    await initializeToken(config);
    saveDeployment(config);
  } else {
    log('BOBT Token already initialized', 'info');
  }

  if (!config.initialized.treasury) {
    await initializeTreasury(config);
    saveDeployment(config);
  } else {
    log('Treasury already initialized', 'info');
  }

  // Step 5: Configure Oracle in Treasury
  console.log('\n--- Step 5: Configure Oracle in Treasury ---\n');

  if (!config.initialized.treasuryOracle) {
    await configureOracleInTreasury(config);
    saveDeployment(config);
  } else {
    log('Oracle already configured in Treasury', 'info');
  }

  // Step 6: Grant MINTER role to Treasury
  console.log('\n--- Step 6: Grant MINTER Role ---\n');

  if (!config.initialized.treasuryMinter) {
    await grantMinterRole(config);
    saveDeployment(config);
  } else {
    log('Treasury already has MINTER role', 'info');
  }

  // Save final config
  saveDeployment(config);

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('DEPLOYMENT COMPLETE');
  console.log('='.repeat(60));
  console.log('');
  console.log('Contract IDs:');
  console.log(`  Oracle:     ${config.contracts.oracle}`);
  console.log(`  BOBT Token: ${config.contracts.bobtToken}`);
  console.log(`  Treasury:   ${config.contracts.treasury}`);
  console.log('');
  console.log('Identities (stellar keys):');
  console.log(`  Owner:           ${config.identities.owner}`);
  console.log(`  Oracle Operator: ${config.identities.oracleOperator}`);
  console.log(`  Signer 1:        ${config.identities.treasurySigner1}`);
  console.log(`  Signer 2:        ${config.identities.treasurySigner2}`);
  console.log('');

  const explorerBase =
    network === 'mainnet'
      ? 'https://stellar.expert/explorer/public/contract'
      : 'https://stellar.expert/explorer/testnet/contract';

  console.log('Explorer links:');
  console.log(`  Oracle:     ${explorerBase}/${config.contracts.oracle}`);
  console.log(`  BOBT Token: ${explorerBase}/${config.contracts.bobtToken}`);
  console.log(`  Treasury:   ${explorerBase}/${config.contracts.treasury}`);
  console.log('');
  console.log(`Configuration saved to: deployments/${network}.json`);
  console.log('');
  console.log('Next steps:');
  console.log('  1. Run: npm run status  (to see deployment details)');
  console.log('  2. Configure price-updater with the Oracle contract ID');
  console.log('  3. Update prices: cd ../price-updater && npm run update-prices');
  console.log('');
}

main().catch((error) => {
  log(String(error), 'error');
  process.exit(1);
});
