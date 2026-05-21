import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateOrder } from '../../hooks/useOrders'
import { useCloudinaryUpload } from '../../hooks/useCloudinaryUpload'
import { UploadedFile } from '../../types/order.types'
import FileUploadZone from '../../components/upload/FileUploadZone'
import UploadProgress from '../../components/upload/UploadProgress'
import PaymentProofUpload from '../../components/payment/PaymentProofUpload'
import { usePriceCalculator } from '../../hooks/usePriceCalculator'
import { formatCurrency } from '../../utils/formatCurrency'
import { MAX_DOCUMENTS } from '../../config/constants'
import { getAllShops, ShopPublicInfo, PriceConfig } from '../../services/shop.service'
import { submitPaymentProof } from '../../services/payments.service'
import Spinner from '../../components/ui/Spinner'
import { QRCodeSVG } from 'qrcode.react'

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

const STEPS = ['Select Shop', 'Upload', 'Configure', 'Payment']

export default function NewOrderPage() {
  const [step, setStep] = useState(0)
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [urgency, setUrgency] = useState('NORMAL')
  const [expectedDelivery, setExpectedDelivery] = useState('')
  const [description, setDescription] = useState('')
  const [paymentProofUrl, setPaymentProofUrl] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('GPAY')
  const [utr, setUtr] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [completedOrder, setCompletedOrder] = useState<{ orderId: string; orderNumber: string } | null>(null)
  const [shops, setShops] = useState<ShopPublicInfo[]>([])
  const [shop, setShop] = useState<ShopPublicInfo | null>(null)
  const [shopLoading, setShopLoading] = useState(true)

  const navigate = useNavigate()
  const createOrder = useCreateOrder()
  const { upload, ...uploadState } = useCloudinaryUpload()

  useEffect(() => {
    getAllShops()
      .then(setShops)
      .catch(() => {})
      .finally(() => setShopLoading(false))
  }, [])

  const priceConfig = shop?.priceConfig || {
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

  const { documentPrices, documentsTotal, urgencyFee, total } = usePriceCalculator(files, urgency, priceConfig as any)

  const handleFilesSelected = async (newFiles: File[]) => {
    const remaining = MAX_DOCUMENTS - files.length
    const toAdd = newFiles.slice(0, remaining)

    const initial: UploadedFile[] = toAdd.map((file) => ({
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
    }))

    setFiles((prev) => [...prev, ...initial])

    for (let i = 0; i < toAdd.length; i++) {
      const file = toAdd[i]
      const fileIndex = files.length + i
      try {
        const url = await upload(file, (progress) => {
          setFiles((prev) => {
            const next = [...prev]
            if (next[fileIndex]) next[fileIndex] = { ...next[fileIndex], uploadProgress: progress }
            return next
          })
        })
        setFiles((prev) => {
          const next = [...prev]
          if (next[fileIndex]) next[fileIndex] = { ...next[fileIndex], fileUrl: url, uploadStatus: 'done', uploadProgress: 100 }
          return next
        })
      } catch {
        setFiles((prev) => {
          const next = [...prev]
          if (next[fileIndex]) next[fileIndex] = { ...next[fileIndex], uploadStatus: 'error' }
          return next
        })
      }
    }
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

      if (paymentProofUrl && paymentMethod !== 'CASH') {
        try {
          await submitPaymentProof(result.orderId, paymentProofUrl, paymentMethod, total, utr)
        } catch {
          // Payment proof submission failed silently; user can retry from order page
        }
      }

      setCompletedOrder({ orderId: result.orderId, orderNumber: result.orderNumber })
    } catch {
      alert('Failed to place order. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const canNextStep = () => {
    if (step === 0) return !!shop
    if (step === 1) return files.length > 0 && files.every((f) => f.uploadStatus === 'done')
    if (step === 2) return files.every((f) => f.pageCount > 0 && f.copies > 0)
    if (step === 3) {
      if (paymentMethod === 'CASH') return true
      return !!paymentProofUrl && !!utr
    }
    return false
  }

  if (completedOrder) {
    return (
      <div className="max-w-md mx-auto text-center py-stack-xl">
        <div className="w-16 h-16 bg-status-success rounded-full flex items-center justify-center mx-auto mb-stack-md">
          <span className="material-symbols-outlined text-on-status-success text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
        </div>
        <h2 className="font-headline-md text-headline-md text-primary mb-2">Order Placed!</h2>
        <p className="font-body-md text-body-md text-secondary font-semibold mb-2">{completedOrder.orderNumber}</p>
        <p className="font-body-sm text-body-sm text-on-surface-variant mb-stack-lg">Your order has been placed successfully.</p>
        <div className="flex gap-stack-md justify-center">
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
    <div>
      <header className="bg-surface-container-lowest border-b border-outline-variant px-margin-mobile md:px-margin-desktop py-stack-sm flex justify-between items-center -mx-margin-mobile md:-mx-margin-desktop mb-stack-lg">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary-container" style={{ fontVariationSettings: "'FILL' 1" }}>print</span>
          <span className="font-headline-md text-headline-md text-primary hidden md:block">PrintFlow</span>
        </div>
        <div className="flex items-center gap-4">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              {i > 0 && <div className={`h-px w-6 ${i <= step ? 'bg-primary' : 'bg-outline-variant'}`} />}
              <div className={`flex items-center gap-1 ${i === step ? 'text-primary font-bold' : i < step ? 'text-primary' : 'text-outline'}`}>
                <span className="material-symbols-outlined text-[18px]">
                  {i < step ? 'check_circle' : i === step ? s === 'Upload' ? 'cloud_upload' : s === 'Configure' ? 'tune' : 'credit_card' : s === 'Upload' ? 'cloud_upload' : s === 'Configure' ? 'tune' : 'credit_card'}
                </span>
                <span className="hidden sm:inline font-label-md text-label-md">{s}</span>
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => navigate('/orders')} className="text-on-surface-variant hover:text-on-surface font-label-md text-label-md uppercase tracking-wider">
          Cancel
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        <div className="lg:col-span-8 flex flex-col gap-stack-lg">
          {step === 0 && (
            <>
              <div>
                <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary mb-1">Select Print Shop</h1>
                <p className="text-on-surface-variant font-body-md text-body-md">Choose a print shop to fulfill your order.</p>
              </div>
              {shopLoading ? <div className="py-10 text-center"><Spinner size="lg" /></div> : shops.length === 0 ? (
                <div className="py-10 text-center text-on-surface-variant font-body-lg">No shops available right now.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-md">
                  {shops.map((s) => (
                    <div key={s.id} onClick={() => setShop(s)} className={`p-stack-md border rounded-xl cursor-pointer transition-colors ${shop?.id === s.id ? 'border-primary bg-primary-fixed/20 shadow-sm' : 'border-outline-variant hover:border-secondary bg-surface-container-lowest'}`}>
                      <h3 className="font-headline-sm text-headline-sm text-primary mb-1">{s.name}</h3>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">Owner: {s.ownerName || 'Unknown'}</p>
                      {s.priceConfig && (
                        <div className="mt-3 inline-flex bg-surface-variant text-on-surface-variant text-xs rounded-full px-3 py-1 items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">info</span>
                          B&W A4: {formatCurrency(s.priceConfig.bwPerPageA4)} &middot; Color A4: {formatCurrency(s.priceConfig.colorPerPageA4)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {step === 1 && (
            <>
              <div>
                <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary mb-1">Document Setup</h1>
                <p className="text-on-surface-variant font-body-md text-body-md">Upload up to {MAX_DOCUMENTS} documents and configure print settings for each.</p>
              </div>

              {files.length < MAX_DOCUMENTS && (
                <div className="border-2 border-dashed border-outline-variant rounded-xl bg-surface-container-lowest p-stack-xl flex flex-col items-center justify-center text-center hover:border-primary hover:bg-surface-container-low transition-colors cursor-pointer group">
                  <FileUploadZone onFilesSelected={handleFilesSelected} disabled={files.length >= MAX_DOCUMENTS} />
                </div>
              )}

              <div className="flex flex-col gap-stack-md">
                {files.map((f, i) => (
                  <div key={i} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg shadow-sm hover:border-primary hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-stack-md pb-stack-sm border-b border-surface-variant">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-error text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                          {f.fileName?.endsWith('.pdf') ? 'picture_as_pdf' : f.fileName?.match(/\.(png|jpg|jpeg)$/i) ? 'image' : 'description'}
                        </span>
                        <div>
                          <h4 className="font-body-md text-body-md font-bold">{f.fileName}</h4>
                          <span className="font-label-md text-label-md text-on-surface-variant">{f.fileSizeKb} KB</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <UploadProgress progress={f.uploadProgress} status={f.uploadStatus} />
                        <button onClick={() => removeFile(i)} className="text-outline hover:text-error transition-colors p-2">
                          <span className="material-symbols-outlined">delete</span>
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-stack-md">
                      <div className="flex flex-col gap-1">
                        <label className="font-body-sm text-body-sm font-semibold text-on-surface">Copies</label>
                        <div className="flex items-center border border-outline-variant rounded-lg h-10 overflow-hidden bg-surface-container-lowest">
                          <button onClick={() => updateDoc(i, { copies: Math.max(1, (f.copies || 1) - 1) })} className="px-3 hover:bg-surface-container text-on-surface transition-colors h-full flex items-center justify-center border-r border-outline-variant">
                            <span className="material-symbols-outlined text-[18px]">remove</span>
                          </button>
                          <input
                            type="number"
                            min={1}
                            max={999}
                            value={f.copies}
                            onChange={(e) => updateDoc(i, { copies: parseInt(e.target.value) || 1 })}
                            className="w-full text-center border-none focus:ring-0 font-body-md text-body-md h-full bg-transparent"
                          />
                          <button onClick={() => updateDoc(i, { copies: Math.min(999, (f.copies || 1) + 1) })} className="px-3 hover:bg-surface-container text-on-surface transition-colors h-full flex items-center justify-center border-l border-outline-variant">
                            <span className="material-symbols-outlined text-[18px]">add</span>
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="font-body-sm text-body-sm font-semibold text-on-surface">Page Count</label>
                        <input type="number" min={1} value={f.pageCount}
                          onChange={(e) => updateDoc(i, { pageCount: parseInt(e.target.value) || 1 })}
                          className="input-field" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="font-body-sm text-body-sm font-semibold text-on-surface">Color Mode</label>
                        <div className="flex p-1 bg-surface-container-low rounded-lg h-10">
                          <button
                            onClick={() => updateDoc(i, { printType: 'COLOR' })}
                            className={`flex-1 rounded flex items-center justify-center gap-2 font-label-md text-label-md ${f.printType === 'COLOR' ? 'bg-surface-container-lowest shadow-sm text-primary' : 'text-on-surface-variant hover:text-on-surface transition-colors'}`}
                          >
                            <span className="material-symbols-outlined text-[16px]">palette</span> Color
                          </button>
                          <button
                            onClick={() => updateDoc(i, { printType: 'BW' })}
                            className={`flex-1 rounded flex items-center justify-center gap-2 font-label-md text-label-md ${f.printType === 'BW' ? 'bg-surface-container-lowest shadow-sm text-primary' : 'text-on-surface-variant hover:text-on-surface transition-colors'}`}
                          >
                            <span className="material-symbols-outlined text-[16px]">contrast</span> B&W
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="font-body-sm text-body-sm font-semibold text-on-surface">Print Sides</label>
                        <div className="flex p-1 bg-surface-container-low rounded-lg h-10">
                          <button
                            onClick={() => updateDoc(i, { sideType: 'SINGLE' })}
                            className={`flex-1 rounded flex items-center justify-center font-label-md text-label-md ${f.sideType === 'SINGLE' ? 'bg-surface-container-lowest shadow-sm text-primary' : 'text-on-surface-variant hover:text-on-surface transition-colors'}`}
                          >Single</button>
                          <button
                            onClick={() => updateDoc(i, { sideType: 'DOUBLE' })}
                            className={`flex-1 rounded flex items-center justify-center font-label-md text-label-md ${f.sideType === 'DOUBLE' ? 'bg-surface-container-lowest shadow-sm text-primary' : 'text-on-surface-variant hover:text-on-surface transition-colors'}`}
                          >Double</button>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="font-body-sm text-body-sm font-semibold text-on-surface">Paper Size</label>
                        <select value={f.paperSize} onChange={(e) => updateDoc(i, { paperSize: e.target.value as any })}
                          className="input-field">
                          <option value="A4">A4 (Standard)</option>
                          <option value="A3">A3 (Poster)</option>
                          <option value="LETTER">Letter</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="font-body-sm text-body-sm font-semibold text-on-surface">Finishing Options</label>
                        <div className="flex gap-2 h-10">
                          <button
                            onClick={() => updateDoc(i, { binding: f.binding === 'SPIRAL' ? 'NONE' : 'SPIRAL' })}
                            className={`flex-1 border rounded-lg flex items-center justify-center gap-2 font-label-md text-label-md transition-colors ${
                              f.binding === 'SPIRAL' ? 'border-primary bg-primary-fixed/20 text-primary' : 'border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary bg-surface-container-lowest'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[18px]">auto_stories</span> Spiral
                          </button>
                          <button
                            onClick={() => updateDoc(i, { lamination: f.lamination === 'BOTH_SIDES' ? 'NONE' : 'BOTH_SIDES' })}
                            className={`flex-1 border rounded-lg flex items-center justify-center gap-2 font-label-md text-label-md transition-colors ${
                              f.lamination !== 'NONE' ? 'border-primary bg-primary-fixed/20 text-primary' : 'border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary bg-surface-container-lowest'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[18px]">layers</span> Laminate
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="mt-stack-sm">
                      <input value={f.notes || ''} onChange={(e) => updateDoc(i, { notes: e.target.value })}
                        placeholder="Special instructions..." maxLength={200}
                        className="input-field" />
                    </div>
                  </div>
                ))}
                {files.length < MAX_DOCUMENTS && files.length > 0 && (
                  <div className="border border-dashed border-outline-variant rounded-xl p-stack-md flex items-center gap-4 bg-surface-container-lowest/50 opacity-60">
                    <div className="w-10 h-10 rounded bg-surface-container flex items-center justify-center text-outline">
                      <span className="material-symbols-outlined">add_circle</span>
                    </div>
                    <span className="font-body-md text-body-md text-on-surface-variant">Slot {files.length + 1} available</span>
                  </div>
                )}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary mb-1">Order Details & Pricing</h1>
                <p className="text-on-surface-variant font-body-md text-body-md">Set urgency, delivery time, and review pricing.</p>
              </div>

              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg shadow-sm">
                <div className="space-y-stack-md">
                  <div>
                    <label className="font-body-sm text-body-sm font-semibold text-on-surface block mb-2">Processing Speed</label>
                    <div className="flex flex-col gap-2 p-stack-md bg-surface rounded-lg border border-outline-variant">
                      {[
                        { value: 'NORMAL', label: 'Standard', time: '24hrs', fee: 0, desc: 'Free' },
                        { value: 'HIGH', label: 'High Priority', time: '1hr', fee: priceConfig.urgencyHighFee, desc: `+${formatCurrency(priceConfig.urgencyHighFee)}` },
                        { value: 'CRITICAL', label: 'Critical', time: '30min', fee: priceConfig.urgencyCriticalFee, desc: `+${formatCurrency(priceConfig.urgencyCriticalFee)}` },
                      ].map((opt) => (
                        <label key={opt.value} className={`flex items-center justify-between cursor-pointer p-2 rounded-lg transition-colors ${urgency === opt.value ? 'bg-surface-container-lowest' : 'hover:bg-surface-container-low'}`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${urgency === opt.value ? 'border-primary' : 'border-outline-variant'}`}>
                              {urgency === opt.value && <div className="w-3 h-3 rounded-full bg-primary" />}
                            </div>
                            <span className="font-body-sm text-body-sm text-on-surface flex items-center gap-1">
                              {opt.value === 'HIGH' || opt.value === 'CRITICAL' ? <span className="material-symbols-outlined text-[16px] text-secondary">bolt</span> : null}
                              {opt.label} ({opt.time})
                            </span>
                          </div>
                          <span className={`font-label-md text-label-md ${opt.value !== 'NORMAL' ? 'text-secondary' : 'text-on-surface-variant'}`}>{opt.desc}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="font-body-sm text-body-sm font-semibold text-on-surface block mb-1">Expected Delivery</label>
                    <input type="datetime-local" value={expectedDelivery}
                      onChange={(e) => setExpectedDelivery(e.target.value)} className="input-field" />
                  </div>

                  <div>
                    <label className="font-body-sm text-body-sm font-semibold text-on-surface block mb-1">Order Description (optional)</label>
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                      maxLength={500} rows={3} className="input-field" placeholder="Any notes about your order..." />
                  </div>
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div>
                <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary mb-1">Payment</h1>
                <p className="text-on-surface-variant font-body-md text-body-md">Select payment method, scan to pay, and upload proof.</p>
              </div>

              <div className="space-y-stack-md">
                {paymentMethod !== 'CASH' && (
                  <div className="bg-surface-container-lowest border border-outline-variant p-stack-lg rounded-lg shadow-sm">
                    <h2 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-stack-md">Scan & Pay (UPI)</h2>
                    {shopLoading ? (
                      <Spinner size="sm" />
                    ) : shop?.upiId ? (
                      <div className="flex flex-col items-center gap-stack-md p-stack-md bg-surface rounded-lg border border-outline-variant">
                        <div className="bg-white p-4 rounded-lg">
                          <QRCodeSVG
                            value={`upi://pay?pa=${shop.upiId}&am=${total}&tn=PrintFlow&cu=INR`}
                            size={180}
                            level="M"
                            includeMargin
                          />
                        </div>
                        <div className="text-center">
                          <p className="font-label-md text-label-md text-on-surface-variant">UPI ID</p>
                          <p className="font-body-md text-body-md font-mono font-semibold text-primary">{shop.upiId}</p>
                        </div>
                        <div className="bg-surface-container-low p-stack-sm rounded-lg w-full text-center">
                          <p className="font-body-sm text-body-sm text-on-surface-variant">Amount: <span className="font-bold text-primary font-headline-md text-headline-md">{formatCurrency(total)}</span></p>
                          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Send exact amount. Order ID will be in payment note.</p>
                        </div>
                      </div>
                    ) : (
                      <p className="font-body-sm text-body-sm text-on-surface-variant text-center p-stack-md">UPI details not available for this shop.</p>
                    )}
                  </div>
                )}

                <div className="bg-surface-container-lowest border border-outline-variant p-stack-lg rounded-lg shadow-sm">
                  <h2 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-stack-md">Payment Method</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-md">
                    {[
                      { value: 'GPAY', icon: 'account_balance_wallet', label: 'Google Pay', desc: 'Pay via any UPI App' },
                      { value: 'PHONEPE', icon: 'smartphone', label: 'PhonePe', desc: 'Fast & Secure' },
                      { value: 'PAYTM', icon: 'payments', label: 'Paytm', desc: 'Instant Transfer' },
                      { value: 'UPI', icon: 'qr_code', label: 'UPI', desc: 'Direct UPI Transfer' },
                      { value: 'CASH', icon: 'payments', label: 'Cash (on pickup)', desc: 'Pay when you collect' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setPaymentMethod(opt.value)}
                        className={`flex items-center gap-stack-md p-stack-md border rounded-lg transition-all text-left ${
                          paymentMethod === opt.value ? 'border-secondary bg-[#fff9f5]' : 'border-outline-variant hover:border-secondary'
                        }`}
                      >
                        <div className="w-12 h-12 bg-surface-container rounded flex items-center justify-center text-primary">
                          <span className="material-symbols-outlined text-3xl">{opt.icon}</span>
                        </div>
                        <div>
                          <p className="font-bold text-on-surface">{opt.label}</p>
                          <p className="font-body-sm text-body-sm text-on-surface-variant">{opt.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {paymentMethod !== 'CASH' && (
                  <div className="bg-surface-container-lowest border border-outline-variant p-stack-lg rounded-lg shadow-sm">
                    <h2 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-stack-md">Transaction Details</h2>
                    <div className="space-y-stack-md">
                      <div>
                        <label className="font-body-sm text-body-sm font-semibold text-on-surface block mb-1">UPI Transaction ID (UTR)</label>
                        <input
                          type="text"
                          value={utr}
                          onChange={(e) => setUtr(e.target.value)}
                          className="input-field"
                          placeholder="e.g., 123456789012"
                          maxLength={50}
                        />
                        <p className="font-label-md text-label-md text-on-surface-variant mt-1">Enter the 12-digit UTR from your payment app after scanning the QR.</p>
                      </div>
                      <div>
                        <h3 className="font-body-sm text-body-sm font-semibold text-on-surface block mb-2">Payment Screenshot (Optional but recommended)</h3>
                        <PaymentProofUpload onUploadComplete={(url) => setPaymentProofUrl(url)} />
                      </div>
                    </div>
                  </div>
                )}

                {paymentMethod === 'CASH' && (
                  <div className="bg-surface-container-lowest border border-outline-variant p-stack-lg rounded-lg shadow-sm">
                    <h2 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-stack-md">Cash on Pickup</h2>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">You can pay with cash when you collect your order at the shop.</p>
                  </div>
                )}
              </div>
            </>
          )}

          <div className="flex justify-between items-center">
            <div>
              {step > 0 && (
                <button onClick={() => setStep(step - 1)} className="btn-ghost">
                  <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                  Back
                </button>
              )}
            </div>
            <div className="flex items-center gap-stack-md">
              {step < STEPS.length - 1 ? (
                <button onClick={() => setStep(step + 1)} disabled={!canNextStep()} className="btn-primary">
                  Next
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
              ) : (
                <button onClick={handleSubmit} disabled={submitting || !canNextStep()} className="btn-primary">
                  {submitting ? <Spinner size="sm" /> : null}
                  {submitting ? 'Placing Order...' : 'Place Order'}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 relative">
          <div className="sticky top-[88px] flex flex-col gap-stack-md">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm flex flex-col">
              <div className="p-stack-md border-b border-surface-variant bg-surface-container-low flex justify-between items-center">
                <h2 className="font-headline-md text-headline-md text-primary">Order Summary</h2>
                <span className="material-symbols-outlined text-outline">receipt_long</span>
              </div>
              <div className="p-stack-md flex flex-col gap-stack-sm flex-1">
                {files.map((f, i) => (
                  <div key={i}>
                    <div className="flex justify-between items-start font-body-sm text-body-sm">
                      <div className="flex flex-col">
                        <span className="font-bold text-on-surface">{f.fileName.length > 25 ? f.fileName.substring(0, 25) + '...' : f.fileName}</span>
                        <span className="text-on-surface-variant">
                          {f.pageCount}pgs &middot; {f.printType === 'COLOR' ? 'Color' : 'B&W'} &middot; {f.sideType === 'DOUBLE' ? 'Double' : 'Single'}
                        </span>
                        {f.lamination !== 'NONE' && <span className="text-on-surface-variant">Lamination applied</span>}
                      </div>
                      <span className="font-bold text-on-surface">{formatCurrency(documentPrices[i]?.subtotal)}</span>
                    </div>
                    {i < files.length - 1 && <div className="h-px w-full bg-surface-variant my-2" />}
                  </div>
                ))}
                <div className="h-px w-full bg-surface-variant my-2" />
                <div className="flex justify-between items-center font-body-sm text-body-sm text-on-surface-variant">
                  <span>Subtotal</span>
                  <span>{formatCurrency(documentsTotal)}</span>
                </div>
                {urgencyFee > 0 && (
                  <div className="flex justify-between items-center font-body-sm text-body-sm text-on-surface-variant">
                    <span>Rush Fee ({urgency})</span>
                    <span className="text-secondary">+{formatCurrency(urgencyFee)}</span>
                  </div>
                )}
                <div className="h-px w-full bg-surface-variant my-2" />
                <div className="flex justify-between items-end">
                  <span className="font-body-lg text-body-lg font-bold text-on-surface">Total</span>
                  <span className="font-headline-md text-headline-md text-primary">{formatCurrency(total)}</span>
                </div>
              </div>
              {step === 3 && (
                <div className="p-stack-md bg-surface-container-lowest border-t border-surface-variant flex flex-col gap-stack-sm">
                  <div className="flex items-center justify-center gap-2 p-2 bg-secondary-fixed/30 text-on-secondary-container rounded font-label-md text-label-md">
                    <span className="material-symbols-outlined text-[16px] animate-pulse">timer</span>
                    <span>Hold price for: 14:59</span>
                  </div>
                </div>
              )}
            </div>
            <div className="bg-surface-container-low border border-outline-variant rounded-xl p-stack-md flex items-start gap-3">
              <span className="material-symbols-outlined text-primary mt-1">help</span>
              <div>
                <h4 className="font-label-md text-label-md text-on-surface uppercase mb-1">Need Assistance?</h4>
                <p className="font-body-sm text-body-sm text-on-surface-variant mb-2">Our technical team is available to help with complex file configurations.</p>
                <a className="font-label-md text-label-md text-primary hover:underline" href="#">Chat with Support</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
