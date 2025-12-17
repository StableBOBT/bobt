"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Shield,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Eye,
  Play,
  Banknote,
  Activity,
  Users,
  TrendingUp,
  ExternalLink,
} from "lucide-react"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

interface RampRequest {
  id: string
  type: "on_ramp" | "off_ramp"
  userAddress: string
  bobAmount: number
  bobtAmount: number
  feeAmount: number
  status: string
  bankReference?: string
  createdAt: number
  expiresAt: number
  txHash?: string
}

interface ServiceStats {
  totalRequests: number
  completedRequests: number
  pendingRequests: number
  totalVolumeBOB: number
  totalVolumeBOBT: number
  totalFees: number
}

function formatAddress(address: string): string {
  if (!address || address.length < 12) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function formatTime(timestamp: number) {
  try {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: es })
  } catch {
    return "Desconocido"
  }
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
    pending_payment: { label: "Esperando Pago", variant: "secondary", icon: <Clock className="h-3 w-3" /> },
    payment_received: { label: "Pago Recibido", variant: "default", icon: <Banknote className="h-3 w-3" /> },
    pending_verification: { label: "Pendiente Verificar", variant: "outline", icon: <Eye className="h-3 w-3" /> },
    verified: { label: "Verificado", variant: "default", icon: <CheckCircle2 className="h-3 w-3" /> },
    processing: { label: "Procesando", variant: "default", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
    completed: { label: "Completado", variant: "outline", icon: <CheckCircle2 className="h-3 w-3" /> },
    cancelled: { label: "Cancelado", variant: "destructive", icon: <AlertCircle className="h-3 w-3" /> },
    failed: { label: "Fallido", variant: "destructive", icon: <AlertCircle className="h-3 w-3" /> },
  }

  const c = config[status] || { label: status, variant: "secondary" as const, icon: null }

  return (
    <Badge variant={c.variant} className="gap-1">
      {c.icon}
      {c.label}
    </Badge>
  )
}

export default function AdminPage() {
  const rampApiUrl = process.env.NEXT_PUBLIC_RAMP_API_URL || ""

  const [stats, setStats] = useState<ServiceStats | null>(null)
  const [pendingRequests, setPendingRequests] = useState<RampRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<RampRequest | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false)
  const [bankReference, setBankReference] = useState("")

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, pendingRes] = await Promise.all([
        fetch(`${rampApiUrl}/api/stats`),
        fetch(`${rampApiUrl}/api/admin/pending`),
      ])

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData.data)
      }

      if (pendingRes.ok) {
        const pendingData = await pendingRes.json()
        setPendingRequests(pendingData.data || [])
      }
    } catch (error) {
      console.error("Error fetching admin data:", error)
      toast.error("Error cargando datos")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [rampApiUrl])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 10000) // Refresh every 10s
    return () => clearInterval(interval)
  }, [fetchData])

  const handleRefresh = () => {
    setIsRefreshing(true)
    fetchData()
  }

  const handleSimulateDeposit = async (request: RampRequest) => {
    setIsProcessing(true)
    try {
      const res = await fetch(`${rampApiUrl}/api/test/simulate-deposit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: request.id }),
      })

      const data = await res.json()
      if (data.success) {
        toast.success("Deposito simulado exitosamente")
        fetchData()
      } else {
        toast.error(data.error || "Error simulando deposito")
      }
    } catch {
      toast.error("Error de conexion")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleAutoVerify = async (request: RampRequest) => {
    setIsProcessing(true)
    try {
      const res = await fetch(`${rampApiUrl}/api/test/auto-verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: request.id }),
      })

      const data = await res.json()
      if (data.success) {
        toast.success("Solicitud verificada")
        fetchData()
      } else {
        toast.error(data.error || "Error verificando")
      }
    } catch {
      toast.error("Error de conexion")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleProcess = async (request: RampRequest) => {
    setIsProcessing(true)
    try {
      const res = await fetch(`${rampApiUrl}/api/test/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: request.id }),
      })

      const data = await res.json()
      if (data.success) {
        toast.success("Solicitud procesada - BOBT enviado")
        fetchData()
      } else {
        toast.error(data.error || "Error procesando")
      }
    } catch {
      toast.error("Error de conexion")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleManualVerify = async () => {
    if (!selectedRequest || !bankReference) {
      toast.error("Ingresa la referencia bancaria")
      return
    }

    setIsProcessing(true)
    try {
      const res = await fetch(`${rampApiUrl}/api/admin/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: selectedRequest.id,
          bankReference,
          verifiedBy: "admin-panel",
        }),
      })

      const data = await res.json()
      if (data.success) {
        toast.success("Pago verificado exitosamente")
        setVerifyDialogOpen(false)
        setBankReference("")
        setSelectedRequest(null)
        fetchData()
      } else {
        toast.error(data.error || "Error verificando pago")
      }
    } catch {
      toast.error("Error de conexion")
    } finally {
      setIsProcessing(false)
    }
  }

  const openVerifyDialog = (request: RampRequest) => {
    setSelectedRequest(request)
    setBankReference(request.bankReference || "")
    setVerifyDialogOpen(true)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Panel de Administracion
          </h1>
          <p className="text-muted-foreground">
            Gestiona solicitudes de on/off-ramp y verifica pagos
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={isRefreshing} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Solicitudes</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats?.totalRequests || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-yellow-600">
                {stats?.pendingRequests || pendingRequests.length}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Volumen BOB</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">
                Bs. {(stats?.totalVolumeBOB || 0).toLocaleString()}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comisiones</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold text-green-600">
                Bs. {(stats?.totalFees || 0).toFixed(2)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pending Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Solicitudes Pendientes
          </CardTitle>
          <CardDescription>
            Solicitudes que requieren verificacion o procesamiento
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : pendingRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No hay solicitudes pendientes</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Tiempo</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingRequests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-mono text-xs">
                      {req.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {req.type === "on_ramp" ? "Compra" : "Venta"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {formatAddress(req.userAddress)}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">Bs. {req.bobAmount.toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground">
                          → {req.bobtAmount.toFixed(2)} BOBT
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {req.bankReference || "-"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={req.status} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatTime(req.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        {req.status === "pending_payment" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSimulateDeposit(req)}
                              disabled={isProcessing}
                            >
                              <Banknote className="h-3 w-3 mr-1" />
                              Simular
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => openVerifyDialog(req)}
                              disabled={isProcessing}
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Verificar
                            </Button>
                          </>
                        )}
                        {(req.status === "payment_received" || req.status === "pending_verification") && (
                          <Button
                            size="sm"
                            onClick={() => handleAutoVerify(req)}
                            disabled={isProcessing}
                          >
                            {isProcessing ? (
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                            )}
                            Auto-Verificar
                          </Button>
                        )}
                        {req.status === "verified" && (
                          <Button
                            size="sm"
                            onClick={() => handleProcess(req)}
                            disabled={isProcessing}
                          >
                            {isProcessing ? (
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            ) : (
                              <Play className="h-3 w-3 mr-1" />
                            )}
                            Procesar
                          </Button>
                        )}
                        {req.status === "completed" && req.txHash && (
                          <a
                            href={`https://stellar.expert/explorer/testnet/tx/${req.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button size="sm" variant="outline">
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Ver TX
                            </Button>
                          </a>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Manual Verify Dialog */}
      <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verificar Pago Manual</DialogTitle>
            <DialogDescription>
              Ingresa la referencia bancaria para verificar el pago
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">ID:</span>
                  <span className="font-mono">{selectedRequest.id.slice(0, 12)}...</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Usuario:</span>
                  <span className="font-mono">{formatAddress(selectedRequest.userAddress)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Monto:</span>
                  <span className="font-bold">Bs. {selectedRequest.bobAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Referencia esperada:</span>
                  <span className="font-mono text-yellow-600">{selectedRequest.bankReference}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Referencia bancaria verificada</label>
                <Input
                  placeholder="Ej: TRX123456789"
                  value={bankReference}
                  onChange={(e) => setBankReference(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setVerifyDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleManualVerify} disabled={!bankReference || isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Verificar Pago
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
