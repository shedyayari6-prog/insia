const rtf = typeof Intl !== 'undefined' && 'RelativeTimeFormat' in Intl ? new Intl.RelativeTimeFormat('en', { numeric: 'auto' }) : null

/** "just now", "5 minutes ago", "yesterday"... Falls back to the full date after a week. */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const then = new Date(iso)
  const seconds = Math.round((then.getTime() - now.getTime()) / 1000)
  const abs = Math.abs(seconds)
  if (abs < 45) return 'just now'
  if (!rtf) return then.toLocaleString()
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), 'hour')
  if (abs < 7 * 86400) return rtf.format(Math.round(seconds / 86400), 'day')
  return then.toLocaleDateString(undefined, { dateStyle: 'medium' })
}

export const formatDateTime = (iso: string): string =>
  new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

export const formatDay = (iso: string): string => new Date(iso).toLocaleDateString(undefined, { dateStyle: 'full' })

/** Start and end of a local calendar day (yyyy-mm-dd) as ISO strings, for date filters. */
export function dayBounds(date: string): { start: string; end: string } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!m) return null
  const y = Number(m[1]), mo = Number(m[2]) - 1, d = Number(m[3])
  return { start: new Date(y, mo, d, 0, 0, 0, 0).toISOString(), end: new Date(y, mo, d, 23, 59, 59, 999).toISOString() }
}
