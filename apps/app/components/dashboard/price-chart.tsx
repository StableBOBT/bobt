"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Area, AreaChart, XAxis, YAxis } from "recharts"
import { usePriceHistory } from "@bobt/stellar"
import { AlertCircle } from "lucide-react"

const chartConfig = {
  price: {
    label: "Precio",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

export function PriceChart() {
  const { history, currentPrice, isLoading, error } = usePriceHistory()

  // Calculate domain for Y axis
  const prices = history.map(p => p.price)
  const minPrice = prices.length > 0 ? Math.min(...prices) * 0.995 : 6.9
  const maxPrice = prices.length > 0 ? Math.max(...prices) * 1.005 : 7.1

  return (
    <Card className="col-span-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Precio BOB/USD (P2P)</CardTitle>
          <CardDescription>
            {currentPrice ? (
              <>Precio actual: <span className="font-semibold text-foreground">Bs {currentPrice.toFixed(4)}</span></>
            ) : (
              "Cargando precio del Oracle..."
            )}
          </CardDescription>
        </div>
        {error && (
          <div className="flex items-center gap-2 text-yellow-600 text-sm">
            <AlertCircle className="h-4 w-4" />
            <span>Oracle stale</span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isLoading && history.length === 0 ? (
          <Skeleton className="h-[300px] w-full" />
        ) : history.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Sin datos de precio disponibles</p>
              <p className="text-sm">El historial se construye con el tiempo</p>
            </div>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <AreaChart data={history}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-price)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-price)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="time"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                interval="preserveStartEnd"
                minTickGap={50}
              />
              <YAxis
                domain={[minPrice, maxPrice]}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => `Bs ${value.toFixed(2)}`}
                width={70}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => [`Bs ${Number(value).toFixed(4)}`, "Precio"]}
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke="var(--color-price)"
                fill="url(#priceGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        )}
        <div className="mt-4 text-xs text-muted-foreground text-center">
          Datos en tiempo real desde Oracle P2P (Binance, Bybit, Bitget)
        </div>
      </CardContent>
    </Card>
  )
}
