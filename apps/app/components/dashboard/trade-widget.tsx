"use client"

import { useState } from "react"
import { useWallet } from "@bobt/stellar/hooks"
import { useOraclePrice } from "@bobt/stellar/hooks"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ArrowDownUp, AlertCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"

export function TradeWidget() {
  const { isConnected, connect } = useWallet()
  const { midPrice, isValid } = useOraclePrice()
  const [usdtAmount, setUsdtAmount] = useState("")
  const [bobtAmount, setBobtAmount] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  const handleUsdtChange = (value: string) => {
    setUsdtAmount(value)
    if (value && midPrice) {
      setBobtAmount((parseFloat(value) * midPrice).toFixed(2))
    } else {
      setBobtAmount("")
    }
  }

  const handleBobtChange = (value: string) => {
    setBobtAmount(value)
    if (value && midPrice) {
      setUsdtAmount((parseFloat(value) / midPrice).toFixed(2))
    } else {
      setUsdtAmount("")
    }
  }

  const handleTrade = async (type: "mint" | "burn") => {
    if (!isConnected) {
      toast.error("Please connect your wallet first")
      return
    }

    if (!isValid) {
      toast.error("Oracle price is stale. Please wait for an update.")
      return
    }

    setIsProcessing(true)
    try {
      // TODO: Implement actual mint/burn transaction
      toast.info(`${type === "mint" ? "Minting" : "Burning"} ${bobtAmount} BOBT...`)
      await new Promise(resolve => setTimeout(resolve, 2000))
      toast.success(`Successfully ${type === "mint" ? "minted" : "burned"} ${bobtAmount} BOBT`)
      setUsdtAmount("")
      setBobtAmount("")
    } catch (error) {
      toast.error(`Failed to ${type}: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trade</CardTitle>
        <CardDescription>Mint or burn BOBT tokens</CardDescription>
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
              <p className="text-xs text-muted-foreground text-center">
                1 USDT = {midPrice.toFixed(4)} BOBT
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
                disabled={!usdtAmount || isProcessing || !isValid}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
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
              <p className="text-xs text-muted-foreground text-center">
                1 BOBT = {(1 / midPrice).toFixed(4)} USDT
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
                disabled={!bobtAmount || isProcessing || !isValid}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
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
      </CardContent>
    </Card>
  )
}
