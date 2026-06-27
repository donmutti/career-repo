import {useState} from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import {useQuery} from '@tanstack/react-query'
import {BaseDialog} from '@/shared/controls/dialogs/BaseDialog'
import {queryKeys} from '@/services/queryKeys'
import {inbox as inboxApi} from '@/services/client'
import {DeclineReason} from '@/app/inbox/InboxTypes'

const MAX_FREQUENT = 20

interface ReasonDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (reason: string | null) => void
  title?: string
  submitLabel?: string
}

export function ReasonDialog({open, onOpenChange, onSubmit, title = 'Why declining?', submitLabel = 'Decline'}: ReasonDialogProps) {
  const [value, setValue] = useState('')

  const {data} = useQuery({
    queryKey: queryKeys.inboxDeclineReasons,
    queryFn: () => inboxApi.declineReasons(),
    staleTime: 0,
  })
  const frequent = ((data as DeclineReason[] | undefined) ?? []).slice(0, MAX_FREQUENT)

  function submit(reason: string | null) {
    onOpenChange(false)
    setValue('')
    onSubmit(reason)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && value.trim()) {
      e.preventDefault()
      submit(value.trim())
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
      width="w-[480px]"
    >
      <div className="px-5 py-4 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label>Reason</label>
          <input
            autoFocus
            type="text"
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a reason…"
            className="w-full"
          />
        </div>
        {frequent.length > 0 && (
          <div className="flex flex-col gap-2 overflow-y-auto max-h-48">
            {frequent.map(r => (
              <button key={r.id} className="secondary min-h-8 w-full" onClick={() => submit(r.text)}>
                {r.text}
              </button>
            ))}
          </div>
        )}
        <div className="flex justify-between items-center mt-6 py-1">
          <button className="secondary" onClick={() => submit(null)}>
            Not for me
          </button>
          <div className="flex gap-2">
            <Dialog.Close asChild>
              <button className="secondary">Cancel</button>
            </Dialog.Close>
            <button className="danger" onClick={() => value.trim() && submit(value.trim())} disabled={!value.trim()}>
              {submitLabel}
            </button>
          </div>
        </div>
      </div>
    </BaseDialog>
  )
}
