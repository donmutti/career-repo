import {GalleryVerticalEnd} from 'lucide-react'
import {OPP_TYPE_ICONS} from '@/app/opportunities/OpportunityTypes'
import {formatCount} from '@/shared/utils/FormatUtils'

interface OpportunityTypeRowProps {
  type: string
  label: string
  count: number
  selected: boolean
  onClick: () => void
}

export function OpportunityTypeRow({type, label, count, selected, onClick}: OpportunityTypeRowProps) {
  const Icon = OPP_TYPE_ICONS[type] ?? GalleryVerticalEnd
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 w-full px-3 py-2 text-left ${selected ? 'text-action hovered' : 'text-label-dark hoverable'}`}
    >
      <Icon size={16} className="shrink-0"/>
      <span className="flex-1 text-base text-label-darker">{label}</span>
      <span className="text-sm text-label-medium">{formatCount(count)}</span>
    </button>
  )
}
