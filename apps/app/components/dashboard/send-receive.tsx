"use client"

import { useState } from "react"
import { QRCodeSVG } from "qrcode.react"
import { useBalance, useTransfer } from "@bobt/stellar/hooks"
import { useWallet } from "@bobt/stellar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Send,
  Download,
  Copy,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  QrCode,
  Wallet,
} from "lucide-react"
import { toast } from "sonner"

export function SendReceive() {
  const { isConnected, publicKey, connect } = useWallet()
  const { balanceNumber, balanceFormatted, refetch } = useBalance(publicKey)
  const { isProcessing, error, lastTxHash, transfer, validateAddress } = useTransfer(publicKey)

  const [tab, setTab] = useState("send")
  const [toAddress, setToAddress] = useState("")
  const [amount, setAmount] = useState("")
  const [memo, setMemo] = useState("")
  const [addressError, setAddressError] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)

  const handleAddressChange = (value: string) => {
    setToAddress(value)
    if (value && !validateAddress(value)) {
      setAddressError("Dirección Stellar inválida")
    } else if (value === publicKey) {
      setAddressError("No puedes enviarte a ti mismo")
    } else {
      setAddressError(null)
    }
  }

  const handleSend = async () => {
    const numAmount = parseFloat(amount)
    if (!numAmount || numAmount <= 0) {
      toast.error("Ingresa un monto válido")
      return
    }

    if (numAmount > balanceNumber) {
      toast.error("Monto excede tu balance")
      return
    }

    if (!toAddress || !validateAddress(toAddress)) {
      toast.error("Dirección inválida")
      return
    }

    const result = await transfer(toAddress, numAmount, memo || undefined)

    if (result.success) {
      setShowSuccess(true)
      refetch()
    } else {
      toast.error(result.error || "Error al enviar")
    }
  }

  const handleCloseSuccess = () => {
    setShowSuccess(false)
    setToAddress("")
    setAmount("")
    setMemo("")
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copiado`)
  }

  const handleSetMax = () => {
    // Leave a small amount for fees
    const maxAmount = Math.max(0, balanceNumber - 0.01)
    setAmount(maxAmount.toFixed(2))
  }

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Enviar / Recibir
          </CardTitle>
          <CardDescription>Conecta tu wallet para enviar o recibir BOBT</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Wallet className="h-12 w-12 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">Wallet no conectada</p>
            <Button onClick={connect}>Conectar Wallet</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Enviar / Recibir BOBT
          </CardTitle>
          <CardDescription>
            Transfiere BOBT a otras wallets Stellar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="send" className="gap-2">
                <Send className="h-4 w-4" />
                Enviar
              </TabsTrigger>
              <TabsTrigger value="receive" className="gap-2">
                <Download className="h-4 w-4" />
                Recibir
              </TabsTrigger>
            </TabsList>

            {/* Send Tab */}
            <TabsContent value="send" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="toAddress">Dirección destino</Label>
                <Input
                  id="toAddress"
                  placeholder="G..."
                  value={toAddress}
                  onChange={(e) => handleAddressChange(e.target.value)}
                  className={addressError ? "border-destructive" : ""}
                />
                {addressError && (
                  <p className="text-xs text-destructive">{addressError}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="amount">Monto</Label>
                  <span className="text-xs text-muted-foreground">
                    Disponible: {balanceFormatted} BOBT
                  </span>
                </div>
                <div className="relative">
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pr-20"
                    min="0"
                    step="0.01"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={handleSetMax}
                    >
                      Max
                    </Button>
                    <span className="text-sm text-muted-foreground">BOBT</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="memo">Memo (opcional)</Label>
                <Input
                  id="memo"
                  placeholder="Nota para el destinatario"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  maxLength={28}
                />
                <p className="text-xs text-muted-foreground">
                  Máximo 28 caracteres
                </p>
              </div>

              {/* Preview */}
              {parseFloat(amount) > 0 && toAddress && !addressError && (
                <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Enviando</span>
                    <span className="font-mono font-semibold">{parseFloat(amount).toFixed(2)} BOBT</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">A</span>
                    <span className="font-mono text-xs">
                      {toAddress.slice(0, 8)}...{toAddress.slice(-8)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-muted-foreground">Red fee</span>
                    <span className="font-mono text-green-500">~0.00001 XLM</span>
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                className="w-full"
                onClick={handleSend}
                disabled={
                  !toAddress ||
                  !amount ||
                  parseFloat(amount) <= 0 ||
                  parseFloat(amount) > balanceNumber ||
                  !!addressError ||
                  isProcessing
                }
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Enviar BOBT
                  </>
                )}
              </Button>
            </TabsContent>

            {/* Receive Tab */}
            <TabsContent value="receive" className="space-y-4">
              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  Comparte tu dirección o código QR para recibir BOBT
                </p>

                {/* QR Code */}
                <div className="bg-white p-4 rounded-lg mx-auto w-fit">
                  <QRCodeSVG
                    value={publicKey || ""}
                    size={180}
                    level="H"
                    includeMargin
                  />
                </div>

                {/* Address Display */}
                <div className="space-y-2">
                  <Label>Tu dirección Stellar</Label>
                  <div className="flex gap-2">
                    <Input
                      value={publicKey || ""}
                      readOnly
                      className="font-mono text-xs"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(publicKey || "", "Dirección")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Instructions */}
                <div className="bg-muted/50 rounded-lg p-4 text-left space-y-2">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <QrCode className="h-4 w-4" />
                    Como recibir BOBT
                  </h4>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>1. Comparte tu dirección o QR con el remitente</li>
                    <li>2. El remitente envía BOBT a tu dirección</li>
                    <li>3. Recibirás los tokens en segundos</li>
                  </ul>
                </div>

                <a
                  href={`https://stellar.expert/explorer/testnet/account/${publicKey}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  Ver cuenta en Explorer <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Success Dialog */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              Envío Exitoso
            </DialogTitle>
            <DialogDescription>
              Tu transferencia de BOBT se ha completado
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="bg-green-500/10 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Monto enviado</span>
                <span className="font-mono font-semibold">{parseFloat(amount).toFixed(2)} BOBT</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Destinatario</span>
                <span className="font-mono text-xs">
                  {toAddress.slice(0, 8)}...{toAddress.slice(-8)}
                </span>
              </div>
            </div>

            {lastTxHash && (
              <a
                href={`https://stellar.expert/explorer/testnet/tx/${lastTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1 text-sm text-primary hover:underline"
              >
                Ver transacción en Explorer <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          <DialogFooter>
            <Button onClick={handleCloseSuccess} className="w-full">
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
