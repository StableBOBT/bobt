"use client"

import { useBalance } from "@bobt/stellar/hooks"
import { useWallet } from "@bobt/stellar/hooks"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Wallet, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export function BalanceCard() {
  const { isConnected, publicKey } = useWallet()
  const { isLoading, balanceFormatted } = useBalance(publicKey)

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Your Balance
          </CardTitle>
          <CardDescription>Connect your wallet to view balance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-24 text-muted-foreground">
            <p className="text-sm">Wallet not connected</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Your Balance
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
              <Button size="sm" className="flex-1">
                <ArrowDownRight className="h-4 w-4 mr-1" />
                Mint
              </Button>
              <Button size="sm" variant="outline" className="flex-1">
                <ArrowUpRight className="h-4 w-4 mr-1" />
                Burn
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
