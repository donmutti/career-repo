export function formatCount(count: number): string {
  return count === 0 ? '' : String(count)
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const parts = []
  if (h > 0) parts.push(`${h}h`)
  if (m > 0) parts.push(`${m}m`)
  if (s > 0 || parts.length === 0) parts.push(`${s}s`)
  return parts.join(' ')
}

function parseUtc(value: string): Date {
  // Bare ISO strings from the backend have no TZ suffix — treat as UTC
  return new Date(/[Z+]/.test(value) ? value : value + 'Z')
}

export function formatDate(value: string): string {
  const d = parseUtc(value)
  const now = new Date()
  const isToday = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
  if (isToday) {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }
  const isThisYear = d.getFullYear() === now.getFullYear()
  if (isThisYear) {
    return d.toLocaleDateString('en-US', {month: 'short', day: 'numeric'})
  }
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function formatTimestamp(value: string): string {
  const d = parseUtc(value)
  const now = new Date()
  const hhmm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  const isToday = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
  if (isToday) return `Today at ${hhmm}`
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const isYesterday = d.getFullYear() === yesterday.getFullYear() && d.getMonth() === yesterday.getMonth() && d.getDate() === yesterday.getDate()
  if (isYesterday) return `Yesterday at ${hhmm}`
  const isThisYear = d.getFullYear() === now.getFullYear()
  const date = d.toLocaleDateString('en-US', isThisYear ? {month: 'short', day: 'numeric'} : {month: 'short', day: 'numeric', year: 'numeric'})
  return `${date} at ${hhmm}`
}

export function formatPay(
  payMin?: number,
  payMax?: number,
  currency?: string,
  period?: string,
): string | null {
  if (!payMin && !payMax) return null
  const c = currency ?? ''
  const p = period ? `/${period.toLowerCase()}` : ''
  if (payMin && payMax) return `${payMin.toLocaleString()}–${payMax.toLocaleString()} ${c}${p}`
  if (payMax) return `Up to ${payMax.toLocaleString()} ${c}${p}`
  return `${(payMin ?? 0).toLocaleString()} ${c}${p}`
}

export function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural
}

export function dateBucketKey(value: string): string {
  const d = parseUtc(value)
  const now = new Date()
  const isThisMonth = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  if (isThisMonth) return value.slice(0, 10)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

export function formatDateBucketKey(key: string): string {
  const d = parseUtc(key)
  const now = new Date()
  const isToday = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
  if (isToday) return 'Today'
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const isYesterday = d.getFullYear() === yesterday.getFullYear() && d.getMonth() === yesterday.getMonth() && d.getDate() === yesterday.getDate()
  if (isYesterday) return 'Yesterday'
  const isThisMonth = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  if (isThisMonth) return d.toLocaleDateString('en-US', {month: 'short', day: 'numeric'})
  return d.toLocaleDateString('en-US', {month: 'short', year: 'numeric'})
}

export function formatDateAgo(value: string | Date): string {
  const date = value instanceof Date ? value : parseUtc(value)
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} ${pluralize(minutes, 'minute', 'minutes')} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} ${pluralize(hours, 'hour', 'hours')} ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} ${pluralize(days, 'day', 'days')} ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} ${pluralize(months, 'month', 'months')} ago`
  const years = Math.floor(months / 12)
  return `${years} ${pluralize(years, 'year', 'years')} ago`
}

