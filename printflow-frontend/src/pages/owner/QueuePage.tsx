import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOwnerQueue } from '../../hooks/useOwnerQueue'
import Spinner from '../../components/ui/Spinner'
import ErrorState from '../../components/ui/ErrorState'
import { formatCurrency } from '../../utils/formatCurrency'

const urgencyColors: Record<string, string> = {
  CRITICAL: 'bg-error-container text-on-error-container border-error',
  HIGH: 'bg-secondary-fixed text-on-secondary-fixed border-secondary-container',
  NORMAL: 'bg-surface-variant text-on-surface-variant border-outline-variant',
}

const topBorderUrgency: Record<string, string> = {
  CRITICAL: 'border-l-error',
  HIGH: 'border-l-secondary-container',
  NORMAL: 'border-l-primary',
}

const statusBadge: Record<string, string> = {
  PENDING: 'bg-surface-variant text-on-surface-variant',
  ACCEPTED: 'bg-primary-container text-primary',
  IN_PROGRESS: 'bg-secondary-fixed text-on-secondary-fixed',
  DELAYED: 'bg-error-container text-on-error-container',
  WAITING_CLARIFICATION: 'bg-tertiary-container text-on-tertiary-container',
  COMPLETED: 'bg-primary-fixed text-primary',
  CANCELLED: 'bg-surface-variant text-on-surface-variant',
}

export default function QueuePage() {
  const { data, isLoading, isError, refetch } = useOwnerQueue()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  if (isLoading) return <Spinner size="lg" className="mt-20" />
  if (isError) return <ErrorState message="Failed to load queue" onRetry={() => refetch()} />

  const orders = Array.isArray(data) ? data : (data as any)?.items || []
  const filtered = search
    ? orders.filter((o: any) =>
        o.orderNumber?.toLowerCase().includes(search.toLowerCase()) ||
        (o.customerName || '')?.toLowerCase().includes(search.toLowerCase())
      )
    : orders

  const criticalCount = orders.filter((o: any) => o.urgency === 'CRITICAL').length
  const highCount = orders.filter((o: any) => o.urgency === 'HIGH').length

  return (
    <div className="space-y-stack-lg">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-stack-md">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-primary">Priority Queue</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">{orders.length} active job{orders.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-stack-sm">
          {criticalCount > 0 && (
            <span className="bg-error-container text-on-error-container font-label-md text-label-md px-3 py-1 rounded-full flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-error"></span> {criticalCount} Critical
            </span>
          )}
          {highCount > 0 && (
            <span className="bg-secondary-fixed text-on-secondary-fixed font-label-md text-label-md px-3 py-1 rounded-full flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-secondary-container"></span> {highCount} High
            </span>
          )}
          <div className="relative">
            <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-4 py-1 border border-outline-variant rounded bg-surface focus:border-primary focus:ring-0 text-sm w-48 h-8 outline-none"
              placeholder="Search orders..."
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        <div className="lg:col-span-12 flex flex-col gap-stack-md">
          {filtered.length === 0 ? (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-xl text-center">
              <span className="material-symbols-outlined text-outline text-5xl mb-4">inbox</span>
              <p className="font-body-md text-body-md text-on-surface-variant">No orders in queue{search ? ' matching your search' : ''}.</p>
            </div>
          ) : (
            filtered.map((order: any) => (
              <div
                key={order.id}
                onClick={() => navigate(`/owner/orders/${order.id}`)}
                className={`bg-surface-container-lowest border-l-4 ${topBorderUrgency[order.urgency] || 'border-l-primary'} border-y border-r border-outline-variant rounded-r-lg p-stack-md hover:shadow-md transition-shadow cursor-pointer`}
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
                          <span className={`font-label-md text-[10px] px-2 py-0.5 rounded-full font-semibold ${urgencyColors[order.urgency] || 'bg-surface-variant text-on-surface-variant'}`}>
                            {order.urgency}
                          </span>
                        )}
                      </div>
                      <p className="font-body-sm text-body-sm text-on-surface-variant truncate">
                        {order.customerName || 'Customer'} &middot; {order.documentCount || 0} document{(order.documentCount || 0) !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-stack-lg shrink-0 ml-4">
                    <div className="hidden sm:block text-right">
                      <p className="font-body-md text-body-md font-bold text-primary">{formatCurrency(order.totalAmount)}</p>
                      <span className={`font-label-md text-[10px] px-2 py-0.5 rounded-full inline-block ${statusBadge[order.status] || 'bg-surface-variant text-on-surface-variant'}`}>
                        {order.status?.replace(/_/g, ' ') || 'PENDING'}
                      </span>
                    </div>
                    <button className="text-outline hover:text-primary transition-colors" onClick={(e) => { e.stopPropagation(); navigate(`/owner/orders/${order.id}`) }}>
                      <span className="material-symbols-outlined">chevron_right</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
