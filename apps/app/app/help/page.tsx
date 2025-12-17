"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  HelpCircle,
  Search,
  BookOpen,
  MessageCircle,
  ExternalLink,
  Wallet,
  ArrowRightLeft,
  Shield,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Zap,
  Globe,
} from "lucide-react"

interface FAQItem {
  question: string
  answer: string
  category: string
}

const faqItems: FAQItem[] = [
  // General
  {
    category: "general",
    question: "Que es BOBT?",
    answer: "BOBT es una stablecoin respaldada 1:1 por el Boliviano (BOB). Cada BOBT en circulacion esta respaldado por un Boliviano real en reservas bancarias, permitiendo transferencias rapidas y seguras en la red Stellar.",
  },
  {
    category: "general",
    question: "Es seguro usar BOBT?",
    answer: "Si. BOBT utiliza contratos inteligentes auditados en Stellar Soroban, con un sistema de multifirma para operaciones criticas. Las reservas son verificables en tiempo real a traves de nuestra pagina de Proof of Reserves.",
  },
  {
    category: "general",
    question: "Cual es la diferencia entre BOBT y otras stablecoins?",
    answer: "BOBT esta especificamente disenado para el mercado boliviano, con respaldo 1:1 en Bolivianos y integracion directa con bancos locales. A diferencia de stablecoins en dolares, BOBT elimina la exposicion al tipo de cambio USD/BOB.",
  },
  // Wallet
  {
    category: "wallet",
    question: "Que wallets puedo usar?",
    answer: "BOBT es compatible con cualquier wallet Stellar, incluyendo Freighter (extension de navegador), xBull, Lobstr, y Solar Wallet. Recomendamos Freighter para usuarios de escritorio por su facilidad de uso.",
  },
  {
    category: "wallet",
    question: "Como conecto mi wallet?",
    answer: "1) Instala una wallet compatible (ej: Freighter desde Chrome Web Store). 2) Crea o importa tu cuenta Stellar. 3) Visita el Dashboard de BOBT y haz clic en 'Conectar Wallet'. 4) Aprueba la conexion en tu wallet.",
  },
  {
    category: "wallet",
    question: "Perdi acceso a mi wallet, que hago?",
    answer: "Si tienes tu frase de recuperacion (12 o 24 palabras), puedes restaurar tu wallet en cualquier aplicacion compatible. BOBT no almacena claves privadas, por lo que no podemos recuperar wallets perdidas. Guarda tu frase de recuperacion en un lugar seguro.",
  },
  // Trading
  {
    category: "trading",
    question: "Como compro BOBT con Bolivianos?",
    answer: "1) Conecta tu wallet. 2) Ve a la seccion 'Trade'. 3) Ingresa el monto en BOB que deseas convertir. 4) Realiza la transferencia bancaria con el QR o datos indicados. 5) Una vez verificado el pago, recibiras BOBT en tu wallet.",
  },
  {
    category: "trading",
    question: "Como vendo BOBT por Bolivianos?",
    answer: "1) Conecta tu wallet. 2) Ve a la seccion 'Trade' y selecciona 'Vender'. 3) Ingresa tus datos bancarios bolivianos. 4) Envia BOBT a la direccion del Treasury. 5) Una vez recibido, procesamos la transferencia bancaria a tu cuenta.",
  },
  {
    category: "trading",
    question: "Cuanto tiempo toma una transaccion?",
    answer: "Las transacciones en Stellar se confirman en 3-5 segundos. Para on-ramp (compra), el tiempo depende de la verificacion bancaria (usualmente minutos). Para off-ramp (venta), las transferencias bancarias pueden tomar hasta 24 horas habiles.",
  },
  {
    category: "trading",
    question: "Cuales son las comisiones?",
    answer: "On-ramp (compra): 0.5% del monto. Off-ramp (venta): 0.5% del monto. Transferencias P2P de BOBT: Solo el fee de red Stellar (~0.00001 XLM). Mint/Burn directo con USDT: 0% comision.",
  },
  // Technical
  {
    category: "technical",
    question: "Que es el Oracle?",
    answer: "El Oracle es un servicio que proporciona el tipo de cambio USDT/BOB al contrato inteligente. BOBT utiliza datos de CriptoYa para obtener precios actualizados del mercado boliviano.",
  },
  {
    category: "technical",
    question: "Que significa Mint y Burn?",
    answer: "Mint: Crear nuevos BOBT depositando colateral (USDT o BOB). Burn: Destruir BOBT para retirar el colateral equivalente. Estos procesos mantienen el respaldo 1:1 de la stablecoin.",
  },
  {
    category: "technical",
    question: "Que es Stellar Soroban?",
    answer: "Soroban es la plataforma de contratos inteligentes de Stellar. Permite crear aplicaciones descentralizadas con transacciones rapidas (3-5 seg) y fees muy bajos (~$0.0001). BOBT utiliza 3 contratos: Token, Treasury y Oracle.",
  },
  // Troubleshooting
  {
    category: "troubleshooting",
    question: "Mi transaccion fallo, que hago?",
    answer: "1) Verifica que tengas suficiente XLM para fees (~0.5 XLM recomendado). 2) Asegurate de que tu wallet este conectada a Testnet. 3) Revisa que el monto no exceda los limites diarios. 4) Si persiste, contacta soporte con el ID de la transaccion.",
  },
  {
    category: "troubleshooting",
    question: "No veo mi balance de BOBT",
    answer: "1) Verifica que tu wallet tenga una trustline para BOBT (se crea automaticamente al recibir). 2) Refresca la pagina. 3) Asegurate de estar en la red correcta (Testnet). 4) Revisa tu cuenta en stellar.expert para confirmar el balance.",
  },
  {
    category: "troubleshooting",
    question: "El precio del Oracle aparece como invalido",
    answer: "El Oracle tiene un tiempo maximo de validez (1 hora). Si el precio esta 'stale', las operaciones de mint/burn se pausan hasta que se actualice. Esto es una medida de seguridad. Intenta nuevamente en unos minutos.",
  },
]

const categories = [
  { id: "all", label: "Todos", icon: HelpCircle },
  { id: "general", label: "General", icon: BookOpen },
  { id: "wallet", label: "Wallet", icon: Wallet },
  { id: "trading", label: "Trading", icon: ArrowRightLeft },
  { id: "technical", label: "Tecnico", icon: Zap },
  { id: "troubleshooting", label: "Problemas", icon: AlertTriangle },
]

const glossary = [
  { term: "BOBT", definition: "Boliviano On-chain Backed Token - Stablecoin 1:1 con BOB" },
  { term: "Stablecoin", definition: "Criptomoneda con valor estable anclado a un activo (ej: BOB)" },
  { term: "Wallet", definition: "Billetera digital para almacenar y gestionar criptomonedas" },
  { term: "Stellar", definition: "Red blockchain rapida y de bajo costo para pagos" },
  { term: "Soroban", definition: "Plataforma de smart contracts de Stellar" },
  { term: "Oracle", definition: "Servicio que provee datos externos (precios) a contratos" },
  { term: "Treasury", definition: "Contrato que gestiona las reservas de BOBT" },
  { term: "Mint", definition: "Crear nuevos tokens depositando colateral" },
  { term: "Burn", definition: "Destruir tokens para retirar colateral" },
  { term: "On-ramp", definition: "Proceso de convertir dinero fiat a cripto" },
  { term: "Off-ramp", definition: "Proceso de convertir cripto a dinero fiat" },
  { term: "Trustline", definition: "Autorizacion en Stellar para recibir un token especifico" },
  { term: "XLM", definition: "Lumens - Moneda nativa de Stellar para fees" },
  { term: "Testnet", definition: "Red de pruebas (los tokens no tienen valor real)" },
  { term: "Mainnet", definition: "Red principal de produccion" },
]

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")

  const filteredFAQ = faqItems.filter((item) => {
    const matchesSearch =
      searchQuery === "" ||
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory

    return matchesSearch && matchesCategory
  })

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <HelpCircle className="h-6 w-6" />
          Centro de Ayuda
        </h1>
        <p className="text-muted-foreground">
          Encuentra respuestas a tus preguntas sobre BOBT
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar en preguntas frecuentes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="hover:border-primary/50 transition-colors cursor-pointer">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Documentacion</p>
                <p className="text-xs text-muted-foreground">Guias detalladas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <a
          href="https://stellar.expert/explorer/testnet"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Globe className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium flex items-center gap-1">
                    Explorer <ExternalLink className="h-3 w-3" />
                  </p>
                  <p className="text-xs text-muted-foreground">Ver blockchain</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </a>

        <Card className="hover:border-primary/50 transition-colors cursor-pointer">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Soporte</p>
                <p className="text-xs text-muted-foreground">Contactar equipo</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => {
          const Icon = cat.icon
          return (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(cat.id)}
              className="gap-2"
            >
              <Icon className="h-4 w-4" />
              {cat.label}
            </Button>
          )
        })}
      </div>

      {/* FAQ Accordion */}
      <Card>
        <CardHeader>
          <CardTitle>Preguntas Frecuentes</CardTitle>
          <CardDescription>
            {filteredFAQ.length} pregunta{filteredFAQ.length !== 1 ? "s" : ""} encontrada{filteredFAQ.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredFAQ.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No se encontraron resultados para &quot;{searchQuery}&quot;</p>
              <Button
                variant="link"
                onClick={() => {
                  setSearchQuery("")
                  setSelectedCategory("all")
                }}
              >
                Limpiar busqueda
              </Button>
            </div>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {filteredFAQ.map((item, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                      <span>{item.question}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pl-8 text-muted-foreground">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Glossary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Glosario
          </CardTitle>
          <CardDescription>
            Terminos comunes en el ecosistema BOBT
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {glossary.map((item) => (
              <div
                key={item.term}
                className="p-3 rounded-lg bg-muted/50 space-y-1"
              >
                <p className="font-medium text-sm">{item.term}</p>
                <p className="text-xs text-muted-foreground">{item.definition}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Status Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Estado del Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm">Red Stellar</span>
              </div>
              <span className="text-xs text-green-600">Operacional</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm">Contratos BOBT</span>
              </div>
              <span className="text-xs text-green-600">Operacional</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm">Oracle de Precios</span>
              </div>
              <span className="text-xs text-green-600">Actualizado</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-yellow-500" />
                <span className="text-sm">Red</span>
              </div>
              <span className="text-xs text-yellow-600">Testnet</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Necesitas mas ayuda?
          </CardTitle>
          <CardDescription>
            Nuestro equipo esta disponible para asistirte
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="p-4 border rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <span className="font-medium">Soporte Transacciones</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Problemas con compras, ventas o transferencias
              </p>
              <Button variant="outline" size="sm" className="w-full">
                Abrir Ticket
              </Button>
            </div>
            <div className="p-4 border rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <span className="font-medium">Soporte Tecnico</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Problemas con wallet, contratos o integraciones
              </p>
              <Button variant="outline" size="sm" className="w-full">
                Abrir Ticket
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
