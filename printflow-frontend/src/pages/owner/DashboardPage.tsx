import { useNavigate } from 'react-router-dom'
import { useDashboard, useOwnerQueue } from '../../hooks/useOwnerQueue'
import Card from '../../components/ui/Card'
import Spinner from '../../components/ui/Spinner'
import ErrorState from '../../components/ui/ErrorState'
import { formatCurrency } from '../../utils/formatCurrency'

const urgencyStyles: Record<string, string> = {
  CRITICAL: 'border-l-error bg-error-container/10',
  HIGH: 'border-l-secondary-container',
  NORMAL: 'border-l-primary',
}

const statusStyles: Record<string, string> = {
  PENDING: 'bg-surface-variant text-on-surface-variant',
  ACCEPTED: 'bg-primary-container text-primary',
  IN_PROGRESS: 'bg-secondary-fixed text-on-secondary-fixed',
  DELAYED: 'bg-error-container text-on-error-container',
  WAITING_CLARIFICATION: 'bg-tertiary-container text-on-tertiary-container',
  COMPLETED: 'bg-primary-fixed text-primary',
  CANCELLED: 'bg-surface-variant text-on-surface-variant',
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { data: stats, isLoading, isError, refetch } = useDashboard()
  const { data: queueData } = useOwnerQueue()

  if (isLoading) return <Spinner size="lg" className="mt-20" />
  if (isError) return <ErrorState message="Failed to load dashboard" onRetry={() => refetch()} />

  const metrics = [
    {
      label: 'Total Pending',
      value: stats?.pendingOrders ?? 0,
      icon: 'hourglass_empty',
      trend: 'Active orders awaiting processing',
      iconColor: 'text-primary',
    },
    {
      label: 'Urgent Jobs',
      value: stats?.urgentOrders ?? 0,
      icon: 'warning',
      iconColor: 'text-error',
      bgClass: 'bg-error-container border-error/20',
      note: 'Requires immediate attention',
      noteClass: 'text-on-error-container font-semibold',
    },
    {
      label: "Today's Revenue",
      value: formatCurrency(stats?.revenueToday ?? 0),
      icon: 'attach_money',
      iconColor: 'text-primary',
      note: `${stats?.completedToday ?? 0} completed orders`,
    },
    {
      label: 'Delayed Orders',
      value: stats?.delayedOrders ?? 0,
      icon: 'schedule',
      iconColor: 'text-on-surface-variant',
      note: 'Waiting on customer or resources',
    },
  ]

  const allOrders = Array.isArray(queueData) ? queueData : (queueData as any)?.items || []
  const topUrgent = allOrders.slice(0, 3)

  return (
    <div className="space-y-stack-lg">
      <div>
        <h2 className="font-headline-lg text-headline-lg text-primary">Dashboard</h2>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1">Manage current print queues and shop status.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map((m, i) => (
          <div key={i} className={`${m.bgClass || 'bg-surface-container-lowest border border-outline-variant'} rounded-xl p-4 card-shadow relative overflow-hidden group`}>
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <span className={`material-symbols-outlined text-[64px] ${m.iconColor}`}>{m.icon}</span>
            </div>
            <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-2">{m.label}</p>
            <p className="font-display text-display text-primary">{m.value}</p>
            {m.trend && (
              <p className="font-body-sm text-body-sm text-secondary-container mt-2 flex items-center gap-1">{m.trend}</p>
            )}
            {m.note && (
              <p className={`font-body-sm text-body-sm mt-2 flex items-center gap-1 ${m.noteClass || 'text-on-surface-variant'}`}>{m.note}</p>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        <div className="lg:col-span-8 space-y-4">
          <div className="flex justify-between items-center border-b border-outline-variant pb-2">
            <h3 className="font-headline-md text-headline-md text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary-container">dynamic_feed</span>
              Smart Queue
            </h3>
            <button onClick={() => navigate('/owner/queue')} className="text-primary font-label-md text-label-md hover:underline">
              View All
            </button>
          </div>

          {topUrgent.length === 0 ? (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-xl text-center">
              <span className="material-symbols-outlined text-outline text-4xl mb-2">check_circle</span>
              <p className="font-body-md text-body-md text-on-surface-variant">All caught up! No pending orders in queue.</p>
            </div>
          ) : (
            topUrgent.map((order: any) => (
              <div
                key={order.id}
                onClick={() => navigate(`/owner/orders/${order.id}`)}
                className={`bg-surface-container-lowest border-l-4 ${urgencyStyles[order.urgency] || 'border-l-primary'} border-y border-r border-outline-variant rounded-r-lg p-stack-md hover:shadow-md transition-shadow cursor-pointer`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-stack-md flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded flex items-center justify-center shrink-0 ${
                      order.urgency === 'CRITICAL' ? 'bg-error-container' : order.urgency === 'HIGH' ? 'bg-secondary-fixed' : 'bg-primary-container'
                    }`}>
                      <span className={`material-symbols-outlined ${
                        order.urgency === 'CRITICAL' ? 'text-error' : order.urgency === 'HIGH' ? 'text-secondary-container' : 'text-primary'
                      }`}>
                        {order.urgency === 'CRITICAL' ? 'priority_high' : 'description'}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-body-md text-body-md font-semibold text-on-surface truncate">#{order.orderNumber}</h4>
                        {order.urgency && (
                          <span className={`font-label-md text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            order.urgency === 'CRITICAL' ? 'bg-error-container text-on-error-container' :
                            order.urgency === 'HIGH' ? 'bg-secondary-fixed text-on-secondary-fixed' : 'bg-surface-variant text-on-surface-variant'
                          }`}>{order.urgency}</span>
                        )}
                      </div>
                      <p className="font-body-sm text-body-sm text-on-surface-variant truncate">
                        {order.customerName || 'Customer'} &middot; {order.documentCount || 0} document{(order.documentCount || 0) !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-stack-lg shrink-0 ml-4">
                    <p className="font-body-md text-body-md font-bold text-primary">{formatCurrency(order.totalAmount)}</p>
                    <span className="font-label-md text-[10px] px-2 py-0.5 rounded-full bg-surface-variant text-on-surface-variant">
                      {order.status?.replace(/_/g, ' ') || 'PENDING'}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="lg:col-span-4 space-y-6">
          <Card>
            <h3 className="font-body-lg text-body-lg font-semibold text-primary mb-4 flex items-center gap-2 border-b border-outline-variant pb-2">
              <span className="material-symbols-outlined">groups</span>
              Customers
            </h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-4">Track all customers who have placed orders at your shop.</p>
            <button onClick={() => navigate('/owner/customers')} className="w-full py-2 text-primary font-label-md text-label-md hover:bg-primary/5 rounded transition-colors text-center border border-outline-variant rounded-lg">
              View All Customers
            </button>
          </Card>

          <Card>
            <h3 className="font-body-lg text-body-lg font-semibold text-primary mb-4 border-b border-outline-variant pb-2">Machine Status</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-body-sm text-body-sm font-semibold text-on-surface">Printer A (Color)</span>
                  <span className="font-label-md text-label-md text-primary">75%</span>
                </div>
                <div className="w-full bg-surface-variant rounded-full h-2 overflow-hidden">
                  <div className="bg-primary h-2 rounded-full" style={{ width: '75%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-body-sm text-body-sm font-semibold text-on-surface">Printer B (B&amp;W)</span>
                  <span className="font-label-md text-label-md text-secondary-container">Idle</span>
                </div>
                <div className="w-full bg-surface-variant rounded-full h-2"></div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
