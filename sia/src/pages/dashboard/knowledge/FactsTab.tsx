import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Alert, EmptyState, Spinner } from '@/components/ui/Feedback'
import { Panel } from '@/components/ui/Card'
import { TextAreaField, TextField } from '@/components/ui/Field'
import { Modal, ConfirmModal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { TemplateFactsForm } from '@/components/ui/TemplateFactsForm'
import { useBusiness } from '@/contexts/BusinessContext'
import { useLoad } from '@/hooks/useLoad'
import { createFact, deleteFact, listFacts, saveTemplateFacts, updateFact } from '@/services/knowledge'
import { fieldsFor } from '@/lib/templates'
import { categoryLabel } from '@/lib/constants'
import type { BusinessFact } from '@/types'

export default function FactsTab() {
  const { business } = useBusiness()
  const businessId = business!.id
  const fields = useMemo(() => fieldsFor(business!.business_type), [business])
  const { data: facts, loading, error, reload } = useLoad(() => listFacts(businessId))

  const [values, setValues] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<BusinessFact | 'new' | null>(null)
  const [deleting, setDeleting] = useState<BusinessFact | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  useEffect(() => {
    if (facts) setValues(Object.fromEntries(facts.filter((f) => f.key).map((f) => [f.key as string, f.value])))
  }, [facts])

  const fieldKeys = new Set(fields.map((f) => f.key))
  const otherFacts = (facts ?? []).filter((f) => !f.key || !fieldKeys.has(f.key))

  async function saveTemplate() {
    setMsg(null)
    setSaving(true)
    try {
      await saveTemplateFacts(businessId, fields.map((f) => ({ key: f.key, label: f.label, value: values[f.key] ?? '' })))
      await reload()
      setMsg({ tone: 'success', text: 'Details saved.' })
    } catch (e) {
      setMsg({ tone: 'error', text: e instanceof Error ? e.message : 'Could not save.' })
    } finally { setSaving(false) }
  }

  async function confirmDelete() {
    if (!deleting) return
    setDeleteBusy(true)
    try {
      await deleteFact(deleting.id)
      setDeleting(null)
      await reload()
    } catch (e) {
      setMsg({ tone: 'error', text: e instanceof Error ? e.message : 'Could not delete.' })
      setDeleting(null)
    } finally { setDeleteBusy(false) }
  }

  if (loading && !facts) return <Spinner label="Loading business facts" />
  if (error) return <Alert tone="error">{error}</Alert>

  return (
    <div className="space-y-6">
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}

      <Panel
        title={`${categoryLabel(business!.business_type, business!.custom_business_type)} details`}
        description="Leave anything blank that you don’t want INSIA to say. Blank details are never made up."
        footer={<div className="flex justify-end"><Button onClick={() => void saveTemplate()} loading={saving}>Save details</Button></div>}
      >
        <TemplateFactsForm fields={fields} values={values} onChange={setValues} />
      </Panel>

      <Panel
        title="Other facts"
        description="Anything else customers may ask about, such as “Delivery takes 24–48 hours.”"
        footer={<Button variant="secondary" onClick={() => setEditing('new')}><Plus className="h-4 w-4" aria-hidden="true" /> Add fact</Button>}
      >
        {otherFacts.length === 0 ? (
          <EmptyState icon={<Plus className="h-5 w-5" aria-hidden="true" />} title="No other facts yet">
            Add a short label and the fact itself. You can edit or remove it at any time.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-sand-light">
            {otherFacts.map((f) => (
              <li key={f.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">{f.label} {f.verified && <Badge tone="success">Verified</Badge>}</p>
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-ink-soft">{f.value}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" onClick={() => setEditing(f)}>Edit</Button>
                  <Button variant="ghost" onClick={() => setDeleting(f)}>Delete</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {editing && (
        <FactEditor
          fact={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={async (input) => {
            if (editing === 'new') await createFact(businessId, input)
            else await updateFact(editing.id, input)
            setEditing(null)
            await reload()
          }}
        />
      )}
      {deleting && (
        <ConfirmModal title="Delete this fact?" message={`“${deleting.label}” will be removed from your knowledge.`} confirmLabel="Delete fact" busy={deleteBusy} onConfirm={() => void confirmDelete()} onClose={() => setDeleting(null)} />
      )}
    </div>
  )
}

function FactEditor({ fact, onClose, onSave }: {
  fact: BusinessFact | null
  onClose: () => void
  onSave: (input: { label: string; value: string; verified: boolean }) => Promise<void>
}) {
  const [label, setLabel] = useState(fact?.label ?? '')
  const [value, setValue] = useState(fact?.value ?? '')
  const [verified, setVerified] = useState(fact?.verified ?? true)
  const [errors, setErrors] = useState<{ label?: string; value?: string }>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const found: typeof errors = {}
    if (!label.trim()) found.label = 'Enter a label.'
    if (!value.trim()) found.value = 'Enter the fact.'
    setErrors(found)
    if (Object.keys(found).length) return
    setBusy(true)
    setFormError(null)
    try {
      await onSave({ label, value, verified })
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save.')
      setBusy(false)
    }
  }

  return (
    <Modal title={fact ? 'Edit fact' : 'Add fact'} onClose={onClose}>
      <form onSubmit={(e) => void submit(e)} noValidate className="space-y-5">
        {formError && <Alert tone="error">{formError}</Alert>}
        <TextField label="Label" value={label} onChange={(e) => setLabel(e.target.value)} error={errors.label} maxLength={120} placeholder="Delivery time" />
        <TextAreaField label="Fact" value={value} onChange={(e) => setValue(e.target.value)} error={errors.value} maxLength={2000} placeholder="Delivery takes 24–48 hours." />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4 rounded border-sand accent-ink" checked={verified} onChange={(e) => setVerified(e.target.checked)} />
          I have checked that this is correct
        </label>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" loading={busy}>Save fact</Button>
        </div>
      </form>
    </Modal>
  )
}
