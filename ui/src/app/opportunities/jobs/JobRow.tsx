import {useState} from 'react'
import {useNavigate} from 'react-router'
import {ScoreBadge} from '@/shared/controls/buttons/ScoreBadge'
import {Spinner} from '@/shared/controls/Spinner'
import {Building2, RefreshCw} from 'lucide-react'
import {Opportunity} from '@/app/opportunities/OpportunityTypes'
import {IconButton} from '@/shared/controls/buttons/IconButton'

interface JobRowProps {
  opportunity: Opportunity
  navigateTo: string
  selected?: boolean
  isChanging?: boolean
  onScoreBadgeClick?: () => void
  onRescore?: () => void
}

function CompanyAvatar({url, avatarUrl}: { url: string; avatarUrl?: string }) {
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

export function JobRow({opportunity: o, navigateTo, selected, isChanging, onScoreBadgeClick, onRescore}: JobRowProps) {
  const navigate = useNavigate()
  const {title, score} = o.active_version

  return (
    <button
      onClick={() => navigate(navigateTo)}
      className={`group flex items-center gap-2 pl-3 w-full text-left px-3 h-[38px] ${selected ? 'hovered' : 'hoverable'}`}
    >
      <CompanyAvatar url={o.url} avatarUrl={o.avatar_url}/>
      <div className="flex-1 min-w-0">
        <div className={`one-liner text-base ${isChanging ? 'text-label-medium' : 'text-label-darker'}`}>{title || o.url}</div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {isChanging ? <Spinner/> : (
          <>
            <IconButton
              label="Re-score"
              icon={RefreshCw}
              tooltip={true}
              tooltipPosition="left"
              onClick={(e) => {
                e.stopPropagation();
                onRescore?.()
              }}
              className="invisible group-hover:visible auxiliary w-6 h-6 hoverable-text"
            />
            <button onClick={(e) => {
              e.stopPropagation();
              onScoreBadgeClick?.()
            }}>
              <ScoreBadge score={score} size="sm"/>
            </button>
          </>
        )}
      </div>
    </button>
  )
}
