// In-memory store for ramp requests
// In production, replace with a proper database (PostgreSQL, etc.)

import type { RampRequest, RampQuote } from './types.js';

class RampStore {
  private requests: Map<string, RampRequest> = new Map();
  private quotes: Map<string, RampQuote> = new Map();
  private requestsByUser: Map<string, Set<string>> = new Map();

  // Requests
  createRequest(request: RampRequest): void {
    this.requests.set(request.id, request);

    // Index by user
    const userRequests = this.requestsByUser.get(request.userAddress) || new Set();
    userRequests.add(request.id);
    this.requestsByUser.set(request.userAddress, userRequests);
  }

  getRequest(id: string): RampRequest | undefined {
    return this.requests.get(id);
  }

  updateRequest(id: string, updates: Partial<RampRequest>): RampRequest | undefined {
    const request = this.requests.get(id);
    if (!request) return undefined;

    const updated = {
      ...request,
      ...updates,
      updatedAt: Date.now(),
    };
    this.requests.set(id, updated);
    return updated;
  }

  getRequestsByUser(userAddress: string): RampRequest[] {
    const requestIds = this.requestsByUser.get(userAddress);
    if (!requestIds) return [];

    return Array.from(requestIds)
      .map(id => this.requests.get(id))
      .filter((r): r is RampRequest => r !== undefined)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  getRequestsByStatus(status: RampRequest['status']): RampRequest[] {
    return Array.from(this.requests.values())
      .filter(r => r.status === status)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  getAllRequests(): RampRequest[] {
    return Array.from(this.requests.values())
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  getPendingVerificationRequests(): RampRequest[] {
    return this.getRequestsByStatus('pending_verification');
  }

  // Quotes
  createQuote(quote: RampQuote): void {
    this.quotes.set(quote.id, quote);
  }

  getQuote(id: string): RampQuote | undefined {
    const quote = this.quotes.get(id);
    if (!quote) return undefined;

    // Check if expired
    if (Date.now() > quote.validUntil) {
      this.quotes.delete(id);
      return undefined;
    }

    return quote;
  }

  deleteQuote(id: string): void {
    this.quotes.delete(id);
  }

  // Cleanup expired quotes periodically
  cleanupExpiredQuotes(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, quote] of this.quotes.entries()) {
      if (now > quote.validUntil) {
        this.quotes.delete(id);
        cleaned++;
      }
    }

    return cleaned;
  }

  // Stats
  getStats(): {
    totalRequests: number;
    pendingRequests: number;
    completedRequests: number;
    totalOnRampVolume: number;
    totalOffRampVolume: number;
  } {
    const requests = Array.from(this.requests.values());

    const completed = requests.filter(r => r.status === 'completed');
    const onRampVolume = completed
      .filter(r => r.type === 'on_ramp')
      .reduce((sum, r) => sum + r.bobAmount, 0);
    const offRampVolume = completed
      .filter(r => r.type === 'off_ramp')
      .reduce((sum, r) => sum + r.bobtAmount, 0);

    return {
      totalRequests: requests.length,
      pendingRequests: requests.filter(r =>
        !['completed', 'failed', 'cancelled', 'refunded'].includes(r.status)
      ).length,
      completedRequests: completed.length,
      totalOnRampVolume: onRampVolume,
      totalOffRampVolume: offRampVolume,
    };
  }
}

// Singleton instance
export const store = new RampStore();

// Cleanup expired quotes every minute
setInterval(() => {
  const cleaned = store.cleanupExpiredQuotes();
  if (cleaned > 0) {
    console.log(`Cleaned up ${cleaned} expired quotes`);
  }
}, 60_000);
