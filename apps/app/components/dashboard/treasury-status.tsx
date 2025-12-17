"use client"

import { useState, useEffect, useCallback } from "react"
import { getBOBTClient } from "@bobt/stellar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Vault,
  RefreshCw,
  Shield,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
  Coins,
  Activity,
} from "lucide-react"

interface TreasuryStats {
  totalSupply: number
  dailyMinted: number
  dailyBurned: number
  dailyMintLimit: number
  dailyBurnLimit: number
  oracleValid: boolean
  isPaused: boolean
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(2)}M`
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(2)}K`
  }
  return num.toFixed(2)
}

export function TreasuryStatus() {
  const [stats, setStats] = useState<TreasuryStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const client = getBOBTClient()

      // Fetch all data in parallel
      const [totalSupply, rateLimits, oracleValid, isPaused] = await Promise.all([
        client.getTotalSupply(),
        client.getTreasuryRateLimits(),
        client.isTreasuryOracleValid(),
        client.isTokenPaused(),
      ])

      const decimals = 7
      const divisor = BigInt(10 ** decimals)

      setStats({
        totalSupply: Number(totalSupply / divisor),
        dailyMinted: rateLimits ? Number(rateLimits.dailyMinted / divisor) : 0,
        dailyBurned: rateLimits ? Number(rateLimits.dailyBurned / divisor) : 0,
        dailyMintLimit: rateLimits ? Number(rateLimits.dailyMintLimit / divisor) : 10_000_000,
        dailyBurnLimit: rateLimits ? Number(rateLimits.dailyBurnLimit / divisor) : 10_000_000,
        oracleValid,
        isPaused,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando datos")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [fetchStats])

  const mintUsagePercent = stats
    ? Math.min((stats.dailyMinted / stats.dailyMintLimit) * 100, 100)
    : 0

  const burnUsagePercent = stats
    ? Math.min((stats.dailyBurned / stats.dailyBurnLimit) * 100, 100)
    : 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Vault className="h-5 w-5" />
            Treasury Status
          </CardTitle>
          <CardDescription>Estado del Treasury y Oracle</CardDescription>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={fetchStats}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <div className="flex items-center gap-2 text-destructive text-sm p-3 bg-destructive/10 rounded-lg">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        ) : isLoading && !stats ? (
          <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : stats ? (
          <>
            {/* Status Badges */}
            <div className="flex gap-2 flex-wrap">
              <Badge
                variant="outline"
                className={
                  stats.oracleValid
                    ? "text-green-500 border-green-500/30"
                    : "text-red-500 border-red-500/30"
                }
              >
                {stats.oracleValid ? (
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                ) : (
                  <AlertCircle className="h-3 w-3 mr-1" />
                )}
                Oracle {stats.oracleValid ? "Activo" : "Stale"}
              </Badge>
              <Badge
                variant="outline"
                className={
                  !stats.isPaused
                    ? "text-green-500 border-green-500/30"
                    : "text-yellow-500 border-yellow-500/30"
                }
              >
                <Shield className="h-3 w-3 mr-1" />
                {stats.isPaused ? "Pausado" : "Operativo"}
              </Badge>
            </div>

            {/* Total Supply */}
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">BOBT en Circulacion</span>
                </div>
                <span className="text-xl font-bold font-mono">
                  {formatNumber(stats.totalSupply)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Respaldado 1:1 por reservas BOB
              </p>
            </div>

            {/* Daily Limits */}
            <div className="space-y-3">
              <p className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Actividad 24h
              </p>

              {/* Mint Progress */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="flex items-center gap-1 text-green-500">
                    <TrendingUp className="h-3 w-3" />
                    Minteado
                  </span>
                  <span className="text-muted-foreground">
                    {formatNumber(stats.dailyMinted)} / {formatNumber(stats.dailyMintLimit)}
                  </span>
                </div>
                <Progress value={mintUsagePercent} className="h-2" />
              </div>

              {/* Burn Progress */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="flex items-center gap-1 text-red-500">
                    <TrendingDown className="h-3 w-3" />
                    Quemado
                  </span>
                  <span className="text-muted-foreground">
                    {formatNumber(stats.dailyBurned)} / {formatNumber(stats.dailyBurnLimit)}
                  </span>
                </div>
                <Progress value={burnUsagePercent} className="h-2" />
              </div>
            </div>

            {/* Net Flow */}
            <div className="flex items-center justify-between pt-2 border-t text-sm">
              <span className="text-muted-foreground">Flujo Neto 24h</span>
              <span
                className={`font-mono font-semibold ${
                  stats.dailyMinted - stats.dailyBurned >= 0
                    ? "text-green-500"
                    : "text-red-500"
                }`}
              >
                {stats.dailyMinted - stats.dailyBurned >= 0 ? "+" : ""}
                {formatNumber(stats.dailyMinted - stats.dailyBurned)} BOBT
              </span>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
