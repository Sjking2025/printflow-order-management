interface UploadProgressProps {
  progress: number
  status: string
  error?: string | null
}

export default function UploadProgress({ progress, status, error }: UploadProgressProps) {
  if (status === 'idle') return null

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              status === 'error' ? 'bg-red-500' : 'bg-brand-blue'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs text-gray-500 w-10 text-right">
          {status === 'signing' ? '...' : `${progress}%`}
        </span>
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}
