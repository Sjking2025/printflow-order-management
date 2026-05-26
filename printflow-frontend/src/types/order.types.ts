export interface OrderDocument {
  id?: string
  fileName: string
  fileUrl: string
  fileSizeKb?: number
  pageCount: number
  copies: number
  printType: 'BW' | 'COLOR'
  sideType: 'SINGLE' | 'DOUBLE'
  paperSize: 'A4' | 'A3' | 'LETTER' | 'LEGAL'
  binding: 'NONE' | 'SPIRAL' | 'STAPLE'
  lamination: 'NONE' | 'SINGLE_SIDE' | 'BOTH_SIDES'
  notes?: string
  subtotal?: number
  copiesModifiedAt?: string
}

export interface UploadedFile extends OrderDocument {
  uploadProgress: number
  uploadStatus: 'pending' | 'uploading' | 'done' | 'error'
  errorMessage?: string
}

// ── Payment types ─────────────────────────────────────────────

export type PaymentMethod = 'MANUAL_UPI' | 'RAZORPAY'

export type PaymentStatus =
  | 'PENDING'
  | 'PROOF_UPLOADED'
  | 'VERIFIED'
  | 'REJECTED'
  | 'GATEWAY_INITIATED'
  | 'PAID'
  | 'FAILED'
  | 'REFUNDED'

export interface OrderPayment {
  id: string
  amount: number
  gateway?: PaymentMethod        // NEW — MANUAL_UPI or RAZORPAY
  status: PaymentStatus          // was 'string' — now typed
  proofUrl?: string
  transactionId?: string
  gatewayOrderId?: string        // NEW — Razorpay order_xxx
  gatewayPaymentId?: string      // NEW — Razorpay pay_xxx
  paidAt?: string                // NEW — when payment was captured
  verifiedAt?: string
}

// ── Order types ───────────────────────────────────────────────

export interface Order {
  id: string
  orderNumber: string
  status: string
  urgency: string
  expectedDelivery?: string
  description?: string
  totalAmount: number
  paymentStatus: PaymentStatus   // was 'string' — now typed
  paymentMethod?: PaymentMethod  // NEW — which method was selected
  lockExpiresAt?: string
  copyModifyExpiresAt?: string
  processingStartedAt?: string
  customer?: { id: string; name: string; phone?: string; email?: string }
  documents: OrderDocument[]
  payment?: OrderPayment         // Updated type
  statusHistory?: {
    fromStatus: string
    toStatus: string
    changedAt: string
  }[]
  clarifications?: {
    id: string
    senderRole: string
    message: string
    isRead: boolean
    createdAt: string
  }[]
  createdAt: string
}

export interface OrderSummary {
  id: string
  orderNumber: string
  status: string
  urgency: string
  documentCount: number
  totalAmount: number
  paymentStatus: PaymentStatus
  paymentMethod?: PaymentMethod  // NEW
  expectedDelivery: string
  createdAt: string
  customerId?: string
  customerName?: string
}
