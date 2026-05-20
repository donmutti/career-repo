import {ReactNode} from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import {BaseDialog} from './BaseDialog'
import {Spinner} from '@/shared/controls/Spinner'

interface ValueDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: ReactNode
  onSubmit: () => void
  submitLabel?: string
  isSubmitting?: boolean
}

export function ValueDialog({open, onOpenChange, title, children, onSubmit, submitLabel = 'Add', isSubmitting}: ValueDialogProps) {
  return (
    <BaseDialog open={open} onOpenChange={onOpenChange} title={title}>
      <div className="px-5 py-4 flex flex-col gap-4">
        <div>{children}</div>
        <div className="flex justify-end gap-2 mt-6 py-1">
          <Dialog.Close asChild>
            <button className="secondary">Cancel</button>
          </Dialog.Close>
          <button className="primary" onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? <Spinner/> : submitLabel}
          </button>
        </div>
      </div>
    </BaseDialog>
  )
}
