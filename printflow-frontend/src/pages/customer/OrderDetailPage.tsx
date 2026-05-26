import { useState, useRef } from 'react'
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
  const docsRef = useRef<HTMLDivElement>(null)

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

  const now = new Date()
  const copyModifyExpiry = order.copyModifyExpiresAt ? new Date(order.copyModifyExpiresAt) : null
  const isModifyWindowActive = order.status === 'PENDING' && copyModifyExpiry && copyModifyExpiry > now
  const windowExpired = copyModifyExpiry && copyModifyExpiry <= now

  const canEditDoc = (doc: any) => {
    return isModifyWindowActive && !doc.copiesModifiedAt
  }

  const anyDocEditable = order.documents?.some(canEditDoc)

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
            {copyModifyExpiry && isModifyWindowActive && (
              <div>
                <div className="flex justify-between items-center mb-stack-sm">
                  <h3 className="font-label-md text-label-md text-on-surface-variant uppercase">Modification Window</h3>
                  <span className="material-symbols-outlined text-outline">timer</span>
                </div>
                <div className="bg-surface-container-low p-stack-md rounded-lg text-center mb-stack-md border border-outline-variant/50">
                  <p className="font-display text-display text-primary tracking-tight">
                    <CountdownTimer expiresAt={order.copyModifyExpiresAt!} />
                  </p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">remaining to edit quantities</p>
                </div>
              </div>
            )}
            {windowExpired && order.status === 'PENDING' && (
              <div className="bg-surface-variant p-stack-md rounded-lg text-center mb-stack-md border border-outline-variant/50">
                <p className="font-label-md text-label-md text-on-surface-variant">Modification window has expired</p>
              </div>
            )}
            <div className="flex flex-col gap-stack-sm">
              <button
                onClick={() => docsRef.current?.scrollIntoView({ behavior: 'smooth' })}
                disabled={!anyDocEditable}
                className="btn-outline w-full disabled:opacity-40"
              >
                <span className="material-symbols-outlined text-[18px]">edit</span>
                Edit Quantities
              </button>
              {order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
                <button 
                  onClick={() => setClarifyDrawerOpen(true)}
                  className="btn-primary w-full"
                >
                  <span className="material-symbols-outlined text-[18px]">chat_bubble</span>
                  Request Clarification
                </button>
              )}
            </div>
          </Card>
        </div>

        <div ref={docsRef} className="col-span-1 md:col-span-7">
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
                    {doc.copiesModifiedAt ? (
                      <p className="font-label-sm text-label-sm text-on-surface-variant mt-1 flex items-center gap-1 justify-end">
                        <span className="material-symbols-outlined text-[14px]">lock</span>
                        Modified
                      </p>
                    ) : canEditDoc(doc) ? (
                      <button
                        onClick={() => { setEditDocId(doc.id); setNewCopies(doc.copies); setCopyError('') }}
                        className="font-label-md text-label-md text-primary hover:underline mt-1"
                      >
                        Increase copies
                      </button>
                    ) : null}
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
              <div className="flex justify-between mb-2"><span>Subtotal:</span><span className="font-semibold">{formatCurrency(order.totalAmount)}</span></div>
              <div className="flex justify-between mb-2"><span>Status:</span><span className="font-semibold">{order.paymentStatus?.replace('_', ' ') || 'Pending'}</span></div>
              {order.payment?.transactionId && (
                <div className="flex justify-between mb-2"><span>UTR / Txn ID:</span><span className="font-semibold">{order.payment.transactionId}</span></div>
              )}
              {order.payment?.proofUrl && (
                <div className="border-t border-outline-variant/50 pt-2 mt-2">
                  <p className="font-label-md text-label-md text-on-surface-variant mb-1">Payment Screenshot</p>
                  <a href={order.payment.proofUrl} target="_blank" rel="noopener noreferrer">
                    <img src={order.payment.proofUrl} alt="Payment proof" className="max-h-36 rounded border border-outline-variant cursor-pointer hover:opacity-80" />
                  </a>
                </div>
              )}
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

      <Modal isOpen={!!editDocId} onClose={() => setEditDocId(null)} title="Increase Copy Count">
        <div className="space-y-stack-md">
          {(() => {
            const editingDoc = order.documents?.find((d: any) => d.id === editDocId)
            const currentCopies = editingDoc?.copies ?? 1
            return (
              <>
                <div>
                  <label className="font-body-sm text-body-sm font-semibold text-on-surface block mb-1">
                    Number of copies (minimum: {currentCopies})
                  </label>
                  <input
                    type="number"
                    min={currentCopies}
                    max={999}
                    value={newCopies}
                    onChange={(e) => setNewCopies(parseInt(e.target.value) || currentCopies)}
                    className="input-field"
                  />
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                    Only increase is allowed. Current: {currentCopies} copies
                  </p>
                </div>
                {copyModifyExpiry && isModifyWindowActive && (
                  <div className="bg-surface-container-low p-stack-sm rounded-lg text-center border border-outline-variant/50">
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Modification window:{' '}
                      <CountdownTimer expiresAt={order.copyModifyExpiresAt!} />
                    </p>
                  </div>
                )}
              </>
            )
          })()}
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
