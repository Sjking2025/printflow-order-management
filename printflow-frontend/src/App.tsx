import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from './store/auth.store'
import LoginPage from './pages/auth/LoginPage'
import OrderListPage from './pages/customer/OrderListPage'
import OrderDetailPage from './pages/customer/OrderDetailPage'
import NewOrderPage from './pages/customer/NewOrderPage'
import NotificationsPage from './pages/customer/NotificationsPage'
import DashboardPage from './pages/owner/DashboardPage'
import OwnerOnboardingPage from './pages/owner/OwnerOnboardingPage'
import QueuePage from './pages/owner/QueuePage'
import OwnerOrderDetailPage from './pages/owner/OwnerOrderDetailPage'
import CustomersPage from './pages/owner/CustomersPage'
import SettingsPage from './pages/owner/SettingsPage'
import ClosurePage from './pages/owner/ClosurePage'
import NotFoundPage from './pages/NotFoundPage'
import Header from './components/layout/Header'
import OwnerSidebar from './components/layout/OwnerSidebar'
import MobileBottomNav from './components/layout/MobileBottomNav'
import { ReactNode } from 'react'

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

import { useQuery } from '@tanstack/react-query'
import { getMyShop } from './services/shop.service'
import Spinner from './components/ui/Spinner'

const OwnerRoute = ({ children }: { children: ReactNode }) => {
  const user = useAuthStore((s) => s.user)
  if (!user || user.role !== 'OWNER') return <Navigate to="/orders" replace />
  return <>{children}</>
}

const OwnerGuard = ({ children }: { children: ReactNode }) => {
  const { data: shop, isLoading, isError } = useQuery({
    queryKey: ['myShop'],
    queryFn: getMyShop,
    retry: false,
  })

  if (isLoading) return <div className="h-screen flex items-center justify-center"><Spinner size="lg" /></div>
  if (isError || !shop) return <Navigate to="/owner/onboarding" replace />

  return <>{children}</>
}

const CustomerLayout = () => (
  <div className="flex flex-col min-h-screen bg-background">
    <Header />
    <main className="flex-1 w-full max-w-container-max-width mx-auto px-margin-mobile md:px-margin-desktop py-stack-lg pb-[100px] md:pb-stack-lg">
      <Outlet />
    </main>
    <MobileBottomNav />
  </div>
)

const OwnerLayout = () => (
  <div className="flex h-screen overflow-hidden bg-background">
    <OwnerSidebar />
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      <Header />
      <main className="flex-1 overflow-y-auto p-margin-mobile md:p-margin-desktop pb-[100px] md:pb-0">
        <div className="max-w-container-max-width mx-auto space-y-stack-lg">
          <Outlet />
        </div>
      </main>
      <MobileBottomNav />
    </div>
  </div>
)

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute><CustomerLayout /></ProtectedRoute>}>
          <Route path="/orders" element={<OrderListPage />} />
          <Route path="/orders/new" element={<NewOrderPage />} />
          <Route path="/orders/:orderId" element={<OrderDetailPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
        </Route>

        <Route path="/owner/onboarding" element={<ProtectedRoute><OwnerOnboardingPage /></ProtectedRoute>} />

        <Route element={<ProtectedRoute><OwnerRoute><OwnerGuard><OwnerLayout /></OwnerGuard></OwnerRoute></ProtectedRoute>}>
          <Route path="/owner/dashboard" element={<DashboardPage />} />
          <Route path="/owner/queue" element={<QueuePage />} />
          <Route path="/owner/customers" element={<CustomersPage />} />
          <Route path="/owner/orders/:orderId" element={<OwnerOrderDetailPage />} />
          <Route path="/owner/settings" element={<SettingsPage />} />
          <Route path="/owner/closure" element={<ClosurePage />} />
        </Route>

        <Route path="/" element={<Navigate to="/orders" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
