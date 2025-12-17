"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRamp, useWallet, type RampServiceQuote, type RampServiceRequest } from "@bobt/stellar"
import { useCryptoYaPrices } from "@bobt/stellar/bolivia"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowDownUp,
  AlertCircle,
  Loader2,
  RefreshCw,
  Banknote,
  Info,
  CheckCircle2,
  Copy,
  Building2,
  ArrowLeft,
} from "lucide-react"
import { toast } from "sonner"
import { PaymentQR } from "./payment-qr"
import { OffRampStatus } from "./off-ramp-status"
import { AddTokenHelper } from "./add-token-helper"

// Price display component showing P2P rates
function PriceDisplay() {
  const { prices, bestBuy, isLoading, lastUpdated, refetch } = useCryptoYaPrices()

  return (
    <div className="bg-muted/50 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Banknote className="h-4 w-4" />
          Precio BOB/USD (P2P)
        </h4>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {isLoading && !prices ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : prices ? (
        <div className="grid grid-cols-3 gap-2 text-sm">
          {prices.binance && (
            <div className="text-center p-2 bg-background rounded">
              <p className="text-xs text-muted-foreground">Binance</p>
              <p className="font-mono font-medium">{prices.binance.ask.toFixed(2)}</p>
            </div>
          )}
          {prices.bybit && (
            <div className="text-center p-2 bg-background rounded">
              <p className="text-xs text-muted-foreground">Bybit</p>
              <p className="font-mono font-medium">{prices.bybit.ask.toFixed(2)}</p>
            </div>
          )}
          {prices.bitget && (
            <div className="text-center p-2 bg-background rounded">
              <p className="text-xs text-muted-foreground">Bitget</p>
              <p className="font-mono font-medium">{prices.bitget.ask.toFixed(2)}</p>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-2">
          No se pudo obtener precios
        </p>
      )}

      {bestBuy && (
        <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
          <span>Mejor precio: {bestBuy.exchange}</span>
          <span className="font-mono">{bestBuy.price.toFixed(2)} BOB/USD</span>
        </div>
      )}

      {lastUpdated && (
        <p className="text-[10px] text-muted-foreground text-center mt-2">
          Actualizado: {lastUpdated.toLocaleTimeString()}
        </p>
      )}
    </div>
  )
}

// Payment instructions display
function PaymentInstructions({
  instructions,
  amount,
  onCopy
}: {
  instructions: RampServiceQuote['paymentInstructions']
  amount: number
  onCopy: (text: string) => void
}) {
  if (!instructions) return null

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2 text-primary">
        <Building2 className="h-4 w-4" />
        <span className="font-medium text-sm">Instrucciones de Pago</span>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Banco:</span>
          <span className="font-medium">{instructions.bankName}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Cuenta:</span>
          <div className="flex items-center gap-2">
            <span className="font-mono">{instructions.accountNumber}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onCopy(instructions.accountNumber)}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Titular:</span>
          <span className="font-medium">{instructions.accountName}</span>
        </div>
        <div className="flex justify-between items-center bg-yellow-500/10 p-2 rounded">
          <span className="text-muted-foreground">Referencia:</span>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-yellow-600">{instructions.reference}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onCopy(instructions.reference)}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <div className="flex justify-between items-center pt-2 border-t">
          <span className="text-muted-foreground">Monto a depositar:</span>
          <span className="font-mono font-bold text-lg">Bs. {amount.toFixed(2)}</span>
        </div>
      </div>

      <div className="flex items-start gap-2 text-xs text-amber-600 bg-amber-500/10 p-2 rounded">
        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
        <p>
          <strong>Importante:</strong> Incluye la referencia exacta en tu transferencia para que podamos identificar tu pago.
        </p>
      </div>
    </div>
  )
}

// Request status badge
function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    pending_payment: { label: "Esperando Pago", variant: "secondary" },
    payment_received: { label: "Pago Recibido", variant: "default" },
    processing: { label: "Procesando", variant: "default" },
    completed: { label: "Completado", variant: "outline" },
    cancelled: { label: "Cancelado", variant: "destructive" },
    expired: { label: "Expirado", variant: "destructive" },
  }

  const config = statusConfig[status] || { label: status, variant: "secondary" as const }

  return <Badge variant={config.variant}>{config.label}</Badge>
}

export function BoliviaRamp() {
  const { isConnected, publicKey, connect, selectedWallet } = useWallet()
  const rampApiUrl = process.env.NEXT_PUBLIC_RAMP_API_URL || 'http://localhost:3002'
  const {
    isLoading,
    error,
    getOnRampQuote,
    getOffRampQuote,
    createOnRampRequest,
    createOffRampRequest,
    getUserRequests,
    cancelRequest,
    getRequest,
  } = useRamp(rampApiUrl)

  const [bobAmount, setBobAmount] = useState("")
  const [bobtAmount, setBobtAmount] = useState("")
  const [quote, setQuote] = useState<RampServiceQuote | null>(null)
  const [activeRequest, setActiveRequest] = useState<RampServiceRequest | null>(null)
  const [userRequests, setUserRequests] = useState<RampServiceRequest[]>([])
  const [tab, setTab] = useState("buy")
  const [showPayment, setShowPayment] = useState(false)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  // Bank info for off-ramp
  const [bankAccount, setBankAccount] = useState("")
  const [bankName, setBankName] = useState("")

  // Poll for status updates when there's an active request
  const pollRequestStatus = useCallback(async (requestId: string) => {
    try {
      const updated = await getRequest(requestId)
      if (updated) {
        setActiveRequest(updated)

        // Stop polling if completed, cancelled, or failed
        if (['completed', 'cancelled', 'failed', 'expired'].includes(updated.status)) {
          if (pollingRef.current) {
            clearInterval(pollingRef.current)
            pollingRef.current = null
          }

          if (updated.status === 'completed') {
            toast.success("Pago completado! BOBT enviado a tu wallet")
          }
        }
      }
    } catch (err) {
      console.error("Error polling status:", err)
    }
  }, [getRequest])

  // Start polling when active request changes
  useEffect(() => {
    if (activeRequest && ['pending_payment', 'payment_received', 'processing', 'pending_verification', 'verified'].includes(activeRequest.status)) {
      // Poll every 5 seconds
      pollingRef.current = setInterval(() => {
        pollRequestStatus(activeRequest.id)
      }, 5000)

      return () => {
        if (pollingRef.current) {
          clearInterval(pollingRef.current)
          pollingRef.current = null
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRequest?.id, activeRequest?.status, pollRequestStatus])

  // Load user requests on connect
  useEffect(() => {
    if (publicKey) {
      loadUserRequests()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey])

  const loadUserRequests = async () => {
    if (!publicKey) return
    const requests = await getUserRequests(publicKey)
    setUserRequests(requests)
    // Find active request
    const active = requests.find(r =>
      ['pending_payment', 'payment_received', 'processing', 'pending_verification', 'verified'].includes(r.status)
    )
    if (active) {
      setActiveRequest(active)
      setShowPayment(true)
    } else {
      setActiveRequest(null)
      setShowPayment(false)
    }
  }

  const handleGetQuote = async () => {
    if (tab === "buy") {
      const amount = parseFloat(bobAmount)
      if (!amount || amount <= 0) {
        toast.error("Ingrese un monto válido")
        return
      }
      const newQuote = await getOnRampQuote(amount)
      if (newQuote) {
        setQuote(newQuote)
        toast.success("Cotización obtenida")
      }
    } else {
      const amount = parseFloat(bobtAmount)
      if (!amount || amount <= 0) {
        toast.error("Ingrese un monto válido")
        return
      }
      const newQuote = await getOffRampQuote(amount)
      if (newQuote) {
        setQuote(newQuote)
        toast.success("Cotización obtenida")
      }
    }
  }

  const handleCreateRequest = async () => {
    if (!publicKey) {
      toast.error("Conecta tu wallet primero")
      return
    }

    if (tab === "buy") {
      const amount = parseFloat(bobAmount)
      if (!amount) return

      const request = await createOnRampRequest(publicKey, amount)
      if (request) {
        setActiveRequest(request)
        setQuote(null)
        setBobAmount("")
        setShowPayment(true)
        toast.success("Solicitud creada. Realiza el pago para recibir tu BOBT.")
        loadUserRequests()
      }
    } else {
      const amount = parseFloat(bobtAmount)
      if (!amount || !bankAccount || !bankName) {
        toast.error("Completa todos los campos")
        return
      }

      const request = await createOffRampRequest(publicKey, amount, bankAccount, bankName)
      if (request) {
        setActiveRequest(request)
        setQuote(null)
        setBobtAmount("")
        setShowPayment(true)
        toast.success("Solicitud de venta creada")
        loadUserRequests()
      }
    }
  }

  const handleCancelRequest = async () => {
    if (!activeRequest || !publicKey) return

    const result = await cancelRequest(activeRequest.id, publicKey)
    if (result) {
      setActiveRequest(null)
      setShowPayment(false)
      toast.success("Solicitud cancelada")
      loadUserRequests()
    }
  }

  const handleBackToForm = () => {
    // Only allow going back if request is completed or cancelled
    if (activeRequest && ['completed', 'cancelled', 'failed', 'expired'].includes(activeRequest.status)) {
      setActiveRequest(null)
      setShowPayment(false)
    }
  }

  const handleRefreshStatus = () => {
    if (activeRequest) {
      pollRequestStatus(activeRequest.id)
      toast.info("Actualizando estado...")
    }
  }

  const clearQuote = () => {
    setQuote(null)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("Copiado al portapapeles")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {showPayment && activeRequest && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 mr-1"
              onClick={handleBackToForm}
              disabled={!['completed', 'cancelled', 'failed', 'expired'].includes(activeRequest.status)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <Banknote className="h-5 w-5" />
          {showPayment ? "Pago en Proceso" : "Compra/Venta BOBT"}
        </CardTitle>
        <CardDescription>
          {showPayment
            ? "Completa tu pago para recibir BOBT en tu wallet"
            : "Deposita Bolivianos, recibe BOBT - 1:1 con el BOB"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Show Payment QR when there's an active on-ramp request */}
        {showPayment && activeRequest && activeRequest.type === 'on_ramp' && (
          <PaymentQR
            amount={activeRequest.bobAmount}
            reference={activeRequest.bankReference || `BOBT-${activeRequest.id.slice(0, 8)}`}
            bankName={activeRequest.paymentInstructions?.bankName || "Banco Union"}
            accountNumber={activeRequest.paymentInstructions?.accountNumber || "1234567890"}
            accountName={activeRequest.paymentInstructions?.accountName || "BOBT Treasury"}
            expiresAt={activeRequest.expiresAt}
            status={activeRequest.status}
            txHash={activeRequest.txHash}
            requestId={activeRequest.id}
            onStatusChange={handleRefreshStatus}
            onCancel={activeRequest.status === 'pending_payment' ? handleCancelRequest : handleBackToForm}
          />
        )}

        {/* Show Off-ramp Status when there's an active off-ramp request */}
        {showPayment && activeRequest && activeRequest.type === 'off_ramp' && (
          <OffRampStatus
            bobtAmount={activeRequest.bobtAmount}
            bobAmount={activeRequest.bobAmount}
            treasuryAddress={activeRequest.paymentInstructions?.accountNumber || "GCXK...TREASURY"}
            bankAccount={activeRequest.userBankAccount || ""}
            bankName={activeRequest.userBankName || ""}
            status={activeRequest.status}
            expiresAt={activeRequest.expiresAt}
            txHash={activeRequest.txHash}
            onStatusChange={handleRefreshStatus}
            onCancel={activeRequest.status === 'pending_payment' ? handleCancelRequest : handleBackToForm}
          />
        )}

        {/* Show form when no active payment */}
        {!showPayment && (
          <>
            <PriceDisplay />

            {/* Show add token helper when wallet is connected */}
            {isConnected && (
              <div className="mb-4">
                <AddTokenHelper
                  walletId={selectedWallet?.id}
                  walletName={selectedWallet?.name}
                  variant="alert"
                />
              </div>
            )}

          <Tabs value={tab} onValueChange={(v) => { setTab(v); clearQuote(); }}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="buy">Comprar BOBT</TabsTrigger>
              <TabsTrigger value="sell">Vender BOBT</TabsTrigger>
            </TabsList>

            <TabsContent value="buy" className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tú depositas</label>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={bobAmount}
                    onChange={(e) => {
                      setBobAmount(e.target.value)
                      clearQuote()
                    }}
                    className="pr-12"
                    min="10"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    BOB
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Mínimo: Bs. 10 | Máximo: Bs. 10,000</p>
              </div>

              <div className="flex justify-center">
                <div className="rounded-full border p-2">
                  <ArrowDownUp className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              {/* Preview calculation: 1:1 ratio minus 0.5% fee */}
              {(() => {
                const inputAmount = parseFloat(bobAmount) || 0
                const feePercent = 0.5
                const feeAmount = inputAmount * (feePercent / 100)
                const outputAmount = quote?.outputAmount ?? (inputAmount > 0 ? inputAmount - feeAmount : 0)
                const showPreview = inputAmount > 0

                return (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Tú recibes</label>
                      <div className="relative">
                        <Input
                          type="text"
                          placeholder="0.00"
                          value={showPreview ? outputAmount.toFixed(2) : ""}
                          readOnly
                          className="pr-16 bg-muted/50 text-lg font-semibold"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          BOBT
                        </span>
                      </div>
                    </div>

                    {showPreview && (
                      <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tasa de cambio</span>
                          <span className="font-mono">1 BOBT = 1 BOB</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Comisión ({quote?.feePercent ?? feePercent}%)</span>
                          <span className="font-mono">Bs. {(quote?.feeAmount ?? feeAmount).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-medium pt-2 border-t">
                          <span>Total a recibir</span>
                          <span className="font-mono text-primary">{outputAmount.toFixed(2)} BOBT</span>
                        </div>
                      </div>
                    )}

                    {quote?.paymentInstructions && (
                      <PaymentInstructions
                        instructions={quote.paymentInstructions}
                        amount={quote.inputAmount}
                        onCopy={copyToClipboard}
                      />
                    )}
                  </>
                )
              })()}

              {!isConnected ? (
                <Button className="w-full" onClick={connect}>
                  Conectar Wallet
                </Button>
              ) : (
                <Button
                  className="w-full"
                  onClick={quote ? handleCreateRequest : handleGetQuote}
                  disabled={!bobAmount || parseFloat(bobAmount) < 10 || isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {quote ? "Creando solicitud..." : "Verificando..."}
                    </>
                  ) : quote ? (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Confirmar y Crear Solicitud
                    </>
                  ) : (
                    "Continuar"
                  )}
                </Button>
              )}
            </TabsContent>

            <TabsContent value="sell" className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tú vendes</label>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={bobtAmount}
                    onChange={(e) => {
                      setBobtAmount(e.target.value)
                      clearQuote()
                    }}
                    className="pr-16"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    BOBT
                  </span>
                </div>
              </div>

              <div className="flex justify-center">
                <div className="rounded-full border p-2">
                  <ArrowDownUp className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              {/* Preview calculation: 1:1 ratio minus 0.5% fee */}
              {(() => {
                const inputAmount = parseFloat(bobtAmount) || 0
                const feePercent = 0.5
                const feeAmount = inputAmount * (feePercent / 100)
                const outputAmount = quote?.outputAmount ?? (inputAmount > 0 ? inputAmount - feeAmount : 0)
                const showPreview = inputAmount > 0

                return (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Tú recibes</label>
                      <div className="relative">
                        <Input
                          type="text"
                          placeholder="0.00"
                          value={showPreview ? outputAmount.toFixed(2) : ""}
                          readOnly
                          className="pr-12 bg-muted/50 text-lg font-semibold"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          BOB
                        </span>
                      </div>
                    </div>

                    {showPreview && (
                      <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tasa de cambio</span>
                          <span className="font-mono">1 BOBT = 1 BOB</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Comisión ({quote?.feePercent ?? feePercent}%)</span>
                          <span className="font-mono">Bs. {(quote?.feeAmount ?? feeAmount).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-medium pt-2 border-t">
                          <span>Total a recibir</span>
                          <span className="font-mono text-primary">Bs. {outputAmount.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </>
                )
              })()}

              {/* Bank details for off-ramp */}
              <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
                <p className="text-sm font-medium">Datos bancarios para recibir</p>
                <div className="space-y-2">
                  <Input
                    placeholder="Nombre del banco (ej: Banco Unión)"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                  />
                  <Input
                    placeholder="Número de cuenta"
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value)}
                  />
                </div>
              </div>

              {!isConnected ? (
                <Button className="w-full" onClick={connect}>
                  Conectar Wallet
                </Button>
              ) : (
                <Button
                  className="w-full"
                  variant="destructive"
                  onClick={quote ? handleCreateRequest : handleGetQuote}
                  disabled={!bobtAmount || parseFloat(bobtAmount) < 10 || isLoading || !bankAccount || !bankName}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {quote ? "Creando solicitud..." : "Verificando..."}
                    </>
                  ) : quote ? (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Confirmar Venta
                    </>
                  ) : (
                    "Continuar"
                  )}
                </Button>
              )}
            </TabsContent>
          </Tabs>

            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm mt-4 p-3 bg-destructive/10 rounded-lg">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-start gap-2 text-xs text-muted-foreground mt-4 p-3 bg-muted/30 rounded-lg">
              <Info className="h-4 w-4 mt-0.5 shrink-0" />
              <p>
                BOBT mantiene paridad 1:1 con el Boliviano. Deposita BOB en la cuenta del Treasury
                y recibe BOBT directamente en tu wallet. Sin intermediarios.
              </p>
            </div>

            {/* Recent requests */}
            {userRequests.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-medium mb-2">Historial reciente</p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {userRequests.slice(0, 5).map(req => (
                    <div key={req.id} className="flex items-center justify-between text-xs p-2 bg-muted/30 rounded">
                      <span className="font-mono">{req.id.slice(0, 8)}...</span>
                      <span>{req.type === 'on_ramp' ? 'Compra' : 'Venta'}</span>
                      <span className="font-mono">
                        {req.type === 'on_ramp' ? `Bs. ${req.bobAmount}` : `${req.bobtAmount} BOBT`}
                      </span>
                      <StatusBadge status={req.status} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
