import { useState, useEffect } from 'react'
import { formatRelative } from '../../utils/formatDate'

interface CountdownTimerProps {
  expiresAt: string
}

export default function CountdownTimer({ expiresAt }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState('')
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    const update = () => {
      const now = Date.now()
      const expiry = new Date(expiresAt).getTime()
      const diff = expiry - now

      if (diff <= 0) {
        setTimeLeft('Expired')
        setExpired(true)
        return
      }

      const mins = Math.floor(diff / 60000)
      const secs = Math.floor((diff % 60000) / 1000)
      setTimeLeft(`${mins}m ${secs}s`)
      setExpired(false)
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [expiresAt])

  if (expired) {
    return <span className="text-xs text-red-600 font-medium">Copy count is locked</span>
  }

  return (
    <span className={`text-xs font-mono font-medium ${parseInt(timeLeft) < 1 ? 'text-red-600' : 'text-amber-600'}`}>
      {timeLeft} remaining
    </span>
  )
}
