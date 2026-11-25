import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { MessagesSquare, RefreshCw, Search } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Alert, EmptyState, Spinner } from '@/components/ui/Feedback'
import { PageHeader } from '@/components/ui/Card'
import { useBusiness } from '@/contexts/BusinessContext'
import { DEFAULT_FILTERS, listConversations, type ConversationFilters } from '@/services/conversations'
import { formatDateTime, timeAgo } from '@/lib/time'
import type { ConversationRow } from '@/types/widget'

const select = 'h-10 rounded-md border border-sand bg-white px-3 text-sm focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold'

export const customerLabel = (c: Pick<ConversationRow, 'customer_name' | 'customer_email' | 'customer_phone'>): string =>
  c.customer_name || c.customer_email || c.customer_phone || 'Anonymous visitor'

export const channelLabel = (c: ConversationRow['channel']): string =>
  c === 'dashboard_test' ? 'Test' : c === 'website' ? 'Website' : c.charAt(0).toUpperCase() + c.slice(1)

export default function Conversations() {
  const { business } = useBusiness()
  const businessId = business!.id
  const [filters, setFilters] = useState<ConversationFilters>(DEFAULT_FILTERS)
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState<ConversationRow[]>([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const pageRef = useRef(0)
  pageRef.current = page

  useEffect(() => {
    const t = window.setTimeout(() => setFilters((f) => (f.search === search ? f : { ...f, search })), 350)
    return () => window.clearTimeout(t)
  }, [search])

  const fetchPage = useCallback(async (pageIndex: number, replace: boolean, silent = false) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const r = await listConversations(businessId, filters, pageIndex)
      setRows((prev) => (replace ? r.rows : [...prev, ...r.rows]))
      setHasMore(r.hasMore)
      setPage(pageIndex)
      setUpdatedAt(new Date())
    } catch (e) {
      if (!silent) setError(e instanceof Error ? e.message : 'Could not load conversations.')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [businessId, filters])

  useEffect(() => { void fetchPage(0, true) }, [fetchPage])

  // New conversations appear without a manual refresh (only while the first page is shown).
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible' && pageRef.current === 0) void fetchPage(0, true, true)
    }, 20_000)
    return () => window.clearInterval(id)
  }, [fetchPage])

  const set = <K extends keyof ConversationFilters>(key: K, value: ConversationFilters[K]) => setFilters((f) => ({ ...f, [key]: value }))
  const filtered = filters.search || filters.status !== 'all' || filters.source !== 'customers' || filters.from || filters.to

  return (
    <>
      <PageHeader
        title="Conversations"
        description="Every chat between your customers and your chatbot, newest first."
        actions={
          <Button variant="secondary" onClick={() => void fetchPage(0, true)} disabled={loading}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" /> Refresh
          </Button>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto]">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate" aria-hidden="true" />
          <input type="search" aria-label="Search conversations" placeholder="Search messages, names, emails" value={search} onChange={(e) => setSearch(e.target.value)} className={`${select} w-full pl-9 pr-3`} />
        </div>
        <select aria-label="Status" className={select} value={filters.status} onChange={(e) => set('status', e.target.value as ConversationFilters['status'])}>
          <option value="all">All statuses</option>
          <option value="open">Active</option>
          <option value="closed">Closed</option>
        </select>
        <select aria-label="Source" className={select} value={filters.source} onChange={(e) => set('source', e.target.value as ConversationFilters['source'])}>
          <option value="customers">Customer chats</option>
          <option value="website">Website only</option>
          <option value="test">My test chats</option>
        </select>
        <input type="date" aria-label="From date" className={select} value={filters.from} max={filters.to || undefined} onChange={(e) => set('from', e.target.value)} />
        <input type="date" aria-label="To date" className={select} value={filters.to} min={filters.from || undefined} onChange={(e) => set('to', e.target.value)} />
      </div>
      {filtered && (
        <div className="mb-4">
          <Button variant="ghost" onClick={() => { setSearch(''); setFilters(DEFAULT_FILTERS) }}>Clear filters</Button>
        </div>
      )}

      {error && <div className="mb-4"><Alert tone="error">{error}</Alert></div>}
      {loading && rows.length === 0 ? (
        <Spinner label="Loading conversations" />
      ) : rows.length === 0 ? (
        filtered ? (
          <p className="rounded-lg border border-dashed border-sand bg-white px-6 py-10 text-center text-sm text-ink-soft">No conversations match these filters.</p>
        ) : (
          <EmptyState
            icon={<MessagesSquare className="h-5 w-5" aria-hidden="true" />} title="No customer conversations yet"
            action={<ButtonLink to="/dashboard/website-chatbot">Set up your website chatbot</ButtonLink>}
          >
            When visitors chat with your website chatbot, their conversations appear here. You can also try the chatbot yourself in “Test your chatbot”.
          </EmptyState>
        )
      ) : (
        <>
          <ul className="divide-y divide-sand-light rounded-lg border border-sand bg-white shadow-soft">
            {rows.map((c) => (
              <li key={c.id}>
                <Link to={`/dashboard/conversations/${c.id}`} className="block px-4 py-4 hover:bg-paper sm:px-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="flex min-w-0 flex-wrap items-center gap-2 text-sm font-semibold">
                      <span className="truncate">{customerLabel(c)}</span>
                      <Badge tone={c.status === 'open' ? 'success' : 'neutral'}>{c.status === 'open' ? 'Active' : 'Closed'}</Badge>
                      <Badge>{channelLabel(c.channel)}</Badge>
                    </p>
                    <time className="text-xs text-ink-soft" dateTime={c.last_message_at} title={formatDateTime(c.last_message_at)}>{timeAgo(c.last_message_at)}</time>
                  </div>
                  <p className="mt-1 line-clamp-2 break-words text-sm text-ink-soft" dir="auto">{c.first_message ?? 'No messages yet'}</p>
                  <p className="mt-1 text-xs text-ink-soft">{c.message_count} {c.message_count === 1 ? 'message' : 'messages'} · started {formatDateTime(c.created_at)}</p>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-ink-soft">{updatedAt ? `Updated ${timeAgo(updatedAt.toISOString())}` : ''}</p>
            {hasMore && <Button variant="secondary" onClick={() => void fetchPage(page + 1, false)} disabled={loading}>Load more</Button>}
          </div>
        </>
      )}
    </>
  )
}
