import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { createShop } from '../../services/shop.service'
import { useAuthStore } from '../../store/auth.store'
import Spinner from '../../components/ui/Spinner'

export default function OwnerOnboardingPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [formData, setFormData] = useState({
    name: '',
    ownerName: user?.name || '',
    upiId: '',
    address: '',
    phone: '',
    whatsapp: '',
  })
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: createShop,
    onSuccess: () => {
      // Once created, route to dashboard.
      // Next time the user logs in, getMyShop() will succeed, so they won't hit onboarding.
      navigate('/owner/dashboard')
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to register shop. Please try again.')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!formData.name.trim()) return setError('Shop name is required')
    if (!formData.ownerName.trim()) return setError('Owner name is required')
    if (!formData.upiId.trim()) return setError('UPI ID is required')
    
    mutation.mutate(formData)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-stack-md">
      <div className="max-w-md w-full bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg p-stack-xl overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary"></div>
        <div className="text-center mb-stack-xl">
          <div className="flex justify-center items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-primary text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>storefront</span>
          </div>
          <h1 className="font-headline-md text-headline-md text-primary">Set Up Your Shop</h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">Welcome to PrintFlow! Let's get your shop registered so you can start receiving orders.</p>
        </div>

        {error && (
          <div className="bg-error-container text-on-error-container p-3 rounded-lg mb-stack-md font-body-sm text-body-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-stack-md">
          <div>
            <label className="font-label-md text-label-md text-on-surface mb-1 block">Shop Name *</label>
            <input
              type="text"
              placeholder="e.g. Quick Print Station"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input-field w-full"
              required
            />
          </div>
          
          <div>
            <label className="font-label-md text-label-md text-on-surface mb-1 block">Owner Name *</label>
            <input
              type="text"
              placeholder="Your Full Name"
              value={formData.ownerName}
              onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
              className="input-field w-full"
              required
            />
          </div>

          <div>
            <label className="font-label-md text-label-md text-on-surface mb-1 block">UPI ID (For Payments) *</label>
            <input
              type="text"
              placeholder="e.g. shop@upi"
              value={formData.upiId}
              onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
              className="input-field w-full"
              required
            />
            <p className="text-xs text-on-surface-variant mt-1">Customers will pay this UPI ID directly.</p>
          </div>

          <div className="grid grid-cols-2 gap-stack-sm">
            <div>
              <label className="font-label-md text-label-md text-on-surface mb-1 block">Phone Number</label>
              <input
                type="text"
                placeholder="Optional"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="font-label-md text-label-md text-on-surface mb-1 block">WhatsApp</label>
              <input
                type="text"
                placeholder="Optional"
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                className="input-field w-full"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={mutation.isPending}
            className="btn-primary w-full mt-stack-lg py-3 text-lg"
          >
            {mutation.isPending ? <Spinner size="sm" /> : 'Complete Setup'}
          </button>
        </form>
      </div>
    </div>
  )
}
