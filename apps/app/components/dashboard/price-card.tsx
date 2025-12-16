"use client"

import { useOraclePrice } from "@bobt/stellar/hooks"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { TrendingUp, RefreshCw, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export function PriceCard() {
  const { midPrice, askPrice, bidPrice, spreadPercent, isValid, isLoading, error, refetch, lastUpdated } = useOraclePrice()

  if (error) {
    return (
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Oracle Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={refetch} className="mt-4">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="col-span-2">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-2xl font-bold">BOBT/USD Price</CardTitle>
          <CardDescription>Real-time oracle price from CriptoYa</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isValid ? "default" : "destructive"}>
            {isValid ? "Active" : "Stale"}
          </Badge>
          <Button variant="ghost" size="icon" onClick={refetch} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-48" />
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-baseline gap-4 mb-6">
              <span className="text-5xl font-bold tabular-nums">
                Bs {midPrice.toFixed(4)}
              </span>
              <div className="flex items-center text-green-500">
                <TrendingUp className="h-5 w-5 mr-1" />
                <span className="text-sm font-medium">Stable</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Ask (Sell)</p>
                <p className="text-xl font-semibold text-red-500 tabular-nums">
                  Bs {askPrice.toFixed(4)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Bid (Buy)</p>
                <p className="text-xl font-semibold text-green-500 tabular-nums">
                  Bs {bidPrice.toFixed(4)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Spread</p>
                <p className="text-xl font-semibold tabular-nums">
                  {spreadPercent.toFixed(2)}%
                </p>
              </div>
            </div>
            {lastUpdated && (
              <p className="text-xs text-muted-foreground mt-4">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
