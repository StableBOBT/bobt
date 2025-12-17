// BOBT Ramp Service Client
// Connects to the ramp-service API for on/off-ramp operations

// API Response types (distinct from bolivia/types.ts)
export interface RampServiceQuote {
  id: string;
  type: 'on_ramp' | 'off_ramp';
  inputAmount: number;
  inputCurrency: 'BOB' | 'BOBT';
  outputAmount: number;
  outputCurrency: 'BOB' | 'BOBT';
  exchangeRate: number;
  feeAmount: number;
  feePercent: number;
  validUntil: number;
  paymentInstructions?: {
    bankName: string;
    accountNumber: string;
    accountName: string;
    reference: string;
  };
}

export interface RampServiceRequest {
  id: string;
  type: 'on_ramp' | 'off_ramp';
  status: string;
  userAddress: string;
  bobAmount: number;
  bobtAmount: number;
  exchangeRate: number;
  feeAmount: number;
  bankReference?: string;
  txHash?: string;
  createdAt: number;
  expiresAt: number;
  // Off-ramp specific fields
  userBankAccount?: string;
  userBankName?: string;
  paymentInstructions?: {
    bankName: string;
    accountNumber: string;
    accountName: string;
    reference: string;
  };
}

export interface RampServicePrice {
  ask: number;
  bid: number;
  mid: number;
  numSources: number;
  timestamp: number;
  isValid: boolean;
}

export interface RampApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

const DEFAULT_RAMP_API_URL = 'http://localhost:3002';

export class RampClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || DEFAULT_RAMP_API_URL;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<RampApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      const data = await response.json() as RampApiResponse<T>;
      return data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // Health check
  async health(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  // Get current price
  async getPrice(): Promise<RampServicePrice | null> {
    const response = await this.request<RampServicePrice>('/api/price');
    return response.success ? response.data || null : null;
  }

  // Get on-ramp quote (BOB -> BOBT)
  async getOnRampQuote(bobAmount: number): Promise<RampServiceQuote | null> {
    const response = await this.request<RampServiceQuote>('/api/quote/on-ramp', {
      method: 'POST',
      body: JSON.stringify({ bobAmount }),
    });
    return response.success ? response.data || null : null;
  }

  // Get off-ramp quote (BOBT -> BOB)
  async getOffRampQuote(bobtAmount: number): Promise<RampServiceQuote | null> {
    const response = await this.request<RampServiceQuote>('/api/quote/off-ramp', {
      method: 'POST',
      body: JSON.stringify({ bobtAmount }),
    });
    return response.success ? response.data || null : null;
  }

  // Create on-ramp request
  async createOnRampRequest(
    userAddress: string,
    bobAmount: number
  ): Promise<RampServiceRequest | null> {
    const response = await this.request<RampServiceRequest>('/api/ramp/on-ramp', {
      method: 'POST',
      body: JSON.stringify({ userAddress, bobAmount }),
    });
    return response.success ? response.data || null : null;
  }

  // Create off-ramp request
  async createOffRampRequest(
    userAddress: string,
    bobtAmount: number,
    bankAccount: string,
    bankName: string
  ): Promise<RampServiceRequest | null> {
    const response = await this.request<RampServiceRequest>('/api/ramp/off-ramp', {
      method: 'POST',
      body: JSON.stringify({ userAddress, bobtAmount, bankAccount, bankName }),
    });
    return response.success ? response.data || null : null;
  }

  // Get request by ID
  async getRequest(requestId: string): Promise<RampServiceRequest | null> {
    const response = await this.request<RampServiceRequest>(`/api/ramp/${requestId}`);
    return response.success ? response.data || null : null;
  }

  // Get user's requests
  async getUserRequests(userAddress: string): Promise<RampServiceRequest[]> {
    const response = await this.request<RampServiceRequest[]>(
      `/api/ramp/user/${userAddress}`
    );
    return response.success ? response.data || [] : [];
  }

  // Cancel request
  async cancelRequest(
    requestId: string,
    userAddress: string
  ): Promise<RampServiceRequest | null> {
    const response = await this.request<RampServiceRequest>(
      `/api/ramp/${requestId}/cancel`,
      {
        method: 'POST',
        body: JSON.stringify({ userAddress }),
      }
    );
    return response.success ? response.data || null : null;
  }
}

// Singleton instance
let rampClientInstance: RampClient | null = null;

export function getRampClient(baseUrl?: string): RampClient {
  if (!rampClientInstance || baseUrl) {
    rampClientInstance = new RampClient(baseUrl);
  }
  return rampClientInstance;
}
