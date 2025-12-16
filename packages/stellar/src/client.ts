// BOBT Stellar Client
import * as StellarSdk from '@stellar/stellar-sdk';
import { NETWORKS, CONTRACTS, type NetworkType } from './config';
import type { OraclePrice, TokenBalance, TransactionResult } from './types';

export class BOBTClient {
  private rpc: StellarSdk.SorobanRpc.Server;
  private network: NetworkType;
  private contracts: typeof CONTRACTS.testnet;

  constructor(network: NetworkType = 'testnet') {
    this.network = network;
    this.rpc = new StellarSdk.SorobanRpc.Server(NETWORKS[network].rpcUrl);
    this.contracts = CONTRACTS[network];
  }

  // Get current network configuration
  getNetworkConfig() {
    return NETWORKS[this.network];
  }

  // Get contract addresses
  getContracts() {
    return this.contracts;
  }

  // Oracle: Get current price
  async getOraclePrice(): Promise<OraclePrice | null> {
    try {
      const contract = new StellarSdk.Contract(this.contracts.oracle);
      const tx = new StellarSdk.TransactionBuilder(
        new StellarSdk.Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0'),
        {
          fee: '100',
          networkPassphrase: NETWORKS[this.network].networkPassphrase,
        }
      )
        .addOperation(contract.call('get_price'))
        .setTimeout(30)
        .build();

      const response = await this.rpc.simulateTransaction(tx);

      if ('result' in response && response.result) {
        const result = StellarSdk.scValToNative(response.result.retval);
        return {
          ask: BigInt(result.ask),
          bid: BigInt(result.bid),
          mid: BigInt(result.mid),
          spreadBps: BigInt(result.spread_bps),
          numSources: result.num_sources,
          timestamp: result.timestamp,
          ledger: result.ledger,
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to get oracle price:', error);
      return null;
    }
  }

  // Oracle: Check if price is valid (not stale)
  async isPriceValid(): Promise<boolean> {
    try {
      const contract = new StellarSdk.Contract(this.contracts.oracle);
      const tx = new StellarSdk.TransactionBuilder(
        new StellarSdk.Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0'),
        {
          fee: '100',
          networkPassphrase: NETWORKS[this.network].networkPassphrase,
        }
      )
        .addOperation(contract.call('is_price_valid'))
        .setTimeout(30)
        .build();

      const response = await this.rpc.simulateTransaction(tx);

      if ('result' in response && response.result) {
        return StellarSdk.scValToNative(response.result.retval);
      }
      return false;
    } catch {
      return false;
    }
  }

  // Token: Get balance
  async getBalance(address: string): Promise<bigint> {
    try {
      const contract = new StellarSdk.Contract(this.contracts.bobtToken);
      const tx = new StellarSdk.TransactionBuilder(
        new StellarSdk.Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0'),
        {
          fee: '100',
          networkPassphrase: NETWORKS[this.network].networkPassphrase,
        }
      )
        .addOperation(
          contract.call('balance', StellarSdk.Address.fromString(address).toScVal())
        )
        .setTimeout(30)
        .build();

      const response = await this.rpc.simulateTransaction(tx);

      if ('result' in response && response.result) {
        return BigInt(StellarSdk.scValToNative(response.result.retval));
      }
      return BigInt(0);
    } catch {
      return BigInt(0);
    }
  }

  // Token: Check if paused
  async isTokenPaused(): Promise<boolean> {
    try {
      const contract = new StellarSdk.Contract(this.contracts.bobtToken);
      const tx = new StellarSdk.TransactionBuilder(
        new StellarSdk.Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0'),
        {
          fee: '100',
          networkPassphrase: NETWORKS[this.network].networkPassphrase,
        }
      )
        .addOperation(contract.call('is_paused'))
        .setTimeout(30)
        .build();

      const response = await this.rpc.simulateTransaction(tx);

      if ('result' in response && response.result) {
        return StellarSdk.scValToNative(response.result.retval);
      }
      return false;
    } catch {
      return false;
    }
  }

  // Treasury: Estimate BOBT for USDT amount
  async estimateBOBTForUSDT(usdtAmount: bigint): Promise<bigint | null> {
    try {
      const contract = new StellarSdk.Contract(this.contracts.treasury);
      const tx = new StellarSdk.TransactionBuilder(
        new StellarSdk.Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0'),
        {
          fee: '100',
          networkPassphrase: NETWORKS[this.network].networkPassphrase,
        }
      )
        .addOperation(
          contract.call('estimate_bobt_for_usdt', StellarSdk.nativeToScVal(usdtAmount, { type: 'i128' }))
        )
        .setTimeout(30)
        .build();

      const response = await this.rpc.simulateTransaction(tx);

      if ('result' in response && response.result) {
        return BigInt(StellarSdk.scValToNative(response.result.retval));
      }
      return null;
    } catch {
      return null;
    }
  }

  // Treasury: Check if oracle is valid
  async isTreasuryOracleValid(): Promise<boolean> {
    try {
      const contract = new StellarSdk.Contract(this.contracts.treasury);
      const tx = new StellarSdk.TransactionBuilder(
        new StellarSdk.Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0'),
        {
          fee: '100',
          networkPassphrase: NETWORKS[this.network].networkPassphrase,
        }
      )
        .addOperation(contract.call('is_oracle_valid'))
        .setTimeout(30)
        .build();

      const response = await this.rpc.simulateTransaction(tx);

      if ('result' in response && response.result) {
        return StellarSdk.scValToNative(response.result.retval);
      }
      return false;
    } catch {
      return false;
    }
  }
}

// Singleton instance
let clientInstance: BOBTClient | null = null;

export const getBOBTClient = (network: NetworkType = 'testnet'): BOBTClient => {
  if (!clientInstance) {
    clientInstance = new BOBTClient(network);
  }
  return clientInstance;
};
