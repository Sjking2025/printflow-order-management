interface BadgeProps {
  children: React.ReactNode
  variant?: 'pending' | 'active' | 'success' | 'error' | 'default'
  className?: string
}

export default function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  const variantClasses = {
    pending: 'badge-pending',
    active: 'badge-active',
    success: 'badge-success',
    error: 'badge-error',
    default: 'bg-surface-variant text-on-surface-variant',
  }
  return (
    <span className={`${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  )
}
