import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useAuthStore } from '../../store/auth.store'
import Spinner from '../../components/ui/Spinner'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [userType, setUserType] = useState<'owner' | 'customer'>('customer')
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const { loginWithGoogle, loginWithEmail } = useAuth()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const navigate = useNavigate()

  const user = useAuthStore((s) => s.user)

  if (isAuthenticated) {
    navigate(user?.role === 'OWNER' ? '/owner/dashboard' : '/orders', { replace: true })
    return null
  }

  const handleGoogleLogin = async () => {
    setError('')
    setLoading(true)
    try {
      await loginWithGoogle()
      const u = useAuthStore.getState().user
      navigate(u?.role === 'OWNER' ? '/owner/dashboard' : '/orders')
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed')
    } finally {
      setLoading(false)
    }
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }
    setLoading(true)
    try {
      await loginWithEmail(email, password)
      const u = useAuthStore.getState().user
      navigate(u?.role === 'OWNER' ? '/owner/dashboard' : '/orders')
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="relative h-screen w-full flex items-stretch overflow-hidden bg-background">
      <section className="hidden lg:flex lg:w-1/2 relative bg-primary overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/70 z-20" />
        <img
          alt=""
          className="w-full h-full object-cover"
          src="https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=800&q=80"
        />
        <div className="absolute bottom-stack-xl left-margin-desktop z-30 max-w-lg">
          <h2 className="font-display text-display text-white mb-stack-sm leading-tight">
            {userType === 'owner' ? 'The Edge of Precision.' : 'Print Anything.'}
          </h2>
          <p className="font-body-lg text-body-lg text-white/80">
            {userType === 'owner'
              ? 'Empowering print shop owners with enterprise-grade operational control.'
              : 'Seamlessly order custom prints and manage your brand assets in one place.'}
          </p>
        </div>
      </section>

      <section className="w-full lg:w-1/2 flex items-center justify-center bg-surface relative px-margin-mobile lg:px-margin-desktop overflow-y-auto">
        <div className="w-full max-w-md py-stack-xl">
          <div className="mb-stack-xl text-center lg:text-left">
            <div className="inline-flex items-center gap-2 mb-stack-sm">
              <span className="material-symbols-outlined text-secondary-container text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                print
              </span>
              <h1 className="font-headline-lg text-headline-lg font-black tracking-tighter text-primary">PrintFlow</h1>
            </div>
            <h2 className="font-headline-md text-headline-md text-on-surface-variant">Join the Print Revolution</h2>
          </div>

          <div className="bg-surface-container flex p-1 rounded-xl mb-stack-lg border border-outline-variant">
            <button
              onClick={() => setUserType('owner')}
              className={`flex-1 py-stack-sm font-label-md text-label-md rounded-lg transition-all uppercase ${
                userType === 'owner' ? 'bg-secondary-container text-white' : 'text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              Print Shop Owner
            </button>
            <button
              onClick={() => setUserType('customer')}
              className={`flex-1 py-stack-sm font-label-md text-label-md rounded-lg transition-all uppercase ${
                userType === 'customer' ? 'bg-secondary-container text-white' : 'text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              Customer
            </button>
          </div>

          <div className="flex gap-stack-lg border-b border-outline-variant mb-stack-lg">
            <button
              onClick={() => setAuthMode('login')}
              className={`pb-stack-sm font-label-md text-label-md border-b-2 transition-colors uppercase ${
                authMode === 'login' ? 'border-secondary-container text-primary' : 'border-transparent text-on-surface-variant hover:text-primary'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setAuthMode('signup')}
              className={`pb-stack-sm font-label-md text-label-md border-b-2 transition-colors uppercase ${
                authMode === 'signup' ? 'border-secondary-container text-primary' : 'border-transparent text-on-surface-variant hover:text-primary'
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleEmailLogin} className="space-y-stack-md">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full h-10 flex items-center justify-center gap-stack-sm border border-outline-variant rounded-lg font-label-md text-label-md text-on-surface hover:bg-surface-container-low transition-colors disabled:opacity-50 uppercase"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              {loading ? 'Signing in...' : 'Sign in with Google'}
            </button>

            <div className="relative flex items-center py-stack-sm">
              <div className="flex-grow border-t border-outline-variant" />
              <span className="flex-shrink mx-4 text-outline font-label-md text-label-md uppercase">Or Email</span>
              <div className="flex-grow border-t border-outline-variant" />
            </div>

            <div className="space-y-1">
              <label className="font-body-sm text-body-sm font-semibold text-on-surface block">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="name@company.com"
                disabled={loading}
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between">
                <label className="font-body-sm text-body-sm font-semibold text-on-surface">Password</label>
                <button type="button" className="font-label-md text-label-md text-secondary hover:underline uppercase">Forgot?</button>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
                disabled={loading}
              />
            </div>

            {error && (
              <div className="bg-error-container border border-error/20 rounded-lg p-stack-sm">
                <p className="font-body-sm text-body-sm text-on-error-container">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? <Spinner size="sm" /> : authMode === 'login' ? 'Login to Dashboard' : 'Create Account'}
            </button>
          </form>

          <footer className="mt-stack-xl text-center">
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Need assistance? <a href="#" className="text-secondary font-bold hover:underline">Contact Support</a>
            </p>
          </footer>
        </div>
      </section>
    </main>
  )
}
