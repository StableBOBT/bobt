"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert"
import { Copy, CheckCircle2, Plus, ExternalLink, Info } from "lucide-react"
import { toast } from "sonner"

// BOBT Token Contract Address
const BOBT_CONTRACT = "CBFNIREQSJR7EM5QXALVV6JUY3BTYP2G5VRPKB2UIXUJRSUW2TIJHD55"

// Wallet instruction type
interface WalletInstructions {
  name: string
  steps: string[]
  hasAutoAdd: boolean
  addTokenUrl?: string
}

// Default instructions for unknown wallets
const DEFAULT_INSTRUCTIONS: WalletInstructions = {
  name: "Tu Wallet",
  steps: [
    "Busca la opción 'Add Token' o 'Manage Assets' en tu wallet",
    "Selecciona agregar un token Soroban/Smart Contract",
    "Pega la dirección del contrato BOBT",
    "Confirma para agregar el token"
  ],
  hasAutoAdd: false,
}

// Wallet-specific instructions
const FREIGHTER_INSTRUCTIONS: WalletInstructions = {
  name: "Freighter",
  steps: [
    "Abre la extensión Freighter",
    "Click en el icono de configuración",
    "Selecciona 'Manage Assets'",
    "Click en 'Add Soroban Token'",
    "Pega la dirección del contrato BOBT",
    "Confirma para agregar el token"
  ],
  hasAutoAdd: false,
}

const XBULL_INSTRUCTIONS: WalletInstructions = {
  name: "xBull",
  steps: [
    "Abre xBull Wallet",
    "Ve a la sección de Assets",
    "Click en 'Add Asset' o '+' ",
    "Selecciona 'Soroban Token'",
    "Pega la dirección del contrato BOBT",
    "Confirma para agregar"
  ],
  hasAutoAdd: false,
}

const ALBEDO_INSTRUCTIONS: WalletInstructions = {
  name: "Albedo",
  steps: [
    "Albedo muestra automáticamente los tokens Soroban",
    "Tu balance BOBT aparecerá después de la primera transacción",
    "También puedes verificar tu balance en stellar.expert"
  ],
  hasAutoAdd: true,
  addTokenUrl: `https://stellar.expert/explorer/testnet/asset/${BOBT_CONTRACT}`,
}

const LOBSTR_INSTRUCTIONS: WalletInstructions = {
  name: "LOBSTR",
  steps: [
    "Abre LOBSTR",
    "Ve a Assets → Add Asset",
    "Busca 'BOBT' o pega la dirección del contrato",
    "Confirma para agregar el token"
  ],
  hasAutoAdd: false,
}

interface AddTokenHelperProps {
  walletId?: string | null
  walletName?: string | null
  variant?: "button" | "inline" | "alert"
  className?: string
}

export function AddTokenHelper({
  walletId,
  walletName,
  variant = "button",
  className
}: AddTokenHelperProps) {
  const [copied, setCopied] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  // Get wallet-specific instructions
  const getInstructions = (): WalletInstructions => {
    if (!walletId) return DEFAULT_INSTRUCTIONS

    const id = walletId.toLowerCase()
    if (id.includes("freighter")) return FREIGHTER_INSTRUCTIONS
    if (id.includes("xbull")) return XBULL_INSTRUCTIONS
    if (id.includes("albedo")) return ALBEDO_INSTRUCTIONS
    if (id.includes("lobstr")) return LOBSTR_INSTRUCTIONS

    return DEFAULT_INSTRUCTIONS
  }

  const instructions = getInstructions()

  const copyContract = () => {
    navigator.clipboard.writeText(BOBT_CONTRACT)
    setCopied(true)
    toast.success("Dirección copiada")
    setTimeout(() => setCopied(false), 2000)
  }

  const content = (
    <div className="space-y-4">
      {/* Contract Address */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Dirección del Contrato BOBT</label>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-muted px-3 py-2 rounded-md text-xs font-mono break-all">
            {BOBT_CONTRACT}
          </code>
          <Button
            variant="outline"
            size="icon"
            onClick={copyContract}
            className="shrink-0"
          >
            {copied ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Wallet-specific steps */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          Pasos para {instructions.name}
        </label>
        <ol className="list-decimal list-inside space-y-1.5 text-sm text-muted-foreground">
          {instructions.steps.map((step, index) => (
            <li key={index} className="leading-relaxed">{step}</li>
          ))}
        </ol>
      </div>

      {/* Auto-add note for Albedo */}
      {instructions.hasAutoAdd && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            {instructions.name} detecta automáticamente los tokens Soroban.
            Si no ves tu balance, verifica en{" "}
            <a
              href={instructions.addTokenUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              Stellar Expert <ExternalLink className="h-3 w-3" />
            </a>
          </AlertDescription>
        </Alert>
      )}

      {/* Stellar Expert Link */}
      <div className="pt-2 border-t">
        <a
          href={`https://stellar.expert/explorer/testnet/contract/${BOBT_CONTRACT}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary hover:underline inline-flex items-center gap-1"
        >
          Ver contrato en Stellar Expert <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  )

  // Inline variant - just shows the alert
  if (variant === "alert") {
    return (
      <Alert className={className}>
        <Plus className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>Agrega BOBT a tu wallet para ver tu balance</span>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button variant="link" size="sm" className="h-auto p-0">
                Ver cómo
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Agregar Token BOBT
                </DialogTitle>
                <DialogDescription>
                  Agrega el token BOBT a {walletName || instructions.name} para ver tu balance
                </DialogDescription>
              </DialogHeader>
              {content}
            </DialogContent>
          </Dialog>
        </AlertDescription>
      </Alert>
    )
  }

  // Inline variant - compact info
  if (variant === "inline") {
    return (
      <div className={`flex items-center gap-2 text-xs text-muted-foreground ${className}`}>
        <Info className="h-3 w-3" />
        <span>¿No ves tu BOBT?</span>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="link" size="sm" className="h-auto p-0 text-xs">
              Agregar token a wallet
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Agregar Token BOBT
              </DialogTitle>
              <DialogDescription>
                Agrega el token BOBT a {walletName || instructions.name} para ver tu balance
              </DialogDescription>
            </DialogHeader>
            {content}
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // Button variant (default)
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <Plus className="h-4 w-4 mr-1" />
          Agregar BOBT a Wallet
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Agregar Token BOBT
          </DialogTitle>
          <DialogDescription>
            Agrega el token BOBT a {walletName || instructions.name} para ver tu balance
          </DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  )
}
