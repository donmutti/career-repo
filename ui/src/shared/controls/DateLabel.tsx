import {useDateFormat} from '@/shared/context/DateFormatContext'
import {formatDateAgo} from '@/shared/utils/FormatUtils'

function formatAbsolute(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(/[Z+]/.test(value) ? value : value + 'Z')
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d} ${hh}:${mm}`
}

interface DateLabelProps {
  date: string | Date
  className?: string
}

export function DateLabel({date, className = ''}: DateLabelProps) {
  const {absolute, toggle} = useDateFormat()

  return (
    <span
      className={`cursor-pointer underline decoration-dashed underline-offset-4 ${className}`}
      onClick={e => { e.stopPropagation(); toggle() }}
    >
      {absolute ? formatAbsolute(date) : formatDateAgo(date)}
    </span>
  )
}
