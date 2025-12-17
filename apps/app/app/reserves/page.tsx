"use client"

import { useState, useEffect, useCallback } from "react"
import { getBOBTClient } from "@bobt/stellar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Shield,
  RefreshCw,
  CheckCircle2,
  Coins,
  Building2,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  AlertCircle,
  Lock,
  Scale,
  FileCheck,
} from "lucide-react"

interface ReserveData {
  totalSupply: number
  totalReserves: number
  ratio: number
  lastAuditDate: string
  treasuryAccounts: {
    bank: string
    account: string
    balance: number
    lastUpdated: string
  }[]
  recentActivity: {
    type: "mint" | "burn"
    amount: number
    txHash: string
    timestamp: number
  }[]
}

function formatNumber(num: number): string {
  return num.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("es-BO", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function ReservesPage() {
  const [data, setData] = useState<ReserveData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const client = getBOBTClient()

      // Fetch total supply from blockchain
      const totalSupply = await client.getTotalSupply()
      const decimals = 7
      const divisor = BigInt(10 ** decimals)
      const supplyNumber = Number(totalSupply / divisor)

      // For demo purposes, reserves match supply (1:1)
      // In production, this would come from bank API or manual audits
      const reservesNumber = supplyNumber

      // Mock treasury accounts data
      // In production, this would come from bank APIs or admin input
      const treasuryAccounts = [
        {
          bank: "Banco Union",
          account: "****7890",
          balance: reservesNumber * 0.6,
          lastUpdated: new Date().toISOString(),
        },
        {
          bank: "BNB",
          account: "****4567",
          balance: reservesNumber * 0.3,
          lastUpdated: new Date().toISOString(),
        },
        {
          bank: "Banco Mercantil",
          account: "****1234",
          balance: reservesNumber * 0.1,
          lastUpdated: new Date().toISOString(),
        },
      ]

      // Mock recent activity - in production from blockchain events
      const recentActivity: ReserveData["recentActivity"] = [
        { type: "mint", amount: 1500, txHash: "abc123...", timestamp: Date.now() - 3600000 },
        { type: "burn", amount: 500, txHash: "def456...", timestamp: Date.now() - 7200000 },
        { type: "mint", amount: 2000, txHash: "ghi789...", timestamp: Date.now() - 14400000 },
        { type: "mint", amount: 750, txHash: "jkl012...", timestamp: Date.now() - 28800000 },
        { type: "burn", amount: 300, txHash: "mno345...", timestamp: Date.now() - 43200000 },
      ]

      setData({
        totalSupply: supplyNumber,
        totalReserves: reservesNumber,
        ratio: reservesNumber > 0 ? (reservesNumber / supplyNumber) * 100 : 100,
        lastAuditDate: new Date().toISOString(),
        treasuryAccounts,
        recentActivity,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando datos")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Proof of Reserves
          </h1>
          <p className="text-muted-foreground">
            Verificacion transparente del respaldo 1:1 de BOBT con Bolivianos
          </p>
        </div>
        <Button onClick={fetchData} disabled={isLoading} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-destructive text-sm p-4 bg-destructive/10 rounded-lg">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* BOBT Supply */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">BOBT en Circulacion</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatNumber(data?.totalSupply || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Tokens BOBT activos en la red Stellar
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* BOB Reserves */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reservas BOB</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  Bs. {formatNumber(data?.totalReserves || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Bolivianos en cuentas bancarias del Treasury
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Backing Ratio */}
        <Card className={data && data.ratio >= 100 ? "border-green-500/50" : "border-yellow-500/50"}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ratio de Respaldo</CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="flex items-baseline gap-2">
                  <span className={`text-2xl font-bold ${data && data.ratio >= 100 ? "text-green-500" : "text-yellow-500"}`}>
                    {data?.ratio.toFixed(1)}%
                  </span>
                  {data && data.ratio >= 100 && (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {data && data.ratio >= 100
                    ? "Totalmente respaldado"
                    : "Respaldo parcial"}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Backing Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Respaldo Garantizado
          </CardTitle>
          <CardDescription>
            Por cada BOBT en circulacion, existe un Boliviano equivalente en las cuentas del Treasury
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Cobertura de reservas</span>
              <span className="font-medium">{data?.ratio.toFixed(1) || 0}%</span>
            </div>
            <Progress value={Math.min(data?.ratio || 0, 100)} className="h-3" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-500 mb-2">
                <TrendingUp className="h-4 w-4" />
                <span className="font-medium text-sm">Garantias</span>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>Reservas 100% en Bolivianos (BOB)</li>
                <li>Cuentas bancarias segregadas</li>
                <li>Auditorias periodicas</li>
                <li>Sin apalancamiento ni inversiones</li>
              </ul>
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-primary mb-2">
                <FileCheck className="h-4 w-4" />
                <span className="font-medium text-sm">Verificacion</span>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>Supply verificable on-chain</li>
                <li>Contratos auditados en Soroban</li>
                <li>Treasury multi-firma</li>
                <li>Reportes mensuales publicos</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Treasury Accounts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Cuentas del Treasury
          </CardTitle>
          <CardDescription>
            Distribucion de reservas en cuentas bancarias bolivianas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Banco</TableHead>
                  <TableHead>Cuenta</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">% del Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.treasuryAccounts.map((account, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{account.bank}</TableCell>
                    <TableCell className="font-mono text-muted-foreground">
                      {account.account}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      Bs. {formatNumber(account.balance)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline">
                        {((account.balance / (data?.totalReserves || 1)) * 100).toFixed(0)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50">
                  <TableCell className="font-bold">Total</TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-right font-mono font-bold">
                    Bs. {formatNumber(data?.totalReserves || 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge className="bg-green-500">100%</Badge>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Actividad Reciente
          </CardTitle>
          <CardDescription>
            Ultimas operaciones de mint y burn
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Transaccion</TableHead>
                  <TableHead className="text-right">Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.recentActivity.map((activity, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          activity.type === "mint"
                            ? "text-green-500 border-green-500/30"
                            : "text-red-500 border-red-500/30"
                        }
                      >
                        {activity.type === "mint" ? (
                          <TrendingUp className="h-3 w-3 mr-1" />
                        ) : (
                          <TrendingDown className="h-3 w-3 mr-1" />
                        )}
                        {activity.type === "mint" ? "Mint" : "Burn"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">
                      {activity.type === "mint" ? "+" : "-"}
                      {formatNumber(activity.amount)} BOBT
                    </TableCell>
                    <TableCell>
                      <a
                        href={`https://stellar.expert/explorer/testnet/tx/${activity.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-primary hover:underline font-mono"
                      >
                        {activity.txHash}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm">
                      {formatDate(activity.timestamp)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Verification Links */}
      <Card>
        <CardHeader>
          <CardTitle>Verificacion Independiente</CardTitle>
          <CardDescription>
            Enlaces para verificar los datos de forma independiente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <a
              href="https://stellar.expert/explorer/testnet"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <ExternalLink className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Stellar Expert</p>
                <p className="text-xs text-muted-foreground">
                  Explorador de blockchain
                </p>
              </div>
            </a>

            <a
              href="#"
              className="flex items-center gap-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <FileCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Informe de Auditoria</p>
                <p className="text-xs text-muted-foreground">
                  Ultimo reporte mensual
                </p>
              </div>
            </a>

            <a
              href="#"
              className="flex items-center gap-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Contratos Soroban</p>
                <p className="text-xs text-muted-foreground">
                  Codigo fuente verificado
                </p>
              </div>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
