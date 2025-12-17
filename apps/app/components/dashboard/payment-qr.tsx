"use client"

import { useState, useEffect } from "react"
import { QRCodeSVG } from "qrcode.react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Copy,
  CheckCircle2,
  Clock,
  QrCode,
  Building2,
  Smartphone,
  AlertCircle,
  Loader2,
  RefreshCw,
  ExternalLink,
} from "lucide-react"
import { toast } from "sonner"

interface PaymentQRProps {
  amount: number
  reference: string
  bankName: string
  accountNumber: string
  accountName: string
  expiresAt: number
  status: string
  onStatusChange?: (newStatus: string) => void
  onCancel?: () => void
  txHash?: string
  requestId?: string // For testnet simulation
}

// Check if we're in testnet mode
const isTestnet = process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'testnet' ||
                  process.env.NODE_ENV === 'development' ||
                  typeof window !== 'undefined' && window.location.hostname === 'localhost'

// Generate QR Simple compatible data
function generateQRData(params: {
  amount: number
  reference: string
  accountNumber: string
  currency?: string
}): string {
  // QR Simple Bolivia format (BCB standard)
  // Format: amount|currency|reference|account
  const { amount, reference, accountNumber, currency = "BOB" } = params

  // Simple format for bank apps
  return JSON.stringify({
    v: "1", // version
    t: "payment",
    a: amount.toFixed(2),
    c: currency,
    r: reference,
    n: accountNumber,
  })
}

// Status step indicator
function PaymentSteps({ currentStatus }: { currentStatus: string }) {
  const steps = [
    { id: "pending_payment", label: "Esperando Pago", icon: Clock },
    { id: "payment_received", label: "Pago Recibido", icon: CheckCircle2 },
    { id: "processing", label: "Procesando", icon: Loader2 },
    { id: "completed", label: "Completado", icon: CheckCircle2 },
  ]

  const currentIndex = steps.findIndex(s => s.id === currentStatus)

  return (
    <div className="flex items-center justify-between w-full mb-6">
      {steps.map((step, index) => {
        const Icon = step.icon
        const isActive = index === currentIndex
        const isCompleted = index < currentIndex
        const isPending = index > currentIndex

        return (
          <div key={step.id} className="flex flex-col items-center flex-1">
            <div className="flex items-center w-full">
              {index > 0 && (
                <div
                  className={`h-0.5 flex-1 ${
                    isCompleted ? "bg-green-500" : "bg-muted"
                  }`}
                />
              )}
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center
                  ${isCompleted ? "bg-green-500 text-white" : ""}
                  ${isActive ? "bg-primary text-primary-foreground" : ""}
                  ${isPending ? "bg-muted text-muted-foreground" : ""}
                  ${isActive && currentStatus === "processing" ? "animate-pulse" : ""}
                `}
              >
                <Icon className={`h-4 w-4 ${isActive && currentStatus === "processing" ? "animate-spin" : ""}`} />
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`h-0.5 flex-1 ${
                    isCompleted ? "bg-green-500" : "bg-muted"
                  }`}
                />
              )}
            </div>
            <span className={`text-[10px] mt-1 text-center ${isActive ? "font-medium" : "text-muted-foreground"}`}>
              {step.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export function PaymentQR({
  amount,
  reference,
  bankName,
  accountNumber,
  accountName,
  expiresAt,
  status,
  onStatusChange,
  onCancel,
  txHash,
  requestId,
}: PaymentQRProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [paymentMethod, setPaymentMethod] = useState<"qr" | "transfer">("qr")
  const [isPolling] = useState(false)
  const [isSimulating, setIsSimulating] = useState(false)

  // Simulate payment for testnet
  const handleSimulatePayment = async () => {
    if (!requestId) {
      toast.error("No se puede simular: falta el ID de solicitud")
      return
    }

    setIsSimulating(true)
    const rampApiUrl = process.env.NEXT_PUBLIC_RAMP_API_URL || ''

    try {
      // Step 1: Simulate bank deposit
      toast.info("Simulando deposito bancario...")
      const depositRes = await fetch(`${rampApiUrl}/api/test/simulate-deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId }),
      })

      if (!depositRes.ok) {
        const error = await depositRes.json()
        throw new Error(error.error || 'Error simulando deposito')
      }

      // Step 2: Auto-verify and process
      toast.info("Verificando y procesando...")
      const verifyRes = await fetch(`${rampApiUrl}/api/test/auto-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId }),
      })

      if (!verifyRes.ok) {
        const error = await verifyRes.json()
        throw new Error(error.error || 'Error verificando pago')
      }

      // Step 3: Process (mint BOBT)
      toast.info("Minteando BOBT...")
      const processRes = await fetch(`${rampApiUrl}/api/test/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId }),
      })

      if (!processRes.ok) {
        const error = await processRes.json()
        throw new Error(error.error || 'Error procesando mint')
      }

      toast.success("Pago simulado exitosamente! BOBT minteado.")
      onStatusChange?.("completed")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error simulando pago')
    } finally {
      setIsSimulating(false)
    }
  }

  // Countdown timer
  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now()
      const remaining = Math.max(0, expiresAt - now)
      setTimeLeft(remaining)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [expiresAt])

  // Format time remaining
  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  const isExpired = timeLeft === 0
  const qrData = generateQRData({ amount, reference, accountNumber })

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copiado`)
  }

  // If completed, show success
  if (status === "completed") {
    return (
      <Card className="border-green-500/50 bg-green-500/5">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-500 mx-auto flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-green-600">Pago Completado</h3>
              <p className="text-sm text-muted-foreground">
                Has recibido {amount.toFixed(2)} BOBT en tu wallet
              </p>
            </div>
            {txHash && (
              <a
                href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                Ver transaccion <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // If expired
  if (isExpired && status === "pending_payment") {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-destructive mx-auto flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-destructive">Tiempo Expirado</h3>
              <p className="text-sm text-muted-foreground">
                La solicitud ha expirado. Crea una nueva solicitud para continuar.
              </p>
            </div>
            {onCancel && (
              <Button variant="outline" onClick={onCancel}>
                Crear Nueva Solicitud
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-primary/20">
      <CardContent className="pt-6">
        {/* Status Steps */}
        <PaymentSteps currentStatus={status} />

        {/* Amount Display */}
        <div className="text-center mb-6">
          <p className="text-sm text-muted-foreground">Monto a pagar</p>
          <p className="text-3xl font-bold">Bs. {amount.toFixed(2)}</p>
          <Badge variant="outline" className="mt-2">
            Referencia: {reference}
          </Badge>
        </div>

        {/* Payment Method Tabs */}
        {status === "pending_payment" && (
          <>
            <div className="flex gap-2 mb-4">
              <Button
                variant={paymentMethod === "qr" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setPaymentMethod("qr")}
              >
                <QrCode className="h-4 w-4 mr-2" />
                QR Simple
              </Button>
              <Button
                variant={paymentMethod === "transfer" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setPaymentMethod("transfer")}
              >
                <Building2 className="h-4 w-4 mr-2" />
                Transferencia
              </Button>
            </div>

            {/* QR Code Display */}
            {paymentMethod === "qr" && (
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-lg mx-auto w-fit">
                  <QRCodeSVG
                    value={qrData}
                    size={200}
                    level="H"
                    includeMargin
                    imageSettings={{
                      src: "/bobt-logo.png",
                      height: 40,
                      width: 40,
                      excavate: true,
                    }}
                  />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Escanea con tu app bancaria
                  </p>
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <Smartphone className="h-3 w-3" />
                    Compatible con: BNB, BCP, Banco Union, Mercantil
                  </div>
                </div>
              </div>
            )}

            {/* Bank Transfer Details */}
            {paymentMethod === "transfer" && (
              <div className="space-y-3 bg-muted/50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Banco</span>
                  <span className="font-medium">{bankName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Cuenta</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{accountNumber}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(accountNumber, "Cuenta")}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Titular</span>
                  <span className="font-medium">{accountName}</span>
                </div>
                <div className="flex justify-between items-center bg-yellow-500/10 p-2 rounded">
                  <span className="text-sm text-muted-foreground">Glosa/Referencia</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-yellow-600">{reference}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(reference, "Referencia")}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-sm text-muted-foreground">Monto exacto</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-lg">Bs. {amount.toFixed(2)}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(amount.toFixed(2), "Monto")}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Important Notice */}
            <div className="flex items-start gap-2 text-xs text-amber-600 bg-amber-500/10 p-3 rounded-lg mt-4">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Importante:</p>
                <ul className="mt-1 space-y-1">
                  <li>Incluye la referencia <strong>{reference}</strong> en la glosa</li>
                  <li>El monto debe ser exactamente <strong>Bs. {amount.toFixed(2)}</strong></li>
                  <li>El pago se detectara automaticamente</li>
                </ul>
              </div>
            </div>

            {/* Testnet Simulation Button */}
            {isTestnet && requestId && (
              <div className="mt-4 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="outline" className="bg-purple-500/20 text-purple-600 border-purple-500/30">
                    TESTNET
                  </Badge>
                  <span className="text-sm font-medium text-purple-600">Modo de Prueba</span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  En testnet puedes simular el pago sin hacer una transferencia real.
                  Esto simulara el deposito bancario y minteara BOBT a tu wallet.
                </p>
                <Button
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  onClick={handleSimulatePayment}
                  disabled={isSimulating}
                >
                  {isSimulating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Simulando pago...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Simular Pago (Testnet)
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        )}

        {/* Processing Status */}
        {(status === "payment_received" || status === "processing") && (
          <div className="text-center space-y-4 py-4">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <div>
              <p className="font-medium">
                {status === "payment_received" ? "Pago detectado" : "Procesando tu BOBT"}
              </p>
              <p className="text-sm text-muted-foreground">
                {status === "payment_received"
                  ? "Verificando la transaccion..."
                  : "Minteando BOBT a tu wallet..."}
              </p>
            </div>
          </div>
        )}

        {/* Timer and Actions */}
        {status === "pending_payment" && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className={timeLeft < 300000 ? "text-amber-600 font-medium" : "text-muted-foreground"}>
                Expira en {formatTime(timeLeft)}
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onStatusChange?.("refresh")}
                disabled={isPolling}
              >
                {isPolling ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
              {onCancel && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={onCancel}
                >
                  Cancelar
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
