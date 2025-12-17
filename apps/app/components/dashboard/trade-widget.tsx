"use client"

import { useState, useCallback } from "react"
import { useOraclePrice, useTreasury, useBalance } from "@bobt/stellar/hooks"
import { useWallet } from "@bobt/stellar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ArrowDownUp, AlertCircle, Loader2, ExternalLink, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"

export function TradeWidget() {
  const { isConnected, publicKey, connect } = useWallet()
  const { midPrice, isValid, lastUpdated } = useOraclePrice()
  const { refetch: refetchBalance } = useBalance(publicKey)
  const {
    isProcessing,
    error: treasuryError,
    lastTxHash,
    estimateBOBTForUSDT,
    estimateUSDTForBOBT,
    mint,
    burn,
  } = useTreasury(publicKey)

  const [usdtAmount, setUsdtAmount] = useState("")
  const [bobtAmount, setBobtAmount] = useState("")
  const [isEstimating, setIsEstimating] = useState(false)

  // Debounced estimation for USDT -> BOBT
  const handleUsdtChange = useCallback(async (value: string) => {
    setUsdtAmount(value)

    if (!value || parseFloat(value) <= 0) {
      setBobtAmount("")
      return
    }

    // Use oracle mid price for quick preview
    if (midPrice) {
      setBobtAmount((parseFloat(value) * midPrice).toFixed(2))
    }

    // Then get accurate estimate from contract
    setIsEstimating(true)
    try {
      const estimate = await estimateBOBTForUSDT(parseFloat(value))
      if (estimate !== null) {
        setBobtAmount(estimate.toFixed(2))
      }
    } catch {
      // Keep the oracle-based estimate
    } finally {
      setIsEstimating(false)
    }
  }, [midPrice, estimateBOBTForUSDT])

  // Debounced estimation for BOBT -> USDT
  const handleBobtChange = useCallback(async (value: string) => {
    setBobtAmount(value)

    if (!value || parseFloat(value) <= 0) {
      setUsdtAmount("")
      return
    }

    // Use oracle mid price for quick preview
    if (midPrice) {
      setUsdtAmount((parseFloat(value) / midPrice).toFixed(2))
    }

    // Then get accurate estimate from contract
    setIsEstimating(true)
    try {
      const estimate = await estimateUSDTForBOBT(parseFloat(value))
      if (estimate !== null) {
        setUsdtAmount(estimate.toFixed(2))
      }
    } catch {
      // Keep the oracle-based estimate
    } finally {
      setIsEstimating(false)
    }
  }, [midPrice, estimateUSDTForBOBT])

  const handleTrade = async (type: "mint" | "burn") => {
    if (!isConnected) {
      toast.error("Please connect your wallet first")
      return
    }

    if (!isValid) {
      toast.error("Oracle price is stale. Please wait for an update.")
      return
    }

    const amount = type === "mint" ? parseFloat(usdtAmount) : parseFloat(bobtAmount)
    if (!amount || amount <= 0) {
      toast.error("Please enter a valid amount")
      return
    }

    toast.info(`${type === "mint" ? "Minting" : "Burning"} ${bobtAmount} BOBT...`)

    try {
      const result = type === "mint"
        ? await mint(amount)
        : await burn(amount)

      if (result.success) {
        toast.success(
          <div className="flex flex-col gap-1">
            <span>Successfully {type === "mint" ? "minted" : "burned"} {bobtAmount} BOBT</span>
            {result.txHash && (
              <a
                href={`https://stellar.expert/explorer/testnet/tx/${result.txHash}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary flex items-center gap-1"
              >
                View transaction <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        )
        setUsdtAmount("")
        setBobtAmount("")
        // Refresh balance after successful transaction
        await refetchBalance()
      } else {
        toast.error(`Failed to ${type}: ${result.error || "Unknown error"}`)
      }
    } catch (error) {
      toast.error(`Failed to ${type}: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl">Mint / Burn BOBT</CardTitle>
        <CardDescription>
          Intercambia USDT por BOBT directamente en la blockchain Stellar
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="mint">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="mint">Mint</TabsTrigger>
            <TabsTrigger value="burn">Burn</TabsTrigger>
          </TabsList>
          <TabsContent value="mint" className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">You pay</label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="0.00"
                  value={usdtAmount}
                  onChange={(e) => handleUsdtChange(e.target.value)}
                  className="pr-16"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  USDT
                </span>
              </div>
            </div>
            <div className="flex justify-center">
              <div className="rounded-full border p-2">
                <ArrowDownUp className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">You receive</label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="0.00"
                  value={bobtAmount}
                  onChange={(e) => handleBobtChange(e.target.value)}
                  className="pr-16"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  BOBT
                </span>
              </div>
            </div>
            {midPrice && (
              <div className="text-xs text-muted-foreground text-center space-y-1">
                <p>1 USDT = {midPrice.toFixed(4)} BOBT</p>
                {lastUpdated && (
                  <p className="text-[10px] opacity-70">
                    Updated: {lastUpdated.toLocaleTimeString()}
                  </p>
                )}
              </div>
            )}
            {isEstimating && (
              <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Getting estimate from contract...
              </p>
            )}
            {!isConnected ? (
              <Button className="w-full" onClick={connect}>
                Connect Wallet
              </Button>
            ) : (
              <Button
                className="w-full"
                onClick={() => handleTrade("mint")}
                disabled={!usdtAmount || isProcessing || !isValid || isEstimating}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing & Processing...
                  </>
                ) : (
                  "Mint BOBT"
                )}
              </Button>
            )}
          </TabsContent>
          <TabsContent value="burn" className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">You burn</label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="0.00"
                  value={bobtAmount}
                  onChange={(e) => handleBobtChange(e.target.value)}
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
            <div className="space-y-2">
              <label className="text-sm font-medium">You receive</label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="0.00"
                  value={usdtAmount}
                  onChange={(e) => handleUsdtChange(e.target.value)}
                  className="pr-16"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  USDT
                </span>
              </div>
            </div>
            {midPrice && (
              <div className="text-xs text-muted-foreground text-center space-y-1">
                <p>1 BOBT = {(1 / midPrice).toFixed(4)} USDT</p>
                {lastUpdated && (
                  <p className="text-[10px] opacity-70">
                    Updated: {lastUpdated.toLocaleTimeString()}
                  </p>
                )}
              </div>
            )}
            {isEstimating && (
              <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Getting estimate from contract...
              </p>
            )}
            {!isConnected ? (
              <Button className="w-full" onClick={connect}>
                Connect Wallet
              </Button>
            ) : (
              <Button
                className="w-full"
                variant="destructive"
                onClick={() => handleTrade("burn")}
                disabled={!bobtAmount || isProcessing || !isValid || isEstimating}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing & Processing...
                  </>
                ) : (
                  "Burn BOBT"
                )}
              </Button>
            )}
          </TabsContent>
        </Tabs>
        {!isValid && (
          <div className="flex items-center gap-2 text-amber-500 text-sm mt-4 p-3 bg-amber-500/10 rounded-lg">
            <AlertCircle className="h-4 w-4" />
            <span>Oracle price is stale. Trading is temporarily disabled.</span>
          </div>
        )}
        {treasuryError && (
          <div className="flex items-center gap-2 text-destructive text-sm mt-4 p-3 bg-destructive/10 rounded-lg">
            <AlertCircle className="h-4 w-4" />
            <span>{treasuryError}</span>
          </div>
        )}
        {lastTxHash && (
          <div className="flex items-center gap-2 text-green-500 text-sm mt-4 p-3 bg-green-500/10 rounded-lg">
            <CheckCircle2 className="h-4 w-4" />
            <span>Last transaction:</span>
            <a
              href={`https://stellar.expert/explorer/testnet/tx/${lastTxHash}`}
              target="_blank"
              rel="noreferrer"
              className="underline flex items-center gap-1"
            >
              {lastTxHash.slice(0, 8)}...{lastTxHash.slice(-8)}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
