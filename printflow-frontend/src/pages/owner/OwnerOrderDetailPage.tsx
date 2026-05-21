import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getOwnerOrder } from '../../services/owner.service'
import { updateOrderStatus, getOrderById } from '../../services/orders.service'
import { verifyPayment } from '../../services/payments.service'
import OrderStatusBadge from '../../components/order/OrderStatusBadge'
import UrgencyBadge from '../../components/order/UrgencyBadge'
import Card from '../../components/ui/Card'
import Spinner from '../../components/ui/Spinner'
import ErrorState from '../../components/ui/ErrorState'
import Modal from '../../components/ui/Modal'
import { formatCurrency } from '../../utils/formatCurrency'
import { formatDate } from '../../utils/formatDate'

export default function OwnerOrderDetailPage() {
  const { orderId } = useParams()
  const queryClient = useQueryClient()
  const [actionLoading, setActionLoading] = useState('')
  const [delayModal, setDelayModal] = useState(false)
  const [cancelModal, setCancelModal] = useState(false)
  const [clarifyModal, setClarifyModal] = useState(false)
  const [delayReason, setDelayReason] = useState('')
  const [delayUntil, setDelayUntil] = useState('')
  const [cancelReason, setCancelReason] = useState('')
  const [clarifyMsg, setClarifyMsg] = useState('')

  const { data: order, isLoading, isError, refetch } = useQuery({
    queryKey: ['owner-order', orderId],
    queryFn: () => getOwnerOrder(orderId!),
    enabled: !!orderId,
    refetchInterval: 15_000,
  })

  const handleAction = async (status: string, extra?: any) => {
    setActionLoading(status)
    try {
      await updateOrderStatus(orderId!, status, extra?.note, extra?.delayReason, extra?.delayUntil)
      queryClient.invalidateQueries({ queryKey: ['owner-order'] })
      queryClient.invalidateQueries({ queryKey: ['owner-queue'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      refetch()
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Action failed')
    } finally {
      setActionLoading('')
    }
  }

  const handleVerifyPayment = async () => {
    if (!order?.payment?.id) return
    setActionLoading('verify')
    try {
      await verifyPayment(order.payment.id, 'VERIFIED', 'Payment confirmed')
      refetch()
    } catch (err: any) {
      alert(err.message || 'Verification failed')
    } finally {
      setActionLoading('')
    }
  }

  const handleDelay = async () => {
    await handleAction('DELAYED', { delayReason, delayUntil: delayUntil ? new Date(delayUntil).toISOString() : undefined })
    setDelayModal(false)
  }

  const handleCancel = async () => {
    await handleAction('CANCELLED', { note: cancelReason })
    setCancelModal(false)
  }

  if (isLoading) return <Spinner size="lg" className="mt-20" />
  if (isError) return <ErrorState message="Failed to load order" onRetry={() => refetch()} />
  if (!order) return <ErrorState message="Order not found" />

  const status = order.status || order.status

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{order.orderNumber}</h1>
          <div className="flex items-center gap-2 mt-1">
            <OrderStatusBadge status={status} />
            <UrgencyBadge urgency={order.urgency} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <h3 className="font-semibold text-sm mb-3">Customer</h3>
            <p className="text-sm">{order.customer?.name || 'Unknown'}</p>
            {order.customer?.phone && (
              <a href={`tel:${order.customer.phone}`} className="text-sm text-brand-blue hover:underline">
                {order.customer.phone}
              </a>
            )}
          </Card>

          <Card>
            <h3 className="font-semibold text-sm mb-3">Documents</h3>
            <div className="space-y-2">
              {(order.documents || []).map((doc: any, i: number) => (
                <div key={i} className="border rounded-lg p-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium">{doc.fileName}</p>
                      <p className="text-xs text-gray-500">
                        {doc.copies} copy(ies) · {doc.printType} · {doc.sideType} · {doc.paperSize}
                        {doc.binding !== 'NONE' && ` · ${doc.binding}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatCurrency(doc.subtotal)}</p>
                      <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-brand-blue hover:underline">Download</a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between pt-3 mt-3 border-t">
              <span className="font-semibold">Total</span>
              <span className="font-bold text-brand-blue">{formatCurrency(order.totalAmount)}</span>
            </div>
          </Card>

          {order.payment?.proofUrl && (
            <Card>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm">Payment Proof</h3>
                <span className={`badge ${order.paymentStatus === 'VERIFIED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  {order.paymentStatus?.replace('_', ' ') || 'Pending'}
                </span>
              </div>
              <a href={order.payment.proofUrl} target="_blank" rel="noopener noreferrer">
                <img src={order.payment.proofUrl} alt="Payment proof" className="max-h-48 rounded-lg border cursor-pointer hover:opacity-80" />
              </a>
              {order.paymentStatus === 'PROOF_UPLOADED' && (
                <button onClick={handleVerifyPayment} disabled={actionLoading === 'verify'}
                  className="btn-primary mt-3 text-sm w-full">
                  {actionLoading === 'verify' ? 'Verifying...' : 'Verify Payment'}
                </button>
              )}
            </Card>
          )}

          {order.description && (
            <Card>
              <h3 className="font-semibold text-sm mb-1">Customer Notes</h3>
              <p className="text-sm text-gray-600">{order.description}</p>
            </Card>
          )}
        </div>

        <div className="space-y-3">
          <Card className="sticky top-4">
            <h3 className="font-semibold text-sm mb-3">Actions</h3>
            <div className="space-y-2">
              {status === 'PENDING' && (
                <>
                  <button onClick={() => handleAction('ACCEPTED')} disabled={!!actionLoading}
                    className="w-full btn-primary text-sm">Accept Order</button>
                  <button onClick={() => setCancelModal(true)} disabled={!!actionLoading}
                    className="w-full btn-danger text-sm">Cancel Order</button>
                </>
              )}
              {status === 'ACCEPTED' && (
                <>
                  <button onClick={() => handleAction('IN_PROGRESS')} disabled={!!actionLoading}
                    className="w-full btn-primary text-sm">Start Processing</button>
                  <button onClick={() => setDelayModal(true)} disabled={!!actionLoading}
                    className="w-full btn-ghost text-sm">Mark Delayed</button>
                  <button onClick={() => setClarifyModal(true)} disabled={!!actionLoading}
                    className="w-full btn-ghost text-sm">Request Clarification</button>
                  <button onClick={() => setCancelModal(true)} disabled={!!actionLoading}
                    className="w-full btn-danger text-sm">Cancel</button>
                </>
              )}
              {status === 'IN_PROGRESS' && (
                <>
                  <button onClick={() => handleAction('COMPLETED')} disabled={!!actionLoading}
                    className="w-full btn-primary text-sm">Mark Completed</button>
                  <button onClick={() => setDelayModal(true)} disabled={!!actionLoading}
                    className="w-full btn-ghost text-sm">Mark Delayed</button>
                </>
              )}
              {status === 'DELAYED' && (
                <button onClick={() => handleAction('IN_PROGRESS')} disabled={!!actionLoading}
                  className="w-full btn-primary text-sm">Resume Processing</button>
              )}
              {status === 'WAITING_CLARIFICATION' && (
                <button onClick={() => handleAction('ACCEPTED')} disabled={!!actionLoading}
                  className="w-full btn-primary text-sm">Resolve (Back to Accepted)</button>
              )}
            </div>
          </Card>
        </div>
      </div>

      <Modal isOpen={delayModal} onClose={() => setDelayModal(false)} title="Mark Order as Delayed">
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-600">Reason for delay</label>
            <textarea value={delayReason} onChange={(e) => setDelayReason(e.target.value)}
              className="input-field mt-1" rows={3} placeholder="e.g., Paper jam, machine maintenance" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Expected ready by</label>
            <input type="datetime-local" value={delayUntil} onChange={(e) => setDelayUntil(e.target.value)}
              className="input-field mt-1" />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setDelayModal(false)} className="btn-ghost flex-1">Cancel</button>
            <button onClick={handleDelay} disabled={!delayReason} className="btn-primary flex-1">Confirm Delay</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={cancelModal} onClose={() => setCancelModal(false)} title="Cancel Order">
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-600">Reason for cancellation</label>
            <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}
              className="input-field mt-1" rows={3} placeholder="Required" />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setCancelModal(false)} className="btn-ghost flex-1">Keep Order</button>
            <button onClick={handleCancel} disabled={!cancelReason} className="btn-danger flex-1">Cancel Order</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={clarifyModal} onClose={() => setClarifyModal(false)} title="Request Clarification">
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-600">Your question to customer</label>
            <textarea value={clarifyMsg} onChange={(e) => setClarifyMsg(e.target.value)}
              className="input-field mt-1" rows={3} placeholder="e.g., Should I use color for the cover page?" />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setClarifyModal(false)} className="btn-ghost flex-1">Cancel</button>
            <button
              onClick={async () => {
                await handleAction('WAITING_CLARIFICATION', { note: clarifyMsg })
                setClarifyModal(false)
              }}
              disabled={!clarifyMsg} className="btn-primary flex-1">Send</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
