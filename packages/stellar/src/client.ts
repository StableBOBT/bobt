// BOBT Stellar Client
import * as StellarSdk from '@stellar/stellar-sdk';
import { NETWORKS, CONTRACTS, type NetworkType, toStroops, USDT_DECIMALS } from './config';
import type { OraclePrice, TransactionResult, Proposal, ProposalStatus, TreasuryConfig, RateLimitState } from './types';

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

  // Treasury: Estimate USDT for BOBT amount (burn)
  async estimateUSDTForBOBT(bobtAmount: bigint): Promise<bigint | null> {
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
          contract.call('estimate_usdt_for_bobt', StellarSdk.nativeToScVal(bobtAmount, { type: 'i128' }))
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

  // Treasury: Get current price from oracle
  async getTreasuryPrice(): Promise<bigint | null> {
    try {
      const contract = new StellarSdk.Contract(this.contracts.treasury);
      const tx = new StellarSdk.TransactionBuilder(
        new StellarSdk.Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0'),
        {
          fee: '100',
          networkPassphrase: NETWORKS[this.network].networkPassphrase,
        }
      )
        .addOperation(contract.call('get_current_price'))
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

  // Treasury: Build mint proposal transaction
  async buildMintProposalTx(
    signerPublicKey: string,
    targetAddress: string,
    usdtAmount: number,
    externalRef: string
  ): Promise<StellarSdk.Transaction | null> {
    try {
      const account = await this.rpc.getAccount(signerPublicKey);
      const contract = new StellarSdk.Contract(this.contracts.treasury);
      const usdtStroops = toStroops(usdtAmount, USDT_DECIMALS);

      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: '100000',
        networkPassphrase: NETWORKS[this.network].networkPassphrase,
      })
        .addOperation(
          contract.call(
            'propose_mint_from_usdt',
            StellarSdk.Address.fromString(signerPublicKey).toScVal(),
            StellarSdk.Address.fromString(targetAddress).toScVal(),
            StellarSdk.nativeToScVal(usdtStroops, { type: 'i128' }),
            StellarSdk.nativeToScVal(externalRef, { type: 'string' })
          )
        )
        .setTimeout(30)
        .build();

      const preparedTx = await this.rpc.prepareTransaction(tx);
      return preparedTx as StellarSdk.Transaction;
    } catch (error) {
      console.error('Failed to build mint proposal tx:', error);
      return null;
    }
  }

  // Treasury: Build burn proposal transaction
  async buildBurnProposalTx(
    signerPublicKey: string,
    targetAddress: string,
    bobtAmount: number,
    externalRef: string
  ): Promise<StellarSdk.Transaction | null> {
    try {
      const account = await this.rpc.getAccount(signerPublicKey);
      const contract = new StellarSdk.Contract(this.contracts.treasury);
      const bobtStroops = toStroops(bobtAmount);

      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: '100000',
        networkPassphrase: NETWORKS[this.network].networkPassphrase,
      })
        .addOperation(
          contract.call(
            'propose_burn',
            StellarSdk.Address.fromString(signerPublicKey).toScVal(),
            StellarSdk.Address.fromString(targetAddress).toScVal(),
            StellarSdk.nativeToScVal(bobtStroops, { type: 'i128' }),
            StellarSdk.nativeToScVal(externalRef, { type: 'string' })
          )
        )
        .setTimeout(30)
        .build();

      const preparedTx = await this.rpc.prepareTransaction(tx);
      return preparedTx as StellarSdk.Transaction;
    } catch (error) {
      console.error('Failed to build burn proposal tx:', error);
      return null;
    }
  }

  // Submit signed transaction
  async submitTransaction(signedXdr: string): Promise<TransactionResult> {
    try {
      const tx = StellarSdk.TransactionBuilder.fromXDR(
        signedXdr,
        NETWORKS[this.network].networkPassphrase
      );

      const response = await this.rpc.sendTransaction(tx);

      if (response.status === 'PENDING') {
        // Wait for transaction to complete
        let getResponse = await this.rpc.getTransaction(response.hash);
        while (getResponse.status === 'NOT_FOUND') {
          await new Promise(resolve => setTimeout(resolve, 1000));
          getResponse = await this.rpc.getTransaction(response.hash);
        }

        if (getResponse.status === 'SUCCESS') {
          return { success: true, txHash: response.hash };
        } else {
          return { success: false, error: 'Transaction failed' };
        }
      }

      return { success: false, error: response.status };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Get transaction history from Horizon
  async getTransactionHistory(address: string, limit = 20): Promise<any[]> {
    try {
      const horizonUrl = NETWORKS[this.network].horizonUrl;
      const response = await fetch(
        `${horizonUrl}/accounts/${address}/transactions?limit=${limit}&order=desc`
      );

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data._embedded?.records || [];
    } catch {
      return [];
    }
  }

  // Get operations for an account (more detailed than transactions)
  async getAccountOperations(address: string, limit = 50): Promise<any[]> {
    try {
      const horizonUrl = NETWORKS[this.network].horizonUrl;
      const response = await fetch(
        `${horizonUrl}/accounts/${address}/operations?limit=${limit}&order=desc`
      );

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data._embedded?.records || [];
    } catch {
      return [];
    }
  }

  // Get payments (for tracking mint/burn operations)
  async getPayments(address: string, limit = 50): Promise<any[]> {
    try {
      const horizonUrl = NETWORKS[this.network].horizonUrl;
      const response = await fetch(
        `${horizonUrl}/accounts/${address}/payments?limit=${limit}&order=desc`
      );

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data._embedded?.records || [];
    } catch {
      return [];
    }
  }

  // Token: Get total supply
  async getTotalSupply(): Promise<bigint> {
    try {
      const contract = new StellarSdk.Contract(this.contracts.bobtToken);
      const tx = new StellarSdk.TransactionBuilder(
        new StellarSdk.Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0'),
        {
          fee: '100',
          networkPassphrase: NETWORKS[this.network].networkPassphrase,
        }
      )
        .addOperation(contract.call('total_supply'))
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

  // Token: Get decimals
  async getDecimals(): Promise<number> {
    try {
      const contract = new StellarSdk.Contract(this.contracts.bobtToken);
      const tx = new StellarSdk.TransactionBuilder(
        new StellarSdk.Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0'),
        {
          fee: '100',
          networkPassphrase: NETWORKS[this.network].networkPassphrase,
        }
      )
        .addOperation(contract.call('decimals'))
        .setTimeout(30)
        .build();

      const response = await this.rpc.simulateTransaction(tx);

      if ('result' in response && response.result) {
        return Number(StellarSdk.scValToNative(response.result.retval));
      }
      return 7;
    } catch {
      return 7;
    }
  }

  // Oracle: Get full price data with all details
  async getOraclePriceDetails(): Promise<{
    ask: number;
    bid: number;
    mid: number;
    spread: number;
    numSources: number;
    timestamp: number;
    isValid: boolean;
  } | null> {
    const price = await this.getOraclePrice();
    if (!price) return null;

    const decimals = 7;
    const divisor = 10 ** decimals;

    return {
      ask: Number(price.ask) / divisor,
      bid: Number(price.bid) / divisor,
      mid: Number(price.mid) / divisor,
      spread: Number(price.spreadBps) / 100, // Convert bps to percentage
      numSources: price.numSources,
      timestamp: price.timestamp,
      isValid: await this.isPriceValid(),
    };
  }

  // Treasury: Get rate limit state
  async getTreasuryRateLimits(): Promise<{
    dailyMinted: bigint;
    dailyBurned: bigint;
    dailyMintLimit: bigint;
    dailyBurnLimit: bigint;
  } | null> {
    try {
      const contract = new StellarSdk.Contract(this.contracts.treasury);
      const tx = new StellarSdk.TransactionBuilder(
        new StellarSdk.Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0'),
        {
          fee: '100',
          networkPassphrase: NETWORKS[this.network].networkPassphrase,
        }
      )
        .addOperation(contract.call('get_rate_limits'))
        .setTimeout(30)
        .build();

      const response = await this.rpc.simulateTransaction(tx);

      if ('result' in response && response.result) {
        const result = StellarSdk.scValToNative(response.result.retval);
        return {
          dailyMinted: BigInt(result.daily_minted || 0),
          dailyBurned: BigInt(result.daily_burned || 0),
          dailyMintLimit: BigInt(10_000_000_0000000), // Default 10M BOBT
          dailyBurnLimit: BigInt(10_000_000_0000000),
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  // Get contract events for price history (from Horizon)
  async getOracleEvents(limit = 100): Promise<any[]> {
    try {
      const horizonUrl = NETWORKS[this.network].horizonUrl;
      const response = await fetch(
        `${horizonUrl}/accounts/${this.contracts.oracle}/effects?limit=${limit}&order=desc`
      );

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data._embedded?.records || [];
    } catch {
      return [];
    }
  }

  // Get RPC server instance (for advanced use)
  getRpc(): StellarSdk.SorobanRpc.Server {
    return this.rpc;
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
