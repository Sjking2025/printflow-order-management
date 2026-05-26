import api from './api'
import { ApiResponse, PageResponse } from '../types/api.types'

export interface Notification {
  id: string
  userId: string
  orderId: string
  type: string
  channel: string
  subject: string | null
  message: string
  status: string
  sentAt: string
}

export const getNotifications = async (page = 1, pageSize = 20, unreadOnly = false) => {
  const { data } = await api.get<ApiResponse<PageResponse<Notification>>>('/notifications', {
    params: { page, pageSize, unreadOnly },
  })
  return data.data
}

export const getUnreadCount = async () => {
  const { data } = await api.get<ApiResponse<{ count: number }>>('/notifications/unread-count')
  return data.data.count
}

export const markAsRead = async (id: string) => {
  const { data } = await api.patch<ApiResponse<{ id: string; isRead: boolean }>>(`/notifications/${id}/read`)
  return data.data
}

export const markAllAsRead = async () => {
  const { data } = await api.patch<ApiResponse<{ updatedCount: number }>>('/notifications/read-all')
  return data.data.updatedCount
}
