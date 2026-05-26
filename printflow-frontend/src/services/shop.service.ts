import api from './api'
import { ApiResponse } from '../types/api.types'

export interface PriceConfig {
  id: string
  shopId: string
  bwPerPageA4: number
  colorPerPageA4: number
  a3Multiplier: number
  doubleSideDiscount: number
  spiralBindingFlat: number
  stapleFlat: number
  laminationPerPage: number
  urgencyHighFee: number
  urgencyCriticalFee: number
}

export interface ShopPublicInfo {
  id: string
  name: string
  ownerName?: string
  upiId: string | null
  qrCodeUrl: string | null
  priceConfig?: PriceConfig
}

export const getAllShops = async () => {
  const { data } = await api.get<ApiResponse<ShopPublicInfo[]>>('/shops/public')
  return data.data
}

export const getMyShop = async () => {
  const { data } = await api.get<ApiResponse<ShopPublicInfo>>('/owner/shop')
  return data.data
}

export const createShop = async (shopData: { name: string; ownerName: string; upiId: string; address?: string; phone?: string; whatsapp?: string }) => {
  const { data } = await api.post<ApiResponse<ShopPublicInfo>>('/shops', shopData)
  return data.data
}

export const getShopById = async (shopId: string) => {
  const { data } = await api.get<ApiResponse<ShopPublicInfo>>(`/shops/${shopId}`)
  return data.data
}
