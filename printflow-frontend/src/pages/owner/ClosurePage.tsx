import { useState } from 'react'
import Card from '../../components/ui/Card'
import Spinner from '../../components/ui/Spinner'
import { setClosureMode } from '../../services/owner.service'

const MODES = [
  { value: 'OPEN', label: 'Shop Open', icon: 'store', desc: 'Accepting new orders normally' },
  { value: 'LUNCH_BREAK', label: 'Lunch Break', icon: 'breakfast_dining', desc: 'Temporary pause during lunch hours' },
  { value: 'MACHINE_ISSUE', label: 'Machine Issue', icon: 'build', desc: 'Technical issue affecting production' },
  { value: 'EMERGENCY', label: 'Emergency Closure', icon: 'warning', desc: 'Complete shop closure due to emergency' },
  { value: 'CUSTOM', label: 'Custom Message', icon: 'edit_note', desc: 'Write a custom status message' },
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
    <div className="max-w-lg mx-auto space-y-stack-lg">
      <div>
        <h2 className="font-headline-lg text-headline-lg text-primary">Shop Closure</h2>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1">Manage your shop availability for customers.</p>
      </div>

      <Card>
        <h3 className="font-label-md text-label-md text-on-surface-variant uppercase mb-4">Shop Status</h3>
        <div className="space-y-stack-sm">
          {MODES.map((mode) => (
            <button
              key={mode.value}
              onClick={() => setSelectedMode(mode.value)}
              className={`w-full text-left p-stack-md rounded-lg border transition-colors flex items-center gap-stack-md ${
                selectedMode === mode.value
                  ? 'border-secondary-container bg-[#fff9f5]'
                  : 'border-outline-variant hover:bg-surface-container-low'
              }`}
            >
              <div className={`w-10 h-10 rounded flex items-center justify-center shrink-0 ${
                selectedMode === mode.value ? 'bg-secondary-container text-white' : 'bg-surface-container text-primary'
              }`}>
                <span className="material-symbols-outlined">{mode.icon}</span>
              </div>
              <div>
                <p className="font-body-md text-body-md font-semibold text-on-surface">{mode.label}</p>
                <p className="font-body-sm text-body-sm text-on-surface-variant">{mode.desc}</p>
              </div>
            </button>
          ))}
        </div>

        {selectedMode === 'CUSTOM' && (
          <div className="mt-stack-md">
            <label className="font-body-sm text-body-sm font-semibold text-on-surface block mb-1">Your message to customers</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)}
              className="input-field" rows={3} placeholder="e.g., Shop will reopen at 4 PM" />
          </div>
        )}

        {selectedMode !== 'OPEN' && (
          <div className="mt-stack-md">
            <label className="font-body-sm text-body-sm font-semibold text-on-surface block mb-1">Expected reopen time</label>
            <input type="datetime-local" value={until} onChange={(e) => setUntil(e.target.value)} className="input-field" />
          </div>
        )}

        {status && (
          <div className={`mt-4 p-stack-md rounded-lg font-body-sm text-body-sm flex items-center gap-2 ${
            status.includes('open') ? 'bg-status-success text-on-status-success' : 'bg-primary-fixed text-primary'
          }`}>
            <span className="material-symbols-outlined text-[18px]">{status.includes('open') ? 'check_circle' : 'info'}</span>
            {status}
          </div>
        )}

        <button onClick={handleActivate} disabled={saving} className={`w-full mt-stack-md ${selectedMode === 'OPEN' ? 'btn-outline text-green-700 border-green-500' : 'btn-primary'}`}>
          {saving ? <Spinner size="sm" /> : null}
          {saving ? 'Updating...' : selectedMode === 'OPEN' ? 'Open Shop' : 'Activate Mode'}
        </button>
      </Card>
    </div>
  )
}
