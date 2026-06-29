import {useState} from 'react'
import {useNavigate} from 'react-router'
import {ScoreBadge} from '@/shared/controls/buttons/ScoreBadge'
import {Spinner} from '@/shared/controls/Spinner'
import {Building2, RefreshCw, Star} from 'lucide-react'
import {Opportunity} from '@/app/opportunities/OpportunityTypes'
import {IconButton} from '@/shared/controls/buttons/IconButton'

interface JobRowProps {
  opportunity: Opportunity
  navigateTo: string
  selected?: boolean
  isChanging?: boolean
  onScoreBadgeClick?: () => void
  onRescore?: () => void
  onToggleStar?: () => void
}

function CompanyAvatar({avatarUrl}: { avatarUrl?: string | null }) {
  const [imgFailed, setImgFailed] = useState(false)
  return (
    <div className="w-5 h-5 shrink-0 flex items-center justify-center">
      {avatarUrl && !imgFailed
        ? <img src={avatarUrl} alt="" className="w-5 h-5 rounded-sm object-contain" onError={() => setImgFailed(true)}/>
        : <Building2 size={16} className="text-label-light"/>
      }
    </div>
  )
}

export function JobRow({opportunity: o, navigateTo, selected, isChanging, onScoreBadgeClick, onRescore, onToggleStar}: JobRowProps) {
  const navigate = useNavigate()
  const {title, score, organization_name, is_starred} = o.active_version

  return (
    <div
      onClick={() => navigate(navigateTo)}
      className={`group flex items-center gap-2 pl-3 w-full text-left px-3 h-[38px] cursor-pointer ${selected ? 'hovered' : 'hoverable'}`}
    >
      <IconButton
        icon={Star}
        label={is_starred ? 'Unstar' : 'Star'}
        iconStrokeWidth={1.5}
        inactiveColor={is_starred ? 'var(--color-action)' : 'var(--color-label-medium)'}
        iconClassName={is_starred ? 'fill-current' : ''}
        onClick={(e) => { e.stopPropagation(); onToggleStar?.() }}
      />
      <CompanyAvatar avatarUrl={o.avatar_url}/>
      <div className="flex-1 min-w-0">
        <div className={`one-liner text-base ${isChanging ? 'text-label-medium' : 'text-label-darker'}`}>
          {title || o.url}
          {organization_name && <span className="text-label-medium/70"> · {organization_name}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0 min-w-6">
        {isChanging ? (
          <div className="w-7 h-7 flex items-center justify-center shrink-0"><Spinner/></div>
        ) : (
          <IconButton
            label="Re-score"
            icon={RefreshCw}
            tooltipPosition="left"
            onClick={(e) => {
              e.stopPropagation();
              onRescore?.()
            }}
            className="invisible group-hover:visible"
          />
        )}
        <button onClick={(e) => {
          e.stopPropagation();
          onScoreBadgeClick?.()
        }} disabled={isChanging}>
          <ScoreBadge score={score} size="sm"/>
        </button>
      </div>
    </div>
  )
}
