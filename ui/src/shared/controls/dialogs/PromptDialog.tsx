import {useState} from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import {BaseDialog} from './BaseDialog'
import {Spinner} from '@/shared/controls/Spinner'

interface PromptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (value: string) => void
  title: string
  placeholder?: string
  submitLabel?: string
  isSubmitting?: boolean
}

export function PromptDialog({open, onOpenChange, onSubmit, title, placeholder = 'Type here…', submitLabel = 'Submit', isSubmitting}: PromptDialogProps) {
  const [value, setValue] = useState('')

  function submit() {
    onOpenChange(false)
    onSubmit(value.trim())
    setValue('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <BaseDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setValue('')
        onOpenChange(o)
      }}
      title={title}
      width="w-[540px]"
    >
      <div className="px-5 py-4 flex flex-col gap-4">
        <textarea
          autoFocus
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={5}
          className="w-full resize-y"
        />
        <div className="flex justify-end gap-2">
          <Dialog.Close asChild>
            <button className="secondary">Cancel</button>
          </Dialog.Close>
          <button className="primary" onClick={submit} disabled={isSubmitting}>
            {isSubmitting ? <Spinner/> : submitLabel}
          </button>
        </div>
      </div>
    </BaseDialog>
  )
}
