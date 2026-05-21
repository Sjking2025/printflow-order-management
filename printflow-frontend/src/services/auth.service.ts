import api from './api'
import { ApiResponse, AuthResponse } from '../types/api.types'

export const verifyFirebaseToken = async (firebaseToken: string) => {
  const { data } = await api.post<ApiResponse<AuthResponse>>('/auth/verify', {
    firebaseToken,
  })
  return data.data
}

export const getCurrentUser = async () => {
  const { data } = await api.get('/auth/me')
  return data.data
}
