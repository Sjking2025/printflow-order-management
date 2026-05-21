import { useDashboard } from '../../hooks/useOwnerQueue'
import Card from '../../components/ui/Card'
import Spinner from '../../components/ui/Spinner'
import ErrorState from '../../components/ui/ErrorState'
import { formatCurrency } from '../../utils/formatCurrency'

export default function DashboardPage() {
  const { data: stats, isLoading, isError, refetch } = useDashboard()

  if (isLoading) return <Spinner size="lg" className="mt-20" />
  if (isError) return <ErrorState message="Failed to load dashboard" onRetry={() => refetch()} />

  const metrics = [
    {
      label: 'Total Pending',
      value: stats?.pendingOrders ?? 0,
      icon: 'hourglass_empty',
      trend: '12% vs last hour',
      trendIcon: 'arrow_upward',
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
      note: 'Waiting on customer',
    },
  ]

  return (
    <div className="space-y-stack-lg">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-primary">Dashboard</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">Manage current print queues and shop status.</p>
        </div>
        <div className="flex items-center gap-4 bg-surface-container-low p-2 rounded-lg border border-outline-variant">
          <span className="font-body-sm text-body-sm font-semibold text-on-surface">Shop Status:</span>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-secondary-container animate-pulse"></span>
            <span className="font-label-md text-label-md text-secondary">Accepting Orders</span>
          </div>
          <div className="h-6 w-px bg-outline-variant mx-2"></div>
          <button className="flex items-center gap-1 text-on-surface-variant hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-[18px]">pause_circle</span>
            <span className="font-body-sm text-body-sm">Delay (Break)</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map((m, i) => (
          <div
            key={i}
            className={`${m.bgClass || 'bg-surface-container-lowest border border-outline-variant'} rounded-xl p-4 card-shadow relative overflow-hidden group`}
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <span className={`material-symbols-outlined text-[64px] ${m.iconColor}`}>{m.icon}</span>
            </div>
            <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-2">{m.label}</p>
            <p className="font-display text-display text-primary">{m.value}</p>
            {m.trend && (
              <p className="font-body-sm text-body-sm text-secondary-container mt-2 flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">{m.trendIcon}</span> {m.trend}
              </p>
            )}
            {m.note && (
              <p className={`font-body-sm text-body-sm mt-2 flex items-center gap-1 ${m.noteClass || 'text-on-surface-variant'}`}>
                {m.note}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        <div className="lg:col-span-8 space-y-4">
          <div className="flex justify-between items-center mb-2 border-b border-outline-variant pb-2">
            <h3 className="font-headline-md text-headline-md text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary-container">dynamic_feed</span>
              Smart Queue
            </h3>
            <div className="flex gap-2">
              <span className="bg-surface-variant text-on-surface-variant px-3 py-1 rounded-full font-label-md text-label-md flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-error"></span> Urgent First
              </span>
            </div>
          </div>

          <div className="bg-surface-container-lowest border-l-4 border-l-error border-y border-r border-outline-variant rounded-r-lg p-6 card-shadow hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="flex gap-4 items-start">
                <div className="w-12 h-12 bg-error-container rounded-full flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-error">priority_high</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-headline-md text-[20px] font-semibold text-on-surface">ORD-8902</h4>
                    <span className="bg-error/10 text-error px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide">Due in 15m</span>
                  </div>
                  <p className="font-body-md text-body-md text-on-surface-variant mt-1">Elena Rodriguez &middot; 2 Documents</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-headline-md text-headline-md text-primary">$14.50</p>
                <p className="font-label-md text-label-md text-on-surface-variant mt-1">Paid</p>
              </div>
            </div>
            <div className="bg-surface-container-low p-4 rounded-lg mb-4 flex gap-6 border border-outline-variant">
              <div>
                <p className="font-label-md text-label-md text-on-surface-variant mb-1">SPECIFICATIONS</p>
                <p className="font-body-md text-body-md font-medium text-on-surface">15 Copies &middot; A3 &middot; Color &middot; Single Sided</p>
              </div>
              <div className="w-px bg-outline-variant"></div>
              <div>
                <p className="font-label-md text-label-md text-on-surface-variant mb-1">PAPER TYPE</p>
                <p className="font-body-md text-body-md font-medium text-on-surface">Glossy 120gsm</p>
              </div>
            </div>
            <div className="flex justify-between items-center border-t border-outline-variant pt-4">
              <div className="flex items-center gap-2 text-on-surface-variant">
                <span className="material-symbols-outlined text-[18px]">lock_clock</span>
                <span className="font-body-sm text-body-sm">Changes locked in: <span className="font-mono font-bold text-error">03:45</span></span>
              </div>
              <div className="flex gap-3">
                <button className="btn-outline">Reject</button>
                <button className="btn-primary">Accept &amp; Print</button>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-lowest border-l-4 border-l-primary border-y border-r border-outline-variant rounded-r-lg p-6 card-shadow hover:shadow-md transition-shadow opacity-90">
            <div className="flex justify-between items-start mb-4">
              <div className="flex gap-4 items-start">
                <div className="w-12 h-12 bg-primary-container rounded-full flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-on-primary-container">description</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-headline-md text-[20px] font-semibold text-on-surface">ORD-8903</h4>
                    <span className="bg-surface-variant text-on-surface-variant px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide">Due in 2h</span>
                  </div>
                  <p className="font-body-md text-body-md text-on-surface-variant mt-1">Marcus Johnson &middot; 1 Document</p>
                </div>
              </div>
            </div>
            <div className="bg-surface-container-low p-4 rounded-lg mb-4 flex gap-6 border border-outline-variant">
              <div>
                <p className="font-label-md text-label-md text-on-surface-variant mb-1">SPECIFICATIONS</p>
                <p className="font-body-md text-body-md font-medium text-on-surface">50 Copies &middot; A4 &middot; B&amp;W &middot; Double Sided</p>
              </div>
            </div>
            <div className="flex justify-between items-center border-t border-outline-variant pt-4">
              <div className="flex items-center gap-2 text-on-surface-variant">
                <span className="material-symbols-outlined text-[18px]">lock</span>
                <span className="font-body-sm text-body-sm">Locked</span>
              </div>
              <div className="flex gap-3">
                <button className="btn-ghost">Clarify</button>
                <button className="btn-outline">Mark In Progress</button>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <Card>
            <h3 className="font-body-lg text-body-lg font-semibold text-primary mb-4 flex items-center gap-2 border-b border-outline-variant pb-2">
              <span className="material-symbols-outlined">groups</span>
              Client Batches
            </h3>
            <div className="space-y-3">
              {[
                { initials: 'SJ', name: 'Sarah Jenkins', batch: 'Arch. Portfolio Batch', count: '3' },
                { initials: 'DP', name: 'David Park', batch: '2 Orders • Pending' },
              ].map((client, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-container-low transition-colors cursor-pointer border border-transparent hover:border-outline-variant">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center font-bold text-primary">{client.initials}</div>
                      {client.count && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-secondary-container rounded-full flex items-center justify-center text-[10px] text-white font-bold border border-white">{client.count}</div>
                      )}
                    </div>
                    <div>
                      <p className="font-body-sm text-body-sm font-semibold text-on-surface">{client.name}</p>
                      <p className="font-label-md text-label-md text-on-surface-variant">{client.batch}</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant text-[20px]">chevron_right</span>
                </div>
              ))}
            </div>
            <button className="w-full mt-4 py-2 text-primary font-label-md text-label-md hover:bg-primary/5 rounded transition-colors text-center">
              View All Batches
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
                <p className="font-label-md text-[10px] text-on-surface-variant mt-1">Printing ORD-8899...</p>
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
