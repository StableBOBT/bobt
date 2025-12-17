"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Copy,
  CheckCircle2,
  Clock,
  Loader2,
  AlertCircle,
  ExternalLink,
  ArrowUpRight,
  Banknote,
  Building2,
} from "lucide-react"
import { toast } from "sonner"

interface OffRampStatusProps {
  bobtAmount: number
  bobAmount: number
  treasuryAddress: string
  bankAccount: string
  bankName: string
  status: string
  expiresAt: number
  txHash?: string
  bankTxRef?: string
  onStatusChange?: (newStatus: string) => void
  onCancel?: () => void
}

// Status step indicator for off-ramp
function OffRampSteps({ currentStatus }: { currentStatus: string }) {
  const steps = [
    { id: "pending_bobt", label: "Enviar BOBT", icon: ArrowUpRight },
    { id: "bobt_received", label: "BOBT Recibido", icon: CheckCircle2 },
    { id: "processing", label: "Procesando", icon: Loader2 },
    { id: "completed", label: "BOB Enviado", icon: Banknote },
  ]

  // Map status to step index
  const statusToIndex: Record<string, number> = {
    pending_payment: 0, // waiting for user to send BOBT
    pending_bobt: 0,
    payment_received: 1,
    bobt_received: 1,
    pending_verification: 2,
    verified: 2,
    processing: 2,
    completed: 3,
  }

  const currentIndex = statusToIndex[currentStatus] ?? 0

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

export function OffRampStatus({
  bobtAmount,
  bobAmount,
  treasuryAddress,
  bankAccount,
  bankName,
  status,
  expiresAt,
  txHash,
  bankTxRef,
  onStatusChange: _onStatusChange,
  onCancel,
}: OffRampStatusProps) {
  // Note: onStatusChange is available for future use when real-time status polling is implemented
  void _onStatusChange
  const [timeLeft, setTimeLeft] = useState<number>(0)

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
  const isPendingBobt = status === "pending_payment" || status === "pending_bobt"

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
              <Banknote className="h-8 w-8 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-green-600">Venta Completada</h3>
              <p className="text-sm text-muted-foreground">
                Bs. {bobAmount.toFixed(2)} enviados a tu cuenta bancaria
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Banco</span>
                <span className="font-medium">{bankName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cuenta</span>
                <span className="font-mono">{bankAccount}</span>
              </div>
              {bankTxRef && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Referencia</span>
                  <span className="font-mono text-green-600">{bankTxRef}</span>
                </div>
              )}
            </div>
            {txHash && (
              <a
                href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                Ver transaccion Stellar <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // If expired
  if (isExpired && isPendingBobt) {
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
        <OffRampSteps currentStatus={status} />

        {/* Amount Display */}
        <div className="text-center mb-6">
          <p className="text-sm text-muted-foreground">
            {isPendingBobt ? "BOBT a enviar" : "BOBT vendido"}
          </p>
          <p className="text-3xl font-bold">{bobtAmount.toFixed(2)} BOBT</p>
          <p className="text-sm text-muted-foreground mt-1">
            Recibirás: <span className="font-semibold text-green-600">Bs. {bobAmount.toFixed(2)}</span>
          </p>
        </div>

        {/* Pending BOBT - Show instructions to send */}
        {isPendingBobt && (
          <>
            <div className="space-y-3 bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-primary mb-2">
                <ArrowUpRight className="h-4 w-4" />
                <span className="font-medium text-sm">Envía BOBT al Treasury</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Dirección Treasury</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs">
                    {treasuryAddress.slice(0, 8)}...{treasuryAddress.slice(-8)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => copyToClipboard(treasuryAddress, "Dirección")}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-sm text-muted-foreground">Monto exacto</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-lg">{bobtAmount.toFixed(2)} BOBT</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => copyToClipboard(bobtAmount.toFixed(2), "Monto")}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Bank Details where BOB will be sent */}
            <div className="mt-4 p-3 bg-green-500/10 rounded-lg">
              <div className="flex items-center gap-2 text-green-600 mb-2">
                <Building2 className="h-4 w-4" />
                <span className="font-medium text-sm">Recibirás BOB en:</span>
              </div>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Banco:</span>
                  <span className="font-medium">{bankName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cuenta:</span>
                  <span className="font-mono">{bankAccount}</span>
                </div>
              </div>
            </div>

            {/* Important Notice */}
            <div className="flex items-start gap-2 text-xs text-amber-600 bg-amber-500/10 p-3 rounded-lg mt-4">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Importante:</p>
                <ul className="mt-1 space-y-1">
                  <li>Envía exactamente <strong>{bobtAmount.toFixed(2)} BOBT</strong></li>
                  <li>Usa la dirección del Treasury indicada</li>
                  <li>Una vez recibido el BOBT, procesamos tu pago en BOB</li>
                </ul>
              </div>
            </div>
          </>
        )}

        {/* Processing Status */}
        {(status === "payment_received" || status === "bobt_received" || status === "processing" || status === "verified" || status === "pending_verification") && (
          <div className="text-center space-y-4 py-4">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <div>
              <p className="font-medium">
                {status === "payment_received" || status === "bobt_received"
                  ? "BOBT Recibido"
                  : "Procesando tu pago"}
              </p>
              <p className="text-sm text-muted-foreground">
                {status === "payment_received" || status === "bobt_received"
                  ? "Verificando la transacción..."
                  : "Enviando BOB a tu cuenta bancaria..."}
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monto a recibir</span>
                <span className="font-semibold text-green-600">Bs. {bobAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Timer and Actions */}
        {isPendingBobt && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className={timeLeft < 300000 ? "text-amber-600 font-medium" : "text-muted-foreground"}>
                Expira en {formatTime(timeLeft)}
              </span>
            </div>
            <div className="flex gap-2">
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
