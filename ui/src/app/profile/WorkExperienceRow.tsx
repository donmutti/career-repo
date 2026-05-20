import {NavLink} from 'react-router'

interface WorkExperienceVersion {
  company: string
  role: string
  start_date?: string
  end_date?: string
}

interface WorkExperience {
  id: string
  active_version: WorkExperienceVersion
}

interface WorkExperienceRowProps {
  experience: WorkExperience
  navigateTo: string
}

export function WorkExperienceRow({experience: e, navigateTo}: WorkExperienceRowProps) {
  const v = e.active_version
  const dateRange = v.start_date ? [v.start_date, v.end_date ?? 'Present'].join(' – ') : null

  return (
    <NavLink
      to={navigateTo}
      className={({isActive}) => `no-underline text-inherit flex flex-col items-start w-full px-3 text-left gap-0.5 rounded h-[77px] justify-center ${isActive ? 'hovered' : 'hoverable'}`}
    >
      <span className="one-liner font-semibold w-full">{v.role}</span>
      <span className="one-liner text-sm text-label-dark w-full">{v.company}</span>
      <span className="text-sm text-label-dark">{dateRange ?? <span className="text-label-light">No dates</span>}</span>
    </NavLink>
  )
}
