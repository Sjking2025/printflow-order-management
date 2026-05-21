import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  hover?: boolean
}

export default function Card({ children, className = '', onClick, hover = false }: CardProps) {
  const Component = onClick ? 'button' : 'div'
  return (
    <Component
      onClick={onClick}
      className={`bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-md card-shadow ${className} ${
        hover && onClick ? 'hover:shadow-md transition-shadow cursor-pointer text-left w-full' : ''
      }`}
    >
      {children}
    </Component>
  )
}
