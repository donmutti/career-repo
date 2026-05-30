import {useLocation, useNavigate} from 'react-router'
import {useQuery} from '@tanstack/react-query'
import {BriefcaseBusiness, Mail, User} from 'lucide-react'
import {queryKeys} from '@/services/queryKeys'
import {inbox as inboxApi, profile as profileApi} from '@/services/client'
import {Tooltip} from '@/shared/controls/Tooltip'
import {ActionIntent} from '@/shared/types'

export type SidebarButton = 'profile' | 'inbox' | 'opportunities'

export interface SidebarFlashingButton {
  button: SidebarButton
  intent: ActionIntent
}

interface SidebarProps {
  flashingButton: SidebarFlashingButton | null
}

export function Sidebar({flashingButton}: SidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()

  const {data: profileData} = useQuery({
    queryKey: queryKeys.profile,
    queryFn: profileApi.get,
  })

  const {data: countsData} = useQuery({
    queryKey: queryKeys.inboxCounts,
    queryFn: inboxApi.counts,
  })
  const counts = countsData as { today: number; yesterday: number; last7: number; last30: number; today_all_sorted: boolean; yesterday_all_sorted: boolean; last7_all_sorted: boolean; last30_all_sorted: boolean } | undefined
  const hasUnsorted = !!(
    (counts?.today ?? 0) > 0 && !counts?.today_all_sorted ||
    (counts?.yesterday ?? 0) > 0 && !counts?.yesterday_all_sorted ||
    (counts?.last7 ?? 0) > 0 && !counts?.last7_all_sorted ||
    (counts?.last30 ?? 0) > 0 && !counts?.last30_all_sorted
  )

  const isProfile = location.pathname.startsWith('/profile')
  const isOpportunities = location.pathname.startsWith('/opportunities')
  const isInbox = location.pathname.startsWith('/inbox')

  const av = (profileData as { active_version?: { full_name?: string; avatar_file_name?: string } })?.active_version
  const fullName = av?.full_name ?? 'You'
  const hasAvatar = !!av?.avatar_file_name

  const flashButton = (button: SidebarButton) => flashingButton?.button === button ? flashingButton : null

  return (
    <aside className="bg-panel-lighter border-r border-frame-lighter flex flex-col shrink-0 w-14">
      <div className="flex-1 flex flex-col items-center pt-3 gap-y-3 ">
        <Tooltip content="Profile">
          <button
            onClick={() => navigate('/profile/info')}
            className={`flex items-center justify-center rounded-md w-10 h-10 ${isProfile ? 'hovered text-action' : 'hoverable hoverable-text text-label-medium'}`}
          >
            <span className={`flex items-center justify-center w-full h-full rounded-md ${flashButton('profile') ? `flash-${flashButton('profile')!.intent}` : ''}`}>
              {hasAvatar
                ? <img src={`/api/profile/avatar?f=${av?.avatar_file_name}`} alt={fullName} className="w-7 h-7 rounded-full object-cover"/>
                : <User size={20}/>
              }
            </span>
          </button>
        </Tooltip>

        <Tooltip content="Inbox">
          <button
            onClick={() => navigate('/inbox')}
            className={`relative flex items-center justify-center rounded-md w-10 h-10 ${isInbox ? 'hovered text-action' : 'hoverable hoverable-text text-label-medium'}`}
          >
            <span className={`flex items-center justify-center w-full h-full rounded-md ${flashButton('inbox') ? `flash-${flashButton('inbox')!.intent}` : ''}`}>
              <Mail size={20}/>
            </span>
            {hasUnsorted && <span className="attention-dot absolute top-0.5 right-0.5"/>}
          </button>
        </Tooltip>

        <Tooltip content="Opportunities">
          <button
            onClick={() => navigate('/opportunities/jobs')}
            className={`flex items-center justify-center rounded-md w-10 h-10 ${isOpportunities ? 'hovered text-action' : 'hoverable hoverable-text text-label-medium'}`}
          >
            <span className={`flex items-center justify-center w-full h-full rounded-md ${flashButton('opportunities') ? `flash-${flashButton('opportunities')!.intent}` : ''}`}>
              <BriefcaseBusiness size={20}/>
            </span>
          </button>
        </Tooltip>
      </div>
    </aside>
  )
}
