import { useState } from 'react'
import Card from '../../components/ui/Card'
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
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Shop Settings</h1>

      <Card>
        <h3 className="font-semibold text-sm mb-4">Basic Prices</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">B&W per page (A4)</label>
              <input type="number" step="0.50" min="0" value={prices.bwPerPageA4}
                onChange={(e) => handleChange('bwPerPageA4', parseFloat(e.target.value) || 0)}
                className="input-field mt-1" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Color per page (A4)</label>
              <input type="number" step="0.50" min="0" value={prices.colorPerPageA4}
                onChange={(e) => handleChange('colorPerPageA4', parseFloat(e.target.value) || 0)}
                className="input-field mt-1" />
            </div>
            <div>
              <label className="text-xs text-gray-500">A3 Multiplier (×)</label>
              <input type="number" step="0.5" min="1" value={prices.a3Multiplier}
                onChange={(e) => handleChange('a3Multiplier', parseFloat(e.target.value) || 1)}
                className="input-field mt-1" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Double Side Discount (per page)</label>
              <input type="number" step="0.10" min="0" value={prices.doubleSideDiscount}
                onChange={(e) => handleChange('doubleSideDiscount', parseFloat(e.target.value) || 0)}
                className="input-field mt-1" />
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold text-sm mb-4">Add-on Prices</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500">Spiral Binding (flat)</label>
            <input type="number" step="5" min="0" value={prices.spiralBindingFlat}
              onChange={(e) => handleChange('spiralBindingFlat', parseFloat(e.target.value) || 0)}
              className="input-field mt-1" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Staple (flat)</label>
            <input type="number" step="1" min="0" value={prices.stapleFlat}
              onChange={(e) => handleChange('stapleFlat', parseFloat(e.target.value) || 0)}
              className="input-field mt-1" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Lamination (per page)</label>
            <input type="number" step="1" min="0" value={prices.laminationPerPage}
              onChange={(e) => handleChange('laminationPerPage', parseFloat(e.target.value) || 0)}
              className="input-field mt-1" />
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold text-sm mb-4">Urgency Fees</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500">High Urgency Fee</label>
            <input type="number" step="5" min="0" value={prices.urgencyHighFee}
              onChange={(e) => handleChange('urgencyHighFee', parseFloat(e.target.value) || 0)}
              className="input-field mt-1" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Critical Urgency Fee</label>
            <input type="number" step="10" min="0" value={prices.urgencyCriticalFee}
              onChange={(e) => handleChange('urgencyCriticalFee', parseFloat(e.target.value) || 0)}
              className="input-field mt-1" />
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold text-sm mb-4">Order Rules</h3>
        <div>
          <label className="text-xs text-gray-500">Copy Change Lock Timer (2–30 minutes)</label>
          <input type="range" min="2" max="30" value={prices.lockTimerMins}
            onChange={(e) => handleChange('lockTimerMins', parseInt(e.target.value))}
            className="w-full mt-2" />
          <p className="text-xs text-gray-500 text-center mt-1">{prices.lockTimerMins} minutes</p>
        </div>
      </Card>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message}
        </div>
      )}

      <button onClick={handleSave} disabled={saving} className="w-full btn-primary">
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  )
}
