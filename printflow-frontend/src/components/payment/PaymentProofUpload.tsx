import { useState } from 'react'
import { useCloudinaryUpload } from '../../hooks/useCloudinaryUpload'

interface PaymentProofUploadProps {
  onUploadComplete: (url: string) => void
}

export default function PaymentProofUpload({ onUploadComplete }: PaymentProofUploadProps) {
  const { progress, status, error, upload } = useCloudinaryUpload()
  const [isUploading, setIsUploading] = useState(false)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploading(true)
    try {
      const url = await upload(file)
      onUploadComplete(url)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Upload Payment Screenshot
      </label>
      {!isUploading && status !== 'done' ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <input
            type="file"
            accept="image/*"
            onChange={handleFile}
            className="hidden"
            id="payment-proof"
          />
          <label htmlFor="payment-proof" className="cursor-pointer">
            <svg className="w-8 h-8 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-gray-600">Tap to upload payment screenshot</p>
          </label>
        </div>
      ) : (
        <div className="space-y-2">
          {status === 'uploading' && (
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-blue-200 rounded-full h-2">
                  <div className="bg-brand-blue h-2 rounded-full" style={{ width: `${progress}%` }} />
                </div>
                <span className="text-xs text-blue-700">{progress}%</span>
              </div>
              <p className="text-xs text-blue-600 mt-1">Uploading payment proof...</p>
            </div>
          )}
          {status === 'done' && (
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <p className="text-sm text-green-700 font-medium">Screenshot uploaded successfully</p>
            </div>
          )}
          {status === 'error' && (
            <div className="bg-red-50 rounded-lg p-3 text-center">
              <p className="text-sm text-red-600">{error || 'Upload failed'}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
