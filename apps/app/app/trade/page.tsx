import { BoliviaRamp, PriceCard, SendReceive } from "@/components/dashboard"

export default function TradePage() {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Compra/Venta Bolivia</h1>
        <p className="text-muted-foreground">
          Compra BOBT con transferencia bancaria directa o vende BOBT y recibe Bolivianos en tu cuenta.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Bolivia Ramp - Main */}
        <BoliviaRamp />

        {/* Right Column */}
        <div className="space-y-6">
          {/* Send/Receive */}
          <SendReceive />

          {/* Price Info */}
          <PriceCard />

          {/* Info Card */}
          <div className="rounded-xl border bg-card p-6 space-y-4">
            <h3 className="font-semibold">Como funciona</h3>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">1</div>
                <p>Conecta tu wallet Stellar (Freighter, xBull, etc.)</p>
              </div>
              <div className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">2</div>
                <p>Ingresa el monto en Bolivianos que deseas convertir</p>
              </div>
              <div className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">3</div>
                <p>Realiza la transferencia bancaria con la referencia indicada</p>
              </div>
              <div className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">4</div>
                <p>Recibe BOBT directamente en tu wallet (1:1 con BOB)</p>
              </div>
            </div>
          </div>

          {/* Fees Info */}
          <div className="rounded-xl border bg-card p-6 space-y-3">
            <h3 className="font-semibold">Comisiones</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Compra (On-Ramp)</span>
                <span className="font-mono">0.5%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Venta (Off-Ramp)</span>
                <span className="font-mono">0.5%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mint/Burn directo</span>
                <span className="font-mono text-green-500">0%</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground pt-2 border-t">
              Las comisiones cubren los costos operativos de las transferencias bancarias.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
