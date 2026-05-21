import { create } from 'zustand'
import { User } from '../types/user.types'
import { verifyFirebaseToken } from '../services/auth.service'

interface AuthState {
  user: User | null
  accessToken: string | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (firebaseToken: string, role?: string) => Promise<void>
  logout: () => void
  setUser: (user: User) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isLoading: false,
  isAuthenticated: false,

  login: async (firebaseToken: string, role?: string) => {
    set({ isLoading: true })
    try {
      const authResponse = await verifyFirebaseToken(firebaseToken, role)
      set({
        user: authResponse.user,
        accessToken: authResponse.accessToken,
        isAuthenticated: true,
        isLoading: false,
      })
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  logout: () => {
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
    })
  },

  setUser: (user: User) => set({ user }),
}))
