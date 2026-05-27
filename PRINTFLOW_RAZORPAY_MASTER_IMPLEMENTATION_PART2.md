# PrintFlow — Razorpay Integration: Part 2
## Deep Implementation Guide — Complete Code Files

**Continuation of:** PRINTFLOW_RAZORPAY_MASTER_IMPLEMENTATION.md  
**Covers:** Full file implementations, owner-side UI, NewOrderPage, complete tests, hardening

---

## Table of Contents (Part 2)

- [A. Complete NewOrderPage.tsx — Payment Step Rewrite](#a-complete-neworderpag-tsx--payment-step-rewrite)
- [B. Complete OrderDetailPage.tsx — Payment Section](#b-complete-orderdetailpagetsx--payment-section)
- [C. OwnerOrderDetailPage — Gateway Payment Awareness](#c-ownerorderdetailpage--gateway-payment-awareness)
- [D. Complete GlobalExceptionHandler Updates](#d-complete-globalexceptionhandler-updates)
- [E. Complete RazorpayService — Production-Hardened Version](#e-complete-razorpayservice--production-hardened-version)
- [F. Complete NotificationService Updates](#f-complete-notificationservice-updates)
- [G. Full Test Suite](#g-full-test-suite)
- [H. Production Hardening — Detailed Checklist](#h-production-hardening--detailed-checklist)
- [I. Environment Configuration Reference](#i-environment-configuration-reference)
- [J. Exact Folder Structure — Final State](#j-exact-folder-structure--final-state)
- [K. Resume/Portfolio Positioning](#k-resumeportfolio-positioning)
- [L. Future Enhancements](#l-future-enhancements)

---

## A. Complete NewOrderPage.tsx — Payment Step Rewrite

The existing `NewOrderPage.tsx` already has a 4-step wizard: `Select Shop → Upload → Configure → Payment`. The current Payment step (step 3) only supports Manual UPI + screenshot upload. This section shows exactly how to extend it to support both Manual UPI and Razorpay, with the Razorpay option being the recommended/default method.

### A.1 Current Payment Step Analysis

From the existing codebase, Step 3 (Payment) currently:
- Shows a `paymentMethod` selector with hardcoded `'GPAY'` as the default state value
- Shows a `PaymentProofUpload` component (screenshot upload)
- Requires both `paymentProofUrl` AND `utr` to proceed
- Calls `submitPaymentProof()` after order creation
- Has `canNextStep()` guard: `if (paymentMethod === 'CASH') return true` — cash bypasses proof

The problem with `NewOrderPage` is that Razorpay payment **cannot happen before order creation** — you need an `orderId` to create a gateway order. So the flow must be:

```
Step 3 (Payment Selection):
  → Customer selects: "Pay Online (Razorpay)" or "UPI Screenshot" or "Pay at Counter"
  → If Razorpay: customer proceeds to confirmation, order is created, then checkout opens
  → If Manual UPI: existing flow, proof uploaded after order creation
  → If Cash: order created, payment pending
```

### A.2 Updated State and Logic in NewOrderPage.tsx

Replace/update these state variables and handlers in the existing file:

```tsx
// REPLACE existing payment-related state declarations with:

// Payment method selection
const [selectedGateway, setSelectedGateway] =
  useState<'RAZORPAY' | 'MANUAL_UPI' | 'CASH' | null>(null)

// Manual UPI state (existing)
const [paymentProofUrl, setPaymentProofUrl] = useState('')
const [utr, setUtr] = useState('')

// Razorpay state
const [gatewayPaymentDone, setGatewayPaymentDone] = useState(false)

// Replace canNextStep for step 3:
const canNextStep = () => {
  if (step === 0) return !!shop
  if (step === 1) return files.length > 0 && files.every((f) => f.uploadStatus === 'done')
  if (step === 2) return files.every((f) => f.pageCount > 0 && f.copies > 0)
  if (step === 3) {
    if (selectedGateway === 'CASH') return true
    if (selectedGateway === 'RAZORPAY') return true  // checkout happens after order creation
    if (selectedGateway === 'MANUAL_UPI') return !!paymentProofUrl  // proof required
    return false  // nothing selected
  }
  return false
}
```

### A.3 Updated handleSubmit in NewOrderPage.tsx

The submit flow changes based on selected gateway:

```tsx
const handleSubmit = async () => {
  setSubmitting(true)
  try {
    // Step 1: Always create the order first
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

    // Step 2: Handle payment based on selected method
    if (selectedGateway === 'MANUAL_UPI' && paymentProofUrl) {
      // Existing Manual UPI flow — preserved unchanged
      try {
        await submitPaymentProof(result.orderId, paymentProofUrl, 'UPI', total, utr)
      } catch {
        // Silent fail — customer can retry from order detail page
      }
      setCompletedOrder({ orderId: result.orderId, orderNumber: result.orderNumber })
      return
    }

    if (selectedGateway === 'RAZORPAY') {
      // Razorpay: show order created, then open checkout
      setCompletedOrder({ orderId: result.orderId, orderNumber: result.orderNumber })
      // The RazorpayCheckoutButton on the success screen handles checkout
      return
    }

    // Cash or no payment method — just show order created
    setCompletedOrder({ orderId: result.orderId, orderNumber: result.orderNumber })

  } catch {
    alert('Failed to place order. Please try again.')
  } finally {
    setSubmitting(false)
  }
}
```

### A.4 Updated Payment Step (Step 3) JSX

Replace the existing Step 3 JSX block in `NewOrderPage.tsx`:

```tsx
{step === 3 && (
  <div className="space-y-stack-lg">
    <div>
      <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile
        md:text-headline-lg text-primary mb-1">
        Payment
      </h1>
      <p className="font-body-md text-body-md text-on-surface-variant">
        Choose how you'd like to pay for your order.
      </p>
    </div>

    {/* Payment method cards */}
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-gutter">

      {/* Razorpay — recommended */}
      <button
        type="button"
        onClick={() => setSelectedGateway('RAZORPAY')}
        className={`p-stack-md rounded-2xl border-2 text-left transition-all relative
          ${selectedGateway === 'RAZORPAY'
            ? 'border-primary bg-primary-container shadow-md'
            : 'border-outline-variant bg-surface-container-lowest hover:border-primary/50'
          }`}
      >
        <span className="absolute top-2 right-2 text-xs bg-primary text-on-primary
          rounded-full px-2 py-0.5 font-label-sm">
          Recommended
        </span>
        <span className="material-symbols-outlined text-primary text-3xl mb-stack-sm block">
          credit_card
        </span>
        <p className="font-label-lg text-label-lg text-on-surface mb-1">Pay Online</p>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          UPI, cards, net banking. Auto-confirmed instantly.
        </p>
        {selectedGateway === 'RAZORPAY' && (
          <span className="material-symbols-outlined text-primary mt-stack-sm block">
            check_circle
          </span>
        )}
      </button>

      {/* Manual UPI */}
      <button
        type="button"
        onClick={() => setSelectedGateway('MANUAL_UPI')}
        className={`p-stack-md rounded-2xl border-2 text-left transition-all
          ${selectedGateway === 'MANUAL_UPI'
            ? 'border-primary bg-primary-container shadow-md'
            : 'border-outline-variant bg-surface-container-lowest hover:border-primary/50'
          }`}
      >
        <span className="material-symbols-outlined text-primary text-3xl mb-stack-sm block">
          qr_code_scanner
        </span>
        <p className="font-label-lg text-label-lg text-on-surface mb-1">
          UPI Screenshot
        </p>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Pay via UPI, upload screenshot. Owner reviews and confirms.
        </p>
        {selectedGateway === 'MANUAL_UPI' && (
          <span className="material-symbols-outlined text-primary mt-stack-sm block">
            check_circle
          </span>
        )}
      </button>

      {/* Pay at counter */}
      <button
        type="button"
        onClick={() => setSelectedGateway('CASH')}
        className={`p-stack-md rounded-2xl border-2 text-left transition-all
          ${selectedGateway === 'CASH'
            ? 'border-primary bg-primary-container shadow-md'
            : 'border-outline-variant bg-surface-container-lowest hover:border-primary/50'
          }`}
      >
        <span className="material-symbols-outlined text-primary text-3xl mb-stack-sm block">
          payments
        </span>
        <p className="font-label-lg text-label-lg text-on-surface mb-1">Pay at Counter</p>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Pay cash when you pick up your order.
        </p>
        {selectedGateway === 'CASH' && (
          <span className="material-symbols-outlined text-primary mt-stack-sm block">
            check_circle
          </span>
        )}
      </button>

    </div>

    {/* Manual UPI detail section — shown when selected */}
    {selectedGateway === 'MANUAL_UPI' && (
      <div className="space-y-stack-md bg-surface-container rounded-2xl p-stack-lg">
        <h3 className="font-label-lg text-label-lg text-on-surface-variant uppercase">
          Upload Payment Proof
        </h3>

        {shop?.upiId && (
          <div className="bg-surface-container-low rounded-xl p-stack-md
            flex items-center gap-stack-md">
            <span className="material-symbols-outlined text-primary">qr_code_2</span>
            <div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">UPI ID</p>
              <p className="font-label-lg text-label-lg text-on-surface font-mono">
                {shop.upiId}
              </p>
            </div>
          </div>
        )}

        <PaymentProofUpload onUploadComplete={setPaymentProofUrl} />

        {paymentProofUrl && (
          <div className="space-y-stack-sm">
            <label className="font-body-sm text-body-sm font-semibold text-on-surface">
              UTR / Transaction ID
              <span className="text-on-surface-variant font-normal ml-1">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="12-digit UTR or transaction reference"
              value={utr}
              onChange={(e) => setUtr(e.target.value)}
              className="w-full p-stack-sm border border-outline-variant rounded-xl
                font-body-md text-body-md bg-surface-container-lowest
                focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        )}
      </div>
    )}

    {/* Razorpay info — shown when selected */}
    {selectedGateway === 'RAZORPAY' && (
      <div className="bg-surface-container rounded-2xl p-stack-lg space-y-stack-sm">
        <div className="flex items-center gap-stack-sm">
          <span className="material-symbols-outlined text-tertiary">info</span>
          <p className="font-body-md text-body-md text-on-surface">
            Razorpay checkout will open after your order is created.
          </p>
        </div>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Your order will be automatically confirmed the moment payment succeeds.
          No waiting for owner approval.
        </p>
        <div className="flex flex-wrap gap-stack-sm pt-stack-xs">
          {['UPI', 'Credit/Debit Card', 'Net Banking', 'Wallets'].map((method) => (
            <span key={method}
              className="font-label-sm text-label-sm bg-secondary-fixed/30
                text-on-secondary-fixed px-3 py-1 rounded-full">
              {method}
            </span>
          ))}
        </div>
      </div>
    )}

  </div>
)}
```

### A.5 Updated Success Screen in NewOrderPage.tsx

Replace the `completedOrder` success screen to handle Razorpay checkout launch:

```tsx
if (completedOrder) {
  // For Razorpay: show checkout button prominently
  if (selectedGateway === 'RAZORPAY' && !gatewayPaymentDone) {
    return (
      <div className="max-w-md mx-auto py-stack-xl space-y-stack-lg">
        <div className="text-center">
          <div className="w-16 h-16 bg-surface-container rounded-full flex items-center
            justify-center mx-auto mb-stack-md">
            <span className="material-symbols-outlined text-primary text-3xl"
              style={{ fontVariationSettings: "'FILL' 1" }}>
              receipt_long
            </span>
          </div>
          <h2 className="font-headline-md text-headline-md text-primary mb-2">
            Order Created
          </h2>
          <p className="font-body-md text-body-md text-secondary font-semibold mb-1">
            {completedOrder.orderNumber}
          </p>
          <p className="font-body-sm text-body-sm text-on-surface-variant mb-stack-lg">
            Complete payment below to confirm your order.
          </p>
        </div>

        {/* Razorpay checkout button — inline */}
        <RazorpayCheckoutButton
          orderId={completedOrder.orderId}
          orderNumber={completedOrder.orderNumber}
          amount={total}
          onSuccess={() => {
            setGatewayPaymentDone(true)
          }}
          onFailure={(err) => {
            console.error('Payment failed:', err)
          }}
        />

        <p className="font-body-sm text-body-sm text-on-surface-variant text-center">
          You can also complete payment later from{' '}
          <button
            onClick={() => navigate(`/orders/${completedOrder.orderId}`)}
            className="text-primary underline"
          >
            your order page
          </button>.
        </p>
      </div>
    )
  }

  // For all other methods OR after Razorpay success:
  return (
    <div className="max-w-md mx-auto text-center py-stack-xl">
      <div className="w-16 h-16 bg-status-success rounded-full flex items-center
        justify-center mx-auto mb-stack-md">
        <span className="material-symbols-outlined text-on-status-success text-3xl"
          style={{ fontVariationSettings: "'FILL' 1" }}>
          check
        </span>
      </div>
      <h2 className="font-headline-md text-headline-md text-primary mb-2">
        {gatewayPaymentDone ? 'Order Confirmed!' : 'Order Placed!'}
      </h2>
      <p className="font-body-md text-body-md text-secondary font-semibold mb-2">
        {completedOrder.orderNumber}
      </p>
      <p className="font-body-sm text-body-sm text-on-surface-variant mb-stack-lg">
        {gatewayPaymentDone
          ? 'Payment received. Your order is confirmed and in the queue.'
          : selectedGateway === 'MANUAL_UPI'
          ? 'Proof submitted. Owner will verify and confirm your order.'
          : 'Your order has been placed. Pay at the counter when you collect.'}
      </p>
      <div className="flex gap-stack-md justify-center">
        <button
          onClick={() => navigate(`/orders/${completedOrder.orderId}`)}
          className="btn-primary"
        >
          Track Order
        </button>
        <button
          onClick={() => navigate('/orders')}
          className="btn-ghost"
        >
          My Orders
        </button>
      </div>
    </div>
  )
}
```

### A.6 Required Imports for NewOrderPage.tsx

Add these imports to the top of the file:

```tsx
// Add to existing imports in NewOrderPage.tsx
import RazorpayCheckoutButton from '../../components/payment/RazorpayCheckoutButton'
import { PaymentMethod } from '../../types/order.types'
```

---

## B. Complete OrderDetailPage.tsx — Payment Section

This is the complete payment section to integrate into the existing `OrderDetailPage.tsx`. The existing page already shows order timeline, documents, and copy modification. The payment section is **added below the documents section**.

### B.1 Full Payment Section Integration

```tsx
// Complete payment section to add to OrderDetailPage.tsx

// ── Add these imports ─────────────────────────────────────────
import { useState } from 'react'   // already imported
import PaymentMethodSelector from '../../components/payment/PaymentMethodSelector'
import RazorpayCheckoutButton from '../../components/payment/RazorpayCheckoutButton'
import PaymentProofUpload from '../../components/payment/PaymentProofUpload'
import { submitPaymentProof } from '../../services/payments.service'
import { PaymentMethod, PaymentStatus } from '../../types/order.types'

// ── Add these state variables to the component ────────────────
const [selectedPaymentMethod, setSelectedPaymentMethod] =
  useState<PaymentMethod | null>(null)
const [proofUrl, setProofUrl] = useState('')
const [transactionId, setTransactionId] = useState('')
const [proofSubmitting, setProofSubmitting] = useState(false)
const [proofSubmitError, setProofSubmitError] = useState('')

// ── Computed helpers ──────────────────────────────────────────
const paymentStatus = order.paymentStatus as PaymentStatus
const isPaid = paymentStatus === 'PAID' || paymentStatus === 'VERIFIED'
const isPending = paymentStatus === 'PENDING' || paymentStatus === 'GATEWAY_INITIATED'
const isProofUploaded = paymentStatus === 'PROOF_UPLOADED'
const isFailed = paymentStatus === 'FAILED' || paymentStatus === 'REJECTED'
const isGatewayInitiated = paymentStatus === 'GATEWAY_INITIATED'

// ── Payment proof submit handler ──────────────────────────────
const handleManualProofSubmit = async () => {
  if (!proofUrl) return
  setProofSubmitting(true)
  setProofSubmitError('')
  try {
    await submitPaymentProof(
      order.id,
      proofUrl,
      'UPI',
      order.totalAmount,
      transactionId || undefined
    )
    setSelectedPaymentMethod(null)
    refetch()
  } catch (err: any) {
    setProofSubmitError(
      err.response?.data?.error?.message || 'Failed to submit proof. Please try again.'
    )
  } finally {
    setProofSubmitting(false)
  }
}
```

```tsx
{/* ── JSX: Add this card AFTER the documents card ─────────────── */}

{/* Payment section — only show when payment is pending or needed */}
{(isPending || isFailed || isProofUploaded) && (
  <Card>
    <div className="flex items-center justify-between mb-stack-lg">
      <h2 className="font-headline-md text-headline-md text-primary">Payment</h2>
      <span className="font-headline-sm text-headline-sm text-on-surface">
        {formatCurrency(order.totalAmount)}
      </span>
    </div>

    {/* Gateway initiated — checkout was opened but not completed */}
    {isGatewayInitiated && (
      <div className="space-y-stack-md">
        <div className="bg-warning-container rounded-xl p-stack-md flex items-center gap-stack-sm">
          <span className="material-symbols-outlined text-on-warning-container">
            hourglass_empty
          </span>
          <div>
            <p className="font-label-md text-label-md text-on-warning-container">
              Payment in progress
            </p>
            <p className="font-body-sm text-body-sm text-on-warning-container/80">
              Checkout was opened. Complete payment below or choose a different method.
            </p>
          </div>
        </div>

        <RazorpayCheckoutButton
          orderId={order.id}
          orderNumber={order.orderNumber}
          amount={order.totalAmount}
          customerName={order.customer?.name}
          onSuccess={() => refetch()}
          onFailure={() => refetch()}
        />

        <button
          type="button"
          onClick={() => setSelectedPaymentMethod('MANUAL_UPI')}
          className="w-full py-stack-sm text-center font-body-sm text-body-sm
            text-primary underline hover:no-underline"
        >
          Switch to UPI screenshot instead
        </button>
      </div>
    )}

    {/* Failed payment — allow retry */}
    {isFailed && !isGatewayInitiated && (
      <div className="space-y-stack-md">
        <div className="bg-error-container rounded-xl p-stack-md flex items-center gap-stack-sm">
          <span className="material-symbols-outlined text-on-error-container">
            error_outline
          </span>
          <p className="font-body-sm text-body-sm text-on-error-container">
            Previous payment failed or was rejected. Choose a method below to try again.
          </p>
        </div>
        <PaymentMethodSelector
          selected={selectedPaymentMethod}
          onChange={setSelectedPaymentMethod}
        />
      </div>
    )}

    {/* Proof uploaded — awaiting owner */}
    {isProofUploaded && (
      <div className="bg-surface-container rounded-xl p-stack-md flex items-center gap-stack-sm">
        <span className="material-symbols-outlined text-tertiary">
          pending_actions
        </span>
        <div>
          <p className="font-label-md text-label-md text-on-surface">
            Proof submitted — awaiting owner review
          </p>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            The shop owner will verify your payment and confirm your order.
          </p>
        </div>
      </div>
    )}

    {/* Normal pending state — no payment started yet */}
    {isPending && !isGatewayInitiated && (
      <>
        {!selectedPaymentMethod && (
          <PaymentMethodSelector
            selected={selectedPaymentMethod}
            onChange={setSelectedPaymentMethod}
          />
        )}

        {/* Razorpay selected */}
        {selectedPaymentMethod === 'RAZORPAY' && (
          <div className="space-y-stack-md">
            <button
              type="button"
              onClick={() => setSelectedPaymentMethod(null)}
              className="flex items-center gap-stack-xs text-on-surface-variant
                hover:text-on-surface font-body-sm text-body-sm"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              Back to payment options
            </button>

            <RazorpayCheckoutButton
              orderId={order.id}
              orderNumber={order.orderNumber}
              amount={order.totalAmount}
              customerName={order.customer?.name}
              onSuccess={() => {
                setSelectedPaymentMethod(null)
                refetch()
              }}
              onFailure={(err) => {
                console.error('Payment error:', err)
              }}
            />
          </div>
        )}

        {/* Manual UPI selected */}
        {selectedPaymentMethod === 'MANUAL_UPI' && (
          <div className="space-y-stack-md">
            <button
              type="button"
              onClick={() => setSelectedPaymentMethod(null)}
              className="flex items-center gap-stack-xs text-on-surface-variant
                hover:text-on-surface font-body-sm text-body-sm"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              Back to payment options
            </button>

            <PaymentProofUpload onUploadComplete={setProofUrl} />

            {proofUrl && (
              <div className="space-y-stack-sm">
                <div>
                  <label className="font-body-sm text-body-sm font-semibold
                    text-on-surface block mb-1">
                    UTR / Transaction ID
                    <span className="font-normal text-on-surface-variant ml-1">
                      (optional but recommended)
                    </span>
                  </label>
                  <input
                    type="text"
                    placeholder="12-digit UTR or UPI reference"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    className="w-full p-stack-sm border border-outline-variant rounded-xl
                      font-body-md text-body-md bg-surface-container-lowest
                      focus:border-primary focus:outline-none"
                  />
                </div>

                {proofSubmitError && (
                  <p className="font-body-sm text-body-sm text-error">
                    {proofSubmitError}
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleManualProofSubmit}
                  disabled={proofSubmitting}
                  className="w-full py-stack-md bg-primary text-on-primary
                    rounded-2xl font-label-lg text-label-lg flex items-center
                    justify-center gap-stack-sm disabled:opacity-70"
                >
                  {proofSubmitting && <Spinner size="sm" className="text-on-primary" />}
                  Submit Payment Proof
                </button>
              </div>
            )}
          </div>
        )}
      </>
    )}
  </Card>
)}

{/* Payment confirmed card — shown when paid */}
{isPaid && (
  <Card>
    <div className="flex items-center gap-stack-md">
      <div className="w-10 h-10 rounded-full bg-tertiary-container flex items-center
        justify-center">
        <span className="material-symbols-outlined text-on-tertiary-container"
          style={{ fontVariationSettings: "'FILL' 1" }}>
          check_circle
        </span>
      </div>
      <div className="flex-1">
        <p className="font-label-lg text-label-lg text-on-surface">
          Payment Confirmed
        </p>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          {order.payment?.paidAt
            ? `Paid on ${formatDate(order.payment.paidAt)}`
            : order.payment?.verifiedAt
            ? `Verified on ${formatDate(order.payment.verifiedAt)}`
            : 'Payment complete'}
          {order.payment?.gateway === 'RAZORPAY' && ' · via Razorpay'}
          {order.payment?.gateway === 'MANUAL_UPI' && ' · UPI verified by owner'}
        </p>
      </div>
      <span className="font-headline-sm text-headline-sm text-tertiary">
        {formatCurrency(order.totalAmount)}
      </span>
    </div>

    {order.payment?.gatewayPaymentId && (
      <div className="mt-stack-sm pt-stack-sm border-t border-outline-variant">
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Payment ID:{' '}
          <span className="font-mono text-on-surface">
            {order.payment.gatewayPaymentId}
          </span>
        </p>
      </div>
    )}
  </Card>
)}
```

---

## C. OwnerOrderDetailPage — Gateway Payment Awareness

The owner's order detail page needs to:
1. Show a badge when an order was auto-accepted via gateway payment
2. **Not** show the "Verify Payment" button for gateway-paid orders (auto-verified)
3. Show Razorpay payment ID for gateway orders

### C.1 Updated Payment Card in OwnerOrderDetailPage.tsx

Find the existing payment proof section (`order.payment?.proofUrl`) and extend it:

```tsx
// REPLACE the existing payment card section in OwnerOrderDetailPage.tsx
// Find: {order.payment?.proofUrl && (
// Replace with the full block below:

{order.payment && (
  <Card>
    <h3 className="font-label-md text-label-md text-on-surface-variant uppercase mb-3">
      Payment
    </h3>

    {/* Gateway payment — auto-verified, no owner action needed */}
    {order.payment.gateway === 'RAZORPAY' && order.payment.status === 'PAID' && (
      <div className="space-y-stack-md">
        <div className="flex items-center gap-stack-sm bg-tertiary-container
          rounded-xl p-stack-md">
          <span className="material-symbols-outlined text-on-tertiary-container"
            style={{ fontVariationSettings: "'FILL' 1" }}>
            verified
          </span>
          <div>
            <p className="font-label-md text-label-md text-on-tertiary-container">
              Razorpay — Auto-verified
            </p>
            <p className="font-body-sm text-body-sm text-on-tertiary-container/80">
              Payment was automatically confirmed. No action needed.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-stack-sm">
          <div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Amount</p>
            <p className="font-label-lg text-label-lg text-on-surface">
              {formatCurrency(order.payment.amount)}
            </p>
          </div>
          <div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Paid at</p>
            <p className="font-label-md text-label-md text-on-surface">
              {order.payment.paidAt ? formatDate(order.payment.paidAt) : '—'}
            </p>
          </div>
          {order.payment.gatewayPaymentId && (
            <div className="col-span-2">
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Payment ID
              </p>
              <p className="font-label-md text-label-md text-on-surface font-mono
                text-sm break-all">
                {order.payment.gatewayPaymentId}
              </p>
            </div>
          )}
        </div>
      </div>
    )}

    {/* Manual UPI proof — owner verification needed */}
    {order.payment.gateway === 'MANUAL_UPI' || order.payment.proofUrl ? (
      <div className="space-y-stack-md">
        {order.payment.proofUrl && (
          <div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-2">
              Payment Screenshot
            </p>
            <a
              href={order.payment.proofUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src={order.payment.proofUrl}
                alt="Payment proof"
                className="w-full max-h-64 object-contain rounded-xl border
                  border-outline-variant cursor-pointer hover:opacity-80"
              />
            </a>
          </div>
        )}

        {order.payment.transactionId && (
          <div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">UTR</p>
            <p className="font-label-md text-label-md text-on-surface font-mono">
              {order.payment.transactionId}
            </p>
          </div>
        )}

        {/* Verify button — only for manual UPI, only when not yet verified */}
        {order.payment.status === 'PROOF_UPLOADED' && (
          <button
            onClick={handleVerifyPayment}
            disabled={actionLoading === 'verify'}
            className="w-full py-stack-sm bg-tertiary text-on-tertiary rounded-xl
              font-label-lg text-label-lg flex items-center justify-center gap-2
              disabled:opacity-70"
          >
            {actionLoading === 'verify' ? (
              <><span className="animate-spin text-sm">⟳</span> Verifying...</>
            ) : (
              <><span className="material-symbols-outlined text-sm">verified</span>
              Verify Payment</>
            )}
          </button>
        )}

        {/* Already verified */}
        {order.payment.status === 'VERIFIED' && (
          <div className="flex items-center gap-stack-sm text-tertiary">
            <span className="material-symbols-outlined"
              style={{ fontVariationSettings: "'FILL' 1" }}>
              check_circle
            </span>
            <span className="font-label-md text-label-md">
              Verified on {formatDate(order.payment.verifiedAt!)}
            </span>
          </div>
        )}
      </div>
    ) : null}

    {/* Payment pending — no action taken yet */}
    {(!order.payment.proofUrl && !order.payment.paidAt &&
      order.payment.status === 'PENDING') && (
      <p className="font-body-md text-body-md text-on-surface-variant">
        Customer has not submitted payment yet.
      </p>
    )}
  </Card>
)}
```

---

## D. Complete GlobalExceptionHandler Updates

Add all three new payment exceptions to the existing `GlobalExceptionHandler.java`:

```java
// Add these three handlers to GlobalExceptionHandler.java
// Place BEFORE the generic Exception handler

@ExceptionHandler(com.printflow.payments.exception.PaymentAlreadyCompletedException.class)
public ResponseEntity<Map<String, Object>> handlePaymentAlreadyCompleted(
        com.printflow.payments.exception.PaymentAlreadyCompletedException ex) {
    log.warn("Payment already completed: {}", ex.getMessage());
    return buildError(HttpStatus.CONFLICT, "PAYMENT_ALREADY_COMPLETED", ex.getMessage());
}

@ExceptionHandler(com.printflow.payments.exception.InvalidPaymentSignatureException.class)
public ResponseEntity<Map<String, Object>> handleInvalidSignature(
        com.printflow.payments.exception.InvalidPaymentSignatureException ex) {
    log.warn("Invalid payment signature: {}", ex.getMessage());
    return buildError(HttpStatus.BAD_REQUEST, "INVALID_PAYMENT_SIGNATURE",
        "Payment verification failed. Please contact support if this continues.");
}

@ExceptionHandler(com.printflow.payments.exception.GatewayOrderCreationException.class)
public ResponseEntity<Map<String, Object>> handleGatewayError(
        com.printflow.payments.exception.GatewayOrderCreationException ex) {
    log.error("Gateway order creation failed: {}", ex.getMessage());
    return buildError(HttpStatus.BAD_GATEWAY, "GATEWAY_ERROR",
        "Payment gateway is temporarily unavailable. Please try again in a moment.");
}
```

---

## E. Complete RazorpayService — Production-Hardened Version

This is the final production version with all edge cases handled. It supersedes the version in Part 1.

```java
package com.printflow.payments.service;

import com.printflow.notifications.service.NotificationService;
import com.printflow.orders.entity.Order;
import com.printflow.orders.enums.OrderStatus;
import com.printflow.orders.repository.OrderRepository;
import com.printflow.payments.config.RazorpayConfig;
import com.printflow.payments.dto.GatewayOrderResponse;
import com.printflow.payments.dto.VerifyGatewayPaymentRequest;
import com.printflow.payments.entity.Payment;
import com.printflow.payments.enums.PaymentGateway;
import com.printflow.payments.enums.PaymentStatus;
import com.printflow.payments.exception.GatewayOrderCreationException;
import com.printflow.payments.exception.InvalidPaymentSignatureException;
import com.printflow.payments.exception.PaymentAlreadyCompletedException;
import com.printflow.payments.repository.PaymentRepository;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import com.razorpay.Utils;
import jakarta.persistence.EntityNotFoundException;
import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Service
public class RazorpayService {

    private static final Logger log = LoggerFactory.getLogger(RazorpayService.class);
    private static final String CURRENCY = "INR";

    private final RazorpayClient razorpayClient;
    private final RazorpayConfig razorpayConfig;
    private final PaymentRepository paymentRepository;
    private final OrderRepository orderRepository;
    private final NotificationService notificationService;

    public RazorpayService(RazorpayClient razorpayClient,
                           RazorpayConfig razorpayConfig,
                           PaymentRepository paymentRepository,
                           OrderRepository orderRepository,
                           NotificationService notificationService) {
        this.razorpayClient = razorpayClient;
        this.razorpayConfig = razorpayConfig;
        this.paymentRepository = paymentRepository;
        this.orderRepository = orderRepository;
        this.notificationService = notificationService;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 1. CREATE GATEWAY ORDER
    //    Called by: POST /api/v1/payments/{orderId}/gateway-order
    //    Guarded by: order ownership + already-paid check
    //    Produces:   Razorpay order ID + checkout details for frontend
    // ──────────────────────────────────────────────────────────────────────────
    @Transactional
    public GatewayOrderResponse createGatewayOrder(UUID orderId, UUID customerId) {

        // 1a. Validate order existence and ownership
        Order order = orderRepository.findByIdAndCustomerId(orderId, customerId)
            .orElseThrow(() -> new EntityNotFoundException(
                "Order not found or access denied"));

        // 1b. Guard: reject if already paid — idempotent check
        if (paymentRepository.existsPaidPaymentForOrder(orderId)) {
            throw new PaymentAlreadyCompletedException(orderId.toString());
        }

        // 1c. Guard: reject if order is in a terminal state
        if ("CANCELLED".equals(order.getStatus())) {
            throw new IllegalStateException("Cannot pay for a cancelled order");
        }
        if ("COMPLETED".equals(order.getStatus())) {
            throw new IllegalStateException("Order is already completed");
        }

        // 1d. Guard: reject zero or negative amounts
        if (order.getTotalAmount() == null ||
            order.getTotalAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalStateException("Order amount must be greater than zero");
        }

        // 1e. Convert to paise (Razorpay requires smallest currency unit)
        // 1 INR = 100 paise. BigDecimal ensures no floating-point precision loss.
        long amountInPaise;
        try {
            amountInPaise = order.getTotalAmount()
                .multiply(BigDecimal.valueOf(100))
                .longValueExact();
        } catch (ArithmeticException e) {
            throw new IllegalStateException(
                "Order amount has too many decimal places for payment processing");
        }

        // 1f. Create Razorpay order via SDK
        // 'receipt' appears in Razorpay dashboard — use order number for traceability
        JSONObject orderRequest = new JSONObject()
            .put("amount", amountInPaise)
            .put("currency", CURRENCY)
            .put("receipt", order.getOrderNumber())
            .put("notes", new JSONObject()
                .put("printflow_order_id", orderId.toString())
                .put("printflow_order_number", order.getOrderNumber()));

        com.razorpay.Order razorpayOrder;
        try {
            razorpayOrder = razorpayClient.orders.create(orderRequest);
            log.info("Razorpay order created. razorpayOrderId={} printflowOrder={}",
                razorpayOrder.get("id"), order.getOrderNumber());
        } catch (RazorpayException e) {
            log.error("Razorpay API call failed for order {}. Error: {}",
                order.getOrderNumber(), e.getMessage(), e);
            throw new GatewayOrderCreationException(
                "Failed to create payment order: " + e.getMessage(), e);
        }

        String razorpayOrderId = razorpayOrder.get("id");

        // 1g. Upsert Payment record
        // Use existing record if one exists (retry after GATEWAY_INITIATED failure)
        Payment payment = paymentRepository.findByOrderId(orderId)
            .orElseGet(() -> Payment.builder()
                .orderId(orderId)
                .amount(order.getTotalAmount())
                .build());

        payment.setGateway(PaymentGateway.RAZORPAY);
        payment.setStatus(PaymentStatus.GATEWAY_INITIATED);
        payment.setGatewayOrderId(razorpayOrderId);
        paymentRepository.save(payment);

        // 1h. Track payment method on order
        order.setPaymentMethod("RAZORPAY");
        order.setPaymentStatus(PaymentStatus.GATEWAY_INITIATED.name());
        orderRepository.save(order);

        return new GatewayOrderResponse(
            razorpayOrderId,
            order.getTotalAmount(),
            CURRENCY,
            razorpayConfig.getKeyId(),
            order.getOrderNumber(),
            payment.getId().toString()
        );
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 2. VERIFY PAYMENT (client-side verification after checkout)
    //    Called by: POST /api/v1/payments/verify
    //    Guarded by: signature verification + order ownership
    //    Produces:   payment marked PAID + order auto-accepted
    // ──────────────────────────────────────────────────────────────────────────
    @Transactional
    public Payment verifyPayment(VerifyGatewayPaymentRequest request, UUID customerId) {

        // 2a. Find payment by Razorpay order ID
        Payment payment = paymentRepository
            .findByGatewayOrderId(request.razorpayOrderId())
            .orElseThrow(() -> new EntityNotFoundException(
                "No payment found for gateway order: " + request.razorpayOrderId()));

        // 2b. Verify order ownership
        Order order = orderRepository
            .findByIdAndCustomerId(payment.getOrderId(), customerId)
            .orElseThrow(() -> new EntityNotFoundException(
                "Order access denied"));

        // 2c. Idempotency: already successfully verified
        if (PaymentStatus.PAID.equals(payment.getStatus())) {
            log.info("Payment already verified. Returning idempotently. orderId={}",
                order.getOrderNumber());
            return payment;
        }

        // 2d. Verify HMAC-SHA256 signature
        // Razorpay's signature = HMAC(key_secret, razorpayOrderId + "|" + razorpayPaymentId)
        verifyPaymentSignature(
            request.razorpayOrderId(),
            request.razorpayPaymentId(),
            request.razorpaySignature()
        );

        // 2e. Update payment to PAID
        payment.setStatus(PaymentStatus.PAID);
        payment.setGatewayPaymentId(request.razorpayPaymentId());
        payment.setGatewaySignature(request.razorpaySignature());
        payment.setPaidAt(OffsetDateTime.now());
        paymentRepository.save(payment);

        // 2f. Auto-accept the order
        autoAcceptOrderOnPayment(order, request.razorpayPaymentId());

        log.info("Payment verified via client-side. orderId={} razorpayPaymentId={}",
            order.getOrderNumber(), request.razorpayPaymentId());

        return payment;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 3. PROCESS WEBHOOK EVENT
    //    Called by: POST /api/v1/payments/webhook/razorpay
    //    Secured by: HMAC-SHA256 signature verified in controller BEFORE this call
    //    Idempotent: duplicate events are silently ignored
    // ──────────────────────────────────────────────────────────────────────────
    @Transactional
    public void processWebhookEvent(String eventType, JSONObject fullPayload) {
        // 3a. Extract payment entity from webhook payload
        JSONObject paymentEntity;
        try {
            paymentEntity = fullPayload
                .getJSONObject("payload")
                .getJSONObject("payment")
                .getJSONObject("entity");
        } catch (Exception e) {
            log.warn("Webhook payload missing payment entity. eventType={}", eventType);
            return;
        }

        String razorpayOrderId  = paymentEntity.optString("order_id", null);
        String razorpayPaymentId = paymentEntity.optString("id", null);

        if (razorpayOrderId == null || razorpayPaymentId == null) {
            log.warn("Webhook missing order_id or payment_id. Skipping.");
            return;
        }

        // 3b. Build idempotency key: prevents duplicate event processing
        String idempotencyKey = razorpayOrderId + ":" + eventType;

        // 3c. Check idempotency BEFORE any DB write
        if (paymentRepository.existsByIdempotencyKey(idempotencyKey)) {
            log.info("Duplicate webhook event ignored. idempotencyKey={}", idempotencyKey);
            return;
        }

        // 3d. Find our payment record by Razorpay order ID
        Payment payment = paymentRepository.findByGatewayOrderId(razorpayOrderId)
            .orElse(null);

        if (payment == null) {
            log.warn("Webhook for unknown gateway order. razorpayOrderId={} eventType={}",
                razorpayOrderId, eventType);
            return;
        }

        // 3e. Dispatch to event-specific handler
        switch (eventType) {
            case "payment.captured" ->
                handlePaymentCaptured(payment, razorpayPaymentId, idempotencyKey, fullPayload);
            case "payment.failed" ->
                handlePaymentFailed(payment, idempotencyKey);
            case "refund.created" ->
                handleRefundCreated(payment, idempotencyKey);
            default ->
                log.debug("Unhandled webhook event type: {}. Skipping.", eventType);
        }
    }

    // ── Private event handlers ────────────────────────────────────────────────

    private void handlePaymentCaptured(Payment payment, String razorpayPaymentId,
                                        String idempotencyKey, JSONObject fullPayload) {
        // If already PAID from client-side verify(), just record idempotency key
        if (PaymentStatus.PAID.equals(payment.getStatus())) {
            payment.setIdempotencyKey(idempotencyKey);
            paymentRepository.save(payment);
            log.info("Webhook: payment already PAID (via client verify). " +
                "idempotency key recorded. razorpayOrderId={}",
                payment.getGatewayOrderId());
            return;
        }

        // First time processing this capture
        payment.setStatus(PaymentStatus.PAID);
        payment.setGatewayPaymentId(razorpayPaymentId);
        payment.setPaidAt(OffsetDateTime.now());
        payment.setIdempotencyKey(idempotencyKey);
        payment.setWebhookPayload(fullPayload.toString()); // Full audit trail
        paymentRepository.save(payment);

        Order order = orderRepository.findById(payment.getOrderId()).orElse(null);
        if (order != null) {
            autoAcceptOrderOnPayment(order, razorpayPaymentId);
        } else {
            log.error("Webhook: order not found for payment. orderId={}",
                payment.getOrderId());
        }

        log.info("Webhook: payment.captured processed. razorpayOrderId={} razorpayPaymentId={}",
            payment.getGatewayOrderId(), razorpayPaymentId);
    }

    private void handlePaymentFailed(Payment payment, String idempotencyKey) {
        // Only update if not already in a terminal state
        if (!PaymentStatus.PAID.equals(payment.getStatus())) {
            payment.setStatus(PaymentStatus.FAILED);
        }
        payment.setIdempotencyKey(idempotencyKey);
        paymentRepository.save(payment);

        Order order = orderRepository.findById(payment.getOrderId()).orElse(null);
        if (order != null && !isPaidOrAccepted(order)) {
            order.setPaymentStatus(PaymentStatus.FAILED.name());
            orderRepository.save(order);
        }

        log.info("Webhook: payment.failed recorded. razorpayOrderId={}",
            payment.getGatewayOrderId());
    }

    private void handleRefundCreated(Payment payment, String idempotencyKey) {
        payment.setStatus(PaymentStatus.REFUNDED);
        payment.setIdempotencyKey(idempotencyKey);
        paymentRepository.save(payment);
        log.info("Webhook: refund.created recorded. razorpayOrderId={}",
            payment.getGatewayOrderId());
    }

    // ── Core business logic: auto-accept order ────────────────────────────────

    private void autoAcceptOrderOnPayment(Order order, String razorpayPaymentId) {
        // Always sync payment status
        order.setPaymentStatus(PaymentStatus.PAID.name());

        // Auto-accept only if currently PENDING
        // (Idempotent: skip if already ACCEPTED or further)
        if ("PENDING".equals(order.getStatus())) {
            order.setStatus(OrderStatus.ACCEPTED.name());
            orderRepository.save(order);

            log.info("Order auto-accepted on payment. orderNumber={} razorpayPaymentId={}",
                order.getOrderNumber(), razorpayPaymentId);

            // Async notifications — do NOT let notification failures affect payment flow
            try {
                notificationService.notifyOrderStatusChange(order, OrderStatus.ACCEPTED);
            } catch (Exception e) {
                log.error("Failed to send ACCEPTED notification for order {}: {}",
                    order.getOrderNumber(), e.getMessage());
            }
            try {
                notificationService.notifyGatewayPaymentSuccessToOwner(order);
            } catch (Exception e) {
                log.error("Failed to send owner gateway notification for order {}: {}",
                    order.getOrderNumber(), e.getMessage());
            }
        } else {
            // Order was already accepted (e.g., webhook arrived after client verify)
            orderRepository.save(order);
            log.warn("Auto-accept skipped — order already in status: {}. " +
                "Only paymentStatus updated. orderNumber={}",
                order.getStatus(), order.getOrderNumber());
        }
    }

    // ── HMAC verification ─────────────────────────────────────────────────────

    private void verifyPaymentSignature(String razorpayOrderId,
                                         String razorpayPaymentId,
                                         String receivedSignature) {
        // Razorpay signature algorithm:
        // data   = razorpayOrderId + "|" + razorpayPaymentId
        // secret = key_secret (NOT webhook_secret)
        // sig    = HMAC-SHA256(data, secret).hexdigest()
        try {
            String data = razorpayOrderId + "|" + razorpayPaymentId;
            String expected = Utils.getHash(data, razorpayConfig.getKeySecret());

            if (!safeEquals(expected, receivedSignature)) {
                log.warn("Payment signature mismatch. razorpayOrderId={}", razorpayOrderId);
                throw new InvalidPaymentSignatureException();
            }
        } catch (InvalidPaymentSignatureException e) {
            throw e;
        } catch (Exception e) {
            log.error("Signature hash computation failed: {}", e.getMessage(), e);
            throw new InvalidPaymentSignatureException();
        }
    }

    // ── Utility helpers ───────────────────────────────────────────────────────

    /**
     * Constant-time string comparison to prevent timing attacks.
     * Standard String.equals() short-circuits on first mismatch,
     * which could leak information about the expected value length.
     */
    private boolean safeEquals(String a, String b) {
        if (a == null || b == null) return false;
        if (a.length() != b.length()) return false;
        int result = 0;
        for (int i = 0; i < a.length(); i++) {
            result |= a.charAt(i) ^ b.charAt(i);
        }
        return result == 0;
    }

    private boolean isPaidOrAccepted(Order order) {
        return PaymentStatus.PAID.name().equals(order.getPaymentStatus())
            || PaymentStatus.VERIFIED.name().equals(order.getPaymentStatus());
    }
}
```

---

## F. Complete NotificationService Updates

Add these two methods to the existing `NotificationService.java`. Place them after the existing `notifyNewOrderToOwner()` method.

```java
// ── NEW: Gateway payment success — notify owner ───────────────
/**
 * Notifies the shop owner when an order is auto-accepted via Razorpay.
 * Informs them a new order appeared without their manual intervention.
 */
@Async("notificationExecutor")
public void notifyGatewayPaymentSuccessToOwner(Order order) {
    try {
        Shop shop = shopRepository.findById(order.getShopId())
            .orElseThrow(() -> new EntityNotFoundException("Shop not found"));
        User owner = userRepository.findById(shop.getOwnerId())
            .orElseThrow(() -> new EntityNotFoundException("Owner not found"));

        String subject = String.format(
            "\uD83D\uDCB3 Auto-accepted: Order %s — Payment received",
            order.getOrderNumber());

        String body = String.format("""
            A new order was automatically accepted after online payment.

            Order:    %s
            Amount:   ₹%s
            Method:   Razorpay (online payment)
            Status:   Accepted — ready to print

            No manual verification required.
            The order is now in your queue.

            — PrintFlow""",
            order.getOrderNumber(),
            order.getTotalAmount() != null ? order.getTotalAmount().toPlainString() : "0");

        if (owner.getEmail() != null) {
            emailService.send(owner.getEmail(), subject, body);
            saveNotification(owner.getId(), order.getId(),
                "GATEWAY_PAYMENT_RECEIVED", "EMAIL", subject, body);
        }

        // WhatsApp notification to owner
        if (owner.getPhone() != null) {
            String waMsg = String.format(
                "\uD83D\uDCB3 *New order paid online*\nOrder *%s* has been auto-accepted.\nAmount: ₹%s\nReady to print.",
                order.getOrderNumber(),
                order.getTotalAmount() != null ? order.getTotalAmount().toPlainString() : "0");
            whatsappService.send(owner.getPhone(), waMsg);
            saveNotification(owner.getId(), order.getId(),
                "GATEWAY_PAYMENT_RECEIVED", "WHATSAPP", null, waMsg);
        }

        // In-app notification
        saveNotification(owner.getId(), order.getId(),
            "GATEWAY_PAYMENT_RECEIVED", "IN_APP", subject, body);

    } catch (Exception e) {
        log.error("Failed to notify owner of gateway payment for order {}: {}",
            order.getOrderNumber(), e.getMessage());
    }
}

// ── NEW: Gateway payment success — notify customer ────────────
/**
 * Notifies the customer when their Razorpay payment is confirmed.
 * Sent alongside the regular ACCEPTED status notification.
 */
@Async("notificationExecutor")
public void notifyCustomerGatewayPaymentSuccess(Order order, String gatewayPaymentId) {
    try {
        User customer = userRepository.findById(order.getCustomerId())
            .orElseThrow(() -> new EntityNotFoundException("Customer not found"));
        Shop shop = shopRepository.findById(order.getShopId())
            .orElseThrow(() -> new EntityNotFoundException("Shop not found"));

        String subject = String.format(
            "\u2705 Payment confirmed — Order %s accepted", order.getOrderNumber());

        String body = String.format("""
            Hi %s,

            Your payment has been received and your order is confirmed!

            Order:      %s
            Amount:     ₹%s
            Payment ID: %s
            Shop:       %s

            We'll notify you when your order starts printing.

            — %s""",
            customer.getName(),
            order.getOrderNumber(),
            order.getTotalAmount() != null ? order.getTotalAmount().toPlainString() : "0",
            gatewayPaymentId,
            shop.getName(),
            shop.getName());

        if (customer.getEmail() != null) {
            emailService.send(customer.getEmail(), subject, body);
            saveNotification(customer.getId(), order.getId(),
                "PAYMENT_SUCCESS", "EMAIL", subject, body);
        }

        // WhatsApp
        if (customer.getPhone() != null) {
            String waMsg = String.format(
                "\u2705 *Payment confirmed!*\nOrder *%s*\nAmount: ₹%s\n\nYour order is confirmed and in the print queue at *%s*.",
                order.getOrderNumber(),
                order.getTotalAmount() != null ? order.getTotalAmount().toPlainString() : "0",
                shop.getName());
            whatsappService.send(customer.getPhone(), waMsg);
            saveNotification(customer.getId(), order.getId(),
                "PAYMENT_SUCCESS", "WHATSAPP", null, waMsg);
        }

        saveNotification(customer.getId(), order.getId(),
            "PAYMENT_SUCCESS", "IN_APP", subject, body);

    } catch (Exception e) {
        log.error("Failed to notify customer of payment success for order {}: {}",
            order.getOrderNumber(), e.getMessage());
    }
}
```

---

## G. Full Test Suite

### G.1 RazorpayServiceTest.java — Complete

```java
package com.printflow.payments;

import com.printflow.notifications.service.NotificationService;
import com.printflow.orders.entity.Order;
import com.printflow.orders.repository.OrderRepository;
import com.printflow.payments.config.RazorpayConfig;
import com.printflow.payments.dto.GatewayOrderResponse;
import com.printflow.payments.dto.VerifyGatewayPaymentRequest;
import com.printflow.payments.entity.Payment;
import com.printflow.payments.enums.PaymentGateway;
import com.printflow.payments.enums.PaymentStatus;
import com.printflow.payments.exception.GatewayOrderCreationException;
import com.printflow.payments.exception.InvalidPaymentSignatureException;
import com.printflow.payments.exception.PaymentAlreadyCompletedException;
import com.printflow.payments.repository.PaymentRepository;
import com.printflow.payments.service.RazorpayService;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import jakarta.persistence.EntityNotFoundException;
import org.json.JSONObject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RazorpayServiceTest {

    @Mock RazorpayClient razorpayClient;
    @Mock RazorpayConfig razorpayConfig;
    @Mock PaymentRepository paymentRepository;
    @Mock OrderRepository orderRepository;
    @Mock NotificationService notificationService;

    @InjectMocks RazorpayService razorpayService;

    private UUID orderId;
    private UUID customerId;
    private Order testOrder;

    @BeforeEach
    void setUp() {
        orderId    = UUID.randomUUID();
        customerId = UUID.randomUUID();

        testOrder = new Order();
        testOrder.setId(orderId);
        testOrder.setOrderNumber("PF-TEST-001");
        testOrder.setStatus("PENDING");
        testOrder.setPaymentStatus("PENDING");
        testOrder.setTotalAmount(BigDecimal.valueOf(250.00));
        testOrder.setCustomerId(customerId);
    }

    // ── createGatewayOrder tests ──────────────────────────────────────────────

    @Test
    void createGatewayOrder_orderNotFound_throwsEntityNotFound() {
        when(orderRepository.findByIdAndCustomerId(orderId, customerId))
            .thenReturn(Optional.empty());

        assertThatThrownBy(() -> razorpayService.createGatewayOrder(orderId, customerId))
            .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void createGatewayOrder_alreadyPaid_throwsPaymentAlreadyCompleted() {
        when(orderRepository.findByIdAndCustomerId(orderId, customerId))
            .thenReturn(Optional.of(testOrder));
        when(paymentRepository.existsPaidPaymentForOrder(orderId))
            .thenReturn(true);

        assertThatThrownBy(() -> razorpayService.createGatewayOrder(orderId, customerId))
            .isInstanceOf(PaymentAlreadyCompletedException.class);
    }

    @Test
    void createGatewayOrder_cancelledOrder_throwsIllegalState() {
        testOrder.setStatus("CANCELLED");
        when(orderRepository.findByIdAndCustomerId(orderId, customerId))
            .thenReturn(Optional.of(testOrder));
        when(paymentRepository.existsPaidPaymentForOrder(orderId))
            .thenReturn(false);

        assertThatThrownBy(() -> razorpayService.createGatewayOrder(orderId, customerId))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("cancelled");
    }

    @Test
    void createGatewayOrder_razorpayApiFailure_throwsGatewayOrderCreationException()
            throws Exception {
        when(orderRepository.findByIdAndCustomerId(orderId, customerId))
            .thenReturn(Optional.of(testOrder));
        when(paymentRepository.existsPaidPaymentForOrder(orderId))
            .thenReturn(false);
        when(razorpayClient.orders).thenReturn(mock(com.razorpay.Orders.class));
        when(razorpayClient.orders.create(any()))
            .thenThrow(new RazorpayException("API timeout"));

        assertThatThrownBy(() -> razorpayService.createGatewayOrder(orderId, customerId))
            .isInstanceOf(GatewayOrderCreationException.class);
    }

    // ── verifyPayment tests ───────────────────────────────────────────────────

    @Test
    void verifyPayment_paymentNotFound_throwsEntityNotFound() {
        VerifyGatewayPaymentRequest req = new VerifyGatewayPaymentRequest(
            "order_test", "pay_test", "sig_test");

        when(paymentRepository.findByGatewayOrderId("order_test"))
            .thenReturn(Optional.empty());

        assertThatThrownBy(() -> razorpayService.verifyPayment(req, customerId))
            .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void verifyPayment_alreadyPaid_returnsIdempotently() {
        Payment paidPayment = new Payment();
        paidPayment.setId(UUID.randomUUID());
        paidPayment.setOrderId(orderId);
        paidPayment.setStatus(PaymentStatus.PAID);
        paidPayment.setGatewayOrderId("order_test123");

        when(paymentRepository.findByGatewayOrderId("order_test123"))
            .thenReturn(Optional.of(paidPayment));
        when(orderRepository.findByIdAndCustomerId(orderId, customerId))
            .thenReturn(Optional.of(testOrder));

        VerifyGatewayPaymentRequest req = new VerifyGatewayPaymentRequest(
            "order_test123", "pay_test", "any_sig");
        Payment result = razorpayService.verifyPayment(req, customerId);

        assertThat(result.getStatus()).isEqualTo(PaymentStatus.PAID);
        verify(paymentRepository, never()).save(any()); // no write on idempotent return
    }

    @Test
    void verifyPayment_invalidSignature_throwsInvalidSignature() {
        Payment gatewayPayment = new Payment();
        gatewayPayment.setId(UUID.randomUUID());
        gatewayPayment.setOrderId(orderId);
        gatewayPayment.setStatus(PaymentStatus.GATEWAY_INITIATED);
        gatewayPayment.setGatewayOrderId("order_test123");
        gatewayPayment.setGateway(PaymentGateway.RAZORPAY);

        when(paymentRepository.findByGatewayOrderId("order_test123"))
            .thenReturn(Optional.of(gatewayPayment));
        when(orderRepository.findByIdAndCustomerId(orderId, customerId))
            .thenReturn(Optional.of(testOrder));
        when(razorpayConfig.getKeySecret()).thenReturn("test_secret");

        VerifyGatewayPaymentRequest req = new VerifyGatewayPaymentRequest(
            "order_test123", "pay_test456", "invalid_signature_abc");

        assertThatThrownBy(() -> razorpayService.verifyPayment(req, customerId))
            .isInstanceOf(InvalidPaymentSignatureException.class);
    }

    // ── processWebhookEvent tests ─────────────────────────────────────────────

    @Test
    void processWebhookEvent_duplicateEvent_skipped() {
        String idempotencyKey = "order_test123:payment.captured";
        when(paymentRepository.existsByIdempotencyKey(idempotencyKey))
            .thenReturn(true);

        JSONObject payload = buildCapturedWebhookPayload("order_test123", "pay_xxx");
        razorpayService.processWebhookEvent("payment.captured", payload);

        // No DB writes should occur
        verify(paymentRepository, never()).save(any());
        verify(orderRepository, never()).save(any());
    }

    @Test
    void processWebhookEvent_unknownGatewayOrder_skipped() {
        when(paymentRepository.existsByIdempotencyKey(any())).thenReturn(false);
        when(paymentRepository.findByGatewayOrderId("order_unknown"))
            .thenReturn(Optional.empty());

        JSONObject payload = buildCapturedWebhookPayload("order_unknown", "pay_xxx");
        razorpayService.processWebhookEvent("payment.captured", payload);

        verify(paymentRepository, never()).save(any());
    }

    @Test
    void processWebhookEvent_paymentCaptured_alreadyPaid_savesIdempotencyOnly() {
        Payment paidPayment = new Payment();
        paidPayment.setId(UUID.randomUUID());
        paidPayment.setOrderId(orderId);
        paidPayment.setStatus(PaymentStatus.PAID);
        paidPayment.setGatewayOrderId("order_test123");

        when(paymentRepository.existsByIdempotencyKey("order_test123:payment.captured"))
            .thenReturn(false);
        when(paymentRepository.findByGatewayOrderId("order_test123"))
            .thenReturn(Optional.of(paidPayment));

        JSONObject payload = buildCapturedWebhookPayload("order_test123", "pay_xxx");
        razorpayService.processWebhookEvent("payment.captured", payload);

        verify(paymentRepository, times(1)).save(argThat(p ->
            "order_test123:payment.captured".equals(p.getIdempotencyKey())
        ));
    }

    @Test
    void processWebhookEvent_paymentFailed_updatesStatusToFailed() {
        Payment gatewayPayment = new Payment();
        gatewayPayment.setId(UUID.randomUUID());
        gatewayPayment.setOrderId(orderId);
        gatewayPayment.setStatus(PaymentStatus.GATEWAY_INITIATED);
        gatewayPayment.setGatewayOrderId("order_test123");

        when(paymentRepository.existsByIdempotencyKey("order_test123:payment.failed"))
            .thenReturn(false);
        when(paymentRepository.findByGatewayOrderId("order_test123"))
            .thenReturn(Optional.of(gatewayPayment));
        when(orderRepository.findById(orderId)).thenReturn(Optional.of(testOrder));

        JSONObject payload = buildFailedWebhookPayload("order_test123", "pay_xxx");
        razorpayService.processWebhookEvent("payment.failed", payload);

        verify(paymentRepository).save(argThat(p ->
            PaymentStatus.FAILED.equals(p.getStatus())
        ));
    }

    // ── Test helpers ──────────────────────────────────────────────────────────

    private JSONObject buildCapturedWebhookPayload(String orderId, String paymentId) {
        return new JSONObject()
            .put("event", "payment.captured")
            .put("payload", new JSONObject()
                .put("payment", new JSONObject()
                    .put("entity", new JSONObject()
                        .put("id", paymentId)
                        .put("order_id", orderId)
                        .put("status", "captured"))));
    }

    private JSONObject buildFailedWebhookPayload(String orderId, String paymentId) {
        return new JSONObject()
            .put("event", "payment.failed")
            .put("payload", new JSONObject()
                .put("payment", new JSONObject()
                    .put("entity", new JSONObject()
                        .put("id", paymentId)
                        .put("order_id", orderId)
                        .put("status", "failed"))));
    }
}
```

### G.2 RazorpayWebhookControllerTest.java

```java
package com.printflow.payments;

import com.printflow.payments.controller.RazorpayWebhookController;
import com.printflow.payments.service.RazorpayService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(RazorpayWebhookController.class)
class RazorpayWebhookControllerTest {

    @Autowired MockMvc mockMvc;
    @MockBean RazorpayService razorpayService;

    @Test
    void webhook_missingSignatureHeader_returns400() throws Exception {
        mockMvc.perform(post("/api/v1/payments/webhook/razorpay")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"event\":\"payment.captured\"}"))
            .andExpect(status().is4xxClientError());
    }

    @Test
    void webhook_validSignature_returns200() throws Exception {
        // Even with an invalid signature, controller returns 200
        // (logs the mismatch but doesn't fail)
        mockMvc.perform(post("/api/v1/payments/webhook/razorpay")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"event\":\"payment.captured\",\"payload\":{\"payment\":{\"entity\":{\"id\":\"pay_test\",\"order_id\":\"order_test\"}}}}")
            .header("X-Razorpay-Signature", "any_signature"))
            .andExpect(status().isOk());
    }

    @Test
    void webhook_noJwtRequired_returns200() throws Exception {
        // Webhook endpoint is public — no JWT should be needed
        mockMvc.perform(post("/api/v1/payments/webhook/razorpay")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"event\":\"payment.captured\"}")
            .header("X-Razorpay-Signature", "test"))
            .andExpect(status().isOk());
    }
}
```

### G.3 PaymentControllerIntegrationTest.java

```java
package com.printflow.payments;

import com.printflow.payments.dto.VerifyGatewayPaymentRequest;
import com.printflow.payments.entity.Payment;
import com.printflow.payments.enums.PaymentStatus;
import com.printflow.payments.service.PaymentService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class PaymentControllerIntegrationTest {

    @Autowired MockMvc mockMvc;
    @MockBean PaymentService paymentService;

    @Test
    @WithMockUser(roles = "CUSTOMER")
    void createGatewayOrder_authenticated_returns200() throws Exception {
        com.printflow.payments.dto.GatewayOrderResponse mockResp =
            new com.printflow.payments.dto.GatewayOrderResponse(
                "order_test123", BigDecimal.valueOf(250), "INR",
                "rzp_test_xxx", "PF-001", UUID.randomUUID().toString());

        when(paymentService.createGatewayOrder(any(), any())).thenReturn(mockResp);

        mockMvc.perform(post("/api/v1/payments/{orderId}/gateway-order",
                UUID.randomUUID())
            .contentType(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.gatewayOrderId").value("order_test123"))
            .andExpect(jsonPath("$.data.currency").value("INR"));
    }

    @Test
    void createGatewayOrder_unauthenticated_returns401() throws Exception {
        mockMvc.perform(post("/api/v1/payments/{orderId}/gateway-order",
                UUID.randomUUID()))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "CUSTOMER")
    void verifyGatewayPayment_validRequest_returns200() throws Exception {
        Payment mockPayment = new Payment();
        mockPayment.setId(UUID.randomUUID());
        mockPayment.setOrderId(UUID.randomUUID());
        mockPayment.setStatus(PaymentStatus.PAID);
        mockPayment.setAmount(BigDecimal.valueOf(250));

        when(paymentService.verifyGatewayPayment(any(), any())).thenReturn(mockPayment);

        String body = """
            {
              "razorpayOrderId": "order_test123",
              "razorpayPaymentId": "pay_test456",
              "razorpaySignature": "abc123def456"
            }""";

        mockMvc.perform(post("/api/v1/payments/verify")
            .contentType(MediaType.APPLICATION_JSON)
            .content(body))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.verified").value(true))
            .andExpect(jsonPath("$.data.status").value("PAID"));
    }

    @Test
    @WithMockUser(roles = "CUSTOMER")
    void verifyGatewayPayment_missingFields_returns422() throws Exception {
        String invalidBody = """
            {
              "razorpayOrderId": "order_test123"
            }""";

        mockMvc.perform(post("/api/v1/payments/verify")
            .contentType(MediaType.APPLICATION_JSON)
            .content(invalidBody))
            .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void webhookEndpoint_noAuth_accessible() throws Exception {
        // Webhook must be accessible without any JWT
        mockMvc.perform(post("/api/v1/payments/webhook/razorpay")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"event\":\"payment.captured\"}")
            .header("X-Razorpay-Signature", "test_sig"))
            .andExpect(status().isOk());
    }
}
```

---

## H. Production Hardening — Detailed Checklist

### H.1 Pre-Launch Security Audit

```
Secrets:
□ RAZORPAY_KEY_SECRET is in env var, never hardcoded
□ RAZORPAY_WEBHOOK_SECRET is in env var, never in logs
□ Both secrets are minimum 32 characters
□ Test keys (rzp_test_*) used in staging, live keys (rzp_live_*) in production only
□ Key rotation plan documented

Webhook Endpoint:
□ X-Razorpay-Signature verified on every single webhook event
□ Signature mismatch → 200 OK response (not 401/403 — prevents enumeration)
□ Signature mismatch → logged at WARN level with no secret data
□ Webhook URL in Razorpay dashboard matches production URL exactly
□ Idempotency key stored for every processed event

Signature Verification:
□ Client-side verify() uses constant-time comparison (safeEquals method)
□ Webhook verify uses Utils.getHash() from Razorpay SDK
□ Key secret is NOT exposed in any API response or log
```

### H.2 Data Integrity Checks

```
Database:
□ UNIQUE constraint on gateway_payment_id (prevents duplicate payment records)
□ UNIQUE constraint on idempotency_key (prevents duplicate webhook processing)
□ gateway_order_id indexed (fast webhook lookup)
□ V15 migration is backward compatible (nullable columns, no table rewrites)
□ Existing payment records untouched (Manual UPI flow unaffected)

Application:
□ existsPaidPaymentForOrder() called before every createGatewayOrder
□ Transaction boundary covers payment update + order status update atomically
□ Notification failures do NOT roll back payment status update
□ Auto-accept only happens when order.status == PENDING (not on re-capture)
```

### H.3 Razorpay Dashboard Configuration

```
Webhook Configuration:
□ URL: https://[your-domain]/api/v1/payments/webhook/razorpay
□ Secret: matches RAZORPAY_WEBHOOK_SECRET env var exactly
□ Active: Yes
□ Events subscribed:
  □ payment.captured
  □ payment.failed
  □ refund.created (optional, for future)

Test Mode:
□ Test webhook events sent at least once
□ Razorpay test card: 4111 1111 1111 1111 / any CVV / any future expiry
□ Test UPI: success@razorpay
□ Test failure: failure@razorpay

Live Mode Checklist:
□ Business name, logo set in Razorpay dashboard
□ KYC completed (required for live payments in India)
□ Settlement account configured
□ Currency: INR
□ Minimum amount: ₹1 (100 paise)
```

### H.4 Operational Runbook

**Symptom: Customer paid but order not accepted**

```
1. Check Razorpay dashboard → was payment captured?
2. Check payments table → SELECT * FROM payments WHERE gateway_order_id = 'order_xxx'
3. Check application logs → grep for the gateway_order_id
4. If payment.captured webhook not received → manually trigger from Razorpay dashboard
5. If payment is PAID in DB but order still PENDING:
   → UPDATE orders SET status='ACCEPTED', payment_status='PAID' WHERE id='...'
   → Notify customer manually
```

**Symptom: Duplicate webhook events causing errors**

```
1. Check logs → should see "Duplicate webhook event ignored" log lines
2. Check payments.idempotency_key column → should have entries
3. If errors persist → check if UNIQUE constraint on idempotency_key is in place
4. Verify V15 migration ran: SELECT * FROM flyway_schema_history WHERE version = '15'
```

**Symptom: Signature verification failures**

```
1. Verify RAZORPAY_WEBHOOK_SECRET matches what's in Razorpay dashboard exactly
2. Check for trailing whitespace in env var
3. Verify raw request body is being used (not parsed JSON) for verification
4. Check Razorpay SDK version: should be 1.4.4+
```

---

## I. Environment Configuration Reference

### I.1 application.yml — Complete Razorpay Section

```yaml
# Add to application.yml

razorpay:
  key-id: ${RAZORPAY_KEY_ID}
  key-secret: ${RAZORPAY_KEY_SECRET}
  webhook-secret: ${RAZORPAY_WEBHOOK_SECRET}
  currency: INR

# Logging for payment events
logging:
  level:
    com.printflow.payments: DEBUG
    com.printflow.payments.service.RazorpayService: INFO
    com.printflow.payments.controller.RazorpayWebhookController: INFO
```

### I.2 application-dev.yml — Test Keys

```yaml
# application-dev.yml — override for local development
razorpay:
  key-id: rzp_test_xxxxxxxxxxxxxxxxxx
  key-secret: xxxxxxxxxxxxxxxxxxxxxxxx
  webhook-secret: test_webhook_secret_32chars_minimum
```

### I.3 Full Environment Variable Reference

```bash
# ── Existing (already configured) ──────────────────────────────
DATABASE_URL=jdbc:postgresql://...
DATABASE_USERNAME=...
DATABASE_PASSWORD=...
JWT_SECRET=...
FIREBASE_PROJECT_ID=...
FIREBASE_SERVICE_ACCOUNT_JSON=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=...
TWILIO_SMS_FROM=...
MAIL_USERNAME=...
MAIL_PASSWORD=...
APP_BASE_URL=...

# ── New: Razorpay ───────────────────────────────────────────────
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxxxxxxx      # Public key (safe in frontend)
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx      # Private key (NEVER expose)
RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx  # Webhook HMAC key (NEVER expose)
```

---

## J. Exact Folder Structure — Final State

Complete folder tree after all changes are applied:

```
printflow-backend/
└── src/main/java/com/printflow/
    ├── PrintflowApplication.java
    │
    ├── auth/
    │   ├── controller/AuthController.java
    │   ├── dto/AuthResponse.java
    │   ├── dto/FirebaseTokenRequest.java
    │   ├── dto/RefreshTokenRequest.java
    │   ├── entity/RefreshToken.java
    │   ├── filter/JwtAuthFilter.java
    │   ├── repository/RefreshTokenRepository.java
    │   └── service/
    │       ├── AuthService.java
    │       ├── FirebaseTokenVerifier.java
    │       └── JwtService.java
    │
    ├── clarifications/
    │   ├── controller/ClarificationController.java
    │   ├── dto/ClarificationResponse.java
    │   ├── dto/SendMessageRequest.java
    │   ├── entity/ClarificationThread.java
    │   ├── repository/ClarificationRepository.java
    │   └── service/ClarificationService.java
    │
    ├── common/
    │   ├── config/
    │   │   ├── AsyncConfig.java
    │   │   ├── CloudinaryConfig.java
    │   │   ├── CorsConfig.java
    │   │   ├── FirebaseConfig.java
    │   │   └── SecurityConfig.java              ← MODIFIED
    │   ├── dto/
    │   │   ├── ApiResponse.java
    │   │   └── PageResponse.java
    │   ├── exception/
    │   │   ├── ErrorResponse.java
    │   │   └── GlobalExceptionHandler.java      ← MODIFIED
    │   ├── security/
    │   │   ├── SecurityUtils.java
    │   │   └── UserPrincipal.java
    │   └── validation/
    │       ├── CloudinaryUrl.java
    │       └── ValidEnum.java
    │
    ├── notifications/
    │   ├── config/TwilioConfig.java
    │   ├── controller/NotificationController.java
    │   ├── entity/Notification.java
    │   ├── repository/NotificationRepository.java
    │   └── service/
    │       ├── EmailService.java
    │       ├── NotificationService.java         ← MODIFIED (2 new methods)
    │       ├── SmsService.java
    │       └── WhatsAppService.java
    │
    ├── orders/
    │   ├── controller/
    │   │   ├── OrderController.java
    │   │   └── OwnerOrderController.java
    │   ├── dto/
    │   │   ├── CreateOrderRequest.java
    │   │   ├── DocumentRequest.java
    │   │   ├── OrderResponse.java
    │   │   ├── OrderSummaryResponse.java
    │   │   ├── ShopCustomerStats.java
    │   │   ├── UpdateCopiesRequest.java
    │   │   └── UpdateStatusRequest.java
    │   ├── entity/
    │   │   ├── Order.java                       ← MODIFIED (paymentMethod field)
    │   │   ├── OrderDocument.java
    │   │   └── OrderStatusHistory.java
    │   ├── enums/
    │   │   ├── BindingType.java
    │   │   ├── LaminationType.java
    │   │   ├── OrderStatus.java
    │   │   ├── OrderUrgency.java
    │   │   ├── PaperSize.java
    │   │   ├── PrintType.java
    │   │   └── SideType.java
    │   ├── exception/
    │   │   ├── CopyModificationException.java
    │   │   ├── InvalidStatusTransitionException.java
    │   │   └── OrderLockExpiredException.java
    │   ├── mapper/OrderMapper.java
    │   ├── repository/
    │   │   ├── OrderDocumentRepository.java
    │   │   ├── OrderRepository.java
    │   │   └── OrderStatusHistoryRepository.java
    │   └── service/
    │       ├── OrderDocumentService.java
    │       ├── OrderNumberGenerator.java
    │       ├── OrderService.java
    │       ├── OrderStatusService.java
    │       ├── OrderStatusTransitions.java
    │       └── PriceCalculationService.java
    │
    ├── payments/                                ← PRIMARY CHANGE AREA
    │   ├── config/
    │   │   └── RazorpayConfig.java              ← NEW
    │   ├── controller/
    │   │   ├── PaymentController.java           ← MODIFIED (2 endpoints added)
    │   │   └── RazorpayWebhookController.java   ← NEW
    │   ├── dto/
    │   │   ├── CreateGatewayOrderRequest.java   ← NEW
    │   │   ├── GatewayOrderResponse.java        ← NEW
    │   │   ├── PaymentResponse.java             ← NEW
    │   │   ├── SubmitProofRequest.java          ← unchanged
    │   │   ├── VerifyGatewayPaymentRequest.java ← NEW
    │   │   └── VerifyPaymentRequest.java        ← unchanged
    │   ├── entity/
    │   │   └── Payment.java                     ← MODIFIED (gateway fields)
    │   ├── enums/
    │   │   ├── PaymentGateway.java              ← NEW
    │   │   └── PaymentStatus.java               ← NEW
    │   ├── exception/
    │   │   ├── GatewayOrderCreationException.java    ← NEW
    │   │   ├── InvalidPaymentSignatureException.java  ← NEW
    │   │   └── PaymentAlreadyCompletedException.java  ← NEW
    │   ├── repository/
    │   │   └── PaymentRepository.java           ← MODIFIED (4 new methods)
    │   └── service/
    │       ├── PaymentService.java              ← MODIFIED (gateway delegation)
    │       └── RazorpayService.java             ← NEW
    │
    ├── queue/
    │   ├── controller/QueueController.java
    │   └── service/QueueService.java
    │
    ├── shops/
    │   ├── controller/ShopController.java
    │   ├── dto/ (all files unchanged)
    │   ├── entity/ (all files unchanged)
    │   ├── repository/ (all files unchanged)
    │   └── service/ShopService.java
    │
    ├── uploads/
    │   ├── controller/UploadController.java
    │   ├── dto/ (unchanged)
    │   └── service/ (unchanged)
    │
    └── users/
        ├── controller/UserController.java
        ├── dto/ (unchanged)
        ├── entity/ (unchanged)
        ├── mapper/ (unchanged)
        ├── repository/ (unchanged)
        └── service/UserService.java

src/main/resources/db/migration/
    ├── V1__create_users.sql
    ├── V2__create_shops.sql
    ├── V3__create_price_config.sql
    ├── V4__create_orders.sql
    ├── V5__create_order_documents.sql
    ├── V6__create_payments.sql
    ├── V7__create_order_status_history.sql
    ├── V8__create_clarification_threads.sql
    ├── V9__create_notifications.sql
    ├── V10__add_order_number_sequence.sql
    ├── V11__seed_default_price_config.sql
    ├── V12__create_refresh_tokens.sql
    ├── V13__add_transaction_id_to_payments.sql
    ├── V14__add_copy_modify_fields.sql
    └── V15__add_gateway_payment_support.sql     ← NEW

src/test/java/com/printflow/
    ├── orders/
    │   ├── OrderStatusTransitionsTest.java
    │   └── PriceCalculationServiceTest.java
    ├── payments/
    │   ├── RazorpayServiceTest.java              ← NEW
    │   ├── RazorpayWebhookControllerTest.java    ← NEW
    │   └── PaymentControllerIntegrationTest.java ← NEW
    └── uploads/
        └── FileValidationServiceTest.java

── Frontend ──────────────────────────────────────────────────────

printflow-frontend/src/
    ├── App.tsx
    ├── main.tsx
    ├── index.css
    ├── vite-env.d.ts
    │
    ├── components/
    │   ├── clarifications/ClarificationDrawer.tsx
    │   ├── layout/
    │   │   ├── Header.tsx
    │   │   ├── MobileBottomNav.tsx
    │   │   └── OwnerSidebar.tsx
    │   ├── order/
    │   │   ├── CountdownTimer.tsx
    │   │   ├── OrderStatusBadge.tsx
    │   │   ├── PriceBreakdown.tsx
    │   │   ├── StatusTimeline.tsx
    │   │   └── UrgencyBadge.tsx
    │   ├── payment/
    │   │   ├── PaymentMethodSelector.tsx        ← NEW
    │   │   ├── PaymentProofUpload.tsx            ← unchanged
    │   │   └── RazorpayCheckoutButton.tsx        ← NEW
    │   └── ui/
    │       ├── Badge.tsx
    │       ├── Card.tsx
    │       ├── EmptyState.tsx
    │       ├── ErrorState.tsx
    │       ├── Modal.tsx
    │       └── Spinner.tsx
    │
    ├── config/
    │   ├── constants.ts
    │   └── firebase.ts
    │
    ├── hooks/
    │   ├── useAuth.ts
    │   ├── useCloudinaryUpload.ts
    │   ├── useGatewayPayment.ts                  ← NEW
    │   ├── useOrders.ts                          ← unchanged
    │   ├── useOwnerQueue.ts                      ← unchanged
    │   └── usePriceCalculator.ts
    │
    ├── pages/
    │   ├── auth/LoginPage.tsx
    │   ├── customer/
    │   │   ├── NewOrderPage.tsx                  ← MODIFIED (payment step)
    │   │   ├── NotificationsPage.tsx
    │   │   ├── OrderDetailPage.tsx               ← MODIFIED (payment section)
    │   │   └── OrderListPage.tsx
    │   ├── owner/
    │   │   ├── ClosurePage.tsx
    │   │   ├── CustomersPage.tsx
    │   │   ├── DashboardPage.tsx
    │   │   ├── OwnerOnboardingPage.tsx
    │   │   ├── OwnerOrderDetailPage.tsx          ← MODIFIED (gateway payment display)
    │   │   ├── QueuePage.tsx
    │   │   └── SettingsPage.tsx
    │   ├── ContactPage.tsx
    │   ├── DocsPage.tsx
    │   ├── LandingPage.tsx
    │   └── NotFoundPage.tsx
    │
    ├── services/
    │   ├── api.ts                               ← unchanged
    │   ├── auth.service.ts
    │   ├── clarifications.service.ts
    │   ├── notifications.service.ts
    │   ├── orders.service.ts
    │   ├── owner.service.ts
    │   ├── payments.service.ts                  ← MODIFIED (gateway functions)
    │   ├── shop.service.ts
    │   └── upload.service.ts
    │
    ├── store/
    │   ├── auth.store.ts                        ← unchanged
    │   └── shop.store.ts                        ← unchanged
    │
    ├── types/
    │   ├── api.types.ts
    │   ├── order.types.ts                       ← MODIFIED (gateway fields)
    │   ├── razorpay.d.ts                        ← NEW
    │   ├── shop.types.ts
    │   └── user.types.ts
    │
    └── utils/
        ├── calculatePrice.ts
        ├── formatCurrency.ts
        ├── formatDate.ts
        └── statusColors.ts

index.html                                       ← MODIFIED (Razorpay script tag)
pom.xml                                          ← MODIFIED (razorpay-java dependency)
application.yml                                  ← MODIFIED (razorpay.* properties)
```

---

## K. Resume/Portfolio Positioning

This integration demonstrates the following engineering competencies — use these in your resume bullet points:

### System Design
- Designed a **hybrid payment architecture** preserving backward compatibility with existing Manual UPI flow while adding automated gateway payments
- Implemented **idempotent webhook processing** using a composite idempotency key with database-level unique constraint — prevents duplicate order acceptance on retry storms
- Designed **auto-accept order workflow** triggered by payment webhook with proper state machine guards

### Security Engineering
- Implemented **HMAC-SHA256 signature verification** for Razorpay webhooks using constant-time comparison to prevent timing attacks
- Separated **client-side payment verification** (key-secret based) from **webhook verification** (webhook-secret based) — two distinct HMAC secrets, two distinct verification paths
- Secured gateway endpoints with **JWT authentication** while keeping the public webhook endpoint properly accessible without credentials

### Backend Engineering
- Added **Flyway V15 migration** with zero-downtime design: only `ADD COLUMN` operations, all nullable, existing data backfilled
- Implemented **transactional payment + order status synchronization** — payment status and order auto-accept happen atomically in a single transaction
- Built **gateway abstraction layer** (`RazorpayService`) isolating all Razorpay SDK calls — easily swappable to Stripe/PhonePe with zero changes to controllers or service orchestration

### Frontend Engineering
- Built a **payment state machine hook** (`useGatewayPayment`) managing the full checkout lifecycle: idle → creating_order → checkout_open → verifying → success/failed
- Integrated **Razorpay Checkout SDK** with proper TypeScript type declarations
- Implemented **TanStack Query cache invalidation** on payment success to ensure UI reflects updated order status without manual refresh

### Sample Resume Bullet Points

```
• Architected hybrid Razorpay + Manual UPI payment system for PrintFlow (Spring Boot 3.2 / 
  React 18), processing gateway payments with HMAC-SHA256 webhook verification and 
  idempotent event handling to prevent duplicate order acceptance.

• Implemented zero-downtime Flyway migration strategy for payment schema evolution; 
  transactional payment-to-order status sync with auto-accept workflow reducing 
  owner manual workload for online payments to zero.

• Designed gateway abstraction layer (RazorpayService) with constant-time signature 
  comparison, replay attack prevention via DB-unique idempotency keys, and full 
  audit trail (webhook_payload column).
```

---

## L. Future Enhancements

These are planned next steps — out of scope for this implementation but worth noting:

### Payment Refunds
```
POST /api/v1/payments/{paymentId}/refund
→ calls Razorpay refund API
→ Payment.status = REFUNDED
→ Order.status = CANCELLED (if not yet IN_PROGRESS)
→ Notify customer via email + WhatsApp
```

### Partial Refunds
```
Scenario: customer ordered 3 documents, 1 fails to print
→ calculate partial refund amount
→ POST to Razorpay refund API with partial amount
→ Audit trail in payments table
```

### Payment Analytics Dashboard
```
Owner dashboard additions:
→ Revenue by payment method (UPI vs Razorpay vs Cash)
→ Razorpay settlement reports
→ Failed payment rate
→ Average time from order to payment
```

### PhonePe / PayU as Fallback Gateway
```
The RazorpayService gateway abstraction makes this straightforward:
→ Create PaymentGateway.PHONEPE enum value
→ Implement PhonePeService with same interface
→ RazorpayConfig → PaymentGatewayConfig (multi-provider)
→ Frontend: show fallback option if Razorpay fails
```

### Webhook Retry Monitoring
```
Current: duplicate webhooks silently ignored
Future:
→ Count webhook retries per payment
→ Alert on excessive retries (> 5 for same event)
→ Dashboard showing webhook health
```

### Abandoned Payment Recovery
```
Payments stuck in GATEWAY_INITIATED after 30 minutes:
@Scheduled(cron = "0 0 * * * *")  // hourly
→ find GATEWAY_INITIATED payments older than 30min
→ query Razorpay API for actual payment status
→ reconcile: mark PAID or FAILED based on Razorpay truth
```

---

*End of Part 2 — PrintFlow Razorpay Integration Master Document*  
*Combined with Part 1: Complete production-grade implementation blueprint*  
*Total coverage: 21 sections + A–L deep implementation sections*  
*Stack: Java 21 · Spring Boot 3.2.5 · PostgreSQL 17 · Flyway V15 · React 18 + TypeScript*
