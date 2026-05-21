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
  const { data } = await api.get<ApiResponse<ClarificationMessage[]>>(`/clarifications/${orderId}`)
  return data.data
}

export const sendClarificationMessage = async (orderId: string, message: string) => {
  const { data } = await api.post<ApiResponse<ClarificationMessage>>(`/clarifications/${orderId}`, { message })
  return data.data
}
