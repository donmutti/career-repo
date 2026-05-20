import {ChangeEvent, useRef} from 'react'
import {Upload} from 'lucide-react'

interface UploadButtonProps {
  onFileSelect: (file: File) => void
  accept?: string
  maxSizeBytes?: number
  label?: string
  disabled?: boolean
}

export function UploadButton({onFileSelect, accept, maxSizeBytes, label = 'Upload file', disabled}: UploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (maxSizeBytes && file.size > maxSizeBytes) {
      alert(`File too large. Max size: ${Math.round(maxSizeBytes / 1024 / 1024)}MB`)
      return
    }
    onFileSelect(file)
    e.target.value = ''
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
        aria-hidden
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        className="secondary flex items-center gap-1.5"
      >
        <Upload size={14}/>
        {label}
      </button>
    </>
  )
}
