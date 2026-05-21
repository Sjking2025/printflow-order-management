import Badge from '../ui/Badge'
import { statusColors, statusLabels } from '../../utils/statusColors'

interface OrderStatusBadgeProps {
  status: string
}

export default function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const colorClass = statusColors[status] || 'bg-gray-100 text-gray-800'
  const label = statusLabels[status] || status
  return <Badge label={label} className={colorClass} />
}
