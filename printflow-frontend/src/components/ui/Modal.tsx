import { ReactNode, useEffect } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {title && (
          <div className="flex items-center justify-between p-stack-md border-b border-outline-variant">
            <h2 className="font-headline-md text-headline-md text-primary">{title}</h2>
            <button onClick={onClose} className="text-outline hover:text-on-surface transition-colors p-1">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        )}
        <div className="p-stack-md">{children}</div>
      </div>
    </div>
  )
}
