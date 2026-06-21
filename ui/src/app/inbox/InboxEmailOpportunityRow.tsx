import {ExternalLink, ThumbsDown, ThumbsUp} from 'lucide-react'
import {OPP_TYPE_ICONS} from '@/app/opportunities/OpportunityTypes'
import {Tooltip} from '@/shared/controls/Tooltip'
import {InboxEmailOpportunity} from '@/app/inbox/InboxTypes'

interface EmailOpportunityRowProps {
  item: InboxEmailOpportunity
  onExtract: (id: string) => void
  onSkip: (id: string) => void
  onReset: (id: string) => void
}

export function InboxEmailOpportunityRow({item, onExtract, onSkip, onReset}: EmailOpportunityRowProps) {
  const Icon = OPP_TYPE_ICONS[item.type]
  const sorted = item.status !== 'pending'
  const declined = item.status === 'skipped'

  return (
    <div className="grid mb-1.5 rounded-lg border border-frame-lighter shade-xs hoverable overflow-hidden" style={{gridTemplateColumns: '6.75rem 1fr'}}>

      {/* Actions column */}
      <div className="flex flex-row items-center justify-center gap-3 py-3 border-r border-frame-lighter bg-panel-lightest shrink-0">
        <Tooltip content="Save" side="bottom">
          <button
            onClick={() => item.status === 'extracted' ? onReset(item.id) : onExtract(item.id)}
            className={`auxiliary w-8 h-8 ${item.status === 'extracted' ? 'text-white' : 'text-label-medium hover:text-action'}`}
            style={item.status === 'extracted' ? {backgroundColor: 'var(--color-action)'} : undefined}
          >
            <ThumbsUp size={16}/>
          </button>
        </Tooltip>
        <Tooltip content="Decline" side="bottom">
          <button
            onClick={() => item.status === 'skipped' ? onReset(item.id) : onSkip(item.id)}
            className={`auxiliary w-8 h-8 ${item.status === 'skipped' ? 'text-white' : 'text-label-medium hover:text-intent-danger'}`}
            style={item.status === 'skipped' ? {backgroundColor: 'var(--color-intent-danger)'} : undefined}
          >
            <ThumbsDown size={16}/>
          </button>
        </Tooltip>
      </div>

      {/* Body column */}
      <div className={`flex items-center gap-2 text-base px-6 overflow-hidden ${sorted ? 'opacity-50' : ''}`}>
        {Icon && <Icon size={14} className="shrink-0 text-label-medium"/>}
        <span className={`flex-1 truncate ${declined ? 'line-through text-label-dark' : sorted ? 'text-label-dark' : 'text-label-darker'}`}>
          {item.title}{item.location && <span className="text-label-medium"> ({item.location})</span>}
        </span>
        {item.url && (
          <a href={item.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="flex items-center gap-1 text-intent-info shrink-0">View <ExternalLink size={12}/></a>
        )}
      </div>
    </div>
  )
}
