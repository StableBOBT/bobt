// Hook for ramp operations (on-ramp/off-ramp)
'use client';

import { useState, useCallback } from 'react';
import { getRampClient, type RampServiceQuote, type RampServiceRequest } from '../ramp-client';

export interface UseRampReturn {
  // State
  isLoading: boolean;
  error: string | null;

  // Quotes
  getOnRampQuote: (bobAmount: number) => Promise<RampServiceQuote | null>;
  getOffRampQuote: (bobtAmount: number) => Promise<RampServiceQuote | null>;

  // Requests
  createOnRampRequest: (
    userAddress: string,
    bobAmount: number
  ) => Promise<RampServiceRequest | null>;
  createOffRampRequest: (
    userAddress: string,
    bobtAmount: number,
    bankAccount: string,
    bankName: string
  ) => Promise<RampServiceRequest | null>;
  getRequest: (requestId: string) => Promise<RampServiceRequest | null>;
  getUserRequests: (userAddress: string) => Promise<RampServiceRequest[]>;
  cancelRequest: (
    requestId: string,
    userAddress: string
  ) => Promise<RampServiceRequest | null>;
}

export function useRamp(rampApiUrl?: string): UseRampReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const client = getRampClient(rampApiUrl);

  const getOnRampQuote = useCallback(
    async (bobAmount: number): Promise<RampServiceQuote | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const quote = await client.getOnRampQuote(bobAmount);
        if (!quote) {
          setError('Failed to get quote');
        }
        return quote;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to get quote');
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [client]
  );

  const getOffRampQuote = useCallback(
    async (bobtAmount: number): Promise<RampServiceQuote | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const quote = await client.getOffRampQuote(bobtAmount);
        if (!quote) {
          setError('Failed to get quote');
        }
        return quote;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to get quote');
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [client]
  );

  const createOnRampRequest = useCallback(
    async (
      userAddress: string,
      bobAmount: number
    ): Promise<RampServiceRequest | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const request = await client.createOnRampRequest(userAddress, bobAmount);
        if (!request) {
          setError('Failed to create request');
        }
        return request;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create request');
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [client]
  );

  const createOffRampRequest = useCallback(
    async (
      userAddress: string,
      bobtAmount: number,
      bankAccount: string,
      bankName: string
    ): Promise<RampServiceRequest | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const request = await client.createOffRampRequest(
          userAddress,
          bobtAmount,
          bankAccount,
          bankName
        );
        if (!request) {
          setError('Failed to create request');
        }
        return request;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create request');
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [client]
  );

  const getRequest = useCallback(
    async (requestId: string): Promise<RampServiceRequest | null> => {
      try {
        return await client.getRequest(requestId);
      } catch {
        return null;
      }
    },
    [client]
  );

  const getUserRequests = useCallback(
    async (userAddress: string): Promise<RampServiceRequest[]> => {
      try {
        return await client.getUserRequests(userAddress);
      } catch {
        return [];
      }
    },
    [client]
  );

  const cancelRequest = useCallback(
    async (
      requestId: string,
      userAddress: string
    ): Promise<RampServiceRequest | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const request = await client.cancelRequest(requestId, userAddress);
        if (!request) {
          setError('Failed to cancel request');
        }
        return request;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to cancel request');
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [client]
  );

  return {
    isLoading,
    error,
    getOnRampQuote,
    getOffRampQuote,
    createOnRampRequest,
    createOffRampRequest,
    getRequest,
    getUserRequests,
    cancelRequest,
  };
}
