import { ReactNode } from 'react'

interface EmptyStateProps {
  title?: string
  description?: string
  icon?: string
  action?: ReactNode
}

export default function EmptyState({ title = 'Nothing here', description, icon = 'inbox', action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-stack-xl text-center">
      <span className="material-symbols-outlined text-5xl text-outline mb-stack-md">{icon}</span>
      <h3 className="font-headline-md text-headline-md text-on-surface mb-2">{title}</h3>
      {description && <p className="font-body-md text-body-md text-on-surface-variant max-w-sm">{description}</p>}
      {action && <div className="mt-stack-lg">{action}</div>}
    </div>
  )
}
