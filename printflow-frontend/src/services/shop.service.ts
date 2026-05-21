import api from './api'
import { ApiResponse } from '../types/api.types'

export interface ShopPublicInfo {
  id: string
  name: string
  upiId: string | null
  qrCodeUrl: string | null
}

export const getDefaultShop = async () => {
  const { data } = await api.get<ApiResponse<ShopPublicInfo>>('/shops/public')
  return data.data
}

export const getShopById = async (shopId: string) => {
  const { data } = await api.get<ApiResponse<ShopPublicInfo>>(`/shops/${shopId}`)
  return data.data
}
