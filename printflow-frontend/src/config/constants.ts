export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'
export const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || ''
export const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'printflow_temp'

export const ORDER_STATUS = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  IN_PROGRESS: 'IN_PROGRESS',
  WAITING_CLARIFICATION: 'WAITING_CLARIFICATION',
  DELAYED: 'DELAYED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const

export const URGENCY = {
  NORMAL: 'NORMAL',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const

export const ALLOWED_FILE_TYPES = '.pdf,.docx,.jpg,.jpeg,.png'
export const MAX_FILE_SIZE_MB = 20
export const MAX_DOCUMENTS = 5
export const ORDER_POLL_INTERVAL = 30_000
export const NOTIFICATION_POLL_INTERVAL = 60_000
