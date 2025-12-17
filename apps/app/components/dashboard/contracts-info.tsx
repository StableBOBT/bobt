'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  ExternalLink,
  Copy,
  Check,
  Shield,
  Coins,
  TrendingUp,
  Vault,
  FileText,
  Github,
} from 'lucide-react'

// Contract addresses - Stellar Testnet
const CONTRACTS = {
  token: {
    name: 'BOBT Token',
    address: 'CBFNIREQSJR7EM5QXALVV6JUY3BTYP2G5VRPKB2UIXUJRSUW2TIJHD55',
    description: 'Token ERC-20 compatible con funciones de compliance',
    icon: Coins,
    features: [
      'SEP-41 Compliant (Standard Stellar)',
      'Control de acceso basado en roles',
      'Pausable en emergencias',
      'Cuentas congelables para compliance',
      'Tracking de request_id para auditoría',
    ],
    roles: ['OWNER', 'MINTER', 'PAUSER', 'BLACKLISTER', 'RESCUER'],
  },
  oracle: {
    name: 'Price Oracle',
    address: 'CAIVJPXLLIJVSSO67Z4V44B2JHYK323GWRG7OCA7IE7DL3IUZC6JL7Q7',
    description: 'Oráculo de precios USD/BOB desde exchanges P2P',
    icon: TrendingUp,
    features: [
      'Agregación multi-fuente (Binance, Bybit, Bitget)',
      'Detección de precios obsoletos (>5 min)',
      'Cálculo de spread bid/ask',
      'Sistema de operadores autorizados',
      'Actualización cada 60 segundos',
    ],
    sources: ['Binance P2P', 'Bybit P2P', 'Bitget P2P'],
  },
  treasury: {
    name: 'Treasury Multi-Sig',
    address: 'CAAXLHDBYDBQLSPBMW4OF42UGBGT6DU5HM2BWZXUVTAIQYPGU74PSJS5',
    description: 'Control multi-firma para operaciones mint/burn',
    icon: Vault,
    features: [
      'Multi-sig configurable',
      'Rate limiting diario',
      'Integración con Oracle',
      'Sistema de propuestas',
      'Conversión USDT → BOBT automática',
    ],
    flow: ['Propuesta', 'Aprobación', 'Ejecución'],
  },
}

const DEPLOYER = 'GAHDQEBNI2NISCTQEAGJAO57QZI75736S6XDDEQSIQKKCY4LQOHA3EGO'
const DEPLOYMENT_DATE = '16 Diciembre 2024'
const GITHUB_REPO = 'https://github.com/StableBOBT/bobt'

function shortenAddress(address: string) {
  return `${address.slice(0, 8)}...${address.slice(-8)}`
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleCopy} className="h-6 w-6 p-0">
      {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
    </Button>
  )
}

function ContractCard({
  contract,
}: {
  contract: (typeof CONTRACTS)[keyof typeof CONTRACTS]
}) {
  const Icon = contract.icon

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">{contract.name}</CardTitle>
            <CardDescription className="text-xs">{contract.description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Address */}
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Dirección del Contrato</p>
          <div className="flex items-center gap-2 bg-muted/50 rounded-md px-3 py-2">
            <code className="text-xs font-mono flex-1 truncate">{contract.address}</code>
            <CopyButton text={contract.address} />
            <a
              href={`https://stellar.expert/explorer/testnet/contract/${contract.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* Features */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Características</p>
          <ul className="space-y-1">
            {contract.features.map((feature, i) => (
              <li key={i} className="text-xs flex items-start gap-2">
                <Check className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Extra info based on contract type */}
        {'roles' in contract && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Roles de Acceso</p>
            <div className="flex flex-wrap gap-1">
              {contract.roles.map((role) => (
                <Badge key={role} variant="secondary" className="text-xs">
                  {role}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {'sources' in contract && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Fuentes de Precio</p>
            <div className="flex flex-wrap gap-1">
              {contract.sources.map((source) => (
                <Badge key={source} variant="outline" className="text-xs">
                  {source}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {'flow' in contract && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Flujo de Operación</p>
            <div className="flex items-center gap-2">
              {contract.flow.map((step, i) => (
                <div key={step} className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {i + 1}. {step}
                  </Badge>
                  {i < contract.flow.length - 1 && <span className="text-muted-foreground">→</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function ContractsInfo() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Smart Contracts</h2>
          <p className="text-muted-foreground">
            Contratos desplegados en Stellar Testnet
          </p>
        </div>
        <div className="flex gap-2">
          <a href={GITHUB_REPO} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">
              <Github className="h-4 w-4 mr-2" />
              Código Fuente
            </Button>
          </a>
          <a href={`${GITHUB_REPO}/blob/main/docs/CONTRACTS.md`} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-2" />
              Documentación
            </Button>
          </a>
        </div>
      </div>

      {/* Network Badge */}
      <div className="flex items-center gap-4">
        <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600">
          Stellar Testnet
        </Badge>
        <span className="text-sm text-muted-foreground">
          Desplegado: {DEPLOYMENT_DATE}
        </span>
      </div>

      {/* Contract Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ContractCard contract={CONTRACTS.token} />
        <ContractCard contract={CONTRACTS.oracle} />
        <ContractCard contract={CONTRACTS.treasury} />
      </div>

      {/* Security Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Modelo de Seguridad</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="deployer">
              <AccordionTrigger className="text-sm">Cuenta Deployer</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 bg-muted/50 rounded-md px-3 py-2">
                    <code className="text-xs font-mono flex-1">{DEPLOYER}</code>
                    <CopyButton text={DEPLOYER} />
                    <a
                      href={`https://stellar.expert/explorer/testnet/account/${DEPLOYER}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Esta cuenta tiene roles de OWNER, MINTER (testing), y Oracle Operator.
                    En producción, estos roles se distribuirán entre múltiples firmantes.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="roles">
              <AccordionTrigger className="text-sm">Jerarquía de Roles</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Badge>OWNER</Badge>
                    <span>→ Control total, puede asignar/revocar roles</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">MINTER</Badge>
                    <span>→ Puede mintear tokens (asignado a Treasury)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">PAUSER</Badge>
                    <span>→ Puede pausar contrato en emergencias</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">BLACKLISTER</Badge>
                    <span>→ Puede congelar cuentas para compliance</span>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="verification">
              <AccordionTrigger className="text-sm">Verificación de Contratos</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 text-xs">
                  <p>Para verificar que los contratos desplegados coinciden con el código fuente:</p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>Clonar repositorio: <code>git clone {GITHUB_REPO}</code></li>
                    <li>Compilar contratos: <code>stellar contract build</code></li>
                    <li>Comparar hashes WASM con los desplegados</li>
                  </ol>
                  <p className="text-muted-foreground mt-2">
                    Los hashes WASM están documentados en /docs/CONTRACTS.md
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  )
}
