import {formatDate} from '@/shared/utils/FormatUtils'

interface InboxEmail {
  id: string
  subject: string
  from_address: string
  received_at: string
}

interface InboxEmailRowProps {
  email: InboxEmail
  selected: boolean
  onClick: (id: string) => void
  allSorted?: boolean
}

export function InboxEmailRow({email, selected, onClick, allSorted}: InboxEmailRowProps) {
  const hasUnsorted = !allSorted

  return (
    <button
      onClick={() => onClick(email.id)}
      className={`flex flex-col items-start w-full px-3 py-2.5 text-left gap-0.5 ${selected ? 'hovered' : 'hoverable'}`}
    >
      <div className="flex items-center gap-3 w-full min-w-0">
        <span className="one-liner text-base font-semibold flex-1">{email.subject}</span>
        <span className="w-2 h-2 rounded-full shrink-0" style={{backgroundColor: hasUnsorted ? 'var(--color-action)' : 'transparent'}}/>
      </div>
      <span className="one-liner text-sm text-label-dark w-full">{email.from_address}</span>
      <span className="text-sm text-label-dark">{formatDate(email.received_at)}</span>
    </button>
  )
}
