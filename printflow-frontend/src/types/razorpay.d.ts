// Global Razorpay Checkout SDK type declarations
// Loaded from https://checkout.razorpay.com/v1/checkout.js in index.html

interface RazorpayOptions {
  key: string
  amount: number           // Amount in paise (INR × 100)
  currency: string
  name: string
  description: string
  order_id: string         // Razorpay gateway order ID (order_xxx)
  handler: (response: RazorpayPaymentResponse) => void
  prefill?: {
    name?: string
    email?: string
    contact?: string
  }
  notes?: Record<string, string>
  theme?: {
    color?: string
  }
  modal?: {
    ondismiss?: () => void
    escape?: boolean
    backdropclose?: boolean
  }
}

interface RazorpayPaymentResponse {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

declare class Razorpay {
  constructor(options: RazorpayOptions)
  open(): void
  close(): void
  on(event: string, callback: (response: unknown) => void): void
}

interface Window {
  Razorpay: typeof Razorpay
}
