import {Calendar, CalendarClock, CalendarDays, CalendarRange, LucideIcon} from 'lucide-react'

export interface InboxEmailOpportunity {
  id: string
  inbox_email_id: string
  title: string
  type: string
  url?: string | null
  status: string  // pending | extracted | skipped
  opportunity_id?: string | null
}

export interface TimeWindow {
  key: string
  label: string
  icon: LucideIcon
}

export const TIME_WINDOWS: TimeWindow[] = [
  {key: 'today', label: 'Today', icon: Calendar},
  {key: 'yesterday', label: 'Yesterday', icon: CalendarClock},
  {key: 'last7', label: 'Last 7 days', icon: CalendarDays},
  {key: 'last30', label: 'Last 30 days', icon: CalendarRange},
]
