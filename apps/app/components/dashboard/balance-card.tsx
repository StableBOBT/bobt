"use client"

import { useState } from "react"
import { useBalance, useTreasury } from "@bobt/stellar/hooks"
import { useWallet } from "@bobt/stellar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
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
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Info,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

type ModalType = "mint" | "burn" | null

export function BalanceCard() {
  const { isConnected, publicKey } = useWallet()
  const { isLoading, balanceFormatted, balanceNumber, refetch } = useBalance(publicKey)
  const {
    isProcessing,
    error: treasuryError,
    lastTxHash,
    mint,
    burn,
    estimateBOBTForUSDT,
    estimateUSDTForBOBT,
  } = useTreasury(publicKey)

  const [modalType, setModalType] = useState<ModalType>(null)
  const [amount, setAmount] = useState("")
  const [estimate, setEstimate] = useState<number | null>(null)
  const [isEstimating, setIsEstimating] = useState(false)
  const [txSuccess, setTxSuccess] = useState(false)

  const handleOpenModal = (type: ModalType) => {
    setModalType(type)
    setAmount("")
    setEstimate(null)
    setTxSuccess(false)
  }

  const handleCloseModal = () => {
    setModalType(null)
    setAmount("")
    setEstimate(null)
    setTxSuccess(false)
  }

  const handleAmountChange = async (value: string) => {
    setAmount(value)
    const numValue = parseFloat(value)

    if (!numValue || numValue <= 0) {
      setEstimate(null)
      return
    }

    setIsEstimating(true)
    try {
      if (modalType === "mint") {
        // Mint: USDT -> BOBT
        const result = await estimateBOBTForUSDT(numValue)
        setEstimate(result)
      } else {
        // Burn: BOBT -> USDT
        const result = await estimateUSDTForBOBT(numValue)
        setEstimate(result)
      }
    } catch {
      setEstimate(null)
    } finally {
      setIsEstimating(false)
    }
  }

  const handleMint = async () => {
    const numAmount = parseFloat(amount)
    if (!numAmount || numAmount <= 0) {
      toast.error("Ingresa un monto válido")
      return
    }

    const result = await mint(numAmount)
    if (result.success) {
      setTxSuccess(true)
      toast.success("Mint exitoso!")
      refetch()
    } else {
      toast.error(result.error || "Error al mintear")
    }
  }

  const handleBurn = async () => {
    const numAmount = parseFloat(amount)
    if (!numAmount || numAmount <= 0) {
      toast.error("Ingresa un monto válido")
      return
    }

    if (balanceNumber && numAmount > balanceNumber) {
      toast.error("Monto excede tu balance")
      return
    }

    const result = await burn(numAmount)
    if (result.success) {
      setTxSuccess(true)
      toast.success("Burn exitoso!")
      refetch()
    } else {
      toast.error(result.error || "Error al quemar")
    }
  }

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Tu Balance
          </CardTitle>
          <CardDescription>Conecta tu wallet para ver tu balance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-24 text-muted-foreground">
            <p className="text-sm">Wallet no conectada</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Tu Balance
          </CardTitle>
          <CardDescription>BOBT Token Holdings</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-12 w-full" />
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold tabular-nums">
                  {balanceFormatted}
                </span>
                <span className="text-muted-foreground">BOBT</span>
              </div>
              <div className="flex gap-2 mt-4">
                <Button size="sm" className="flex-1" onClick={() => handleOpenModal("mint")}>
                  <ArrowDownRight className="h-4 w-4 mr-1" />
                  Mint
                </Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={() => handleOpenModal("burn")}>
                  <ArrowUpRight className="h-4 w-4 mr-1" />
                  Burn
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Mint/Burn Modal */}
      <Dialog open={modalType !== null} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {modalType === "mint" ? (
                <>
                  <ArrowDownRight className="h-5 w-5 text-green-500" />
                  Mint BOBT
                </>
              ) : (
                <>
                  <ArrowUpRight className="h-5 w-5 text-red-500" />
                  Burn BOBT
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {modalType === "mint"
                ? "Deposita USDT y recibe BOBT al precio del Oracle"
                : "Quema BOBT y recibe USDT al precio del Oracle"}
            </DialogDescription>
          </DialogHeader>

          {txSuccess ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-500 mx-auto flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-green-600">
                  {modalType === "mint" ? "Mint Exitoso!" : "Burn Exitoso!"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  La transacción se ha completado correctamente
                </p>
              </div>
              {lastTxHash && (
                <a
                  href={`https://stellar.expert/explorer/testnet/tx/${lastTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  Ver transacción <ExternalLink className="h-3 w-3" />
                </a>
              )}
              <Button onClick={handleCloseModal} className="w-full mt-4">
                Cerrar
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">
                    {modalType === "mint" ? "USDT a depositar" : "BOBT a quemar"}
                  </Label>
                  <div className="relative">
                    <Input
                      id="amount"
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      className="pr-16"
                      min="0"
                      step="0.01"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      {modalType === "mint" ? "USDT" : "BOBT"}
                    </span>
                  </div>
                  {modalType === "burn" && balanceNumber > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Disponible: {balanceFormatted} BOBT
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 ml-2 text-xs"
                        onClick={() => handleAmountChange(balanceNumber.toString())}
                      >
                        Max
                      </Button>
                    </p>
                  )}
                </div>

                {/* Estimate Display */}
                {(estimate !== null || isEstimating) && (
                  <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Recibirás aprox.</span>
                      {isEstimating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <span className="font-mono font-semibold">
                          {estimate?.toFixed(2)} {modalType === "mint" ? "BOBT" : "USDT"}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Basado en el precio actual del Oracle
                    </p>
                  </div>
                )}

                {/* Info Notice */}
                <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
                  <Info className="h-4 w-4 mt-0.5 shrink-0" />
                  <p>
                    {modalType === "mint"
                      ? "El mint requiere USDT en tu wallet Stellar. El monto se convierte al precio del Oracle."
                      : "El burn destruye tus BOBT y te envía USDT equivalente al precio del Oracle."}
                  </p>
                </div>

                {treasuryError && (
                  <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                    <AlertCircle className="h-4 w-4" />
                    <span>{treasuryError}</span>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={handleCloseModal}>
                  Cancelar
                </Button>
                <Button
                  onClick={modalType === "mint" ? handleMint : handleBurn}
                  disabled={!amount || parseFloat(amount) <= 0 || isProcessing}
                  variant={modalType === "burn" ? "destructive" : "default"}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Procesando...
                    </>
                  ) : modalType === "mint" ? (
                    "Confirmar Mint"
                  ) : (
                    "Confirmar Burn"
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
