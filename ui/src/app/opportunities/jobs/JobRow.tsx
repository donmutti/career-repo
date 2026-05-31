import {useState} from 'react'
import {useNavigate} from 'react-router'
import {ScoreBadge} from '@/shared/controls/buttons/ScoreBadge'
import {Spinner} from '@/shared/controls/Spinner'
import {Building2} from 'lucide-react'

interface Opportunity {
  id: string
  url: string
  avatar_url?: string
  active_version: {
    title?: string
    status: string
    score?: number
  }
}

interface JobRowProps {
  opportunity: Opportunity
  navigateTo: string
  selected?: boolean
  isChanging?: boolean
}

function CompanyAvatar({url, avatarUrl}: {url: string; avatarUrl?: string}) {
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

export function JobRow({opportunity: o, navigateTo, selected, isChanging}: JobRowProps) {
  const navigate = useNavigate()
  const {title, score} = o.active_version

  return (
    <button
      onClick={() => navigate(navigateTo)}
      className={`flex items-center gap-2 pl-3 w-full text-left px-3 h-[38px] ${selected ? 'hovered' : 'hoverable'}`}
    >
      <CompanyAvatar url={o.url} avatarUrl={o.avatar_url}/>
      <div className="flex-1 min-w-0">
        <div className={`one-liner text-base ${isChanging ? 'text-label-medium' : 'text-label-darker'}`}>{title || o.url}</div>
      </div>
      <div className="w-[30px] flex items-center justify-center shrink-0">
        {isChanging ? <Spinner/> : <ScoreBadge score={score} size="sm"/>}
      </div>
    </button>
  )
}
