import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMyOrders } from '../../hooks/useOrders'
import OrderStatusBadge from '../../components/order/OrderStatusBadge'
import UrgencyBadge from '../../components/order/UrgencyBadge'
import Card from '../../components/ui/Card'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import ErrorState from '../../components/ui/ErrorState'
import { formatDate, formatShortDate } from '../../utils/formatDate'
import { formatCurrency } from '../../utils/formatCurrency'

const TABS = ['All', 'PENDING', 'IN_PROGRESS', 'COMPLETED']

export default function OrderListPage() {
  const [activeTab, setActiveTab] = useState('All')
  const { data, isLoading, isError, refetch } = useMyOrders()
  const navigate = useNavigate()

  if (isLoading) return <Spinner size="lg" className="mt-20" />
  if (isError) return <ErrorState message="Failed to load orders" onRetry={() => refetch()} />

  const orders = data?.items || []
  const filtered = activeTab === 'All' ? orders : orders.filter((o) => o.status === activeTab)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">My Orders</h1>
        <button onClick={() => navigate('/orders/new')} className="btn-primary text-sm">
          + New Order
        </button>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors
              ${activeTab === tab ? 'bg-brand-blue text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {tab === 'All' ? 'All' : tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No orders found"
          description={activeTab === 'All' ? 'Place your first print order' : `No ${activeTab.toLowerCase()} orders`}
          action={{ label: 'Place Order', onClick: () => navigate('/orders/new') }}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <Card key={order.id} onClick={() => navigate(`/orders/${order.id}`)}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">{order.orderNumber}</span>
                    <OrderStatusBadge status={order.status} />
                    <UrgencyBadge urgency={order.urgency} />
                  </div>
                  <p className="text-xs text-gray-500">
                    {order.documentCount} document(s) · {formatCurrency(order.totalAmount)} · {formatShortDate(order.createdAt)}
                  </p>
                </div>
                <svg className="w-5 h-5 text-gray-300 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
