import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../store/auth.store'
import { useAuth } from '../../hooks/useAuth'
import { getUnreadCount } from '../../services/notifications.service'

export default function Header() {
  const user = useAuthStore((s) => s.user)
  const { logout } = useAuth()
  const navigate = useNavigate()
  const isOwner = user?.role === 'OWNER'

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unreadNotifications', user?.id],
    queryFn: getUnreadCount,
    enabled: !!user,
    refetchInterval: 30000 // Poll every 30s
  })

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="bg-surface-container-lowest border-b border-outline-variant sticky top-0 z-50">
      <div className="flex justify-between items-center h-16 px-margin-mobile md:px-margin-desktop w-full max-w-container-max-width mx-auto">
        <div className="flex items-center gap-stack-lg">
          <Link to={isOwner ? '/owner/dashboard' : '/orders'} className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary-container text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              print
            </span>
            <span className="font-headline-md text-headline-md font-bold text-primary hidden sm:block">PrintFlow</span>
          </Link>
          <nav className="hidden md:flex items-center gap-stack-md">
            {isOwner ? (
              <>
                <Link to="/owner/dashboard" className="text-on-surface-variant hover:text-secondary transition-colors duration-200 font-label-md text-label-md">Dashboard</Link>
                <Link to="/owner/queue" className="text-on-surface-variant hover:text-secondary transition-colors duration-200 font-label-md text-label-md">Queue</Link>
                <Link to="/owner/settings" className="text-on-surface-variant hover:text-secondary transition-colors duration-200 font-label-md text-label-md">Settings</Link>
              </>
            ) : (
              <>
                <Link to="/orders" className="text-on-surface-variant hover:text-secondary transition-colors duration-200 font-label-md text-label-md">My Orders</Link>
                <Link to="/orders/new" className="text-on-surface-variant hover:text-secondary transition-colors duration-200 font-label-md text-label-md">New Order</Link>
              </>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-stack-md">
          {user ? (
            <>
              <Link to="/notifications" className="relative text-primary hover:bg-surface-container-high p-2 rounded-full transition-colors flex items-center justify-center">
                <span className="material-symbols-outlined">notifications</span>
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-error text-[10px] font-bold text-white ring-2 ring-surface-container-lowest">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
              <span className="hidden sm:block font-body-sm text-body-sm text-on-surface-variant">{user.name}</span>
              <div className="h-8 w-8 rounded-full overflow-hidden border border-outline-variant bg-surface-variant flex items-center justify-center">
                <span className="material-symbols-outlined text-on-surface-variant text-lg">account_circle</span>
              </div>
              <button onClick={handleLogout} className="btn-ghost text-sm">
                Logout
              </button>
            </>
          ) : (
            <Link to="/login" className="text-on-surface-variant font-label-md text-label-md px-4 py-2 hover:text-primary transition-colors">
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
