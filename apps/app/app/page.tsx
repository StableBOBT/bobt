import {
  PriceCard,
  BalanceCard,
  StatsCards,
  PriceChart,
  TradeWidget,
  RecentTransactions,
} from "@/components/dashboard"

export default function DashboardPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCards />
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Price and Chart Section */}
        <div className="lg:col-span-2 space-y-6">
          <PriceCard />
          <PriceChart />
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          <BalanceCard />
          <TradeWidget />
        </div>
      </div>

      {/* Transactions Table */}
      <RecentTransactions />
    </div>
  )
}
