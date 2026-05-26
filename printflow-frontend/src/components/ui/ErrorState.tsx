interface ErrorStateProps {
  message?: string
  onRetry?: () => void
}

export default function ErrorState({ message = 'Something went wrong', onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-stack-xl text-center">
      <span className="material-symbols-outlined text-5xl text-error mb-stack-md">error</span>
      <h3 className="font-headline-md text-headline-md text-on-surface mb-2">Error</h3>
      <p className="font-body-md text-body-md text-on-surface-variant mb-stack-lg">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-outline">
          <span className="material-symbols-outlined text-[18px]">refresh</span>
          Retry
        </button>
      )}
    </div>
  )
}
