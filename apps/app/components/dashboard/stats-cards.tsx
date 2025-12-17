"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Activity, DollarSign, TrendingUp, Radio } from "lucide-react"
import { useOnChainStats } from "@bobt/stellar"

interface StatsCardProps {
  title: string
  value: string
  description: string
  icon: React.ReactNode
  isLoading?: boolean
}

function StatsCard({ title, value, description, icon, isLoading }: StatsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <>
            <Skeleton className="h-8 w-24 mb-1" />
            <Skeleton className="h-4 w-32" />
          </>
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            <p className="text-xs text-muted-foreground">{description}</p>
          </>
        )}
      </CardContent>
    </Card>
  )
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

function formatCurrency(num: number): string {
  return `Bs ${formatNumber(num)}`
}

export function StatsCards() {
  const { stats, isLoading } = useOnChainStats()

  return (
    <>
      <StatsCard
        title="Total Supply"
        value={stats ? formatNumber(stats.totalSupply) : "0"}
        description="BOBT en circulaci&oacute;n"
        icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
        isLoading={isLoading}
      />
      <StatsCard
        title="Volumen 24h"
        value={stats ? formatCurrency(stats.dailyVolume) : "Bs 0"}
        description={stats ? `Mint: ${formatNumber(stats.dailyMinted)} / Burn: ${formatNumber(stats.dailyBurned)}` : "Sin actividad"}
        icon={<Activity className="h-4 w-4 text-muted-foreground" />}
        isLoading={isLoading}
      />
      <StatsCard
        title="Fuentes Oracle"
        value={stats ? `${stats.numSources}/3` : "0/3"}
        description="Exchanges P2P activos"
        icon={<Radio className="h-4 w-4 text-muted-foreground" />}
        isLoading={isLoading}
      />
      <StatsCard
        title="Precio BOB/USD"
        value={stats && stats.lastPriceUpdate ? "Activo" : "Stale"}
        description={stats?.lastPriceUpdate
          ? `Actualizado: ${new Date(stats.lastPriceUpdate * 1000).toLocaleTimeString()}`
          : "Sin datos del Oracle"
        }
        icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
        isLoading={isLoading}
      />
    </>
  )
}
