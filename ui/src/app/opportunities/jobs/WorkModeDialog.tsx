import {useState} from 'react'
import {ValueDialog} from '@/shared/controls/dialogs/ValueDialog'
import {DropdownEdit} from '@/shared/controls/edits/DropdownEdit'

export const WORK_MODES = [
  {value: '', label: '—'},
  {value: 'onsite', label: 'Onsite'},
  {value: 'remote', label: 'Remote'},
  {value: 'hybrid', label: 'Hybrid'},
]

export const WORK_MODE_LABELS: Record<string, string> = {
  onsite: 'Onsite',
  remote: 'Remote',
  hybrid: 'Hybrid',
}

interface WorkModeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  value?: string | null
  isSubmitting?: boolean
  onSubmit: (value: string | null) => void
}

export function WorkModeDialog({open, onOpenChange, value, isSubmitting, onSubmit}: WorkModeDialogProps) {
  const [mode, setMode] = useState(() => value ?? '')

  function handleOpen(o: boolean) {
    if (o) setMode(value ?? '')
    onOpenChange(o)
  }

  return (
    <ValueDialog
      open={open}
      onOpenChange={handleOpen}
      title="Set work mode"
      submitLabel="Save"
      isSubmitting={isSubmitting}
      onSubmit={() => onSubmit(mode || null)}
    >
      <div className="flex flex-col gap-1.5">
        <label>Work mode</label>
        <DropdownEdit
          value={mode}
          options={WORK_MODES}
          onChange={setMode}
          filterMode="jump"
          selectOnly
        />
      </div>
    </ValueDialog>
  )
}
