import { useDashboard } from '../../hooks/useOwnerQueue'
import Card from '../../components/ui/Card'
import Spinner from '../../components/ui/Spinner'
import ErrorState from '../../components/ui/ErrorState'
import { formatCurrency } from '../../utils/formatCurrency'

export default function DashboardPage() {
  const { data: stats, isLoading, isError, refetch } = useDashboard()

  if (isLoading) return <Spinner size="lg" className="mt-20" />
  if (isError) return <ErrorState message="Failed to load dashboard" onRetry={() => refetch()} />

  const cards = [
    { label: 'Pending Orders', value: stats?.pendingOrders ?? 0, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { label: 'Urgent Orders', value: stats?.urgentOrders ?? 0, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Completed Today', value: stats?.completedToday ?? 0, color: 'text-green-600', bg: 'bg-green-50' },
    { label: "Today's Revenue", value: formatCurrency(stats?.revenueToday ?? 0), color: 'text-brand-blue', bg: 'bg-blue-50' },
  ]

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map((card) => (
          <Card key={card.label}>
            <p className="text-xs text-gray-500 mb-1">{card.label}</p>
            <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="font-semibold text-sm mb-3">Quick Links</h3>
          <div className="space-y-2">
            <a href="/owner/queue" className="block text-sm text-brand-blue hover:underline">View Order Queue →</a>
            <a href="/owner/closure" className="block text-sm text-brand-blue hover:underline">Manage Shop Closure →</a>
            <a href="/owner/settings" className="block text-sm text-brand-blue hover:underline">Update Prices →</a>
          </div>
        </Card>
        {stats && stats.delayedOrders > 0 && (
          <Card className="bg-red-50 border-red-200">
            <h3 className="font-semibold text-sm text-red-800 mb-1">Attention Needed</h3>
            <p className="text-sm text-red-700">{stats.delayedOrders} delayed order(s) need attention</p>
            <a href="/owner/queue?status=DELAYED" className="text-sm text-red-600 hover:underline mt-2 block">View Delayed →</a>
          </Card>
        )}
      </div>
    </div>
  )
}
