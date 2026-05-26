import { useState, useEffect } from 'react'
import Card from '../../components/ui/Card'
import Spinner from '../../components/ui/Spinner'
import ErrorState from '../../components/ui/ErrorState'
import api from '../../services/api'
import { getMyShop } from '../../services/shop.service'

interface PriceConfigData {
  bwPerPageA4: number
  colorPerPageA4: number
  a3Multiplier: number
  doubleSideDiscount: number
  spiralBindingFlat: number
  stapleFlat: number
  laminationPerPage: number
  urgencyHighFee: number
  urgencyCriticalFee: number
}

export default function SettingsPage() {
  const [shopId, setShopId] = useState<string | null>(null)
  const [prices, setPrices] = useState<PriceConfigData | null>(null)
  const [lockTimerMins, setLockTimerMins] = useState(5)
  const [copyModifyWindowMins, setCopyModifyWindowMins] = useState(5)
  const [upiId, setUpiId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    (async () => {
      try {
        const shop: any = await getMyShop()
        setShopId(shop.id)
        setLockTimerMins(shop.lockTimerMins ?? 5)
        setCopyModifyWindowMins(shop.copyModifyWindowMins ?? 5)
        setUpiId(shop.upiId ?? '')
        const { data: priceRes } = await api.get(`/shops/${shop.id}/prices`)
        setPrices({
          bwPerPageA4: priceRes.data.bwPerPageA4,
          colorPerPageA4: priceRes.data.colorPerPageA4,
          a3Multiplier: priceRes.data.a3Multiplier,
          doubleSideDiscount: priceRes.data.doubleSideDiscount,
          spiralBindingFlat: priceRes.data.spiralBindingFlat,
          stapleFlat: priceRes.data.stapleFlat,
          laminationPerPage: priceRes.data.laminationPerPage,
          urgencyHighFee: priceRes.data.urgencyHighFee,
          urgencyCriticalFee: priceRes.data.urgencyCriticalFee,
        })
      } catch {
        setError('Failed to load settings')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const handleChange = (field: keyof PriceConfigData, value: number) => {
    if (!prices) return
    setPrices({ ...prices, [field]: value })
  }

  const handleSave = async () => {
    if (!shopId || !prices) return
    setSaving(true)
    setMessage('')
    try {
      await api.patch(`/shops/${shopId}/prices`, {
        bwPerPageA4: prices.bwPerPageA4,
        colorPerPageA4: prices.colorPerPageA4,
        a3Multiplier: prices.a3Multiplier,
        doubleSideDiscount: prices.doubleSideDiscount,
        spiralBindingFlat: prices.spiralBindingFlat,
        stapleFlat: prices.stapleFlat,
        laminationPerPage: prices.laminationPerPage,
        urgencyHighFee: prices.urgencyHighFee,
        urgencyCriticalFee: prices.urgencyCriticalFee,
      })
      await api.patch(`/shops/${shopId}/settings`, { lockTimerMins, copyModifyWindowMins, upiId })
      setMessage('Settings saved successfully')
    } catch {
      setMessage('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Spinner size="lg" className="mt-20" />
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />
  if (!prices) return <ErrorState message="Price config not found" onRetry={() => window.location.reload()} />

  return (
    <div className="max-w-2xl mx-auto space-y-stack-lg">
      <div>
        <h2 className="font-headline-lg text-headline-lg text-primary">Shop Settings</h2>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1">Manage pricing and order configuration.</p>
      </div>

      <Card>
        <h3 className="font-label-md text-label-md text-on-surface-variant uppercase mb-4">Basic Prices</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-body-sm text-body-sm font-semibold text-on-surface block mb-1">B&W per page (A4)</label>
            <input type="number" step="0.50" min="0" value={prices.bwPerPageA4}
              onChange={(e) => handleChange('bwPerPageA4', parseFloat(e.target.value) || 0)} className="input-field" />
          </div>
          <div>
            <label className="font-body-sm text-body-sm font-semibold text-on-surface block mb-1">Color per page (A4)</label>
            <input type="number" step="0.50" min="0" value={prices.colorPerPageA4}
              onChange={(e) => handleChange('colorPerPageA4', parseFloat(e.target.value) || 0)} className="input-field" />
          </div>
          <div>
            <label className="font-body-sm text-body-sm font-semibold text-on-surface block mb-1">A3 Multiplier (×)</label>
            <input type="number" step="0.5" min="1" value={prices.a3Multiplier}
              onChange={(e) => handleChange('a3Multiplier', parseFloat(e.target.value) || 1)} className="input-field" />
          </div>
          <div>
            <label className="font-body-sm text-body-sm font-semibold text-on-surface block mb-1">Double Side Discount (per page)</label>
            <input type="number" step="0.10" min="0" value={prices.doubleSideDiscount}
              onChange={(e) => handleChange('doubleSideDiscount', parseFloat(e.target.value) || 0)} className="input-field" />
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="font-label-md text-label-md text-on-surface-variant uppercase mb-4">Add-on Prices</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-body-sm text-body-sm font-semibold text-on-surface block mb-1">Spiral Binding (flat)</label>
            <input type="number" step="5" min="0" value={prices.spiralBindingFlat}
              onChange={(e) => handleChange('spiralBindingFlat', parseFloat(e.target.value) || 0)} className="input-field" />
          </div>
          <div>
            <label className="font-body-sm text-body-sm font-semibold text-on-surface block mb-1">Staple (flat)</label>
            <input type="number" step="1" min="0" value={prices.stapleFlat}
              onChange={(e) => handleChange('stapleFlat', parseFloat(e.target.value) || 0)} className="input-field" />
          </div>
          <div>
            <label className="font-body-sm text-body-sm font-semibold text-on-surface block mb-1">Lamination (per page)</label>
            <input type="number" step="1" min="0" value={prices.laminationPerPage}
              onChange={(e) => handleChange('laminationPerPage', parseFloat(e.target.value) || 0)} className="input-field" />
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="font-label-md text-label-md text-on-surface-variant uppercase mb-4">Urgency Fees</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-body-sm text-body-sm font-semibold text-on-surface block mb-1">High Urgency Fee</label>
            <input type="number" step="5" min="0" value={prices.urgencyHighFee}
              onChange={(e) => handleChange('urgencyHighFee', parseFloat(e.target.value) || 0)} className="input-field" />
          </div>
          <div>
            <label className="font-body-sm text-body-sm font-semibold text-on-surface block mb-1">Critical Urgency Fee</label>
            <input type="number" step="10" min="0" value={prices.urgencyCriticalFee}
              onChange={(e) => handleChange('urgencyCriticalFee', parseFloat(e.target.value) || 0)} className="input-field" />
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="font-label-md text-label-md text-on-surface-variant uppercase mb-4">Order Rules</h3>
        <div>
          <label className="font-body-sm text-body-sm font-semibold text-on-surface block mb-1">Copy Change Lock Timer ({lockTimerMins} minutes)</label>
          <input type="range" min="2" max="30" value={lockTimerMins}
            onChange={(e) => setLockTimerMins(parseInt(e.target.value))}
            className="w-full accent-primary" />
          <div className="flex justify-between font-label-md text-label-md text-on-surface-variant mt-1">
            <span>2 min</span>
            <span>30 min</span>
          </div>
        </div>
        <div className="mt-stack-lg">
          <label className="font-body-sm text-body-sm font-semibold text-on-surface block mb-1">Copy Modification Window ({copyModifyWindowMins} minutes)</label>
          <input type="range" min="1" max="30" value={copyModifyWindowMins}
            onChange={(e) => setCopyModifyWindowMins(parseInt(e.target.value))}
            className="w-full accent-primary" />
          <div className="flex justify-between font-label-md text-label-md text-on-surface-variant mt-1">
            <span>1 min</span>
            <span>30 min</span>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">
            Customers can increase copy counts within this window after placing an order.
          </p>
        </div>
      </Card>

      <Card>
        <h3 className="font-label-md text-label-md text-on-surface-variant uppercase mb-4">Payment Details</h3>
        <div className="space-y-stack-md">
          <div>
            <label className="font-body-sm text-body-sm font-semibold text-on-surface block mb-1">UPI ID</label>
            <input type="text" value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="e.g. shopname@upi" className="input-field" />
          </div>
          {upiId && (
            <div className="bg-surface-bright rounded-lg p-stack-md border border-outline-variant text-center">
              <p className="font-body-sm text-body-sm text-on-surface-variant mb-2">Customers will see this UPI ID on the payment screen</p>
              <p className="font-label-lg text-label-lg text-primary font-semibold">{upiId}</p>
            </div>
          )}
        </div>
      </Card>

      {message && (
        <div className={`p-stack-md rounded-lg font-body-sm text-body-sm ${
          message.includes('success') ? 'bg-status-success text-on-status-success' : 'bg-error-container text-on-error-container'
        }`}>
          {message}
        </div>
      )}

      <button onClick={handleSave} disabled={saving} className="btn-primary w-full">
        {saving ? <Spinner size="sm" /> : null}
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  )
}
