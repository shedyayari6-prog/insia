import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Field'
import { Alert, FullPageSpinner } from '@/components/ui/Feedback'
import { BusinessForm } from '@/components/ui/BusinessForm'
import { BusinessSummary } from '@/components/ui/BusinessSummary'
import { TemplateFactsForm } from '@/components/ui/TemplateFactsForm'
import { VerificationBadge } from '@/components/ui/Badge'
import { Panel } from '@/components/ui/Card'
import { useAuth } from '@/contexts/AuthContext'
import { useBusiness } from '@/contexts/BusinessContext'
import { getProfile, updateProfile } from '@/services/profile'
import { toFormValues } from '@/services/business'
import { listFacts, listQuestions, saveSuggestedQuestions, saveTemplateFacts } from '@/services/knowledge'
import { signOut } from '@/services/auth'
import { validateBusiness } from '@/lib/validation'
import { ROUTES, categoryLabel } from '@/lib/constants'
import {
  buildFactMap, buildSuggestionItems, deriveVerification, fieldsFor, labelFor, type SuggestionItem,
} from '@/lib/templates'
import type { Business, BusinessFormValues, FieldErrors } from '@/types'

type Step = 1 | 2 | 3 | 4 | 5
const STEPS = ['Personal', 'Business', 'Details', 'Questions', 'Confirm']

export default function Onboarding() {
  const { user, setProfile } = useAuth()
  const { business, loading: bizLoading, error: bizError, save, finishOnboarding, setOnboardingStep } = useBusiness()
  const navigate = useNavigate()

  const [ready, setReady] = useState(false)
  const [step, setStep] = useState<Step>(1)
  const [fullName, setFullName] = useState('')
  const [nameError, setNameError] = useState<string | undefined>()
  const [values, setValues] = useState<BusinessFormValues>(toFormValues(null))
  const [errors, setErrors] = useState<FieldErrors<BusinessFormValues>>({})
  const [factValues, setFactValues] = useState<Record<string, string>>({})
  const [items, setItems] = useState<SuggestionItem[]>([])
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  async function prepareSuggestions(biz: Business, facts: Record<string, string>): Promise<SuggestionItem[]> {
    const saved = await listQuestions(biz.id)
    const map = buildFactMap(biz, Object.entries(facts).map(([key, value]) => ({ key, value })))
    return buildSuggestionItems(
      biz.business_type, map,
      saved.map((s) => ({
        template_key: s.template_key, status: s.status, verification: s.verification,
        answer_text: s.knowledge_answers.find((a) => a.language === 'any')?.answer_text ?? null,
      })),
    )
  }

  // Resume: restore saved values and jump to the saved step, once.
  const userId = user?.id
  useEffect(() => {
    if (!userId || bizLoading || ready) return
    let active = true
    ;(async () => {
      try {
        const profile = await getProfile(userId)
        const name = profile?.full_name ?? ''
        let facts: Record<string, string> = {}
        let nextItems: SuggestionItem[] = []
        let nextStep: Step = name ? 2 : 1
        if (business) {
          const rows = await listFacts(business.id)
          facts = Object.fromEntries(rows.filter((r) => r.key).map((r) => [r.key as string, r.value]))
          nextStep = Math.min(5, Math.max(3, business.onboarding_step)) as Step
          if (nextStep >= 4) nextItems = await prepareSuggestions(business, facts)
        }
        if (!active) return
        setFullName(name)
        setValues(toFormValues(business))
        setFactValues(facts)
        setItems(nextItems)
        setStep(nextStep)
        setReady(true)
      } catch {
        if (active) setLoadError('Could not load your saved progress. Refresh to try again.')
      }
    })()
    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, bizLoading, business, ready])

  const fields = useMemo(() => fieldsFor(values.business_type), [values.business_type])
  const detailsCount = Object.values(factValues).filter((v) => v.trim()).length
  const keptCount = items.filter((i) => i.enabled && i.answer.trim()).length

  if (!user) return null
  if (business?.onboarding_completed) return <Navigate to={ROUTES.dashboard} replace />
  if (bizError || loadError) {
    return <div className="mx-auto max-w-md px-5 py-24"><Alert tone="error">{bizError ?? loadError}</Alert></div>
  }
  if (!ready) return <FullPageSpinner />

  async function run(action: () => Promise<void>) {
    setFormError(null)
    setBusy(true)
    try {
      await action()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  async function submitStep1(e: FormEvent) {
    e.preventDefault()
    if (!fullName.trim()) { setNameError('Enter your full name.'); return }
    setNameError(undefined)
    await run(async () => {
      setProfile(await updateProfile(user!.id, { full_name: fullName.trim() }))
      setStep(2)
    })
  }

  async function submitStep2(e: FormEvent) {
    e.preventDefault()
    const found = validateBusiness(values)
    setErrors(found)
    if (Object.keys(found).length) return
    await run(async () => {
      const saved = await save(values, false)
      if (saved.onboarding_step < 3) await setOnboardingStep(3, saved.id)
      setStep(3)
    })
  }

  async function submitStep3() {
    await run(async () => {
      const biz = business!
      await saveTemplateFacts(biz.id, fields.map((f) => ({ key: f.key, label: f.label, value: factValues[f.key] ?? '' })))
      await setOnboardingStep(4)
      setItems(await prepareSuggestions(biz, factValues))
      setStep(4)
    })
  }

  async function submitStep4() {
    await run(async () => {
      await saveSuggestedQuestions(business!.id, items.map((i) => ({
        template_key: i.key, question: i.question, aliases: i.aliases, answer: i.answer,
        verification: i.verification, enabled: i.enabled,
      })))
      await setOnboardingStep(5)
      setEditingKey(null)
      setStep(5)
    })
  }

  async function goBackToStep4() {
    await run(async () => {
      setItems(await prepareSuggestions(business!, factValues))
      setStep(4)
    })
  }

  const patchItem = (key: string, patch: Partial<SuggestionItem>) =>
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)))

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-sand/70">
        <div className="container-page flex h-16 items-center justify-between">
          <Logo />
          <button type="button" className="text-sm text-ink-soft underline underline-offset-4 hover:text-ink" onClick={() => void signOut().then(() => navigate(ROUTES.home))}>
            Log out
          </button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl px-5 py-10 sm:py-14">
        <h1 className="text-3xl font-medium sm:text-4xl">Set up your business</h1>
        <p className="mt-2 text-ink-soft">Your progress is saved, so you can leave and come back.</p>

        <ol className="mt-8 flex gap-2 sm:gap-4" aria-label="Progress">
          {STEPS.map((label, i) => {
            const n = i + 1
            const done = n < step
            const current = n === step
            return (
              <li key={label} className="flex-1" aria-current={current ? 'step' : undefined}>
                <div className={`h-1 rounded-full ${done || current ? 'bg-gold' : 'bg-sand-light'}`} />
                <p className={`mt-2 flex items-center gap-1 text-xs sm:text-sm ${current ? 'font-semibold text-ink' : 'text-ink-soft'}`}>
                  {done && <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                  <span className="truncate"><span className="sr-only">Step {n}: </span>{label}</span>
                </p>
              </li>
            )
          })}
        </ol>

        <div className="mt-8">
          {formError && <div className="mb-5"><Alert tone="error">{formError}</Alert></div>}

          {step === 1 && (
            <Panel title="Personal information">
              <form onSubmit={(e) => void submitStep1(e)} noValidate className="space-y-5">
                <TextField label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} error={nameError} autoComplete="name" maxLength={120} />
                <TextField label="Email" value={user.email ?? ''} disabled readOnly hint="This is the email you registered with." />
                <div className="flex justify-end"><Button type="submit" loading={busy}>Continue</Button></div>
              </form>
            </Panel>
          )}

          {step === 2 && (
            <Panel title="Business information">
              <form onSubmit={(e) => void submitStep2(e)} noValidate className="space-y-6">
                <BusinessForm values={values} errors={errors} onChange={setValues} />
                <div className="flex justify-between gap-3">
                  <Button type="button" variant="secondary" onClick={() => setStep(1)} disabled={busy}>Back</Button>
                  <Button type="submit" loading={busy}>Continue</Button>
                </div>
              </form>
            </Panel>
          )}

          {step === 3 && (
            <Panel
              title={`Details for your ${categoryLabel(values.business_type, values.custom_business_type).toLowerCase()}`}
              description="Everything here is optional. INSIA only uses what you enter and never fills in missing details. You can finish later in the Knowledge Center."
            >
              <div className="space-y-6">
                <TemplateFactsForm fields={fields} values={factValues} onChange={setFactValues} />
                <div className="flex justify-between gap-3">
                  <Button variant="secondary" onClick={() => setStep(2)} disabled={busy}>Back</Button>
                  <Button onClick={() => void submitStep3()} loading={busy}>
                    {detailsCount === 0 ? 'Skip for now' : 'Continue'}
                  </Button>
                </div>
              </div>
            </Panel>
          )}

          {step === 4 && (
            <Panel
              title="Suggested questions"
              description="These are questions customers often ask. Answers are built only from the details you entered. Keep, edit or disable each one."
            >
              <ul className="divide-y divide-sand-light">
                {items.map((item) => {
                  const hasAnswer = item.answer.trim() !== ''
                  const editing = editingKey === item.key
                  return (
                    <li key={item.key} className="py-4">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          id={`keep-${item.key}`}
                          className="mt-1 h-4 w-4 shrink-0 rounded border-sand accent-ink"
                          checked={item.enabled && hasAnswer}
                          disabled={!hasAnswer}
                          onChange={(e) => patchItem(item.key, { enabled: e.target.checked })}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <label htmlFor={`keep-${item.key}`} className="text-sm font-semibold">{item.question}</label>
                            <VerificationBadge value={item.verification} />
                          </div>
                          {hasAnswer ? (
                            <p className="mt-1 whitespace-pre-wrap break-words text-sm text-ink-soft">{item.answer}</p>
                          ) : (
                            <p className="mt-1 text-sm text-ink-soft">
                              No answer yet.{item.missing.length > 0 && <> Missing: {item.missing.map(labelFor).join(', ')}.</>}
                            </p>
                          )}
                          {editing && (
                            <div className="mt-3 space-y-3">
                              <label className="block text-sm font-medium" htmlFor={`answer-${item.key}`}>Answer</label>
                              <textarea
                                id={`answer-${item.key}`}
                                className="block min-h-[5.5rem] w-full rounded-md border border-sand bg-white px-3 py-2.5 text-[0.95rem] leading-6 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
                                value={item.answer}
                                maxLength={4000}
                                onChange={(e) => {
                                  const text = e.target.value
                                  patchItem(item.key, {
                                    answer: text,
                                    verification: deriveVerification(text, item.verification === 'verified'),
                                    enabled: text.trim() === '' ? false : item.enabled || item.answer.trim() === '',
                                  })
                                }}
                              />
                              <label className="flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox" className="h-4 w-4 rounded border-sand accent-ink"
                                  checked={item.verification === 'verified'} disabled={!hasAnswer}
                                  onChange={(e) => patchItem(item.key, { verification: deriveVerification(item.answer, e.target.checked) })}
                                />
                                I have checked that this answer is correct
                              </label>
                            </div>
                          )}
                        </div>
                        <Button variant="ghost" className="shrink-0" onClick={() => setEditingKey(editing ? null : item.key)}>
                          {editing ? 'Done' : hasAnswer ? 'Edit' : 'Add answer'}
                        </Button>
                      </div>
                    </li>
                  )
                })}
              </ul>
              <div className="mt-6 flex justify-between gap-3">
                <Button variant="secondary" onClick={() => setStep(3)} disabled={busy}>Back</Button>
                <Button onClick={() => void submitStep4()} loading={busy}>Continue</Button>
              </div>
            </Panel>
          )}

          {step === 5 && (
            <div className="space-y-5">
              <Panel title="Personal information" footer={<Button variant="ghost" onClick={() => setStep(1)}>Edit</Button>}>
                <dl className="divide-y divide-sand-light">
                  <Row k="Full name" v={fullName} />
                  <Row k="Email" v={user.email ?? ''} />
                </dl>
              </Panel>
              <Panel title="Business information" footer={<Button variant="ghost" onClick={() => setStep(2)}>Edit</Button>}>
                <BusinessSummary values={values} />
              </Panel>
              <Panel title="Knowledge" footer={<div className="flex gap-2"><Button variant="ghost" onClick={() => setStep(3)}>Edit details</Button><Button variant="ghost" onClick={() => void goBackToStep4()} disabled={busy}>Edit questions</Button></div>}>
                <dl className="divide-y divide-sand-light">
                  <Row k="Details provided" v={`${detailsCount} of ${fields.length}`} />
                  <Row k="Questions kept" v={`${keptCount} of ${items.length}`} />
                  <Row k="Still needing input" v={`${items.filter((i) => !i.answer.trim()).length}`} />
                </dl>
                <p className="mt-3 text-sm text-ink-soft">Anything unanswered can be completed later in the Knowledge Center.</p>
              </Panel>
              <div className="flex justify-between gap-3">
                <Button variant="secondary" onClick={() => void goBackToStep4()} disabled={busy}>Back</Button>
                <Button
                  loading={busy}
                  onClick={() => void run(async () => { await finishOnboarding(); navigate(ROUTES.dashboard, { replace: true }) })}
                >
                  Finish setup
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[11rem_1fr] sm:gap-4">
      <dt className="text-sm text-ink-soft">{k}</dt>
      <dd className="break-words text-sm font-medium">{v}</dd>
    </div>
  )
}
