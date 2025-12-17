// Bolivia On-Ramp/Off-Ramp Hook
'use client';

import { useState, useCallback } from 'react';
import { getBoliviaPayments } from './payments';
import type { RampQuote, PaymentMethod, QRPaymentData } from './types';

export interface UseBoliviaRampReturn {
  // State
  quote: RampQuote | null;
  qrPayment: QRPaymentData | null;
  isLoading: boolean;
  error: string | null;

  // Methods
  createOnRampQuote: (bobAmount: number, paymentMethod?: PaymentMethod) => Promise<RampQuote | null>;
  createOffRampQuote: (bobtAmount: number, paymentMethod?: PaymentMethod) => Promise<RampQuote | null>;
  generateQR: (amount: number, reference: string) => QRPaymentData;
  clearQuote: () => void;

  // Payment methods
  paymentMethods: ReturnType<typeof getBoliviaPayments>['getAvailablePaymentMethods'] extends () => infer R ? R : never;
}

export function useBoliviaRamp(): UseBoliviaRampReturn {
  const [quote, setQuote] = useState<RampQuote | null>(null);
  const [qrPayment, setQrPayment] = useState<QRPaymentData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const payments = getBoliviaPayments();
  const paymentMethods = payments.getAvailablePaymentMethods();

  const createOnRampQuote = useCallback(async (
    bobAmount: number,
    paymentMethod: PaymentMethod = 'p2p_binance'
  ): Promise<RampQuote | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const newQuote = await payments.createOnRampQuote(bobAmount, paymentMethod);
      if (!newQuote) {
        setError('No se pudo obtener cotización. Intente de nuevo.');
        return null;
      }

      setQuote(newQuote);
      return newQuote;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear cotización';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [payments]);

  const createOffRampQuote = useCallback(async (
    bobtAmount: number,
    paymentMethod: PaymentMethod = 'p2p_binance'
  ): Promise<RampQuote | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const newQuote = await payments.createOffRampQuote(bobtAmount, paymentMethod);
      if (!newQuote) {
        setError('No se pudo obtener cotización. Intente de nuevo.');
        return null;
      }

      setQuote(newQuote);
      return newQuote;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear cotización';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [payments]);

  const generateQR = useCallback((
    amount: number,
    reference: string
  ): QRPaymentData => {
    const qr = payments.generateQRPayment(amount, reference);
    setQrPayment(qr);
    return qr;
  }, [payments]);

  const clearQuote = useCallback(() => {
    setQuote(null);
    setQrPayment(null);
    setError(null);
  }, []);

  return {
    quote,
    qrPayment,
    isLoading,
    error,
    createOnRampQuote,
    createOffRampQuote,
    generateQR,
    clearQuote,
    paymentMethods,
  };
}
