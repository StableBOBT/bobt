"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, Users, DollarSign, TrendingUp } from "lucide-react"

interface StatsCardProps {
  title: string
  value: string
  description: string
  icon: React.ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
}

function StatsCard({ title, value, description, icon, trend }: StatsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">
          {trend && (
            <span className={trend.isPositive ? "text-green-500" : "text-red-500"}>
              {trend.isPositive ? "+" : ""}{trend.value}%{" "}
            </span>
          )}
          {description}
        </p>
      </CardContent>
    </Card>
  )
}

export function StatsCards() {
  return (
    <>
      <StatsCard
        title="Total Supply"
        value="1,234,567"
        description="BOBT tokens minted"
        icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
      />
      <StatsCard
        title="Total Holders"
        value="156"
        description="unique wallets"
        icon={<Users className="h-4 w-4 text-muted-foreground" />}
      />
      <StatsCard
        title="24h Volume"
        value="$12,345"
        description="from yesterday"
        icon={<Activity className="h-4 w-4 text-muted-foreground" />}
        trend={{ value: 12.5, isPositive: true }}
      />
      <StatsCard
        title="Oracle Updates"
        value="2,847"
        description="in the last 24h"
        icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
      />
    </>
  )
}
