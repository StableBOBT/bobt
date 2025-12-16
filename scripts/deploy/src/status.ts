#!/usr/bin/env node
/**
 * BOBT Deployment Status Checker
 *
 * Shows the status of deployed contracts and identities.
 */

import 'dotenv/config';
import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..', '..', '..');

function execCapture(command: string): string {
  try {
    return execSync(command, {
      encoding: 'utf-8',
      stdio: 'pipe',
      cwd: PROJECT_ROOT,
    }).trim();
  } catch {
    return '';
  }
}

function getPublicKey(identity: string): string | null {
  try {
    return execCapture(`stellar keys address ${identity}`);
  } catch {
    return null;
  }
}

function getSecretKey(identity: string): string | null {
  try {
    return execCapture(`stellar keys show ${identity}`);
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const network = process.env.NETWORK || 'testnet';
  const deploymentPath = join(PROJECT_ROOT, 'deployments', `${network}.json`);

  console.log('');
  console.log('='.repeat(60));
  console.log(`BOBT Deployment Status (${network})`);
  console.log('='.repeat(60));
  console.log('');

  if (!existsSync(deploymentPath)) {
    console.log('No deployment found. Run "npm run deploy" first.');
    return;
  }

  const config = JSON.parse(readFileSync(deploymentPath, 'utf-8'));

  // Contracts
  console.log('CONTRACTS:');
  console.log('-'.repeat(40));
  if (config.contracts.oracle) {
    console.log(`Oracle:     ${config.contracts.oracle}`);
  }
  if (config.contracts.bobtToken) {
    console.log(`BOBT Token: ${config.contracts.bobtToken}`);
  }
  if (config.contracts.treasury) {
    console.log(`Treasury:   ${config.contracts.treasury}`);
  }
  console.log('');

  // Identities
  console.log('IDENTITIES:');
  console.log('-'.repeat(40));

  for (const [role, name] of Object.entries(config.identities)) {
    const pubkey = getPublicKey(name as string);
    const hasSecret = getSecretKey(name as string) !== null;
    if (pubkey) {
      console.log(`${role}:`);
      console.log(`  Name:   ${name}`);
      console.log(`  Pubkey: ${pubkey}`);
      console.log(`  Secret: ${hasSecret ? 'Available' : 'Not found'}`);
    } else {
      console.log(`${role}: NOT FOUND`);
    }
  }
  console.log('');

  // Price Updater Config
  console.log('PRICE UPDATER CONFIG:');
  console.log('-'.repeat(40));
  const operatorSecret = getSecretKey(config.identities.oracleOperator);
  if (operatorSecret && config.contracts.oracle) {
    console.log('Add these to your .env or GitHub Secrets:');
    console.log('');
    console.log(`NETWORK=${network}`);
    console.log(`ORACLE_CONTRACT_ID=${config.contracts.oracle}`);
    console.log(`STELLAR_SECRET_KEY=${operatorSecret}`);
  } else {
    console.log('Deployment incomplete - cannot generate config');
  }
  console.log('');

  // Explorer Links
  const explorerBase =
    network === 'mainnet'
      ? 'https://stellar.expert/explorer/public/contract'
      : 'https://stellar.expert/explorer/testnet/contract';

  console.log('EXPLORER LINKS:');
  console.log('-'.repeat(40));
  if (config.contracts.oracle) {
    console.log(`Oracle:     ${explorerBase}/${config.contracts.oracle}`);
  }
  if (config.contracts.bobtToken) {
    console.log(`BOBT Token: ${explorerBase}/${config.contracts.bobtToken}`);
  }
  if (config.contracts.treasury) {
    console.log(`Treasury:   ${explorerBase}/${config.contracts.treasury}`);
  }
  console.log('');
}

main().catch(console.error);
