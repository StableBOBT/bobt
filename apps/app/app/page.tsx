import {
  BalanceCard,
  BoliviaRamp,
  RecentTransactions,
  PriceCard,
  TreasuryStatus,
} from "@/components/dashboard"

export default function DashboardPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Dashboard BOBT</h1>
        <p className="text-muted-foreground">
          Stablecoin Boliviano 1:1 con BOB - Deposita Bolivianos, recibe BOBT
        </p>
      </div>

      {/* Main Action: BOB → BOBT */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Bolivia Ramp - Main Action */}
        <BoliviaRamp />

        {/* Right: Balance, Price, Treasury */}
        <div className="space-y-6">
          <BalanceCard />
          <PriceCard />
          <TreasuryStatus />
        </div>
      </div>

      {/* Recent Activity */}
      <RecentTransactions />
    </div>
  )
}
