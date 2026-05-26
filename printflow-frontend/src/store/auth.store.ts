import { create } from 'zustand'
import { User } from '../types/user.types'
import { verifyFirebaseToken } from '../services/auth.service'

const STORAGE_KEY = 'printflow_auth'

interface PersistedAuth {
  user: User
  accessToken: string
  refreshToken: string
}

function loadFromStorage(): PersistedAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      return JSON.parse(raw)
    }
  } catch { /* ignore */ }
  return null
}

function saveToStorage(data: PersistedAuth | null) {
  try {
    if (data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch { /* ignore */ }
}

const saved = loadFromStorage()

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (firebaseToken: string, role?: string) => Promise<void>
  logout: () => void
  setTokens: (accessToken: string, refreshToken: string) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: saved?.user ?? null,
  accessToken: saved?.accessToken ?? null,
  refreshToken: saved?.refreshToken ?? null,
  isLoading: false,
  isAuthenticated: !!saved?.user && !!saved?.accessToken,

  login: async (firebaseToken: string, role?: string) => {
    set({ isLoading: true })
    try {
      const authResponse = await verifyFirebaseToken(firebaseToken, role)
      const persisted: PersistedAuth = {
        user: authResponse.user,
        accessToken: authResponse.accessToken,
        refreshToken: authResponse.refreshToken,
      }
      saveToStorage(persisted)
      set({
        user: authResponse.user,
        accessToken: authResponse.accessToken,
        refreshToken: authResponse.refreshToken,
        isAuthenticated: true,
        isLoading: false,
      })
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  logout: () => {
    saveToStorage(null)
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    })
  },

  setTokens: (accessToken: string, refreshToken: string) => {
    const current = useAuthStore.getState()
    const persisted: PersistedAuth = {
      user: current.user!,
      accessToken,
      refreshToken,
    }
    saveToStorage(persisted)
    set({ accessToken, refreshToken })
  },
}))