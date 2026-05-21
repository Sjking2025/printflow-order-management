import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-200">404</h1>
        <p className="text-lg text-gray-600 mt-2">Page not found</p>
        <Link to="/orders" className="btn-primary inline-block mt-6">
          Go to Orders
        </Link>
      </div>
    </div>
  )
}
