import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOwnerQueue } from '../../hooks/useOwnerQueue'
import OrderStatusBadge from '../../components/order/OrderStatusBadge'
import UrgencyBadge from '../../components/order/UrgencyBadge'
import Card from '../../components/ui/Card'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import ErrorState from '../../components/ui/ErrorState'
import { formatCurrency } from '../../utils/formatCurrency'
import { formatRelative } from '../../utils/formatDate'

const TABS = ['Active', 'PENDING', 'IN_PROGRESS', 'DELAYED', 'COMPLETED']

export default function QueuePage() {
  const [activeTab, setActiveTab] = useState('Active')
  const navigate = useNavigate()

  const statusParam = activeTab === 'Active'
    ? 'PENDING,ACCEPTED,IN_PROGRESS,DELAYED,WAITING_CLARIFICATION'
    : activeTab

  const { data: orders, isLoading, isError, refetch } = useOwnerQueue(statusParam)

  if (isLoading) return <Spinner size="lg" className="mt-20" />
  if (isError) return <ErrorState message="Failed to load queue" onRetry={() => refetch()} />

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">Order Queue</h1>

      <div className="flex gap-2 mb-4 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors
              ${activeTab === tab ? 'bg-brand-blue text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {tab === 'Active' ? 'Active' : tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      {(!orders || orders.length === 0) ? (
        <EmptyState title="No orders in queue" description="New orders will appear here" />
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Card key={order.id} onClick={() => navigate(`/owner/orders/${order.id}`)}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">{order.orderNumber}</span>
                    <OrderStatusBadge status={order.status} />
                    <UrgencyBadge urgency={order.urgency} />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>{order.documentCount} doc(s)</span>
                    <span>{formatCurrency(order.totalAmount)}</span>
                    {order.expectedDelivery && <span>Due {formatRelative(order.expectedDelivery)}</span>}
                  </div>
                </div>
                <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
