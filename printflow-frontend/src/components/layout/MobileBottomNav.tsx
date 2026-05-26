import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/auth.store'

const customerLinks = [
  { label: 'Home', icon: 'home', path: '/orders' },
  { label: 'My Orders', icon: 'receipt_long', path: '/orders' },
  { label: 'Upload', icon: 'cloud_upload', path: '/orders/new' },
  { label: 'Support', icon: 'chat_bubble', path: '#' },
]

const ownerLinks = [
  { label: 'Home', icon: 'home', path: '/owner/dashboard' },
  { label: 'Orders', icon: 'receipt_long', path: '/owner/queue' },
  { label: 'Upload', icon: 'cloud_upload', path: '/orders/new' },
  { label: 'Support', icon: 'chat_bubble', path: '#' },
]

export default function MobileBottomNav() {
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const links = user?.role === 'OWNER' ? ownerLinks : customerLinks

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full flex justify-around items-center px-4 py-2 bg-surface border-t border-outline-variant shadow-md z-50 rounded-t-xl pb-safe">
      {links.map((link) => {
        const isActive = location.pathname === link.path
        return (
          <Link
            key={link.label}
            to={link.path}
            className={`flex flex-col items-center justify-center p-2 transition-colors ${
              isActive ? 'text-secondary font-bold scale-110' : 'text-on-surface-variant hover:text-secondary-container'
            }`}
          >
            <span
              className="material-symbols-outlined"
              style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {link.icon}
            </span>
            <span className="font-label-md text-[10px] mt-1">{link.label}</span>
          </Link>
        )
      })}
      <style>{`
        @supports (padding-bottom: env(safe-area-inset-bottom)) {
          .pb-safe { padding-bottom: calc(0.5rem + env(safe-area-inset-bottom)); }
        }
      `}</style>
    </nav>
  )
}
