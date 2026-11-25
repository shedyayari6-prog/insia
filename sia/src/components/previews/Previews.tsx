import type { ReactNode } from 'react'
import { LogoMark } from '@/components/ui/Logo'

/** Frame for illustrative UI. Content is sample copy, never real data. */
export function PreviewFrame({ title, children, caption = 'Illustrative preview with sample content' }: { title: string; children: ReactNode; caption?: string }) {
  return (
    <figure className="w-full">
      <div aria-hidden="true" className="overflow-hidden rounded-lg border border-sand bg-white shadow-lift">
        <div className="flex items-center gap-2 border-b border-sand-light bg-paper px-4 py-2.5">
          <span className="h-2 w-2 rounded-full bg-sand" /><span className="h-2 w-2 rounded-full bg-sand" /><span className="h-2 w-2 rounded-full bg-sand" />
          <span className="ml-2 truncate text-xs font-medium text-ink-soft">{title}</span>
        </div>
        <div className="p-4 sm:p-5">{children}</div>
      </div>
      <figcaption className="mt-2.5 text-xs text-ink-soft">{caption}</figcaption>
    </figure>
  )
}

function Bubble({ from, children }: { from: 'customer' | 'insia'; children: ReactNode }) {
  const mine = from === 'customer'
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm leading-6 ${mine ? 'bg-ink text-paper' : 'border border-sand bg-paper text-ink'}`}>{children}</div>
    </div>
  )
}

export function ChatPreview() {
  return (
    <PreviewFrame title="Website chat · Sample hotel">
      <div className="mb-4 flex items-center gap-2.5 border-b border-sand-light pb-3">
        <LogoMark className="h-4 w-auto" />
        <span className="text-sm font-semibold">Sample hotel assistant</span>
      </div>
      <div className="space-y-3">
        <Bubble from="customer">Do you have a room for two people next weekend?</Bubble>
        <Bubble from="insia">Yes, we have double rooms. Breakfast is served from 7:00 to 10:30. Would you like me to note your dates for the team?</Bubble>
        <Bubble from="customer">Is there parking?</Bubble>
        <Bubble from="insia">Parking details are with our reception team. I’ve passed your question on and they will reply.</Bubble>
      </div>
    </PreviewFrame>
  )
}

export function KnowledgePreview() {
  const items = [
    ['Opening hours', 'Reception, kitchen and weekend schedule'],
    ['Room types', 'Double, family and sea-view rooms'],
    ['Cancellation policy', 'Free changes up to 48 hours before arrival'],
    ['Frequently asked questions', 'Parking, pets, airport transfers'],
  ]
  return (
    <PreviewFrame title="Knowledge Center">
      <ul className="divide-y divide-sand-light">
        {items.map(([t, d]) => (
          <li key={t} className="flex items-center justify-between gap-4 py-3">
            <div className="min-w-0"><p className="truncate text-sm font-semibold">{t}</p><p className="truncate text-xs text-ink-soft">{d}</p></div>
            <span className="shrink-0 rounded border border-sand px-2 py-0.5 text-xs text-ink-soft">Entry</span>
          </li>
        ))}
      </ul>
    </PreviewFrame>
  )
}

export function LearningPreview() {
  const qs = ['Do you accept pets?', 'Can I check in after midnight?', 'Is there a shuttle from the airport?']
  return (
    <PreviewFrame title="Learning Center · Unanswered questions">
      <ul className="space-y-2.5">
        {qs.map((q) => (
          <li key={q} className="flex items-center justify-between gap-3 rounded-md border border-sand-light bg-paper px-3.5 py-3">
            <p className="text-sm">{q}</p>
            <span className="shrink-0 rounded-md bg-ink px-2.5 py-1 text-xs font-medium text-paper">Add answer</span>
          </li>
        ))}
      </ul>
    </PreviewFrame>
  )
}

export function OpportunityPreview() {
  const rows: [string, string, string][] = [
    ['Asked for a quote for 3 nights', 'Possible booking', 'Contact details shared'],
    ['Asked about group rates', 'Possible booking', 'No contact details yet'],
    ['Asked about opening hours', 'Information only', 'Answered by INSIA'],
  ]
  return (
    <PreviewFrame title="Customers · Detected opportunities">
      <ul className="divide-y divide-sand-light">
        {rows.map(([a, tag, note]) => (
          <li key={a} className="py-3">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold">{a}</p>
              <span className={`shrink-0 rounded border px-2 py-0.5 text-xs ${tag === 'Possible booking' ? 'border-gold text-gold-dark' : 'border-sand text-ink-soft'}`}>{tag}</span>
            </div>
            <p className="mt-0.5 text-xs text-ink-soft">{note}</p>
          </li>
        ))}
      </ul>
    </PreviewFrame>
  )
}

export function ChannelsPreview() {
  const rows = ['WhatsApp', 'Instagram', 'Facebook Messenger', 'Website chat']
  return (
    <PreviewFrame title="Channels">
      <ul className="divide-y divide-sand-light">
        {rows.map((r) => (
          <li key={r} className="flex items-center justify-between py-3">
            <span className="text-sm font-semibold">{r}</span>
            <span className="rounded border border-sand px-2 py-0.5 text-xs text-ink-soft">Planned</span>
          </li>
        ))}
      </ul>
    </PreviewFrame>
  )
}

export function ApiPreview() {
  return (
    <PreviewFrame title="Developer Center" caption="Illustrative preview. The developer API is planned and not available yet.">
      <pre className="overflow-x-auto rounded-md bg-ink p-4 text-xs leading-6 text-sand"><code>{`POST /v1/messages
{
  "conversation_id": "sample",
  "message": "What time does breakfast start?"
}`}</code></pre>
    </PreviewFrame>
  )
}
