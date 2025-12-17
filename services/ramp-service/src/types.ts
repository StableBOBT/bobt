// BOBT Ramp Service Types

export type RampType = 'on_ramp' | 'off_ramp';

export type RampStatus =
  | 'pending_payment'      // Esperando pago BOB del usuario
  | 'payment_received'     // Pago BOB confirmado
  | 'pending_verification' // Esperando verificación manual
  | 'verified'             // Verificado, listo para procesar
  | 'processing'           // Procesando mint/burn
  | 'pending_approval'     // Esperando aprobación multi-sig
  | 'completed'            // Completado exitosamente
  | 'failed'               // Falló
  | 'cancelled'            // Cancelado por usuario
  | 'refunded';            // Reembolsado

export interface RampRequest {
  id: string;
  type: RampType;
  status: RampStatus;

  // Usuario
  userAddress: string;        // Stellar address
  userBankAccount?: string;   // Cuenta bancaria (para off-ramp)
  userBankName?: string;      // Nombre del banco

  // Montos
  bobAmount: number;          // Monto en BOB
  bobtAmount: number;         // Monto en BOBT
  exchangeRate: number;       // Tipo de cambio usado (BOB/USD)
  feeAmount: number;          // Comisión en BOB

  // Referencias
  bankReference?: string;     // Referencia de transferencia bancaria
  txHash?: string;            // Hash de transacción Stellar
  proposalId?: number;        // ID de propuesta en Treasury

  // Timestamps
  createdAt: number;
  updatedAt: number;
  expiresAt: number;          // Expira si no se paga
  completedAt?: number;

  // Metadata
  notes?: string;
  verifiedBy?: string;        // Operador que verificó
}

export interface RampQuote {
  id: string;
  type: RampType;

  // Input
  inputAmount: number;        // BOB para on-ramp, BOBT para off-ramp
  inputCurrency: 'BOB' | 'BOBT';

  // Output
  outputAmount: number;       // BOBT para on-ramp, BOB para off-ramp
  outputCurrency: 'BOB' | 'BOBT';

  // Detalles
  exchangeRate: number;       // BOB/USD rate
  feeAmount: number;
  feePercent: number;

  // Validez
  validUntil: number;         // Unix timestamp

  // Instrucciones de pago (para on-ramp)
  paymentInstructions?: PaymentInstructions;
}

export interface PaymentInstructions {
  bankName: string;
  accountNumber: string;
  accountName: string;
  reference: string;          // Referencia única para identificar pago
  qrCode?: string;            // QR code data para QR Simple
}

export interface TreasuryAccount {
  bankName: string;
  accountNumber: string;
  accountName: string;
  currency: 'BOB';
}

export interface RampConfig {
  // Límites
  minOnRampBOB: number;       // Mínimo para on-ramp (ej: 100 BOB)
  maxOnRampBOB: number;       // Máximo para on-ramp (ej: 50000 BOB)
  minOffRampBOBT: number;     // Mínimo para off-ramp
  maxOffRampBOBT: number;     // Máximo para off-ramp

  // Comisiones
  onRampFeePercent: number;   // Comisión on-ramp (ej: 0.5%)
  offRampFeePercent: number;  // Comisión off-ramp

  // Tiempos
  quoteValidityMinutes: number;  // Validez de cotización
  paymentTimeoutMinutes: number; // Tiempo para pagar

  // Treasury
  treasuryAccounts: TreasuryAccount[];
}

// API Request/Response types
export interface CreateOnRampRequest {
  userAddress: string;
  bobAmount: number;
}

export interface CreateOffRampRequest {
  userAddress: string;
  bobtAmount: number;
  bankAccount: string;
  bankName: string;
}

export interface VerifyPaymentRequest {
  requestId: string;
  bankReference: string;
  verifiedBy: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
