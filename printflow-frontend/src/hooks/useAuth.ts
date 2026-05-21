import { useAuthStore } from '../store/auth.store'
import { signInWithGoogle, signInWithEmail, auth } from '../config/firebase'

export const useAuth = () => {
  const store = useAuthStore()

  const loginWithGoogle = async (role?: string) => {
    const userCred = await signInWithGoogle()
    const token = await userCred.getIdToken()
    await store.login(token, role)
  }

  const loginWithEmail = async (email: string, password: string, role?: string) => {
    const userCred = await signInWithEmail(email, password)
    const token = await userCred.getIdToken()
    await store.login(token, role)
  }

  const logout = () => {
    auth.signOut()
    store.logout()
  }

  return {
    user: store.user,
    isAuthenticated: store.isAuthenticated,
    isLoading: store.isLoading,
    loginWithGoogle,
    loginWithEmail,
    logout,
  }
}
