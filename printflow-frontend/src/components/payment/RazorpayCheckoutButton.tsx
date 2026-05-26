import React from 'react'
import type { GatewayPaymentState } from '../../hooks/useGatewayPayment'

interface RazorpayCheckoutButtonProps {
  state: GatewayPaymentState
  error: string | null
  onClick: () => void
  onReset: () => void
  amount?: number
}

/**
 * Razorpay checkout button with dynamic state-driven labels.
 *
 * State → Label mapping:
 *   idle             → "Pay ₹{amount} Online"
 *   creating_order   → "Preparing checkout..."
 *   checkout_open    → "Complete in Razorpay..."
 *   verifying        → "Verifying payment..."
 *   success          → "Payment Successful ✓"
 *   failed           → "Retry Payment"
 */
export const RazorpayCheckoutButton: React.FC<RazorpayCheckoutButtonProps> = ({
  state,
  error,
  onClick,
  onReset,
  amount,
}) => {
  const isLoading = state === 'creating_order' || state === 'verifying'
  const isSuccess = state === 'success'
  const isFailed = state === 'failed'
  const isCheckoutOpen = state === 'checkout_open'
  const isDisabled = isLoading || isSuccess || isCheckoutOpen

  const handleClick = () => {
    if (isFailed) {
      onReset()
      // Tiny delay so state resets to idle before click re-initiates
      setTimeout(onClick, 50)
    } else {
      onClick()
    }
  }

  const getLabel = () => {
    switch (state) {
      case 'creating_order':
        return 'Preparing checkout...'
      case 'checkout_open':
        return 'Complete in Razorpay...'
      case 'verifying':
        return 'Verifying payment...'
      case 'success':
        return 'Payment Successful'
      case 'failed':
        return 'Retry Payment'
      default:
        return amount ? `Pay ₹${amount.toLocaleString('en-IN')} Online` : 'Pay Online'
    }
  }

  return (
    <div className="razorpay-btn-wrap">
      <button
        id="btn-razorpay-checkout"
        type="button"
        disabled={isDisabled}
        onClick={handleClick}
        className={`razorpay-btn
          ${isLoading ? 'razorpay-btn--loading' : ''}
          ${isSuccess ? 'razorpay-btn--success' : ''}
          ${isFailed ? 'razorpay-btn--failed' : ''}
        `}
      >
        {/* Loading spinner */}
        {isLoading && (
          <span className="razorpay-btn__spinner" aria-hidden="true" />
        )}

        {/* Success icon */}
        {isSuccess && (
          <span className="material-symbols-outlined razorpay-btn__icon" aria-hidden="true">
            check_circle
          </span>
        )}

        {/* Failed icon */}
        {isFailed && !isLoading && (
          <span className="material-symbols-outlined razorpay-btn__icon" aria-hidden="true">
            refresh
          </span>
        )}

        {/* Default: Razorpay logo icon */}
        {!isLoading && !isSuccess && !isFailed && (
          <span className="material-symbols-outlined razorpay-btn__icon" aria-hidden="true">
            lock
          </span>
        )}

        <span className="razorpay-btn__label">{getLabel()}</span>
      </button>

      {/* Powered by Razorpay (idle only) */}
      {state === 'idle' && (
        <p className="razorpay-btn__powered-by">
          <span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle' }}>
            security
          </span>
          {' '}Secured by Razorpay · All major cards, UPI &amp; wallets accepted
        </p>
      )}

      {/* Error message */}
      {error && isFailed && (
        <div className="razorpay-btn__error" role="alert">
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
            error
          </span>
          {error}
        </div>
      )}

      {/* Success message */}
      {isSuccess && (
        <div className="razorpay-btn__success-msg" role="status">
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
            check_circle
          </span>
          Your order has been accepted! You'll receive a confirmation email shortly.
        </div>
      )}
    </div>
  )
}
