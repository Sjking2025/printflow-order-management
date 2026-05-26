import api from './api'
import { ApiResponse } from '../types/api.types'

export interface ClarificationMessage {
  id: string
  senderRole: string
  message: string
  isRead: boolean
  createdAt: string
}

export const getClarificationThread = async (orderId: string) => {
  const { data } = await api.get<ApiResponse<ClarificationMessage[]>>(`/orders/${orderId}/clarifications`)
  return data.data
}

export const sendClarificationMessage = async (orderId: string, message: string) => {
  const { data } = await api.post<ApiResponse<ClarificationMessage>>(`/orders/${orderId}/clarifications`, { message })
  return data.data
}
