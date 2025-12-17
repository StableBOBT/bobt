// BNB (Banco Nacional de Bolivia) API Client
// Para verificación de depósitos en la cuenta Treasury

interface BNBAuthResponse {
  token: string;
  expiresAt: number;
}

interface BNBBalance {
  accountNumber: string;
  currency: string;
  availableBalance: number;
  currentBalance: number;
}

interface BNBMovement {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  reference: string;
  balance: number;
}

interface BNBConfig {
  baseUrl: string;
  authUrl: string;
  accountId: string;
  authorizationId: string;
  treasuryAccount: string;
}

// Configuración para Sandbox BNB
const SANDBOX_CONFIG: BNBConfig = {
  baseUrl: 'http://bnbapideveloperv1.azurewebsites.net',
  authUrl: 'http://test.bnb.com.bo/ClientAuthentication.API/api/v1/auth/token',
  accountId: process.env.BNB_ACCOUNT_ID || '',
  authorizationId: process.env.BNB_AUTHORIZATION_ID || '',
  treasuryAccount: process.env.BNB_TREASURY_ACCOUNT || '',
};

export class BNBClient {
  private config: BNBConfig;
  private token: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(config?: Partial<BNBConfig>) {
    this.config = { ...SANDBOX_CONFIG, ...config };
  }

  // Autenticarse con BNB
  private async authenticate(): Promise<string> {
    // Si el token aún es válido, usarlo
    if (this.token && Date.now() < this.tokenExpiresAt - 60000) {
      return this.token;
    }

    try {
      const response = await fetch(this.config.authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId: this.config.accountId,
          authorizationId: this.config.authorizationId,
        }),
      });

      if (!response.ok) {
        throw new Error(`BNB Auth failed: ${response.status}`);
      }

      const data = await response.json() as BNBAuthResponse;
      this.token = data.token;
      this.tokenExpiresAt = data.expiresAt || Date.now() + 3600000; // 1 hora por defecto

      return this.token;
    } catch (error) {
      console.error('BNB Authentication error:', error);
      throw new Error('Failed to authenticate with BNB');
    }
  }

  // Obtener saldo de la cuenta Treasury
  async getTreasuryBalance(): Promise<BNBBalance | null> {
    try {
      const token = await this.authenticate();

      const response = await fetch(
        `${this.config.baseUrl}/Enterprise/Balance?accountNumber=${this.config.treasuryAccount}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`BNB Balance failed: ${response.status}`);
      }

      return await response.json() as BNBBalance;
    } catch (error) {
      console.error('BNB Balance error:', error);
      return null;
    }
  }

  // Obtener últimos movimientos
  async getRecentMovements(): Promise<BNBMovement[]> {
    try {
      const token = await this.authenticate();

      const response = await fetch(
        `${this.config.baseUrl}/Enterprise/BankStatement?accountNumber=${this.config.treasuryAccount}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`BNB Statement failed: ${response.status}`);
      }

      return await response.json() as BNBMovement[];
    } catch (error) {
      console.error('BNB Statement error:', error);
      return [];
    }
  }

  // Buscar un depósito específico por referencia
  async findDepositByReference(reference: string, expectedAmount: number): Promise<BNBMovement | null> {
    const movements = await this.getRecentMovements();

    return movements.find(m =>
      m.type === 'credit' &&
      m.reference.includes(reference) &&
      Math.abs(m.amount - expectedAmount) < 0.01 // Tolerancia de 1 centavo
    ) || null;
  }

  // Verificar si un depósito existe
  async verifyDeposit(reference: string, amount: number): Promise<{
    verified: boolean;
    movement?: BNBMovement;
    error?: string;
  }> {
    try {
      const deposit = await this.findDepositByReference(reference, amount);

      if (deposit) {
        return {
          verified: true,
          movement: deposit,
        };
      }

      return {
        verified: false,
        error: 'Deposit not found',
      };
    } catch (error) {
      return {
        verified: false,
        error: error instanceof Error ? error.message : 'Verification failed',
      };
    }
  }
}

// Singleton instance
let bnbClientInstance: BNBClient | null = null;

export function getBNBClient(): BNBClient {
  if (!bnbClientInstance) {
    bnbClientInstance = new BNBClient();
  }
  return bnbClientInstance;
}

// ============================================================================
// SIMULADOR PARA PRUEBAS (cuando no hay acceso a BNB real)
// ============================================================================

interface SimulatedDeposit {
  reference: string;
  amount: number;
  userAddress: string;
  timestamp: number;
}

class BNBSimulator {
  private deposits: Map<string, SimulatedDeposit> = new Map();

  // Simular un depósito (para pruebas)
  simulateDeposit(reference: string, amount: number, userAddress: string): SimulatedDeposit {
    const deposit: SimulatedDeposit = {
      reference,
      amount,
      userAddress,
      timestamp: Date.now(),
    };
    this.deposits.set(reference, deposit);
    console.log(`[BNB Simulator] Deposit simulated: ${reference} - Bs. ${amount}`);
    return deposit;
  }

  // Verificar depósito simulado
  verifyDeposit(reference: string, expectedAmount: number): {
    verified: boolean;
    deposit?: SimulatedDeposit;
    error?: string;
  } {
    const deposit = this.deposits.get(reference);

    if (!deposit) {
      return { verified: false, error: 'Deposit not found' };
    }

    if (Math.abs(deposit.amount - expectedAmount) > 0.01) {
      return { verified: false, error: 'Amount mismatch' };
    }

    return { verified: true, deposit };
  }

  // Listar todos los depósitos simulados
  listDeposits(): SimulatedDeposit[] {
    return Array.from(this.deposits.values());
  }

  // Limpiar depósitos
  clearDeposits(): void {
    this.deposits.clear();
  }
}

// Singleton para simulador
export const bnbSimulator = new BNBSimulator();
