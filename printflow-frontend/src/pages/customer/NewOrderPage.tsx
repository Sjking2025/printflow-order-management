import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateOrder } from '../../hooks/useOrders'
import { useCloudinaryUpload } from '../../hooks/useCloudinaryUpload'
import { UploadedFile } from '../../types/order.types'
import FileUploadZone from '../../components/upload/FileUploadZone'
import UploadProgress from '../../components/upload/UploadProgress'
import PaymentProofUpload from '../../components/payment/PaymentProofUpload'
import PriceBreakdown from '../../components/order/PriceBreakdown'
import { usePriceCalculator } from '../../hooks/usePriceCalculator'
import { formatCurrency } from '../../utils/formatCurrency'
import { MAX_DOCUMENTS } from '../../config/constants'
import { getDefaultShop, ShopPublicInfo } from '../../services/shop.service'
import Spinner from '../../components/ui/Spinner'

const STEPS = ['Upload', 'Configure', 'Pricing', 'Payment']

const defaultDocConfig = {
  printType: 'BW' as const,
  sideType: 'SINGLE' as const,
  paperSize: 'A4' as const,
  binding: 'NONE' as const,
  lamination: 'NONE' as const,
  copies: 1,
  pageCount: 1,
  notes: '',
}

export default function NewOrderPage() {
  const [step, setStep] = useState(0)
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [urgency, setUrgency] = useState('NORMAL')
  const [expectedDelivery, setExpectedDelivery] = useState('')
  const [description, setDescription] = useState('')
  const [paymentProofUrl, setPaymentProofUrl] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('GPAY')
  const [submitting, setSubmitting] = useState(false)
  const [completedOrder, setCompletedOrder] = useState<{ orderId: string; orderNumber: string } | null>(null)
  const [shop, setShop] = useState<ShopPublicInfo | null>(null)
  const [shopLoading, setShopLoading] = useState(true)

  const navigate = useNavigate()
  const createOrder = useCreateOrder()
  const { upload, reset, ...uploadState } = useCloudinaryUpload()

  useEffect(() => {
    getDefaultShop()
      .then(setShop)
      .catch(() => {})
      .finally(() => setShopLoading(false))
  }, [])

  const priceConfig = {
    bwPerPageA4: 0.50,
    colorPerPageA4: 5.00,
    a3Multiplier: 2.0,
    doubleSideDiscount: 0,
    spiralBindingFlat: 30,
    stapleFlat: 5,
    laminationPerPage: 10,
    urgencyHighFee: 20,
    urgencyCriticalFee: 50,
  }

  const { documentPrices, documentsTotal, urgencyFee, total } = usePriceCalculator(files, urgency, priceConfig)

  const handleFilesSelected = async (newFiles: File[]) => {
    const remaining = MAX_DOCUMENTS - files.length
    const toAdd = newFiles.slice(0, remaining)
    const added: UploadedFile[] = []

    for (const file of toAdd) {
      const doc: UploadedFile = {
        fileName: file.name,
        fileUrl: '',
        fileSizeKb: Math.round(file.size / 1024),
        copies: 1,
        pageCount: 1,
        printType: 'BW',
        sideType: 'SINGLE',
        paperSize: 'A4',
        binding: 'NONE',
        lamination: 'NONE',
        uploadProgress: 0,
        uploadStatus: 'uploading',
      }
      added.push(doc)

      try {
        const url = await upload(file)
        doc.fileUrl = url
        doc.uploadStatus = 'done'
        doc.uploadProgress = 100
      } catch {
        doc.uploadStatus = 'error'
      }
    }

    setFiles((prev) => [...prev, ...added])
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const updateDoc = (index: number, updates: Partial<UploadedFile>) => {
    setFiles((prev) => prev.map((f, i) => (i === index ? { ...f, ...updates } : f)))
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const result = await createOrder.mutateAsync({
        shopId: shop?.id || '00000000-0000-0000-0000-000000000000',
        urgency,
        expectedDelivery: expectedDelivery ? new Date(expectedDelivery).toISOString() : null,
        description,
        documents: files.map((f) => ({
          fileName: f.fileName,
          fileUrl: f.fileUrl,
          fileSizeKb: f.fileSizeKb,
          pageCount: f.pageCount,
          copies: f.copies,
          printType: f.printType,
          sideType: f.sideType,
          paperSize: f.paperSize,
          binding: f.binding,
          lamination: f.lamination,
          notes: f.notes,
        })),
      })

      setCompletedOrder({ orderId: result.orderId, orderNumber: result.orderNumber })
    } catch (err) {
      alert('Failed to place order. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const canNextStep = () => {
    if (step === 0) return files.length > 0 && files.every((f) => f.uploadStatus === 'done')
    if (step === 1) return files.every((f) => f.pageCount > 0 && f.copies > 0)
    if (step === 2) return !!expectedDelivery
    if (step === 3) return !!paymentProofUrl
    return false
  }

  if (completedOrder) {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900">Order Placed!</h2>
        <p className="text-brand-blue font-semibold mt-2">{completedOrder.orderNumber}</p>
        <p className="text-sm text-gray-500 mt-2">Your order has been placed successfully.</p>
        <div className="flex gap-3 mt-6 justify-center">
          <button onClick={() => navigate(`/orders/${completedOrder.orderId}`)} className="btn-primary">
            Track Order
          </button>
          <button onClick={() => navigate('/orders')} className="btn-ghost">
            My Orders
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900 mb-6">New Order</h1>

      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium
              ${i < step ? 'bg-green-500 text-white' : i === step ? 'bg-brand-blue text-white' : 'bg-gray-200 text-gray-500'}`}>
              {i < step ? '✓' : i + 1}
            </div>
            <span className={`text-xs ${i === step ? 'text-brand-blue font-medium' : 'text-gray-500'}`}>{s}</span>
            {i < STEPS.length - 1 && <div className="w-6 h-0.5 bg-gray-200" />}
          </div>
        ))}
      </div>

      <div className="card">
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="font-semibold">Upload Documents</h2>
            {files.length < MAX_DOCUMENTS && (
              <FileUploadZone onFilesSelected={handleFilesSelected} disabled={files.length >= MAX_DOCUMENTS} />
            )}
            <p className="text-xs text-gray-500">{files.length}/{MAX_DOCUMENTS} files</p>
            {files.map((f, i) => (
              <div key={i} className="flex items-center justify-between border rounded-lg p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{f.fileName}</p>
                  <UploadProgress progress={f.uploadProgress} status={f.uploadStatus} />
                </div>
                <button onClick={() => removeFile(i)} className="ml-2 text-red-500 hover:text-red-700">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <h2 className="font-semibold">Configure Documents</h2>
            {files.map((f, i) => (
              <div key={i} className="border rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium">{f.fileName}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500">Copies</label>
                    <input type="number" min={1} max={999} value={f.copies}
                      onChange={(e) => updateDoc(i, { copies: parseInt(e.target.value) || 1 })}
                      className="input-field mt-1" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Page Count</label>
                    <input type="number" min={1} value={f.pageCount}
                      onChange={(e) => updateDoc(i, { pageCount: parseInt(e.target.value) || 1 })}
                      className="input-field mt-1" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Print Type</label>
                    <select value={f.printType} onChange={(e) => updateDoc(i, { printType: e.target.value as any })}
                      className="input-field mt-1">
                      <option value="BW">Black & White</option>
                      <option value="COLOR">Color</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Side Type</label>
                    <select value={f.sideType} onChange={(e) => updateDoc(i, { sideType: e.target.value as any })}
                      className="input-field mt-1">
                      <option value="SINGLE">Single Side</option>
                      <option value="DOUBLE">Double Side</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Paper Size</label>
                    <select value={f.paperSize} onChange={(e) => updateDoc(i, { paperSize: e.target.value as any })}
                      className="input-field mt-1">
                      <option value="A4">A4</option>
                      <option value="A3">A3</option>
                      <option value="LETTER">Letter</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Binding</label>
                    <select value={f.binding} onChange={(e) => updateDoc(i, { binding: e.target.value as any })}
                      className="input-field mt-1">
                      <option value="NONE">None</option>
                      <option value="SPIRAL">Spiral</option>
                      <option value="STAPLE">Staple</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Lamination</label>
                    <select value={f.lamination} onChange={(e) => updateDoc(i, { lamination: e.target.value as any })}
                      className="input-field mt-1">
                      <option value="NONE">None</option>
                      <option value="SINGLE_SIDE">Single Side</option>
                      <option value="BOTH_SIDES">Both Sides</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Notes</label>
                  <input value={f.notes || ''} onChange={(e) => updateDoc(i, { notes: e.target.value })}
                    placeholder="Special instructions..." maxLength={200}
                    className="input-field mt-1" />
                </div>
              </div>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="font-semibold">Order Details & Pricing</h2>
            <div>
              <label className="text-xs text-gray-500">Urgency</label>
              <select value={urgency} onChange={(e) => setUrgency(e.target.value)} className="input-field mt-1">
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High (+{formatCurrency(priceConfig.urgencyHighFee)})</option>
                <option value="CRITICAL">Critical (+{formatCurrency(priceConfig.urgencyCriticalFee)})</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Expected Delivery</label>
              <input type="datetime-local" value={expectedDelivery}
                onChange={(e) => setExpectedDelivery(e.target.value)} className="input-field mt-1" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Order Description (optional)</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                maxLength={500} rows={3} className="input-field mt-1" placeholder="Any notes about your order..." />
            </div>
            <div className="border-t pt-4">
              <PriceBreakdown
                documentPrices={documentPrices}
                documentsTotal={documentsTotal}
                urgencyFee={urgencyFee}
                total={total}
                urgencyLabel={urgency}
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h2 className="font-semibold">Payment</h2>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600">Total Amount</p>
              <p className="text-3xl font-bold text-brand-blue">{formatCurrency(total)}</p>
            </div>

            {shopLoading ? (
              <div className="flex justify-center py-4"><Spinner size="sm" /></div>
            ) : shop ? (
              <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
                <p className="text-sm font-medium text-gray-700">Pay to</p>
                {shop.qrCodeUrl && (
                  <div className="flex justify-center">
                    <img src={shop.qrCodeUrl} alt="Pay via UPI QR" className="w-40 h-40 object-contain" />
                  </div>
                )}
                {shop.upiId && (
                  <div className="text-center">
                    <p className="text-xs text-gray-500">UPI ID</p>
                    <p className="text-sm font-mono font-semibold text-gray-900">{shop.upiId}</p>
                  </div>
                )}
                <p className="text-xs text-gray-500 text-center">
                  Send exact amount and upload screenshot below
                </p>
              </div>
            ) : null}

            <div>
              <label className="text-xs text-gray-500">Payment Method</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="input-field mt-1">
                <option value="GPAY">Google Pay</option>
                <option value="PHONEPE">PhonePe</option>
                <option value="PAYTM">Paytm</option>
                <option value="UPI">UPI</option>
                <option value="CASH">Cash (on pickup)</option>
              </select>
            </div>
            <PaymentProofUpload onUploadComplete={(url) => setPaymentProofUrl(url)} />
          </div>
        )}

        <div className="flex justify-between mt-6 pt-4 border-t">
          {step > 0 ? (
            <button onClick={() => setStep(step - 1)} className="btn-ghost">Back</button>
          ) : <div />}
          {step < STEPS.length - 1 ? (
            <button onClick={() => setStep(step + 1)} disabled={!canNextStep()} className="btn-primary">
              Next
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={submitting || !canNextStep()} className="btn-primary">
              {submitting ? 'Placing Order...' : 'Place Order'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
