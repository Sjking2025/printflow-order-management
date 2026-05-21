import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/auth.store'
import { useAuth } from '../../hooks/useAuth'

export default function Header() {
  const user = useAuthStore((s) => s.user)
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-6">
            <Link to={user?.role === 'OWNER' ? '/owner/dashboard' : '/orders'} className="flex items-center gap-2">
              <div className="w-8 h-8 bg-brand-blue rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">PF</span>
              </div>
              <span className="font-semibold text-gray-900">PrintFlow</span>
            </Link>

            {user?.role === 'OWNER' && (
              <nav className="hidden sm:flex items-center gap-4 ml-6">
                <Link to="/owner/dashboard" className="text-sm text-gray-600 hover:text-brand-blue">Dashboard</Link>
                <Link to="/owner/queue" className="text-sm text-gray-600 hover:text-brand-blue">Queue</Link>
                <Link to="/owner/settings" className="text-sm text-gray-600 hover:text-brand-blue">Settings</Link>
                <Link to="/owner/closure" className="text-sm text-gray-600 hover:text-brand-blue">Closure</Link>
              </nav>
            )}

            {user?.role === 'CUSTOMER' && (
              <nav className="hidden sm:flex items-center gap-4 ml-6">
                <Link to="/orders" className="text-sm text-gray-600 hover:text-brand-blue">My Orders</Link>
                <Link to="/orders/new" className="text-sm text-gray-600 hover:text-brand-blue">New Order</Link>
              </nav>
            )}
          </div>

          <div className="flex items-center gap-3">
            {user && (
              <>
                <span className="text-sm text-gray-500 hidden sm:block">{user.name}</span>
                <button onClick={handleLogout} className="btn-ghost text-sm py-1.5 px-3">
                  Logout
                </button>
              </>
            )}
          </div>
        </div>

        {user?.role === 'OWNER' && (
          <nav className="sm:hidden flex items-center gap-3 pb-3 overflow-x-auto">
            <Link to="/owner/dashboard" className="text-xs text-gray-600 whitespace-nowrap">Dashboard</Link>
            <Link to="/owner/queue" className="text-xs text-gray-600 whitespace-nowrap">Queue</Link>
            <Link to="/owner/settings" className="text-xs text-gray-600 whitespace-nowrap">Settings</Link>
            <Link to="/owner/closure" className="text-xs text-gray-600 whitespace-nowrap">Closure</Link>
          </nav>
        )}

        {user?.role === 'CUSTOMER' && (
          <nav className="sm:hidden flex items-center gap-3 pb-3 overflow-x-auto">
            <Link to="/orders" className="text-xs text-gray-600 whitespace-nowrap">My Orders</Link>
            <Link to="/orders/new" className="text-xs text-gray-600 whitespace-nowrap">New Order</Link>
          </nav>
        )}
      </div>
    </header>
  )
}
