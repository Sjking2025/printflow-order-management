import { create } from 'zustand'
import { User } from '../types/user.types'
import { verifyFirebaseToken } from '../services/auth.service'

const STORAGE_KEY = 'printflow_auth'

function loadFromStorage(): { user: User | null; accessToken: string | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return { user: parsed.user ?? null, accessToken: parsed.accessToken ?? null }
    }
  } catch { /* ignore */ }
  return { user: null, accessToken: null }
}

function saveToStorage(user: User | null, accessToken: string | null) {
  try {
    if (user && accessToken) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, accessToken }))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch { /* ignore */ }
}

const { user: savedUser, accessToken: savedToken } = loadFromStorage()

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
  user: savedUser,
  accessToken: savedToken,
  isLoading: false,
  isAuthenticated: !!savedUser && !!savedToken,

  login: async (firebaseToken: string, role?: string) => {
    set({ isLoading: true })
    try {
      const authResponse = await verifyFirebaseToken(firebaseToken, role)
      saveToStorage(authResponse.user, authResponse.accessToken)
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
    saveToStorage(null, null)
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
    })
  },

  setUser: (user: User) => {
    const { accessToken } = useAuthStore.getState()
    saveToStorage(user, accessToken)
    set({ user })
  },
}))
