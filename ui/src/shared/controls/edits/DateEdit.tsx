import {useState} from 'react'
import * as Popover from '@radix-ui/react-popover'
import {Calendar} from 'lucide-react'
import {Spinner} from '@/shared/controls/Spinner'

interface DateEditProps {
  value: string | null
  placeholder?: string
  readOnly?: boolean
  onSave: (date: string | null) => Promise<void> | void
}

export function DateEdit({value, placeholder = 'No date', readOnly, onSave}: DateEditProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value ?? '')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      await onSave(draft || null)
      setOpen(false)
    } finally {
      setSaving(false)
    }
  }

  const display = value ? new Date(value + 'T00:00:00').toLocaleDateString('en-CA', {year: 'numeric', month: 'short', day: 'numeric'}) : placeholder

  return (
    <Popover.Root open={open} onOpenChange={readOnly ? undefined : setOpen}>
      <Popover.Trigger asChild>
        <button
          disabled={readOnly}
          className={`flex items-center gap-1.5 text-sm ${readOnly ? 'cursor-default' : 'hoverable cursor-pointer'}`}
          style={{color: value ? 'var(--color-label-darker)' : 'var(--color-label-light)'}}
        >
          <Calendar size={13}/>
          {display}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content sideOffset={4} className="bg-panel-white border border-frame-lighter rounded-md p-3 flex flex-col gap-2 z-50 shade-md">
          <input
            type="date"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="text-sm"
          />
          <div className="flex gap-1.5">
            <button onClick={save} disabled={saving} className="primary px-2.5 py-1 text-xs">
              {saving ? <Spinner/> : 'Set'}
            </button>
            <button onClick={() => {
              setDraft(value ?? '');
              setOpen(false)
            }} className="secondary px-2.5 py-1 text-xs">
              Cancel
            </button>
            {value && (
              <button onClick={async () => {
                setSaving(true);
                await onSave(null);
                setOpen(false);
                setSaving(false)
              }} className="secondary px-2.5 py-1 text-xs ml-auto">
                Clear
              </button>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
