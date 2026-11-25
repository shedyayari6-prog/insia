import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Bug, RotateCcw, Send } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Feedback'
import { PageHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useBusiness } from '@/contexts/BusinessContext'
import { sendTestMessage } from '@/services/chatbot'
import type { DebugInfo, ResponseStatus } from '../../../supabase/functions/_shared/engine/types'

interface ChatMessage {
  id: number
  role: 'you' | 'bot'
  text: string
  status?: ResponseStatus
  sources?: { label: string }[]
  debug?: DebugInfo
}

const EXAMPLES = ['Where are you located?', 'What are your opening hours?', 'How can I contact you?', 'Do you deliver?']
const STATUS_LABEL: Record<ResponseStatus, string> = {
  answered: 'Answered', partial: 'Partly answered', clarification: 'Asked a question', fallback: 'No verified answer',
}

export default function TestChatbot() {
  const { business } = useBusiness()
  const businessId = business!.id
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDebug, setShowDebug] = useState(true)
  const [selected, setSelected] = useState<number | null>(null)
  const nextId = useRef(1)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [messages, sending])

  async function send(raw: string) {
    const message = raw.trim()
    if (!message || sending) return
    setError(null)
    setSending(true)
    const mine: ChatMessage = { id: nextId.current++, role: 'you', text: message }
    setMessages((m) => [...m, mine])
    setText('')
    try {
      const r = await sendTestMessage(businessId, message, conversationId)
      setConversationId(r.conversation_id)
      const bot: ChatMessage = { id: nextId.current++, role: 'bot', text: r.reply, status: r.status, sources: r.sources, debug: r.debug }
      setMessages((m) => [...m, bot])
      setSelected(bot.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally { setSending(false) }
  }

  function reset() {
    setMessages([])
    setConversationId(null)
    setSelected(null)
    setError(null)
    setText('')
  }

  const selectedDebug = messages.find((m) => m.id === selected)?.debug ?? null

  return (
    <>
      <PageHeader
        title="Test your chatbot"
        description="Chat as a customer would. This runs the same engine that your website and messaging channels will use, with your real knowledge."
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowDebug((s) => !s)} aria-pressed={showDebug}><Bug className="h-4 w-4" aria-hidden="true" /> {showDebug ? 'Hide' : 'Show'} debug</Button>
            <Button variant="secondary" onClick={reset} disabled={sending || (!messages.length && !conversationId)}><RotateCcw className="h-4 w-4" aria-hidden="true" /> Reset</Button>
          </div>
        }
      />
      <div className="mb-5"><Alert tone="info">This is a private test. Test messages are saved as test conversations and never reach customers. Debug details are visible only to you.</Alert></div>

      <div className={`grid gap-6 ${showDebug ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]' : ''}`}>
        <section className="flex h-[32rem] flex-col rounded-lg border border-sand bg-white shadow-soft" aria-label="Test conversation">
          <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
            {messages.length === 0 && (
              <div className="py-8 text-center">
                <p className="text-sm text-ink-soft">Ask something a customer might ask.</p>
                <ul className="mt-4 flex flex-wrap justify-center gap-2">
                  {EXAMPLES.map((e) => (
                    <li key={e}><button type="button" onClick={() => void send(e)} className="rounded-md border border-sand bg-paper px-3 py-1.5 text-sm hover:border-slate">{e}</button></li>
                  ))}
                </ul>
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'you' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[88%] ${m.role === 'you' ? '' : 'w-full'}`}>
                  <div
                    className={`whitespace-pre-wrap break-words rounded-lg px-3.5 py-2.5 text-sm leading-6 ${m.role === 'you' ? 'bg-ink text-paper' : 'border border-sand bg-paper text-ink'} ${m.id === selected ? 'ring-1 ring-gold' : ''}`}
                    onClick={() => m.role === 'bot' && setSelected(m.id)}
                    dir="auto"
                  >
                    {m.text}
                  </div>
                  {m.role === 'bot' && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {m.status && <Badge tone={m.status === 'answered' ? 'success' : m.status === 'fallback' ? 'neutral' : 'warn'}>{STATUS_LABEL[m.status]}</Badge>}
                      {m.sources?.slice(0, 4).map((s, i) => <Badge key={i}>{s.label}</Badge>)}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {sending && <p className="text-sm text-ink-soft" role="status">INSIA is thinking…</p>}
            <div ref={endRef} />
          </div>
          {error && <div className="border-t border-sand-light p-3"><Alert tone="error">{error}</Alert></div>}
          <form onSubmit={(e: FormEvent) => { e.preventDefault(); void send(text) }} className="flex gap-2 border-t border-sand-light p-3">
            <input
              aria-label="Message" value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} placeholder="Type a customer message" dir="auto"
              className="h-11 min-w-0 flex-1 rounded-md border border-sand bg-white px-3 text-[0.95rem] focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
            />
            <Button type="submit" loading={sending} disabled={!text.trim()}><Send className="h-4 w-4" aria-hidden="true" /> Send</Button>
          </form>
        </section>

        {showDebug && (
          <section className="min-w-0 rounded-lg border border-sand bg-white shadow-soft" aria-label="Debug panel">
            <header className="border-b border-sand-light px-4 py-3">
              <h2 className="font-display text-lg font-medium">Debug (owner only)</h2>
              <p className="text-xs text-ink-soft">Select a bot reply to see how it was produced.</p>
            </header>
            {selectedDebug ? <DebugView d={selectedDebug} /> : <p className="p-4 text-sm text-ink-soft">Send a message to see details.</p>}
          </section>
        )}
      </div>
    </>
  )
}

function Row({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-sand-light px-4 py-2.5 last:border-b-0 sm:grid-cols-[8.5rem_1fr] sm:gap-3">
      <dt className="text-xs font-medium text-ink-soft">{k}</dt>
      <dd className="min-w-0 break-words text-sm">{children}</dd>
    </div>
  )
}

const mono = 'rounded bg-paper-deep px-1.5 py-0.5 font-mono text-xs'
const none = <span className="text-ink-soft">None</span>

function DebugView({ d }: { d: DebugInfo }) {
  return (
    <dl className="max-h-[32rem] overflow-y-auto">
      <Row k="Original"><span dir="auto">{d.original}</span></Row>
      <Row k="Normalized"><code className={mono}>{d.normalized || '—'}</code></Row>
      <Row k="Script / language">{d.script} / {d.language.language}{d.language.mixed ? ' (mixed)' : ''}</Row>
      <Row k="Recognized words">
        {d.concepts.length ? (
          <ul className="space-y-1">
            {d.concepts.map((c, i) => (
              <li key={i}><code className={mono}>{c.phrase}</code> → {c.concept} <span className="text-xs text-ink-soft">({c.method}, spelling {Math.round(c.similarity * 100)}%)</span></li>
            ))}
          </ul>
        ) : none}
      </Row>
      <Row k="Vocabulary">
        {d.vocabularyExpansions.length ? d.vocabularyExpansions.map((v, i) => <div key={i}><code className={mono}>{v.term}</code> → {v.meaning}</div>) : none}
      </Row>
      <Row k="Intents">
        {d.intents.length ? (
          <ul className="space-y-1">{d.intents.map((i, k) => <li key={k}>{i.name}{i.topic ? ` (${i.topic})` : ''} <span className="text-xs text-ink-soft">{i.confidence}, from “{i.trigger}”</span></li>)}</ul>
        ) : none}
      </Row>
      <Row k="Entities">
        {d.entities.length ? (
          <ul className="space-y-1">{d.entities.map((e, i) => <li key={i}>{e.type}: {e.value} <span className="text-xs text-ink-soft">{e.confidence}{e.fromContext ? ', from conversation context' : ''}</span></li>)}</ul>
        ) : none}
      </Row>
      <Row k="Knowledge used">
        {d.sources.length ? <ul className="space-y-1">{d.sources.map((s, i) => <li key={i}>{s.label} <span className="text-xs text-ink-soft">({s.type.replace('_', ' ')})</span></li>)}</ul> : none}
      </Row>
      <Row k="Confidence">
        Intent {d.confidence.intent} · Entity {d.confidence.entity} · <strong>Overall {d.confidence.overall}</strong>
        <div className="text-xs text-ink-soft">Lowest spelling similarity: {Math.round(d.spellingSimilarity * 100)}%. This measures spelling only, not understanding.</div>
      </Row>
      <Row k="Parts">{d.parts.map((p, i) => <div key={i}>{p.intent}: {p.outcome} ({p.confidence})</div>)}</Row>
      <Row k="Instructions">
        {d.instructions.applied.length || d.instructions.recorded.length ? (
          <>
            {d.instructions.applied.map((x, i) => <div key={`a${i}`}>Applied: {x}</div>)}
            {d.instructions.recorded.map((x, i) => <div key={`r${i}`} className="text-ink-soft">Saved, not interpreted yet: {x}</div>)}
          </>
        ) : none}
      </Row>
      <Row k="Used context">{d.contextUsed ? 'Yes, a reference to the previous message was resolved.' : 'No'}</Row>
    </dl>
  )
}
