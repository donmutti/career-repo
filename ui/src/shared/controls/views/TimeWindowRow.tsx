import {LucideIcon} from 'lucide-react'
import {formatCount} from '@/shared/utils/FormatUtils'

interface TimeWindowRowProps {
  label: string
  icon: LucideIcon
  selected: boolean
  onClick: () => void
  count?: number
  allSorted?: boolean
  showDot?: boolean
}

export function TimeWindowRow({label, icon: Icon, selected, onClick, count, allSorted, showDot}: TimeWindowRowProps) {
  const hasUnsorted = showDot && count != null && count > 0 && allSorted === false

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 w-full px-3 py-2 text-left ${selected ? 'text-action hovered' : 'text-label-dark hoverable'}`}
    >
      <Icon size={16} className="shrink-0"/>
      <span className="flex-1 text-base text-label-darker">{label}</span>
      <span className="flex items-center gap-1.5 shrink-0">
        {hasUnsorted
          ? <span className="text-sm font-medium px-1.5 py-0.5 rounded-md bg-intent-info/90 text-white">{formatCount(count ?? 0)}</span>
          : <span className="text-sm text-label-medium w-6 text-right">{formatCount(count ?? 0)}</span>
        }
      </span>
    </button>
  )
}
