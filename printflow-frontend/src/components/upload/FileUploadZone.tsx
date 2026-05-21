import { useRef, useState, DragEvent } from 'react'
import { ALLOWED_FILE_TYPES, MAX_FILE_SIZE_MB } from '../../config/constants'

interface FileUploadZoneProps {
  onFilesSelected: (files: File[]) => void
  disabled?: boolean
}

export default function FileUploadZone({ onFilesSelected, disabled }: FileUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFiles = (files: FileList) => {
    const valid: File[] = []
    Array.from(files).forEach((file) => {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase()
      if (!ALLOWED_FILE_TYPES.includes(ext)) return
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) return
      valid.push(file)
    })
    if (valid.length > 0) onFilesSelected(valid)
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (disabled) return
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files)
  }

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
        ${isDragging ? 'border-brand-blue bg-brand-blue-50' : 'border-gray-300 hover:border-gray-400'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_FILE_TYPES}
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
        disabled={disabled}
      />
      <svg className="w-10 h-10 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-brand-blue">Click to upload</span> or drag and drop
      </p>
      <p className="text-xs text-gray-500 mt-1">PDF, DOCX, JPG, PNG — Max {MAX_FILE_SIZE_MB}MB each</p>
    </div>
  )
}
