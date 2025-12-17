"use client"

import { useState, useMemo } from "react"
import { useTransactionHistory } from "@bobt/stellar/hooks"
import { useWallet } from "@bobt/stellar"
import type { Transaction } from "@bobt/stellar/hooks"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ArrowDownRight,
  ArrowUpRight,
  ArrowLeftRight,
  ExternalLink,
  RefreshCw,
  History,
  AlertCircle,
  Download,
  Filter,
  Search,
  Wallet,
  TrendingUp,
  TrendingDown,
  Activity,
  X,
} from "lucide-react"
import { formatDistanceToNow, format, isAfter, isBefore, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"

type TransactionType = "all" | "mint" | "burn" | "transfer" | "other"
type DateRange = "all" | "today" | "week" | "month" | "custom"

function TransactionIcon({ type }: { type: Transaction["type"] }) {
  switch (type) {
    case "mint":
      return <ArrowDownRight className="h-4 w-4 text-green-500" />
    case "burn":
      return <ArrowUpRight className="h-4 w-4 text-red-500" />
    case "transfer":
      return <ArrowLeftRight className="h-4 w-4 text-blue-500" />
    default:
      return <History className="h-4 w-4 text-muted-foreground" />
  }
}

function formatAddress(address: string): string {
  if (!address || address.length < 10) return address
  return `${address.slice(0, 6)}...${address.slice(-6)}`
}

function LoadingRows() {
  return (
    <>
      {[1, 2, 3, 4, 5].map((i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-16" /></TableCell>
          <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
        </TableRow>
      ))}
    </>
  )
}

export default function HistoryPage() {
  const { isConnected, publicKey, connect } = useWallet()
  const { transactions, isLoading, error, refetch, hasMore, loadMore } = useTransactionHistory(publicKey, 50)

  // Filters
  const [typeFilter, setTypeFilter] = useState<TransactionType>("all")
  const [dateRange, setDateRange] = useState<DateRange>("all")
  const [customFrom, setCustomFrom] = useState("")
  const [customTo, setCustomTo] = useState("")
  const [searchQuery, setSearchQuery] = useState("")

  const formatTime = (createdAt: string) => {
    try {
      return formatDistanceToNow(new Date(createdAt), { addSuffix: true, locale: es })
    } catch {
      return "Desconocido"
    }
  }

  const formatDate = (createdAt: string) => {
    try {
      return format(new Date(createdAt), "dd/MM/yyyy HH:mm", { locale: es })
    } catch {
      return "Desconocido"
    }
  }

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Type filter
      if (typeFilter !== "all" && tx.type !== typeFilter) {
        return false
      }

      // Search filter (hash or address)
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesHash = tx.hash?.toLowerCase().includes(query)
        const matchesFrom = tx.from?.toLowerCase().includes(query)
        const matchesTo = tx.to?.toLowerCase().includes(query)
        if (!matchesHash && !matchesFrom && !matchesTo) {
          return false
        }
      }

      // Date range filter
      if (dateRange !== "all") {
        const txDate = parseISO(tx.createdAt)
        const now = new Date()

        if (dateRange === "today") {
          const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          if (isBefore(txDate, startOfDay)) return false
        } else if (dateRange === "week") {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          if (isBefore(txDate, weekAgo)) return false
        } else if (dateRange === "month") {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          if (isBefore(txDate, monthAgo)) return false
        } else if (dateRange === "custom") {
          if (customFrom) {
            const fromDate = parseISO(customFrom)
            if (isBefore(txDate, fromDate)) return false
          }
          if (customTo) {
            const toDate = parseISO(customTo + "T23:59:59")
            if (isAfter(txDate, toDate)) return false
          }
        }
      }

      return true
    })
  }, [transactions, typeFilter, dateRange, customFrom, customTo, searchQuery])

  // Calculate stats
  const stats = useMemo(() => {
    const mints = filteredTransactions.filter(t => t.type === "mint")
    const burns = filteredTransactions.filter(t => t.type === "burn")
    const transfers = filteredTransactions.filter(t => t.type === "transfer")

    const totalMinted = mints.reduce((sum, t) => sum + parseFloat(t.amount || "0"), 0)
    const totalBurned = burns.reduce((sum, t) => sum + parseFloat(t.amount || "0"), 0)
    const totalTransferred = transfers.reduce((sum, t) => sum + parseFloat(t.amount || "0"), 0)

    return {
      total: filteredTransactions.length,
      mints: mints.length,
      burns: burns.length,
      transfers: transfers.length,
      totalMinted,
      totalBurned,
      totalTransferred,
      netFlow: totalMinted - totalBurned,
    }
  }, [filteredTransactions])

  // Export to CSV
  const exportToCSV = () => {
    if (filteredTransactions.length === 0) {
      toast.error("No hay transacciones para exportar")
      return
    }

    const headers = ["Fecha", "Tipo", "Monto", "Asset", "De", "Para", "Hash", "Estado"]
    const rows = filteredTransactions.map(tx => [
      formatDate(tx.createdAt),
      tx.type,
      tx.amount || "0",
      tx.asset || "BOBT",
      tx.from || "",
      tx.to || "",
      tx.hash,
      tx.successful ? "Confirmado" : "Fallido",
    ])

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `bobt-transactions-${format(new Date(), "yyyy-MM-dd")}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast.success(`${filteredTransactions.length} transacciones exportadas`)
  }

  const clearFilters = () => {
    setTypeFilter("all")
    setDateRange("all")
    setCustomFrom("")
    setCustomTo("")
    setSearchQuery("")
  }

  const hasActiveFilters = typeFilter !== "all" || dateRange !== "all" || searchQuery !== ""

  if (!isConnected) {
    return (
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Historial</h1>
          <p className="text-muted-foreground">
            Tus transacciones en la red Stellar
          </p>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Wallet className="h-12 w-12 text-muted-foreground opacity-50 mb-4" />
            <h3 className="text-lg font-medium mb-2">Wallet no conectada</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Conecta tu wallet para ver tu historial de transacciones
            </p>
            <Button onClick={connect}>Conectar Wallet</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Historial</h1>
          <p className="text-muted-foreground">
            Tus transacciones en la red Stellar
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transacciones</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.mints} mint, {stats.burns} burn, {stats.transfers} transfer
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Minted</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              +{stats.totalMinted.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">BOBT</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Burned</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              -{stats.totalBurned.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">BOBT</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Flujo Neto</CardTitle>
            <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.netFlow >= 0 ? "text-green-600" : "text-red-600"}`}>
              {stats.netFlow >= 0 ? "+" : ""}{stats.netFlow.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">BOBT</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtros
            </CardTitle>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Limpiar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar hash o direccion..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Type Filter */}
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TransactionType)}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="mint">Mint</SelectItem>
                <SelectItem value="burn">Burn</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
                <SelectItem value="other">Otros</SelectItem>
              </SelectContent>
            </Select>

            {/* Date Range */}
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
              <SelectTrigger>
                <SelectValue placeholder="Periodo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo el tiempo</SelectItem>
                <SelectItem value="today">Hoy</SelectItem>
                <SelectItem value="week">Ultima semana</SelectItem>
                <SelectItem value="month">Ultimo mes</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>

            {/* Custom Date Range */}
            {dateRange === "custom" && (
              <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
                <Input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  placeholder="Desde"
                />
                <Input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  placeholder="Hasta"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transacciones</CardTitle>
          <CardDescription>
            {filteredTransactions.length} transaccion{filteredTransactions.length !== 1 ? "es" : ""} encontrada{filteredTransactions.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="flex items-center gap-2 text-destructive text-sm p-4 bg-destructive/10 rounded-lg">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead className="hidden sm:table-cell">Asset</TableHead>
                      <TableHead className="hidden md:table-cell">De/Para</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading && transactions.length === 0 ? (
                      <LoadingRows />
                    ) : filteredTransactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                          <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="font-medium">No hay transacciones</p>
                          <p className="text-xs">
                            {hasActiveFilters
                              ? "Prueba ajustar los filtros"
                              : "Empieza a operar para ver tu historial"
                            }
                          </p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTransactions.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <TransactionIcon type={tx.type} />
                              <span className="capitalize font-medium">{tx.type}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono">
                            <span className={tx.type === "burn" ? "text-red-500" : tx.type === "mint" ? "text-green-500" : ""}>
                              {tx.amount
                                ? `${tx.type === "burn" ? "-" : tx.type === "mint" ? "+" : ""}${parseFloat(tx.amount).toFixed(2)}`
                                : "-"
                              }
                            </span>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-muted-foreground">
                            {tx.asset || "BOBT"}
                          </TableCell>
                          <TableCell className="hidden md:table-cell font-mono text-muted-foreground text-xs">
                            {tx.type === "transfer" ? (
                              <span>
                                {formatAddress(tx.from || "")} → {formatAddress(tx.to || "")}
                              </span>
                            ) : (
                              formatAddress(tx.to || tx.from || "")
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-0.5">
                              <p className="text-sm">{formatTime(tx.createdAt)}</p>
                              <p className="text-xs text-muted-foreground hidden lg:block">
                                {formatDate(tx.createdAt)}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Badge
                                variant="outline"
                                className={
                                  tx.successful
                                    ? "text-green-500 border-green-500/30"
                                    : "text-red-500 border-red-500/30"
                                }
                              >
                                {tx.successful ? "OK" : "Error"}
                              </Badge>
                              <a
                                href={`https://stellar.expert/explorer/testnet/tx/${tx.hash}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-muted-foreground hover:text-foreground"
                                title="Ver en Explorer"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {hasMore && filteredTransactions.length > 0 && (
                <div className="flex justify-center pt-4">
                  <Button
                    variant="outline"
                    onClick={() => loadMore()}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Cargando...
                      </>
                    ) : (
                      "Cargar mas"
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
