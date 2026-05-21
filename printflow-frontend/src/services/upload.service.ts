import api from './api'

export const getSignedUploadUrl = async (fileName: string, fileType: string, fileSizeKb: number) => {
  const { data } = await api.post('/uploads/sign', {
    fileName,
    fileType,
    fileSizeKb,
  })
  return data.data
}

export const uploadToCloudinary = async (
  file: File,
  signature: string,
  apiKey: string,
  timestamp: number,
  folder: string,
  cloudName: string,
  onProgress?: (progress: number) => void
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('signature', signature)
    formData.append('api_key', apiKey)
    formData.append('timestamp', String(timestamp))
    formData.append('folder', folder)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/upload`)

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }

    xhr.onload = () => {
      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText)
        resolve(response.secure_url)
      } else {
        reject(new Error('Upload failed'))
      }
    }

    xhr.onerror = () => reject(new Error('Upload failed'))
    xhr.send(formData)
  })
}
