import api from './api'

export const submitPaymentProof = async (orderId: string, proofUrl: string, method: string, amount: number, transactionId?: string, notes?: string) => {
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
