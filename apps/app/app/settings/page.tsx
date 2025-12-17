"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Settings,
  Moon,
  Sun,
  Bell,
  Shield,
  Wallet,
  Globe,
  RefreshCw,
  Trash2,
  ExternalLink,
} from "lucide-react"
import { useTheme } from "next-themes"
import { toast } from "sonner"
import { useWallet } from "@bobt/stellar"

interface UserPreferences {
  notifications: {
    transactions: boolean
    priceAlerts: boolean
    systemUpdates: boolean
  }
  display: {
    currency: string
    language: string
    compactNumbers: boolean
  }
  privacy: {
    analytics: boolean
    crashReports: boolean
  }
}

const defaultPreferences: UserPreferences = {
  notifications: {
    transactions: true,
    priceAlerts: false,
    systemUpdates: true,
  },
  display: {
    currency: "BOB",
    language: "es",
    compactNumbers: false,
  },
  privacy: {
    analytics: true,
    crashReports: true,
  },
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const { isConnected, publicKey, disconnect, selectedWallet } = useWallet()
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences)
  const [mounted, setMounted] = useState(false)

  // Load preferences from localStorage
  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem("bobt-preferences")
    if (saved) {
      try {
        setPreferences(JSON.parse(saved))
      } catch {
        // Use defaults
      }
    }
  }, [])

  // Save preferences to localStorage
  const savePreferences = (newPrefs: UserPreferences) => {
    setPreferences(newPrefs)
    localStorage.setItem("bobt-preferences", JSON.stringify(newPrefs))
    toast.success("Preferencias guardadas")
  }

  const updateNotification = (key: keyof UserPreferences["notifications"], value: boolean) => {
    savePreferences({
      ...preferences,
      notifications: { ...preferences.notifications, [key]: value },
    })
  }

  const updateDisplay = (key: keyof UserPreferences["display"], value: string | boolean) => {
    savePreferences({
      ...preferences,
      display: { ...preferences.display, [key]: value },
    })
  }

  const updatePrivacy = (key: keyof UserPreferences["privacy"], value: boolean) => {
    savePreferences({
      ...preferences,
      privacy: { ...preferences.privacy, [key]: value },
    })
  }

  const handleClearCache = () => {
    localStorage.removeItem("bobt-price-history")
    localStorage.removeItem("bobt-tx-cache")
    toast.success("Cache limpiado")
  }

  const handleResetPreferences = () => {
    savePreferences(defaultPreferences)
    toast.success("Preferencias restauradas")
  }

  const handleDisconnectWallet = () => {
    disconnect()
    toast.success("Wallet desconectada")
  }

  if (!mounted) {
    return null
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Configuracion
        </h1>
        <p className="text-muted-foreground">
          Personaliza tu experiencia en BOBT
        </p>
      </div>

      {/* Wallet Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Wallet Conectada
          </CardTitle>
          <CardDescription>
            Gestiona tu conexion de wallet Stellar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isConnected ? (
            <>
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="space-y-1">
                  <p className="text-sm font-medium">{selectedWallet?.name || "Wallet Stellar"}</p>
                  <p className="text-xs font-mono text-muted-foreground">
                    {publicKey?.slice(0, 12)}...{publicKey?.slice(-8)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-sm text-green-600">Conectada</span>
                </div>
              </div>
              <div className="flex gap-2">
                <a
                  href={`https://stellar.expert/explorer/testnet/account/${publicKey}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Ver en Explorer
                  </Button>
                </a>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDisconnectWallet}
                >
                  Desconectar
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-2">
                No hay wallet conectada
              </p>
              <Button variant="outline" onClick={() => window.location.href = "/"}>
                Ir al Dashboard para conectar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            Apariencia
          </CardTitle>
          <CardDescription>
            Personaliza el aspecto visual de la aplicacion
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Tema</Label>
              <p className="text-sm text-muted-foreground">
                Selecciona el modo de color
              </p>
            </div>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Claro</SelectItem>
                <SelectItem value="dark">Oscuro</SelectItem>
                <SelectItem value="system">Sistema</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Numeros compactos</Label>
              <p className="text-sm text-muted-foreground">
                Mostrar 1.5K en lugar de 1,500
              </p>
            </div>
            <Switch
              checked={preferences.display.compactNumbers}
              onCheckedChange={(v) => updateDisplay("compactNumbers", v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificaciones
          </CardTitle>
          <CardDescription>
            Configura que alertas quieres recibir
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Transacciones</Label>
              <p className="text-sm text-muted-foreground">
                Notificar cuando se complete una transaccion
              </p>
            </div>
            <Switch
              checked={preferences.notifications.transactions}
              onCheckedChange={(v) => updateNotification("transactions", v)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Alertas de precio</Label>
              <p className="text-sm text-muted-foreground">
                Notificar cambios significativos en el Oracle
              </p>
            </div>
            <Switch
              checked={preferences.notifications.priceAlerts}
              onCheckedChange={(v) => updateNotification("priceAlerts", v)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Actualizaciones del sistema</Label>
              <p className="text-sm text-muted-foreground">
                Notificar sobre mantenimiento y nuevas funciones
              </p>
            </div>
            <Switch
              checked={preferences.notifications.systemUpdates}
              onCheckedChange={(v) => updateNotification("systemUpdates", v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Language & Region */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Idioma y Region
          </CardTitle>
          <CardDescription>
            Configura tu idioma y moneda preferida
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Idioma</Label>
              <p className="text-sm text-muted-foreground">
                Idioma de la interfaz
              </p>
            </div>
            <Select
              value={preferences.display.language}
              onValueChange={(v) => updateDisplay("language", v)}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="es">Espanol</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Moneda de referencia</Label>
              <p className="text-sm text-muted-foreground">
                Para mostrar equivalencias
              </p>
            </div>
            <Select
              value={preferences.display.currency}
              onValueChange={(v) => updateDisplay("currency", v)}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BOB">BOB (Bs.)</SelectItem>
                <SelectItem value="USD">USD ($)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Privacy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacidad
          </CardTitle>
          <CardDescription>
            Controla que datos se comparten
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Analytics anonimos</Label>
              <p className="text-sm text-muted-foreground">
                Ayuda a mejorar la aplicacion con datos de uso anonimos
              </p>
            </div>
            <Switch
              checked={preferences.privacy.analytics}
              onCheckedChange={(v) => updatePrivacy("analytics", v)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Reportes de errores</Label>
              <p className="text-sm text-muted-foreground">
                Enviar reportes automaticos cuando ocurran errores
              </p>
            </div>
            <Switch
              checked={preferences.privacy.crashReports}
              onCheckedChange={(v) => updatePrivacy("crashReports", v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Gestion de Datos
          </CardTitle>
          <CardDescription>
            Administra el cache y datos locales
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Limpiar cache</Label>
              <p className="text-sm text-muted-foreground">
                Elimina datos temporales guardados
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleClearCache}>
              <Trash2 className="h-4 w-4 mr-2" />
              Limpiar
            </Button>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Restaurar preferencias</Label>
              <p className="text-sm text-muted-foreground">
                Volver a la configuracion por defecto
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleResetPreferences}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Restaurar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Network Info */}
      <Card>
        <CardHeader>
          <CardTitle>Red Stellar</CardTitle>
          <CardDescription>
            Informacion de la red conectada
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
            <div className="h-3 w-3 rounded-full bg-yellow-500" />
            <div>
              <p className="font-medium">Testnet</p>
              <p className="text-xs text-muted-foreground">
                Red de pruebas - Los tokens no tienen valor real
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            La aplicacion cambiara automaticamente a Mainnet cuando este disponible.
          </p>
        </CardContent>
      </Card>

      {/* Version Info */}
      <div className="text-center text-xs text-muted-foreground py-4">
        <p>BOBT Stablecoin v0.1.0 (Testnet)</p>
        <p className="mt-1">Stellar Soroban Smart Contracts</p>
      </div>
    </div>
  )
}
