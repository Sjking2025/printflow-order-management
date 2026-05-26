import api from './api'

// ── Existing Manual UPI endpoints — preserved unchanged ────────────────────────

export const submitPaymentProof = async (
  orderId: string,
  proofUrl: string,
  method: string,
  amount: number,
  transactionId?: string,
  notes?: string
) => {
  const { data } = await api.post(`/payments/${orderId}/proof`, {
    proofUrl,
    method,
    amount,
    transactionId,
    notes,
  })
  return data.data
}

export const verifyPayment = async (paymentId: string, status: string, notes?: string) => {
  const { data } = await api.patch(`/payments/${paymentId}/verify`, {
    status,
    notes,
  })
  return data.data
}

// ── New Razorpay gateway endpoints ─────────────────────────────────────────────

export interface GatewayOrderResponse {
  gatewayOrderId: string    // Razorpay order_xxx — passed to checkout SDK
  amount: number            // Amount in INR (not paise)
  currency: string          // "INR"
  keyId: string             // Razorpay public key (rzp_test_xxx or rzp_live_xxx)
  orderNumber: string       // PrintFlow order number for display
  paymentId: string         // Our internal Payment UUID
}

export interface VerifyGatewayPaymentRequest {
  razorpayOrderId: string
  razorpayPaymentId: string
  razorpaySignature: string
}

export interface VerifyGatewayPaymentResponse {
  verified: boolean
  paymentId: string
  orderId: string
  status: string
}

/**
 * Creates a Razorpay gateway order.
 * Returns checkout details to pass to the Razorpay SDK.
 * POST /api/v1/payments/{orderId}/gateway-order
 */
export const createGatewayOrder = async (orderId: string): Promise<GatewayOrderResponse> => {
  const { data } = await api.post(`/payments/${orderId}/gateway-order`)
  return data.data
}

/**
 * Verifies Razorpay payment after checkout completes.
 * Must be called with the three values Razorpay returns to the handler.
 * POST /api/v1/payments/verify
 */
export const verifyGatewayPayment = async (
  request: VerifyGatewayPaymentRequest
): Promise<VerifyGatewayPaymentResponse> => {
  const { data } = await api.post('/payments/verify', request)
  return data.data
}
