import api from './api'
import { ApiResponse, PageResponse } from '../types/api.types'
import { Order, OrderSummary } from '../types/order.types'

export const createOrder = async (orderData: any) => {
  const { data } = await api.post<ApiResponse<any>>('/orders', orderData)
  return data.data
}

export const getMyOrders = async (page = 1, pageSize = 20) => {
  const { data } = await api.get<ApiResponse<PageResponse<OrderSummary>>>(
    `/orders?page=${page}&pageSize=${pageSize}`
  )
  return data.data
}

export const getOrderById = async (orderId: string) => {
  const { data } = await api.get<ApiResponse<Order>>(`/orders/${orderId}`)
  return data.data
}

export const updateCopies = async (orderId: string, documentId: string, copies: number) => {
  const { data } = await api.patch(`/orders/${orderId}/documents/${documentId}`, { copies })
  return data.data
}

export const updateOrderStatus = async (orderId: string, status: string, note?: string, delayReason?: string, delayUntil?: string) => {
  const { data } = await api.patch(`/orders/${orderId}/status`, {
    status,
    note,
    delayReason,
    delayUntil,
  })
  return data.data
}
