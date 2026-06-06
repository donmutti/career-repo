import {Calendar, CalendarClock, CalendarDays, CalendarRange, CalendarSearch, ClockAlert, LucideIcon} from 'lucide-react'

export interface TimeWindow {
  key: string
  label: string
  icon: LucideIcon
}

export const TIME_WINDOWS: TimeWindow[] = [
  {key: 'all', label: 'All', icon: CalendarSearch},
  {key: 'today', label: 'Today', icon: Calendar},
  {key: 'yesterday', label: 'Yesterday', icon: CalendarClock},
  {key: 'last7', label: 'Last 7 days', icon: CalendarDays},
  {key: 'last30', label: 'Last 30 days', icon: CalendarRange},
]

export const PENDING_WINDOW: TimeWindow = {key: 'pending', label: 'Pending', icon: ClockAlert}

export function getDateRange(windowKey: string): {from_date?: string; to_date?: string} {
  const today = new Date()
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  const daysAgo = (n: number) => {
    const d = new Date(today)
    d.setDate(d.getDate() - n)
    return d
  }
  switch (windowKey) {
    case 'today':     return {from_date: fmt(today), to_date: fmt(today)}
    case 'yesterday': return {from_date: fmt(daysAgo(1)), to_date: fmt(daysAgo(1))}
    case 'last7':     return {from_date: fmt(daysAgo(6)), to_date: fmt(today)}
    case 'last30':    return {from_date: fmt(daysAgo(29)), to_date: fmt(today)}
    default:          return {}
  }
}

export function filterByTimeWindow<T extends {created_at: string}>(items: T[], windowKey: string): T[] {
  if (windowKey === 'all') return items
  const now = new Date()
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const today = startOf(now)
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  return items.filter(item => {
    const d = new Date(item.created_at)
    if (windowKey === 'today') return d >= today
    if (windowKey === 'yesterday') return d >= yesterday && d < today
    if (windowKey === 'last7') { const t = new Date(today); t.setDate(today.getDate() - 7); return d >= t }
    if (windowKey === 'last30') { const t = new Date(today); t.setDate(today.getDate() - 30); return d >= t }
    return true
  })
}
