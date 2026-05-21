export const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  ACCEPTED: 'bg-blue-100 text-blue-800 border-blue-200',
  IN_PROGRESS: 'bg-purple-100 text-purple-800 border-purple-200',
  WAITING_CLARIFICATION: 'bg-orange-100 text-orange-800 border-orange-200',
  DELAYED: 'bg-red-100 text-red-800 border-red-200',
  COMPLETED: 'bg-green-100 text-green-800 border-green-200',
  CANCELLED: 'bg-gray-100 text-gray-800 border-gray-200',
}

export const urgencyColors: Record<string, string> = {
  NORMAL: 'bg-gray-100 text-gray-700',
  HIGH: 'bg-orange-100 text-orange-800',
  CRITICAL: 'bg-red-100 text-red-800',
}

export const paymentStatusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  PROOF_UPLOADED: 'bg-blue-100 text-blue-800',
  VERIFIED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
}

export const statusLabels: Record<string, string> = {
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  IN_PROGRESS: 'In Progress',
  WAITING_CLARIFICATION: 'Needs Info',
  DELAYED: 'Delayed',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

export const urgencyLabels: Record<string, string> = {
  NORMAL: 'Normal',
  HIGH: 'High',
  CRITICAL: 'Critical',
}
