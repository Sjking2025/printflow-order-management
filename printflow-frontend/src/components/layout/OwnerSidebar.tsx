import { Link, useLocation } from 'react-router-dom'

const navItems = [
  { label: 'Queue', icon: 'list_alt', path: '/owner/queue' },
  { label: 'Dashboard', icon: 'monitoring', path: '/owner/dashboard' },
  { label: 'Active Jobs', icon: 'print', path: '/owner/active' },
  { label: 'Completed', icon: 'check_circle', path: '/owner/completed' },
  { label: 'Settings', icon: 'settings', path: '/owner/settings' },
]

export default function OwnerSidebar() {
  const location = useLocation()

  return (
    <nav className="hidden md:flex flex-col h-screen py-stack-md bg-surface-container border-r border-outline-variant w-64 shrink-0">
      <div className="px-margin-desktop mb-stack-lg">
        <h1 className="font-headline-md text-headline-md text-secondary truncate">PrintFlow Pro</h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant truncate mt-1">Terminal #01</p>
      </div>
      <div className="px-4 mb-stack-lg">
        <Link
          to="/orders/new"
          className="w-full flex items-center justify-center gap-2 bg-secondary-container text-on-secondary-container h-10 rounded hover:opacity-90 transition-opacity"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span className="font-label-md text-label-md">New Quick Order</span>
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto px-2 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 rounded-lg mx-2 my-1 px-4 py-3 transition-all duration-200 ease-in-out ${
                isActive
                  ? 'bg-secondary-container text-on-secondary-container'
                  : 'text-on-surface-variant hover:bg-surface-container-highest'
              }`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="font-label-md text-label-md">{item.label}</span>
            </Link>
          )
        })}
      </div>
      <div className="px-2 mt-auto border-t border-outline-variant pt-4 space-y-1">
        <a href="#" className="flex items-center gap-3 text-on-surface-variant mx-2 my-1 px-4 py-3 rounded-lg hover:bg-surface-container-highest transition-all duration-200 ease-in-out">
          <span className="material-symbols-outlined">help</span>
          <span className="font-label-md text-label-md">Help</span>
        </a>
        <Link to="/login" className="flex items-center gap-3 text-on-surface-variant mx-2 my-1 px-4 py-3 rounded-lg hover:bg-surface-container-highest transition-all duration-200 ease-in-out">
          <span className="material-symbols-outlined">logout</span>
          <span className="font-label-md text-label-md">Logout</span>
        </Link>
      </div>
    </nav>
  )
}
