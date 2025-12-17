"use client"

import { useWallet } from "@bobt/stellar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Wallet,
  LogOut,
  Copy,
  ExternalLink,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"
import { useState } from "react"

export function WalletButton() {
  const {
    isConnected,
    publicKey,
    formattedAddress,
    isLoading,
    error,
    selectedWallet,
    availableWallets,
    connectWallet,
    disconnect,
  } = useWallet()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [connectingWallet, setConnectingWallet] = useState<string | null>(null)

  const copyAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey)
      toast.success("Address copied to clipboard")
    }
  }

  const openExplorer = () => {
    if (publicKey) {
      window.open(`https://stellar.expert/explorer/testnet/account/${publicKey}`, "_blank")
    }
  }

  const handleConnectWallet = async (walletId: string) => {
    setConnectingWallet(walletId)
    try {
      await connectWallet(walletId)
      setIsModalOpen(false)
      toast.success("Wallet connected successfully")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to connect wallet")
    } finally {
      setConnectingWallet(null)
    }
  }

  const handleDisconnect = () => {
    disconnect()
    toast.info("Wallet disconnected")
  }

  // Loading state
  if (isLoading) {
    return (
      <Button variant="outline" disabled className="gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <Skeleton className="h-4 w-20" />
      </Button>
    )
  }

  // Not connected state
  if (!isConnected) {
    return (
      <>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Wallet className="h-4 w-4" />
          <span className="hidden sm:inline">Connect Wallet</span>
          <span className="sm:hidden">Connect</span>
        </Button>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Connect Wallet
              </DialogTitle>
              <DialogDescription>
                Select a wallet to connect to BOBT
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 py-4">
              {availableWallets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>No wallets detected</p>
                  <p className="text-sm mt-1">
                    Install <a href="https://freighter.app" target="_blank" rel="noreferrer" className="text-primary underline">Freighter</a> or <a href="https://xbull.app" target="_blank" rel="noreferrer" className="text-primary underline">xBull</a> to continue
                  </p>
                </div>
              ) : (
                availableWallets.map((wallet) => (
                  <button
                    key={wallet.id}
                    onClick={() => handleConnectWallet(wallet.id)}
                    disabled={connectingWallet !== null}
                    className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Avatar className="h-10 w-10">
                      {wallet.icon && (
                        <AvatarImage src={wallet.icon} alt={wallet.name} />
                      )}
                      <AvatarFallback>
                        {wallet.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <p className="font-medium">{wallet.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {wallet.isAvailable ? "Available" : "Not installed"}
                      </p>
                    </div>
                    {connectingWallet === wallet.id ? (
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    ) : wallet.isAvailable ? (
                      <Badge variant="outline" className="text-green-500 border-green-500/30">
                        Ready
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Install
                      </Badge>
                    )}
                  </button>
                ))
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <div className="text-center text-xs text-muted-foreground pt-2 border-t">
              <p>By connecting, you agree to our Terms of Service</p>
            </div>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  // Connected state
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2 px-2 sm:px-4">
          <div className="flex items-center gap-2">
            {selectedWallet?.icon ? (
              <Avatar className="h-5 w-5">
                <AvatarImage src={selectedWallet.icon} alt={selectedWallet.name} />
                <AvatarFallback className="text-[10px]">
                  {selectedWallet.name.slice(0, 2)}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
              </div>
            )}
            <span className="font-mono hidden sm:inline">{formattedAddress}</span>
            <span className="font-mono sm:hidden">{publicKey?.slice(0, 4)}...</span>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50 hidden sm:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex items-center gap-2">
          <div className="flex items-center gap-2 flex-1">
            {selectedWallet?.icon && (
              <Avatar className="h-6 w-6">
                <AvatarImage src={selectedWallet.icon} alt={selectedWallet.name} />
                <AvatarFallback>{selectedWallet.name.slice(0, 2)}</AvatarFallback>
              </Avatar>
            )}
            <div>
              <p className="text-sm font-medium">{selectedWallet?.name || "Connected"}</p>
              <p className="text-xs text-muted-foreground font-mono">{formattedAddress}</p>
            </div>
          </div>
          <Badge variant="outline" className="text-green-500 border-green-500/30 text-xs">
            Testnet
          </Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={copyAddress} className="cursor-pointer">
          <Copy className="mr-2 h-4 w-4" />
          Copy Address
        </DropdownMenuItem>
        <DropdownMenuItem onClick={openExplorer} className="cursor-pointer">
          <ExternalLink className="mr-2 h-4 w-4" />
          View on Explorer
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleDisconnect}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
