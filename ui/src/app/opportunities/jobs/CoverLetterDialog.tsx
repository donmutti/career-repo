import {PromptDialog} from '@/shared/controls/dialogs/PromptDialog'

interface CoverLetterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (instructions: string) => void
}

export function CoverLetterDialog({open, onOpenChange, onSubmit}: CoverLetterDialogProps) {
  return (
    <PromptDialog
      open={open}
      onOpenChange={onOpenChange}
      onSubmit={onSubmit}
      title="Generate cover letter"
      placeholder="Add any one-off instructions for tone and style (optional)…"
      submitLabel="Generate"
    />
  )
}
