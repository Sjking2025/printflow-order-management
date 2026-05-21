import { create } from 'zustand'
import { Shop, PriceConfig } from '../types/shop.types'
import api from '../services/api'
import { ApiResponse } from '../types/api.types'

interface ShopState {
  shop: Shop | null
  priceConfig: PriceConfig | null
  isLoading: boolean
  fetchShop: (shopId: string) => Promise<void>
  fetchPrices: (shopId: string) => Promise<void>
}

export const useShopStore = create<ShopState>((set) => ({
  shop: null,
  priceConfig: null,
  isLoading: false,

  fetchShop: async (shopId: string) => {
    set({ isLoading: true })
    try {
      const { data } = await api.get<ApiResponse<Shop>>(`/shops/${shopId}`)
      set({ shop: data.data, isLoading: false })
    } catch {
      set({ isLoading: false })
    }
  },

  fetchPrices: async (shopId: string) => {
    try {
      const { data } = await api.get<ApiResponse<PriceConfig>>(`/shops/${shopId}/prices`)
      set({ priceConfig: data.data })
    } catch {
      // ignore
    }
  },
}))
