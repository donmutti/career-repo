import {NavLink} from 'react-router'
import {FileText} from 'lucide-react'
import {formatDate} from '@/shared/utils/FormatUtils'

interface Resume {
  id: string
  original_name: string
  file_name: string
  created_at: string
}

interface ResumeRowProps {
  resume: Resume
  navigateTo: string
}

export function ResumeRow({resume, navigateTo}: ResumeRowProps) {
  const ext = resume.file_name.split('.').pop()?.toUpperCase() ?? ''

  return (
    <NavLink
      to={navigateTo}
      className={({isActive}) => `no-underline text-inherit flex flex-col items-start w-full px-3 py-2.5 text-left gap-0.5 rounded ${isActive ? 'hovered' : 'hoverable'}`}
    >
      <div className="flex items-center gap-3 w-full min-w-0">
        <FileText size={16} className="shrink-0 text-label-medium"/>
        <span className="one-liner text-base font-semibold flex-1">{resume.original_name}</span>
        <span className="text-sm text-label-dark shrink-0">{formatDate(resume.created_at)}</span>
      </div>
      <span className="text-sm text-label-dark pl-[26px]">{ext}</span>
    </NavLink>
  )
}
