import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Alert, EmptyState, Spinner } from '@/components/ui/Feedback'
import { Panel } from '@/components/ui/Card'
import { useBusiness } from '@/contexts/BusinessContext'
import { useLoad } from '@/hooks/useLoad'
import { getConversation, listConversationMessages, setConversationStatus } from '@/services/conversations'
import { formatDateTime, formatDay } from '@/lib/time'
import { channelLabel, customerLabel } from './Conversations'
import type { ConversationMessage } from '@/types/widget'

const STATUS_BADGE: Partial<Record<NonNullable<ConversationMessage['response_status']>, string>> = {
  fallback: 'No verified answer', partial: 'Partly answered', clarification: 'Asked a question',
}

export default function ConversationDetail() {
  const { id } = useParams<{ id: string }>()
  const { business } = useBusiness()
  const businessId = business!.id
  const { data, loading, error, reload } = useLoad(async () => {
    if (!id) return null
    const conversation = await getConversation(businessId, id)
    if (!conversation) return null
    return { conversation, messages: await listConversationMessages(businessId, id) }
  })
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => { void reload() }, [id, reload])
  // Active conversations update while the owner reads them.
  const isOpen = data?.conversation.status === 'open'
  useEffect(() => {
    if (!isOpen) return
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void reload() }, 10_000)
    return () => window.clearInterval(timer)
  }, [isOpen, reload])

  async function toggle() {
    if (!data) return
    setBusy(true)
    setActionError(null)
    try {
      await setConversationStatus(businessId, data.conversation.id, data.conversation.status === 'open' ? 'closed' : 'open')
      await reload()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not update the conversation.')
    } finally { setBusy(false) }
  }

  const back = (
    <Link to="/dashboard/conversations" className="mb-5 inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink">
      <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All conversations
    </Link>
  )
  if (loading && !data) return <>{back}<Spinner label="Loading the conversation" /></>
  if (error) return <>{back}<Alert tone="error">{error}</Alert></>
  if (!data) return <>{back}<EmptyState icon={<ArrowLeft className="h-5 w-5" aria-hidden="true" />} title="Conversation not found">It may have been removed, or it belongs to a different account.</EmptyState></>

  const { conversation: c, messages } = data
  return (
    <>
      {back}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex flex-wrap items-center gap-3 text-3xl font-medium sm:text-4xl">
            {customerLabel(c)}
            <Badge tone={c.status === 'open' ? 'success' : 'neutral'}>{c.status === 'open' ? 'Active' : 'Closed'}</Badge>
          </h1>
          <p className="mt-2 text-sm text-ink-soft">{channelLabel(c.channel)} · started {formatDateTime(c.created_at)} · last activity {formatDateTime(c.last_message_at)}</p>
        </div>
        <Button variant={c.status === 'open' ? 'secondary' : 'primary'} onClick={() => void toggle()} loading={busy}>
          {c.status === 'open' ? 'Close conversation' : 'Reopen conversation'}
        </Button>
      </div>
      {actionError && <div className="mb-4"><Alert tone="error">{actionError}</Alert></div>}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <section className="rounded-lg border border-sand bg-white shadow-soft" aria-label="Messages">
          {messages.length === 0 ? (
            <p className="p-6 text-sm text-ink-soft">This conversation has no messages.</p>
          ) : (
            <ol className="space-y-3 p-4 sm:p-5">
              {messages.map((m, i) => {
                const day = formatDay(m.created_at)
                const newDay = i === 0 || day !== formatDay(messages[i - 1]!.created_at)
                const mine = m.sender_type === 'customer'
                const flag = m.response_status ? STATUS_BADGE[m.response_status] : undefined
                return (
                  <li key={m.id}>
                    {newDay && <p className="my-3 text-center text-xs text-ink-soft">{day}</p>}
                    <div className={`flex ${mine ? 'justify-start' : 'justify-end'}`}>
                      <div className="max-w-[85%]">
                        <p className={`mb-1 text-xs text-ink-soft ${mine ? '' : 'text-right'}`}>{mine ? 'Customer' : m.sender_type === 'owner' ? 'You' : 'Chatbot'}</p>
                        <div dir="auto" className={`whitespace-pre-wrap break-words rounded-lg px-3.5 py-2.5 text-sm leading-6 ${mine ? 'border border-sand bg-paper' : 'bg-ink text-paper'}`}>{m.original_content}</div>
                        <p className={`mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-soft ${mine ? '' : 'justify-end'}`}>
                          <time dateTime={m.created_at}>{new Date(m.created_at).toLocaleTimeString(undefined, { timeStyle: 'short' })}</time>
                          {flag && <Badge tone="warn">{flag}</Badge>}
                        </p>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </section>

        <aside aria-label="Customer details">
          <Panel title="Customer">
            <dl className="space-y-3 text-sm">
              <Detail k="Name" v={c.customer_name} />
              <Detail k="Email" v={c.customer_email} />
              <Detail k="Phone" v={c.customer_phone} />
              <Detail k="Messages" v={String(c.message_count)} />
              {c.closed_at && <Detail k="Closed" v={formatDateTime(c.closed_at)} />}
            </dl>
            {!c.customer_name && !c.customer_email && !c.customer_phone && (
              <p className="mt-4 text-sm text-ink-soft">This visitor chose not to share contact details.</p>
            )}
          </Panel>
        </aside>
      </div>
    </>
  )
}

function Detail({ k, v }: { k: string; v: string | null }) {
  return (
    <div>
      <dt className="text-xs text-ink-soft">{k}</dt>
      <dd className="break-words font-medium">{v ?? <span className="font-normal text-ink-soft">Not provided</span>}</dd>
    </div>
  )
}
