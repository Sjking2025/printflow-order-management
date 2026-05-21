import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getOwnerOrder } from '../../services/owner.service'
import { updateOrderStatus } from '../../services/orders.service'
import { verifyPayment } from '../../services/payments.service'
import OrderStatusBadge from '../../components/order/OrderStatusBadge'
import Card from '../../components/ui/Card'
import Spinner from '../../components/ui/Spinner'
import ErrorState from '../../components/ui/ErrorState'
import Modal from '../../components/ui/Modal'
import ClarificationDrawer from '../../components/clarifications/ClarificationDrawer'
import StatusTimeline from '../../components/order/StatusTimeline'
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
    <div className="space-y-stack-lg">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-primary">{order.orderNumber}</h1>
          <div className="flex items-center gap-2 mt-1">
            <OrderStatusBadge status={status} />
            {order.urgency && (
              <span className={`font-label-md text-label-md px-2 py-0.5 rounded-full ${
                order.urgency === 'CRITICAL' ? 'bg-error-container text-on-error-container' :
                order.urgency === 'HIGH' ? 'bg-secondary-fixed text-on-secondary-fixed' :
                'bg-surface-variant text-on-surface-variant'
              }`}>{order.urgency}</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        <div className="lg:col-span-8 space-y-stack-md">
          <Card>
            <h3 className="font-label-md text-label-md text-on-surface-variant uppercase mb-3">Customer</h3>
            <div className="flex items-center gap-stack-md">
              <div className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center font-bold text-primary">
                {(order.customer?.name || 'U')[0]}
              </div>
              <div>
                <p className="font-body-md text-body-md font-semibold text-on-surface">{order.customer?.name || 'Unknown'}</p>
                {order.customer?.phone && (
                  <a href={`tel:${order.customer.phone}`} className="font-body-sm text-body-sm text-primary hover:underline">
                    {order.customer.phone}
                  </a>
                )}
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="font-label-md text-label-md text-on-surface-variant uppercase mb-3">Order Timeline</h3>
            <StatusTimeline currentStatus={order.status} />
          </Card>

          <Card>
            <h3 className="font-label-md text-label-md text-on-surface-variant uppercase mb-3">Documents</h3>
            <div className="flex flex-col border border-outline-variant rounded-lg overflow-hidden">
              {(order.documents || []).map((doc: any, i: number) => (
                <div key={i} className={`flex items-center justify-between p-stack-md ${
                  i < (order.documents || []).length - 1 ? 'border-b border-outline-variant' : ''
                } ${i % 2 === 0 ? 'bg-surface-bright' : 'bg-surface-container-lowest'}`}>
                  <div className="flex items-center gap-stack-md">
                    <div className="w-10 h-10 rounded flex items-center justify-center shrink-0 bg-primary-fixed">
                      <span className="material-symbols-outlined text-primary">description</span>
                    </div>
                    <div>
                      <p className="font-body-md text-body-md font-semibold text-on-surface">{doc.fileName}</p>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        {doc.copies} copy(ies) &middot; {doc.printType} &middot; {doc.sideType} &middot; {doc.paperSize}
                        {doc.binding !== 'NONE' && ` &middot; ${doc.binding}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-body-md text-body-md font-bold text-on-surface">{formatCurrency(doc.subtotal)}</p>
                    {doc.fileUrl && (
                      <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="font-label-md text-label-md text-primary hover:underline">
                        Download
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center pt-stack-md mt-stack-md border-t border-outline-variant">
              <span className="font-body-lg text-body-lg font-bold text-on-surface">Total</span>
              <span className="font-headline-md text-headline-md text-primary">{formatCurrency(order.totalAmount)}</span>
            </div>
          </Card>

          {order.payment?.proofUrl && (
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-label-md text-label-md text-on-surface-variant uppercase">Payment Proof</h3>
                <span className={`inline-flex items-center px-2 py-1 rounded-full font-label-md text-label-md ${
                  order.paymentStatus === 'VERIFIED' ? 'bg-status-success text-on-status-success' : 'bg-status-pending text-on-status-pending'
                }`}>
                  {order.paymentStatus?.replace('_', ' ') || 'Pending'}
                </span>
              </div>
              <a href={order.payment.proofUrl} target="_blank" rel="noopener noreferrer">
                <img src={order.payment.proofUrl} alt="Payment proof" className="max-h-48 rounded-lg border border-outline-variant cursor-pointer hover:opacity-80" />
              </a>
              {order.paymentStatus === 'PROOF_UPLOADED' && (
                <button onClick={handleVerifyPayment} disabled={actionLoading === 'verify'} className="btn-primary w-full mt-3">
                  {actionLoading === 'verify' ? <Spinner size="sm" /> : null}
                  {actionLoading === 'verify' ? 'Verifying...' : 'Verify Payment'}
                </button>
              )}
            </Card>
          )}

          {order.description && (
            <Card>
              <h3 className="font-label-md text-label-md text-on-surface-variant uppercase mb-2">Customer Notes</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">{order.description}</p>
            </Card>
          )}
        </div>

        <div className="lg:col-span-4">
          <Card className="sticky top-4">
            <h3 className="font-label-md text-label-md text-on-surface-variant uppercase mb-3">Actions</h3>
            <div className="space-y-stack-sm">
              {status === 'PENDING' && (
                <>
                  <button onClick={() => handleAction('ACCEPTED')} disabled={!!actionLoading} className="btn-primary w-full">
                    {actionLoading === 'ACCEPTED' ? <Spinner size="sm" /> : null}
                    Accept Order
                  </button>
                  <button onClick={() => setCancelModal(true)} disabled={!!actionLoading} className="btn-danger w-full">
                    Cancel Order
                  </button>
                </>
              )}
              {status === 'ACCEPTED' && (
                <>
                  <button onClick={() => handleAction('IN_PROGRESS')} disabled={!!actionLoading} className="btn-primary w-full">
                    {actionLoading === 'IN_PROGRESS' ? <Spinner size="sm" /> : null}
                    Start Processing
                  </button>
                  <button onClick={() => setDelayModal(true)} disabled={!!actionLoading} className="btn-outline w-full">
                    Mark Delayed
                  </button>
                  <button onClick={() => setClarifyModal(true)} disabled={!!actionLoading} className="btn-ghost w-full">
                    Request Clarification
                  </button>
                  <button onClick={() => setCancelModal(true)} disabled={!!actionLoading} className="btn-danger w-full">
                    Cancel
                  </button>
                </>
              )}
              {status === 'IN_PROGRESS' && (
                <>
                  <button onClick={() => handleAction('COMPLETED')} disabled={!!actionLoading} className="btn-primary w-full">
                    {actionLoading === 'COMPLETED' ? <Spinner size="sm" /> : null}
                    Mark Completed
                  </button>
                  <button onClick={() => setDelayModal(true)} disabled={!!actionLoading} className="btn-outline w-full">
                    Mark Delayed
                  </button>
                </>
              )}
              {status === 'DELAYED' && (
                <button onClick={() => handleAction('IN_PROGRESS')} disabled={!!actionLoading} className="btn-primary w-full">
                  {actionLoading === 'IN_PROGRESS' ? <Spinner size="sm" /> : null}
                  Resume Processing
                </button>
              )}
              {status === 'WAITING_CLARIFICATION' && (
                <button onClick={() => handleAction('ACCEPTED')} disabled={!!actionLoading} className="btn-primary w-full">
                  {actionLoading === 'ACCEPTED' ? <Spinner size="sm" /> : null}
                  Resolve (Back to Accepted)
                </button>
              )}
            </div>
          </Card>
        </div>
      </div>

      <Modal isOpen={delayModal} onClose={() => setDelayModal(false)} title="Mark Order as Delayed">
        <div className="space-y-stack-md">
          <div>
            <label className="font-body-sm text-body-sm font-semibold text-on-surface block mb-1">Reason for delay</label>
            <textarea value={delayReason} onChange={(e) => setDelayReason(e.target.value)}
              className="input-field" rows={3} placeholder="e.g., Paper jam, machine maintenance" />
          </div>
          <div>
            <label className="font-body-sm text-body-sm font-semibold text-on-surface block mb-1">Expected ready by</label>
            <input type="datetime-local" value={delayUntil} onChange={(e) => setDelayUntil(e.target.value)} className="input-field" />
          </div>
          <div className="flex gap-stack-md">
            <button onClick={() => setDelayModal(false)} className="btn-ghost flex-1">Cancel</button>
            <button onClick={handleDelay} disabled={!delayReason} className="btn-primary flex-1">Confirm Delay</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={cancelModal} onClose={() => setCancelModal(false)} title="Cancel Order">
        <div className="space-y-stack-md">
          <div>
            <label className="font-body-sm text-body-sm font-semibold text-on-surface block mb-1">Reason for cancellation</label>
            <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}
              className="input-field" rows={3} placeholder="Required" />
          </div>
          <div className="flex gap-stack-md">
            <button onClick={() => setCancelModal(false)} className="btn-ghost flex-1">Keep Order</button>
            <button onClick={handleCancel} disabled={!cancelReason} className="btn-danger flex-1">Cancel Order</button>
          </div>
        </div>
      </Modal>

      <ClarificationDrawer
        isOpen={clarifyModal}
        onClose={() => setClarifyModal(false)}
        order={order}
      />
    </div>
  )
}
