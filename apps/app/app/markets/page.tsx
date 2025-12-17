import { StatsCards, PriceChart, PriceCard } from "@/components/dashboard"

export default function MarketsPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Mercados</h1>
        <p className="text-muted-foreground">
          Estadísticas en tiempo real del ecosistema BOBT
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCards />
      </div>

      {/* Price Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PriceChart />
        </div>
        <div>
          <PriceCard />
        </div>
      </div>

      {/* Market Info */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <h3 className="font-semibold">Oracle</h3>
          <p className="text-sm text-muted-foreground">
            El precio de BOBT se obtiene de un Oracle on-chain que agrega datos de múltiples
            exchanges P2P (Binance, Bybit, Bitget) para USDT/BOB.
          </p>
          <div className="text-xs text-muted-foreground">
            Actualización: cada 5 minutos
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 space-y-4">
          <h3 className="font-semibold">Paridad 1:1</h3>
          <p className="text-sm text-muted-foreground">
            BOBT mantiene paridad 1:1 con el Boliviano. Por cada BOBT en circulación,
            existe un BOB equivalente en las cuentas del Treasury.
          </p>
          <div className="text-xs text-muted-foreground">
            Respaldado 100% por reservas fiat
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 space-y-4">
          <h3 className="font-semibold">Treasury Multi-sig</h3>
          <p className="text-sm text-muted-foreground">
            Las operaciones de mint y burn requieren aprobación múltiple para
            garantizar la seguridad de los fondos.
          </p>
          <div className="text-xs text-muted-foreground">
            Contratos auditados en Soroban
          </div>
        </div>
      </div>
    </div>
  )
}
