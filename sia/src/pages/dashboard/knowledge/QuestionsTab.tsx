import { useMemo, useState, type FormEvent } from 'react'
import { MessageSquarePlus, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Alert, EmptyState, Spinner } from '@/components/ui/Feedback'
import { TextAreaField, TextField } from '@/components/ui/Field'
import { ConfirmModal, Modal } from '@/components/ui/Modal'
import { Badge, VerificationBadge } from '@/components/ui/Badge'
import { useBusiness } from '@/contexts/BusinessContext'
import { useLoad } from '@/hooks/useLoad'
import { deleteQuestion, listQuestions, saveQuestion, setQuestionStatus } from '@/services/knowledge'
import { deriveVerification, parseAliases } from '@/lib/templates'
import type { KnowledgeQuestion } from '@/types'

type Filter = 'all' | 'active' | 'disabled' | 'needs_input'
const answerOf = (q: KnowledgeQuestion) => q.knowledge_answers.find((a) => a.language === 'any')?.answer_text ?? ''

export default function QuestionsTab() {
  const { business } = useBusiness()
  const businessId = business!.id
  const { data: questions, loading, error, reload } = useLoad(() => listQuestions(businessId))
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [editing, setEditing] = useState<KnowledgeQuestion | 'new' | null>(null)
  const [deleting, setDeleting] = useState<KnowledgeQuestion | null>(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (questions ?? []).filter((q) => {
      if (filter === 'active' && q.status !== 'active') return false
      if (filter === 'disabled' && q.status !== 'disabled') return false
      if (filter === 'needs_input' && answerOf(q)) return false
      if (!term) return true
      return [q.question, answerOf(q), ...q.knowledge_aliases.map((a) => a.phrase)].some((t) => t.toLowerCase().includes(term))
    })
  }, [questions, search, filter])

  async function toggle(q: KnowledgeQuestion) {
    setActionError(null)
    try {
      await setQuestionStatus(q.id, q.status === 'active' ? 'disabled' : 'active')
      await reload()
    } catch (e) { setActionError(e instanceof Error ? e.message : 'Could not update.') }
  }

  async function confirmDelete() {
    if (!deleting) return
    setBusy(true)
    try {
      await deleteQuestion(deleting.id)
      setDeleting(null)
      await reload()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not delete.')
      setDeleting(null)
    } finally { setBusy(false) }
  }

  if (loading && !questions) return <Spinner label="Loading questions" />
  if (error) return <Alert tone="error">{error}</Alert>

  const total = questions?.length ?? 0
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <div className="relative min-w-[12rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate" aria-hidden="true" />
          <input
            type="search" aria-label="Search questions" placeholder="Search questions and answers"
            className="h-10 w-full rounded-md border border-sand bg-white pl-9 pr-3 text-sm focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
            value={search} onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select aria-label="Filter" value={filter} onChange={(e) => setFilter(e.target.value as Filter)} className="h-10 rounded-md border border-sand bg-white px-3 text-sm focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold">
          <option value="all">All questions</option>
          <option value="active">Enabled</option>
          <option value="disabled">Disabled</option>
          <option value="needs_input">No answer yet</option>
        </select>
        <Button onClick={() => setEditing('new')}>Add question</Button>
      </div>
      {actionError && <div className="mb-4"><Alert tone="error">{actionError}</Alert></div>}

      {total === 0 ? (
        <EmptyState icon={<MessageSquarePlus className="h-5 w-5" aria-hidden="true" />} title="No questions yet" action={<Button onClick={() => setEditing('new')}>Add your first question</Button>}>
          Add a question customers ask, the ways they phrase it, and the answer you want them to get.
        </EmptyState>
      ) : visible.length === 0 ? (
        <p className="rounded-lg border border-dashed border-sand bg-white px-6 py-10 text-center text-sm text-ink-soft">No questions match your search or filter.</p>
      ) : (
        <ul className="divide-y divide-sand-light rounded-lg border border-sand bg-white shadow-soft">
          {visible.map((q) => {
            const answer = answerOf(q)
            return (
              <li key={q.id} className="px-4 py-4 sm:px-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{q.question}</p>
                      <VerificationBadge value={q.verification} />
                      {q.status === 'disabled' && <Badge>Disabled</Badge>}
                    </div>
                    <p className="mt-1 line-clamp-2 whitespace-pre-wrap break-words text-sm text-ink-soft">{answer || 'No answer yet.'}</p>
                    {q.knowledge_aliases.length > 0 && <p className="mt-1 text-xs text-ink-soft">{q.knowledge_aliases.length} alternative {q.knowledge_aliases.length === 1 ? 'phrasing' : 'phrasings'}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button variant="ghost" disabled={!answer && q.status === 'disabled'} onClick={() => void toggle(q)}>{q.status === 'active' ? 'Disable' : 'Enable'}</Button>
                    <Button variant="ghost" onClick={() => setEditing(q)}>Edit</Button>
                    <Button variant="ghost" onClick={() => setDeleting(q)}>Delete</Button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {editing && (
        <QuestionEditor
          question={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={async (input) => {
            await saveQuestion(businessId, { ...input, id: editing === 'new' ? undefined : editing.id })
            setEditing(null)
            await reload()
          }}
        />
      )}
      {deleting && (
        <ConfirmModal title="Delete this question?" message="The question, its answer and its alternative phrasings will be permanently removed." confirmLabel="Delete question" busy={busy} onConfirm={() => void confirmDelete()} onClose={() => setDeleting(null)} />
      )}
    </div>
  )
}

function QuestionEditor({ question, onClose, onSave }: {
  question: KnowledgeQuestion | null
  onClose: () => void
  onSave: (input: { question: string; aliases: string[]; answer: string; verification: KnowledgeQuestion['verification']; status: KnowledgeQuestion['status'] }) => Promise<void>
}) {
  const [text, setText] = useState(question?.question ?? '')
  const [aliases, setAliases] = useState(question?.knowledge_aliases.map((a) => a.phrase).join('\n') ?? '')
  const [answer, setAnswer] = useState(question ? answerOf(question) : '')
  const [verified, setVerified] = useState(question?.verification === 'verified')
  const [enabled, setEnabled] = useState(question ? question.status === 'active' : true)
  const [errors, setErrors] = useState<{ question?: string }>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const hasAnswer = answer.trim() !== ''

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!text.trim()) { setErrors({ question: 'Enter the question.' }); return }
    setErrors({})
    setBusy(true)
    setFormError(null)
    try {
      await onSave({
        question: text, aliases: parseAliases(aliases), answer,
        verification: deriveVerification(answer, verified), status: enabled && hasAnswer ? 'active' : 'disabled',
      })
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save.')
      setBusy(false)
    }
  }

  return (
    <Modal title={question ? 'Edit question' : 'Add question'} onClose={onClose} wide>
      <form onSubmit={(e) => void submit(e)} noValidate className="space-y-5">
        {formError && <Alert tone="error">{formError}</Alert>}
        <TextField label="Question" value={text} onChange={(e) => setText(e.target.value)} error={errors.question} maxLength={500} placeholder="Do you offer delivery?" />
        <TextAreaField label="Other ways customers ask this" optional value={aliases} onChange={(e) => setAliases(e.target.value)} hint="One per line, in any language or spelling." className="!min-h-[5.5rem]" />
        <TextAreaField label="Answer" value={answer} onChange={(e) => setAnswer(e.target.value)} maxLength={4000} hint="Leave empty if you don’t have the answer yet. Questions without an answer stay disabled." />
        <div className="space-y-2.5">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 rounded border-sand accent-ink" checked={verified && hasAnswer} disabled={!hasAnswer} onChange={(e) => setVerified(e.target.checked)} />
            I have checked that this answer is correct
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 rounded border-sand accent-ink" checked={enabled && hasAnswer} disabled={!hasAnswer} onChange={(e) => setEnabled(e.target.checked)} />
            Enabled
          </label>
        </div>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" loading={busy}>Save question</Button>
        </div>
      </form>
    </Modal>
  )
}

