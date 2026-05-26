import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMyOrders } from '../../hooks/useOrders'
import OrderStatusBadge from '../../components/order/OrderStatusBadge'
import Card from '../../components/ui/Card'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import ErrorState from '../../components/ui/ErrorState'
import { formatShortDate } from '../../utils/formatDate'
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
      <div className="flex items-center justify-between mb-stack-lg">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-primary">My Orders</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">Track and manage your print orders</p>
        </div>
        <button onClick={() => navigate('/orders/new')} className="btn-primary">
          <span className="material-symbols-outlined text-[18px]">add</span>
          New Order
        </button>
      </div>

      <div className="flex gap-2 mb-stack-lg overflow-x-auto border-b border-outline-variant">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-stack-sm font-label-md text-label-md border-b-2 transition-colors whitespace-nowrap px-1 uppercase ${
              activeTab === tab
                ? 'border-secondary-container text-primary'
                : 'border-transparent text-on-surface-variant hover:text-primary'
            }`}
          >
            {tab === 'All' ? 'All' : tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No orders found"
          description={activeTab === 'All' ? 'Place your first print order to get started' : `No ${activeTab.toLowerCase().replace('_', ' ')} orders`}
          icon="receipt_long"
          action={
            <button onClick={() => navigate('/orders/new')} className="btn-primary">
              <span className="material-symbols-outlined text-[18px]">add</span>
              Place Order
            </button>
          }
        />
      ) : (
        <div className="space-y-stack-md">
          {filtered.map((order) => (
            <Card key={order.id} onClick={() => navigate(`/orders/${order.id}`)} hover>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-stack-md">
                  <div className="w-10 h-10 rounded bg-primary-fixed flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary">description</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-body-md text-body-md font-semibold text-on-surface">{order.orderNumber}</span>
                      <OrderStatusBadge status={order.status} />
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      {order.documentCount} document(s) &middot; {formatCurrency(order.totalAmount)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-label-md text-label-md text-on-surface-variant">{formatShortDate(order.createdAt)}</p>
                  <span className="material-symbols-outlined text-outline mt-1">chevron_right</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
