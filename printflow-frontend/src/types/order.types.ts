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
}

export interface UploadedFile extends OrderDocument {
  uploadProgress: number
  uploadStatus: 'pending' | 'uploading' | 'done' | 'error'
  errorMessage?: string
}

export interface Order {
  id: string
  orderNumber: string
  status: string
  urgency: string
  expectedDelivery?: string
  description?: string
  totalAmount: number
  paymentStatus: string
  lockExpiresAt?: string
  processingStartedAt?: string
  customer?: { id: string; name: string; phone?: string }
  documents: OrderDocument[]
  payment?: {
    id: string
    amount: number
    method: string
    status: string
    proofUrl?: string
    transactionId?: string
    verifiedAt?: string
  }
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
  paymentStatus: string
  expectedDelivery: string
  createdAt: string
  customerId?: string
  customerName?: string
}
