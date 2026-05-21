import Badge from '../ui/Badge'
import { urgencyColors, urgencyLabels } from '../../utils/statusColors'

interface UrgencyBadgeProps {
  urgency: string
}

export default function UrgencyBadge({ urgency }: UrgencyBadgeProps) {
  const colorClass = urgencyColors[urgency] || 'bg-gray-100 text-gray-700'
  const label = urgencyLabels[urgency] || urgency
  return <Badge label={label} className={colorClass} />
}
