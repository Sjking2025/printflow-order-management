import { useState, useCallback } from 'react'
import { getSignedUploadUrl, uploadToCloudinary } from '../services/upload.service'
import { CLOUDINARY_CLOUD_NAME } from '../config/constants'

interface UploadState {
  progress: number
  status: 'idle' | 'signing' | 'uploading' | 'done' | 'error'
  fileUrl: string | null
  error: string | null
}

export const useCloudinaryUpload = () => {
  const [state, setState] = useState<UploadState>({
    progress: 0,
    status: 'idle',
    fileUrl: null,
    error: null,
  })

  const upload = useCallback(async (file: File) => {
    setState({ progress: 0, status: 'signing', fileUrl: null, error: null })

    try {
      const signed = await getSignedUploadUrl(
        file.name,
        file.type,
        Math.round(file.size / 1024)
      )

      setState((s) => ({ ...s, status: 'uploading' }))

      const url = await uploadToCloudinary(
        file,
        signed.signature,
        signed.apiKey,
        signed.timestamp,
        signed.folder,
        CLOUDINARY_CLOUD_NAME || signed.cloudName,
        (progress) => {
          setState((s) => ({ ...s, progress }))
        }
      )

      setState({ progress: 100, status: 'done', fileUrl: url, error: null })
      return url
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err.message || 'Upload failed'
      setState({ progress: 0, status: 'error', fileUrl: null, error: msg })
      throw err
    }
  }, [])

  const reset = useCallback(() => {
    setState({ progress: 0, status: 'idle', fileUrl: null, error: null })
  }, [])

  return { ...state, upload, reset }
}
