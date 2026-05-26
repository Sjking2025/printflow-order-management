import React from 'react'
import type { PaymentMethod } from '../../types/order.types'

interface PaymentMethodSelectorProps {
  selected: PaymentMethod | null
  onChange: (method: PaymentMethod) => void
  disabled?: boolean
}

/**
 * Two-card payment method selection UI.
 * Allows customers to choose between:
 * - Razorpay (online payment — auto-confirms order)
 * - Manual UPI (screenshot upload — owner confirms manually)
 */
export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  selected,
  onChange,
  disabled = false,
}) => {
  return (
    <div className="payment-method-selector">
      <p className="payment-method-heading">Choose payment method</p>
      <div className="payment-method-grid">

        {/* ── Razorpay / Online Payment ────────────────────── */}
        <button
          id="payment-method-razorpay"
          type="button"
          disabled={disabled}
          onClick={() => onChange('RAZORPAY')}
          className={`payment-method-card ${selected === 'RAZORPAY' ? 'payment-method-card--selected' : ''}`}
        >
          <div className="payment-method-card__icon-wrap payment-method-card__icon-wrap--online">
            <span className="material-symbols-outlined">credit_card</span>
          </div>
          <div className="payment-method-card__body">
            <p className="payment-method-card__title">Pay Online</p>
            <p className="payment-method-card__subtitle">Cards, UPI, Net Banking</p>
            <div className="payment-method-card__badge payment-method-card__badge--green">
              <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>bolt</span>
              Auto-confirmed instantly
            </div>
          </div>
          {selected === 'RAZORPAY' && (
            <span className="material-symbols-outlined payment-method-card__check">
              check_circle
            </span>
          )}
        </button>

        {/* ── Manual UPI / Screenshot ──────────────────────── */}
        <button
          id="payment-method-manual-upi"
          type="button"
          disabled={disabled}
          onClick={() => onChange('MANUAL_UPI')}
          className={`payment-method-card ${selected === 'MANUAL_UPI' ? 'payment-method-card--selected' : ''}`}
        >
          <div className="payment-method-card__icon-wrap payment-method-card__icon-wrap--manual">
            <span className="material-symbols-outlined">qr_code</span>
          </div>
          <div className="payment-method-card__body">
            <p className="payment-method-card__title">UPI / Screenshot</p>
            <p className="payment-method-card__subtitle">Pay via any UPI app</p>
            <div className="payment-method-card__badge payment-method-card__badge--amber">
              <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>schedule</span>
              Owner reviews & confirms
            </div>
          </div>
          {selected === 'MANUAL_UPI' && (
            <span className="material-symbols-outlined payment-method-card__check">
              check_circle
            </span>
          )}
        </button>

      </div>
    </div>
  )
}
