import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useOrderDetail, useUpdateCopies } from '../../hooks/useOrders'
import OrderStatusBadge from '../../components/order/OrderStatusBadge'
import StatusTimeline from '../../components/order/StatusTimeline'
import CountdownTimer from '../../components/order/CountdownTimer'
import Card from '../../components/ui/Card'
import Spinner from '../../components/ui/Spinner'
import ErrorState from '../../components/ui/ErrorState'
import Modal from '../../components/ui/Modal'
import ClarificationDrawer from '../../components/clarifications/ClarificationDrawer'
import { formatCurrency } from '../../utils/formatCurrency'
import { formatDate } from '../../utils/formatDate'
export default function OrderDetailPage() {
  const { orderId } = useParams()
  const { data: order, isLoading, isError, refetch } = useOrderDetail(orderId)
  const updateCopies = useUpdateCopies()
  const [editDocId, setEditDocId] = useState<string | null>(null)
  const [newCopies, setNewCopies] = useState(1)
  const [copyError, setCopyError] = useState('')
  const [clarifyDrawerOpen, setClarifyDrawerOpen] = useState(false)

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
    <div className="space-y-stack-lg">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-stack-sm">
        <div>
          <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary mb-stack-xs">
            Order #{order.orderNumber}
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Placed on {formatDate(order.createdAt)}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
        <div className="col-span-1 md:col-span-8">
          <Card>
            <h2 className="font-headline-md text-headline-md text-primary mb-stack-lg">Production Timeline</h2>
            <StatusTimeline currentStatus={order.status} />
          </Card>
        </div>

        <div className="col-span-1 md:col-span-4">
          <Card className="flex flex-col justify-between h-full">
            {order.lockExpiresAt && order.status === 'ACCEPTED' && (
              <div>
                <div className="flex justify-between items-center mb-stack-sm">
                  <h3 className="font-label-md text-label-md text-on-surface-variant uppercase">Modification Window</h3>
                  <span className="material-symbols-outlined text-outline">timer</span>
                </div>
                <div className="bg-surface-container-low p-stack-md rounded-lg text-center mb-stack-md border border-outline-variant/50">
                  <p className="font-display text-display text-primary tracking-tight">
                    <CountdownTimer expiresAt={order.lockExpiresAt} />
                  </p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">remaining to edit quantities</p>
                </div>
              </div>
            )}
            <div className="flex flex-col gap-stack-sm">
              <button className="btn-outline w-full">
                <span className="material-symbols-outlined text-[18px]">edit</span>
                Edit Quantities
              </button>
              <button 
                onClick={() => setClarifyDrawerOpen(true)}
                className="btn-primary w-full"
              >
                <span className="material-symbols-outlined text-[18px]">chat_bubble</span>
                Request Clarification
              </button>
            </div>
          </Card>
        </div>

        <div className="col-span-1 md:col-span-7">
          <Card>
            <h3 className="font-headline-md text-headline-md text-primary mb-stack-md">Document Configuration</h3>
            <div className="flex flex-col border border-outline-variant rounded-lg overflow-hidden">
              {order.documents?.map((doc: any, idx: number) => (
                <div
                  key={doc.id}
                  className={`flex items-center justify-between p-stack-md ${
                    idx < order.documents.length - 1 ? 'border-b border-outline-variant' : ''
                  } ${idx % 2 === 0 ? 'bg-surface-bright' : 'bg-surface-container-lowest'}`}
                >
                  <div className="flex items-center gap-stack-md">
                    <div className="w-10 h-10 rounded flex items-center justify-center shrink-0"
                      style={{ backgroundColor: idx % 2 === 0 ? '#d5e3ff' : '#e0e3e5' }}
                    >
                      <span className="material-symbols-outlined" style={{ color: idx % 2 === 0 ? '#a7c8ff' : '#737780' }}>
                        {doc.fileName?.endsWith('.png') || doc.fileName?.endsWith('.jpg') ? 'image' : 'description'}
                      </span>
                    </div>
                    <div>
                      <p className="font-body-md text-body-md font-semibold text-on-surface">{doc.fileName}</p>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        {doc.paperSize} &middot; {doc.printType === 'COLOR' ? 'Color' : 'B&W'} &middot; {doc.sideType === 'DOUBLE' ? 'Double-sided' : 'Single-sided'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-label-md text-label-md text-on-surface">{doc.copies} Copies</p>
                    <p className="font-body-sm text-body-sm font-medium text-on-surface">{formatCurrency(doc.subtotal)}</p>
                    {canModifyCopies && order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
                      <button
                        onClick={() => { setEditDocId(doc.id); setNewCopies(doc.copies); setCopyError('') }}
                        className="font-label-md text-label-md text-primary hover:underline mt-1"
                      >
                        Change copies
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="col-span-1 md:col-span-5">
          <Card className="flex flex-col h-full">
            <h3 className="font-headline-md text-headline-md text-primary mb-stack-md">Digital Receipt</h3>
            <div className="bg-surface-container-low p-stack-md rounded border border-outline-variant/50 mb-stack-md font-code-sm text-code-sm text-on-surface">
              <div className="flex justify-between mb-2"><span>Subtotal:</span><span>{formatCurrency(order.totalAmount)}</span></div>
              <div className="flex justify-between mb-2"><span>Status:</span><span>{order.paymentStatus?.replace('_', ' ') || 'Pending'}</span></div>
              {(order as any).delayReason && (
                <div className="border-t border-outline-variant/50 my-2 pt-2">
                  <p className="text-error font-semibold">Delay: {(order as any).delayReason}</p>
                  {(order as any).delayUntil && <p className="text-on-surface-variant">Expected by: {formatDate((order as any).delayUntil)}</p>}
                </div>
              )}
            </div>
            <div className="mt-auto">
              <h4 className="font-label-md text-label-md text-on-surface-variant uppercase mb-stack-xs">Pickup Instructions</h4>
              <p className="font-body-sm text-body-sm text-on-surface bg-surface-bright p-stack-sm rounded border border-outline-variant">
                Present this order number at the Front Desk. Please ensure you have a valid ID if requested by the shop owner.
              </p>
            </div>
          </Card>
        </div>
      </div>

      <Modal isOpen={!!editDocId} onClose={() => setEditDocId(null)} title="Change Copy Count">
        <div className="space-y-stack-md">
          <div>
            <label className="font-body-sm text-body-sm font-semibold text-on-surface block mb-1">Number of copies</label>
            <input
              type="number"
              min={1}
              max={999}
              value={newCopies}
              onChange={(e) => setNewCopies(parseInt(e.target.value) || 1)}
              className="input-field"
            />
          </div>
          {copyError && <p className="font-body-sm text-body-sm text-error">{copyError}</p>}
          <div className="flex gap-stack-md">
            <button onClick={() => setEditDocId(null)} className="btn-ghost flex-1">Cancel</button>
            <button onClick={handleUpdateCopies} disabled={updateCopies.isPending} className="btn-primary flex-1">
              {updateCopies.isPending ? <Spinner size="sm" /> : 'Update'}
            </button>
          </div>
        </div>
      </Modal>

      <ClarificationDrawer
        isOpen={clarifyDrawerOpen}
        onClose={() => setClarifyDrawerOpen(false)}
        order={order}
      />
    </div>
  )
}
