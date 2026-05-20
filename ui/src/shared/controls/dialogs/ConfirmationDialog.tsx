import * as Dialog from '@radix-ui/react-dialog'
import {BaseDialog} from './BaseDialog'
import {Spinner} from '@/shared/controls/Spinner'

type Severity = 'info' | 'warning' | 'danger' | 'success'

interface ConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  body: string
  primaryActionLabel: string
  secondaryActionLabel?: string
  severity?: Severity
  onConfirm: () => void
  onCancel?: () => void
  isSubmitting?: boolean
}

export function ConfirmationDialog({
  open, onOpenChange, title, body,
  primaryActionLabel, secondaryActionLabel = 'Cancel',
  severity = 'info', onConfirm, onCancel, isSubmitting,
}: ConfirmationDialogProps) {
  const primaryClass = severity === 'danger' ? 'danger' : severity === 'warning' ? 'warning' : 'primary'

  return (
    <BaseDialog open={open} onOpenChange={onOpenChange} title={title} width="w-[400px]">
      <div className="px-5 py-4 flex flex-col gap-4">
        <Dialog.Description className="text-label-darkest m-0 mb-6">{body}</Dialog.Description>
        <div className="flex justify-end gap-2">
          {severity === 'danger' ? (
            <>
              <button className="secondary" onClick={() => {
                onCancel?.();
                onOpenChange(false)
              }} autoFocus>
                {secondaryActionLabel}
              </button>
              <button className={primaryClass} onClick={onConfirm} disabled={isSubmitting}>
                {isSubmitting ? <Spinner/> : primaryActionLabel}
              </button>
            </>
          ) : (
            <>
              <button className="secondary" onClick={() => {
                onCancel?.();
                onOpenChange(false)
              }}>
                {secondaryActionLabel}
              </button>
              <button className={primaryClass} onClick={onConfirm} disabled={isSubmitting} autoFocus>
                {isSubmitting ? <Spinner/> : primaryActionLabel}
              </button>
            </>
          )}
        </div>
      </div>
    </BaseDialog>
  )
}
