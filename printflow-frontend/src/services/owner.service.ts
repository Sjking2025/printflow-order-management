import api from './api'
import { ApiResponse } from '../types/api.types'
import { OrderSummary } from '../types/order.types'

export interface DashboardStats {
  pendingOrders: number
  urgentOrders: number
  inProgressOrders: number
  completedToday: number
  revenueToday: number
  delayedOrders: number
}

export const getDashboard = async () => {
  const { data } = await api.get<ApiResponse<DashboardStats>>('/owner/dashboard')
  return data.data
}

export const getQueue = async (status = 'PENDING,ACCEPTED,IN_PROGRESS,DELAYED,WAITING_CLARIFICATION') => {
  const { data } = await api.get<ApiResponse<OrderSummary[]>>(`/owner/queue?status=${status}`)
  return data.data
}

export const getOwnerOrder = async (orderId: string) => {
  const { data } = await api.get(`/owner/orders/${orderId}`)
  return data.data
}

export const setClosureMode = async (mode: string, message?: string, until?: string) => {
  const { data } = await api.post('/owner/closure', { mode, message, until })
  return data.data
}
