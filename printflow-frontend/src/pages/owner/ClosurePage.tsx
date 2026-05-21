import { useState } from 'react'
import Card from '../../components/ui/Card'
import { setClosureMode } from '../../services/owner.service'

const MODES = [
  { value: 'OPEN', label: 'Shop Open', icon: '🟢' },
  { value: 'LUNCH_BREAK', label: 'Lunch Break', icon: '🍽️' },
  { value: 'MACHINE_ISSUE', label: 'Machine Issue', icon: '🔧' },
  { value: 'EMERGENCY', label: 'Emergency Closure', icon: '🚨' },
  { value: 'CUSTOM', label: 'Custom Message', icon: '📝' },
]

export default function ClosurePage() {
  const [selectedMode, setSelectedMode] = useState('OPEN')
  const [message, setMessage] = useState('')
  const [until, setUntil] = useState('')
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')

  const handleActivate = async () => {
    setSaving(true)
    setStatus('')
    try {
      await setClosureMode(
        selectedMode,
        selectedMode === 'CUSTOM' ? message : undefined,
        until ? new Date(until).toISOString() : undefined
      )
      setStatus(selectedMode === 'OPEN' ? 'Shop is now open' : `Closure mode set to ${selectedMode}`)
    } catch {
      setStatus('Failed to update closure mode')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Shop Closure</h1>

      <Card>
        <div className="space-y-3">
          {MODES.map((mode) => (
            <button
              key={mode.value}
              onClick={() => setSelectedMode(mode.value)}
              className={`w-full text-left p-3 rounded-lg border transition-colors
                ${selectedMode === mode.value ? 'border-brand-blue bg-brand-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
            >
              <span className="mr-2">{mode.icon}</span>
              <span className="text-sm font-medium">{mode.label}</span>
            </button>
          ))}
        </div>

        {selectedMode === 'CUSTOM' && (
          <div className="mt-4">
            <label className="text-sm text-gray-600">Your message to customers</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)}
              className="input-field mt-1" rows={3} placeholder="e.g., Shop will reopen at 4 PM" />
          </div>
        )}

        {selectedMode !== 'OPEN' && (
          <div className="mt-4">
            <label className="text-sm text-gray-600">Expected reopen time</label>
            <input type="datetime-local" value={until} onChange={(e) => setUntil(e.target.value)}
              className="input-field mt-1" />
          </div>
        )}

        {status && (
          <div className={`mt-4 p-3 rounded-lg text-sm ${status.includes('open') ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>
            {status}
          </div>
        )}

        <button onClick={handleActivate} disabled={saving}
          className={`w-full mt-4 btn-${selectedMode === 'OPEN' ? 'ghost' : 'primary'} ${selectedMode === 'OPEN' ? 'border-green-500 text-green-700' : ''}`}>
          {saving ? 'Updating...' : selectedMode === 'OPEN' ? 'Open Shop' : 'Activate Mode'}
        </button>
      </Card>
    </div>
  )
}
