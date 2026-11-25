import { useState, type FormEvent } from 'react'
import { ListChecks } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Alert, EmptyState, Spinner } from '@/components/ui/Feedback'
import { Panel } from '@/components/ui/Card'
import { TextAreaField } from '@/components/ui/Field'
import { ConfirmModal, Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { useBusiness } from '@/contexts/BusinessContext'
import { useLoad } from '@/hooks/useLoad'
import { createInstruction, deleteInstruction, listInstructions, updateInstruction } from '@/services/knowledge'
import type { BusinessInstruction } from '@/types'

const EXAMPLES = [
  'Be polite and concise.',
  'Always explain the delivery policy before confirming an order.',
  'Never promise stock availability without checking inventory.',
  'Do not provide medical advice.',
  'Do not claim a reservation is confirmed until it is verified.',
]

export default function InstructionsTab() {
  const { business } = useBusiness()
  const businessId = business!.id
  const { data: items, loading, error, reload } = useLoad(() => listInstructions(businessId))
  const [text, setText] = useState('')
  const [fieldError, setFieldError] = useState<string | undefined>()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<BusinessInstruction | null>(null)
  const [deleting, setDeleting] = useState<BusinessInstruction | null>(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  async function act(fn: () => Promise<void>) {
    setActionError(null)
    try {
      await fn()
      await reload()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Something went wrong.')
    }
  }

  async function add(e: FormEvent) {
    e.preventDefault()
    if (!text.trim()) { setFieldError('Write an instruction first.'); return }
    setFieldError(undefined)
    setAdding(true)
    await act(async () => { await createInstruction(businessId, text); setText('') })
    setAdding(false)
  }

  if (loading && !items) return <Spinner label="Loading instructions" />
  if (error) return <Alert tone="error">{error}</Alert>

  const existing = new Set((items ?? []).map((i) => i.instruction.toLowerCase()))
  const suggestions = EXAMPLES.filter((x) => !existing.has(x.toLowerCase()))

  return (
    <div className="space-y-6">
      <Panel title="Add an instruction" description="Rules INSIA should follow when it answers customers. One rule per instruction.">
        <form onSubmit={(e) => void add(e)} noValidate className="space-y-4">
          <TextAreaField label="Instruction" value={text} onChange={(e) => setText(e.target.value)} error={fieldError} maxLength={500} className="!min-h-[4.5rem]" placeholder="Be polite and concise." />
          <div className="flex justify-end"><Button type="submit" loading={adding}>Add instruction</Button></div>
        </form>
        {suggestions.length > 0 && (
          <div className="mt-5 border-t border-sand-light pt-4">
            <p className="text-sm font-medium">Examples</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <li key={s}>
                  <button type="button" onClick={() => void act(() => createInstruction(businessId, s))} className="rounded-md border border-sand bg-paper px-3 py-1.5 text-left text-sm hover:border-slate">
                    + {s}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Panel>

      {actionError && <Alert tone="error">{actionError}</Alert>}

      {(items ?? []).length === 0 ? (
        <EmptyState icon={<ListChecks className="h-5 w-5" aria-hidden="true" />} title="No instructions yet">
          Instructions are optional. Add the rules that matter most to your business.
        </EmptyState>
      ) : (
        <ul className="divide-y divide-sand-light rounded-lg border border-sand bg-white shadow-soft">
          {items!.map((i) => (
            <li key={i.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-4 sm:px-5">
              <div className="min-w-0 flex-1">
                <p className={`break-words text-sm ${i.enabled ? '' : 'text-ink-soft line-through'}`}>{i.instruction}</p>
                {!i.enabled && <div className="mt-1"><Badge>Disabled</Badge></div>}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button variant="ghost" onClick={() => void act(() => updateInstruction(i.id, { enabled: !i.enabled }))}>{i.enabled ? 'Disable' : 'Enable'}</Button>
                <Button variant="ghost" onClick={() => setEditing(i)}>Edit</Button>
                <Button variant="ghost" onClick={() => setDeleting(i)}>Delete</Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <EditInstruction
          item={editing}
          onClose={() => setEditing(null)}
          onSave={async (value) => { await updateInstruction(editing.id, { instruction: value }); setEditing(null); await reload() }}
        />
      )}
      {deleting && (
        <ConfirmModal
          title="Delete this instruction?" message={`“${deleting.instruction}” will be removed.`} confirmLabel="Delete instruction" busy={busy}
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            setBusy(true)
            void act(() => deleteInstruction(deleting.id)).finally(() => { setBusy(false); setDeleting(null) })
          }}
        />
      )}
    </div>
  )
}

function EditInstruction({ item, onClose, onSave }: { item: BusinessInstruction; onClose: () => void; onSave: (value: string) => Promise<void> }) {
  const [value, setValue] = useState(item.instruction)
  const [error, setError] = useState<string | undefined>()
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!value.trim()) { setError('Write an instruction first.'); return }
    setError(undefined)
    setBusy(true)
    try { await onSave(value) } catch (err) { setFormError(err instanceof Error ? err.message : 'Could not save.'); setBusy(false) }
  }

  return (
    <Modal title="Edit instruction" onClose={onClose}>
      <form onSubmit={(e) => void submit(e)} noValidate className="space-y-5">
        {formError && <Alert tone="error">{formError}</Alert>}
        <TextAreaField label="Instruction" value={value} onChange={(e) => setValue(e.target.value)} error={error} maxLength={500} />
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" loading={busy}>Save instruction</Button>
        </div>
      </form>
    </Modal>
  )
}
