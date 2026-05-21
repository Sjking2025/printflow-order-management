import { useState } from 'react'
import Card from '../../components/ui/Card'
import Spinner from '../../components/ui/Spinner'
import api from '../../services/api'

export default function SettingsPage() {
  const [prices, setPrices] = useState({
    bwPerPageA4: 0.50,
    colorPerPageA4: 5.00,
    a3Multiplier: 2.0,
    doubleSideDiscount: 0,
    spiralBindingFlat: 30,
    stapleFlat: 5,
    laminationPerPage: 10,
    urgencyHighFee: 20,
    urgencyCriticalFee: 50,
    lockTimerMins: 5,
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const handleChange = (field: string, value: number) => {
    setPrices((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage('')
    try {
      await api.patch('/shops/00000000-0000-0000-0000-000000000000/prices', {
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
      await api.patch('/shops/00000000-0000-0000-0000-000000000000/settings', {
        lockTimerMins: prices.lockTimerMins,
      })
      setMessage('Settings saved successfully')
    } catch {
      setMessage('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

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
          <label className="font-body-sm text-body-sm font-semibold text-on-surface block mb-1">Copy Change Lock Timer ({prices.lockTimerMins} minutes)</label>
          <input type="range" min="2" max="30" value={prices.lockTimerMins}
            onChange={(e) => handleChange('lockTimerMins', parseInt(e.target.value))}
            className="w-full accent-primary" />
          <div className="flex justify-between font-label-md text-label-md text-on-surface-variant mt-1">
            <span>2 min</span>
            <span>30 min</span>
          </div>
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
