import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from './store/auth.store'
import LoginPage from './pages/auth/LoginPage'
import OrderListPage from './pages/customer/OrderListPage'
import OrderDetailPage from './pages/customer/OrderDetailPage'
import NewOrderPage from './pages/customer/NewOrderPage'
import DashboardPage from './pages/owner/DashboardPage'
import QueuePage from './pages/owner/QueuePage'
import OwnerOrderDetailPage from './pages/owner/OwnerOrderDetailPage'
import SettingsPage from './pages/owner/SettingsPage'
import ClosurePage from './pages/owner/ClosurePage'
import NotFoundPage from './pages/NotFoundPage'
import Header from './components/layout/Header'
import { ReactNode } from 'react'

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

const OwnerRoute = ({ children }: { children: ReactNode }) => {
  const user = useAuthStore((s) => s.user)
  if (!user || user.role !== 'OWNER') return <Navigate to="/orders" replace />
  return <>{children}</>
}

const AppLayout = () => (
  <div className="min-h-screen bg-gray-50">
    <Header />
    <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
      <Outlet />
    </main>
  </div>
)

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="/orders" element={<OrderListPage />} />
          <Route path="/orders/new" element={<NewOrderPage />} />
          <Route path="/orders/:orderId" element={<OrderDetailPage />} />

          <Route element={<OwnerRoute><Outlet /></OwnerRoute>}>
            <Route path="/owner/dashboard" element={<DashboardPage />} />
            <Route path="/owner/queue" element={<QueuePage />} />
            <Route path="/owner/orders/:orderId" element={<OwnerOrderDetailPage />} />
            <Route path="/owner/settings" element={<SettingsPage />} />
            <Route path="/owner/closure" element={<ClosurePage />} />
          </Route>
        </Route>

        <Route path="/" element={<Navigate to="/orders" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
