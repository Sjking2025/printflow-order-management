import { useState, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createGatewayOrder,
  verifyGatewayPayment,
  type GatewayOrderResponse,
  type VerifyGatewayPaymentRequest,
} from '../services/payments.service'
import { useAuth } from './useAuth'

export type GatewayPaymentState =
  | 'idle'
  | 'creating_order'
  | 'checkout_open'
  | 'verifying'
  | 'success'
  | 'failed'

interface UseGatewayPaymentOptions {
  orderId: string
  orderNumber?: string
  amount?: number
  onSuccess?: () => void
}

interface UseGatewayPaymentResult {
  initiatePayment: () => void
  state: GatewayPaymentState
  error: string | null
  isLoading: boolean
  isSuccess: boolean
  isFailed: boolean
  reset: () => void
}

/**
 * React hook managing the full Razorpay gateway payment lifecycle.
 *
 * State machine:
 *   idle → creating_order → checkout_open → verifying → success
 *                                       ↘ failed (modal dismissed or payment declined)
 *
 * Usage:
 *   const { initiatePayment, state, isSuccess } = useGatewayPayment({ orderId })
 *   <button onClick={initiatePayment}>Pay Now</button>
 */
export const useGatewayPayment = ({
  orderId,
  orderNumber,
  amount,
  onSuccess,
}: UseGatewayPaymentOptions): UseGatewayPaymentResult => {
  const [state, setState] = useState<GatewayPaymentState>('idle')
  const [error, setError] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const { user } = useAuth()

  // Step 1: Create gateway order mutation
  const createOrderMutation = useMutation({
    mutationFn: () => createGatewayOrder(orderId),
    onSuccess: (gatewayOrder) => {
      openRazorpayModal(gatewayOrder)
    },
    onError: (err: Error) => {
      setState('failed')
      setError(err.message || 'Failed to initiate payment. Please try again.')
    },
  })

  // Step 2: Verify payment mutation (called by Razorpay handler callback)
  const verifyMutation = useMutation({
    mutationFn: (request: VerifyGatewayPaymentRequest) => verifyGatewayPayment(request),
    onSuccess: () => {
      setState('success')
      // Invalidate order queries to refresh the payment status in UI
      queryClient.invalidateQueries({ queryKey: ['order', orderId] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      onSuccess?.()
    },
    onError: (err: Error) => {
      setState('failed')
      setError(err.message || 'Payment verification failed. Please contact support.')
    },
  })

  /**
   * Opens the Razorpay checkout modal with the gateway order details.
   * The modal is opened after a successful createGatewayOrder API call.
   */
  const openRazorpayModal = useCallback((gatewayOrder: GatewayOrderResponse) => {
    // Ensure SDK is loaded
    if (!window.Razorpay) {
      setState('failed')
      setError('Payment gateway is not available. Please refresh and try again.')
      return
    }

    setState('checkout_open')

    const options: RazorpayOptions = {
      key: gatewayOrder.keyId,
      amount: Math.round(gatewayOrder.amount * 100), // Convert INR to paise
      currency: gatewayOrder.currency,
      name: 'PrintFlow',
      description: `Order ${orderNumber ?? orderId}`,
      order_id: gatewayOrder.gatewayOrderId,

      // Prefill customer info if available
      prefill: {
        name: user?.name ?? undefined,
        email: user?.email ?? undefined,
      },

      notes: {
        order_number: orderNumber ?? '',
        printflow_order_id: orderId,
      },

      theme: {
        color: '#7C3AED', // Matches PrintFlow's primary purple
      },

      modal: {
        ondismiss: () => {
          // User closed the modal without paying — return to idle
          // Do NOT set to 'failed' on dismiss; let them retry
          setState('idle')
          setError(null)
        },
        escape: true,
        backdropclose: false,
      },

      handler: (response: RazorpayPaymentResponse) => {
        // Payment succeeded in Razorpay — now verify server-side
        setState('verifying')
        verifyMutation.mutate({
          razorpayOrderId: response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
        })
      },
    }

    try {
      const razorpay = new window.Razorpay(options)
      razorpay.open()
    } catch (err) {
      setState('failed')
      setError('Failed to open payment modal. Please try again.')
    }
  }, [orderId, orderNumber, user, verifyMutation])

  /**
   * Entry point — starts the payment flow from idle.
   * Creates a gateway order, then opens the Razorpay modal on success.
   */
  const initiatePayment = useCallback(() => {
    if (state !== 'idle' && state !== 'failed') return // Prevent double-clicks

    setState('creating_order')
    setError(null)
    createOrderMutation.mutate()
  }, [state, createOrderMutation])

  const reset = useCallback(() => {
    setState('idle')
    setError(null)
  }, [])

  return {
    initiatePayment,
    state,
    error,
    isLoading: state === 'creating_order' || state === 'verifying',
    isSuccess: state === 'success',
    isFailed: state === 'failed',
    reset,
  }
}
