import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useOrderDetail, useUpdateCopies } from '../../hooks/useOrders'
import OrderStatusBadge from '../../components/order/OrderStatusBadge'
import UrgencyBadge from '../../components/order/UrgencyBadge'
import StatusTimeline from '../../components/order/StatusTimeline'
import CountdownTimer from '../../components/order/CountdownTimer'
import Card from '../../components/ui/Card'
import Spinner from '../../components/ui/Spinner'
import ErrorState from '../../components/ui/ErrorState'
import Modal from '../../components/ui/Modal'
import { formatCurrency } from '../../utils/formatCurrency'
import { formatDate } from '../../utils/formatDate'

export default function OrderDetailPage() {
  const { orderId } = useParams()
  const { data: order, isLoading, isError, refetch } = useOrderDetail(orderId)
  const updateCopies = useUpdateCopies()
  const [editDocId, setEditDocId] = useState<string | null>(null)
  const [newCopies, setNewCopies] = useState(1)
  const [copyError, setCopyError] = useState('')

  if (isLoading) return <Spinner size="lg" className="mt-20" />
  if (isError) return <ErrorState message="Failed to load order" onRetry={() => refetch()} />
  if (!order) return <ErrorState message="Order not found" />

  const handleUpdateCopies = async () => {
    if (!editDocId) return
    setCopyError('')
    try {
      await updateCopies.mutateAsync({ orderId: orderId!, documentId: editDocId, copies: newCopies })
      setEditDocId(null)
      refetch()
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.message || 'Failed to update'
      setCopyError(msg)
    }
  }

  const isLockActive = order.lockExpiresAt && new Date(order.lockExpiresAt) > new Date()
  const canModifyCopies = !order.processingStartedAt || isLockActive

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{order.orderNumber}</h1>
          <div className="flex items-center gap-2 mt-1">
            <OrderStatusBadge status={order.status} />
            <UrgencyBadge urgency={order.urgency} />
          </div>
        </div>
      </div>

      <Card>
        <StatusTimeline currentStatus={order.status} />
      </Card>

      {order.lockExpiresAt && order.status === 'ACCEPTED' && (
        <Card className="bg-amber-50 border-amber-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-amber-800">
              {isLockActive ? 'You can modify copies for:' : 'Copy count is locked'}
            </span>
            <CountdownTimer expiresAt={order.lockExpiresAt} />
          </div>
        </Card>
      )}

      <Card>
        <h3 className="font-semibold text-sm mb-3">Documents</h3>
        <div className="space-y-3">
          {order.documents?.map((doc: any) => (
            <div key={doc.id} className="border rounded-lg p-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium">{doc.fileName}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {doc.copies} copy(ies) · {doc.printType} · {doc.sideType} · {doc.paperSize}
                    {doc.binding !== 'NONE' && ` · ${doc.binding}`}
                    {doc.lamination !== 'NONE' && ` · ${doc.lamination}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{formatCurrency(doc.subtotal)}</p>
                  {canModifyCopies && order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
                    <button
                      onClick={() => { setEditDocId(doc.id); setNewCopies(doc.copies); setCopyError('') }}
                      className="text-xs text-brand-blue hover:underline mt-1"
                    >
                      Change copies
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between items-center pt-3 mt-3 border-t">
          <span className="font-semibold">Total</span>
          <span className="text-lg font-bold text-brand-blue">{formatCurrency(order.totalAmount)}</span>
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold text-sm mb-2">Payment Status</h3>
        <span className={`badge ${order.paymentStatus === 'VERIFIED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
          {order.paymentStatus?.replace('_', ' ') || 'Pending'}
        </span>
      </Card>

      {order.delayReason && (
        <Card className="bg-red-50 border-red-200">
          <h3 className="font-semibold text-sm text-red-800">Delay Notice</h3>
          <p className="text-sm text-red-700 mt-1">{order.delayReason}</p>
          {order.delayUntil && (
            <p className="text-xs text-red-600 mt-1">Expected by: {formatDate(order.delayUntil)}</p>
          )}
        </Card>
      )}

      <Modal isOpen={!!editDocId} onClose={() => setEditDocId(null)} title="Change Copy Count">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Number of copies</label>
            <input
              type="number"
              min={1}
              max={999}
              value={newCopies}
              onChange={(e) => setNewCopies(parseInt(e.target.value) || 1)}
              className="input-field"
            />
          </div>
          {copyError && <p className="text-sm text-red-600">{copyError}</p>}
          <div className="flex gap-3">
            <button onClick={() => setEditDocId(null)} className="btn-ghost flex-1">Cancel</button>
            <button onClick={handleUpdateCopies} disabled={updateCopies.isPending} className="btn-primary flex-1">
              {updateCopies.isPending ? 'Updating...' : 'Update'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
