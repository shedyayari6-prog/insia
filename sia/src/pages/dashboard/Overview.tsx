import { Check, Circle } from 'lucide-react'
import { ButtonLink } from '@/components/ui/Button'
import { Panel } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Feedback'
import { useAuth } from '@/contexts/AuthContext'
import { useBusiness } from '@/contexts/BusinessContext'
import { useLoad } from '@/hooks/useLoad'
import { getKnowledgeCounts } from '@/services/knowledge'

export default function Overview() {
  const { profile } = useAuth()
  const { business } = useBusiness()
  const firstName = profile?.full_name?.split(' ')[0]
  const businessId = business!.id
  const { data: counts, error } = useLoad(() => getKnowledgeCounts(businessId))

  const hasKnowledge = counts !== null && (counts.facts > 0 || counts.questions > 0)
  const steps = [
    { label: 'Create your account', done: true, note: null as string | null, to: null as string | null },
    { label: 'Complete your business profile', done: Boolean(business?.onboarding_completed), note: null, to: '/dashboard/business' },
    {
      label: 'Add your business knowledge',
      done: hasKnowledge,
      note: counts ? `${counts.facts} ${counts.facts === 1 ? 'fact' : 'facts'}, ${counts.questions} enabled ${counts.questions === 1 ? 'answer' : 'answers'}` : null,
      to: '/dashboard/knowledge',
    },
    { label: 'Connect a channel for customers', done: false, note: 'Coming in a later phase', to: null },
  ]
  const doneCount = steps.filter((s) => s.done).length

  return (
    <>
      <h1 className="text-3xl font-medium sm:text-4xl">Welcome to INSIA{firstName ? `, ${firstName}` : ''}</h1>
      <p className="mt-2 max-w-2xl text-lg text-ink-soft">
        Let’s get {business?.business_name ? <strong className="font-medium text-ink">{business.business_name}</strong> : 'your business'} ready for its first customer conversation.
      </p>

      {error && <div className="mt-6"><Alert tone="error">{error}</Alert></div>}

      <div className="mt-10">
        <Panel
          title="Setup progress"
          description={`${doneCount} of ${steps.length} steps done.`}
          footer={
            <div className="flex flex-wrap gap-2">
              <ButtonLink to="/dashboard/knowledge">{hasKnowledge ? 'Open Knowledge Center' : 'Add business knowledge'}</ButtonLink>
              <ButtonLink to="/dashboard/business" variant="secondary">Review business profile</ButtonLink>
            </div>
          }
        >
          <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-sand-light" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={doneCount} aria-label="Setup progress">
            <div className="h-full bg-gold" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
          </div>
          <ul className="divide-y divide-sand-light">
            {steps.map((s) => (
              <li key={s.label} className="flex items-center gap-3 py-3">
                {s.done ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ink text-paper"><Check className="h-3 w-3" aria-hidden="true" /></span>
                ) : (
                  <Circle className="h-5 w-5 text-sand" aria-hidden="true" />
                )}
                <span className={`flex-1 text-sm ${s.done ? 'text-ink' : 'text-ink-soft'}`}>{s.label}</span>
                {s.note && <span className="text-xs text-ink-soft">{s.note}</span>}
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  )
}
