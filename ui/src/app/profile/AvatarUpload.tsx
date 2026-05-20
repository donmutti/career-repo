import {ChangeEvent, useRef, useState} from 'react'
import {Camera, User, X} from 'lucide-react'
import {ConfirmationDialog} from '@/shared/controls/dialogs/ConfirmationDialog'

interface AvatarUploadProps {
  avatarFileName?: string
  onUpload: (file: File) => void
  onClear?: () => void
  isUploading?: boolean
}

export function AvatarUpload({avatarFileName, onUpload, onClear, isUploading}: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [confirmClear, setConfirmClear] = useState(false)

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) onUpload(file)
    e.target.value = ''
  }

  return (
    <div className="relative group w-fit">
      {avatarFileName
        ? <img src={`/api/profile/avatar?f=${avatarFileName}`} alt="Avatar" className="w-16 h-16 rounded-full object-cover shrink-0"/>
        : <div className="w-16 h-16 rounded-full flex items-center justify-center bg-panel-light text-label-medium shrink-0"><User size={28} strokeWidth={1.2}/></div>
      }
      <button
        type="button"
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
        className="absolute inset-0 rounded-full flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
      >
        <Camera size={24} className="text-white"/>
      </button>
      {avatarFileName && onClear && (
        <button
          type="button"
          onClick={() => setConfirmClear(true)}
          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-panel-white border border-frame-light flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-label-dark hover:text-intent-danger"
        >
          <X size={11}/>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleChange}
      />
      <ConfirmationDialog
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title="Clear avatar"
        body="Are you sure you want to remove your avatar?"
        primaryActionLabel="Remove"
        severity="danger"
        onConfirm={() => { setConfirmClear(false); onClear?.() }}
      />
    </div>
  )
}
