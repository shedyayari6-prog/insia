import { useState, type FormEvent } from 'react'
import { Languages } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Alert, EmptyState, Spinner } from '@/components/ui/Feedback'
import { TextField } from '@/components/ui/Field'
import { ConfirmModal, Modal } from '@/components/ui/Modal'
import { useBusiness } from '@/contexts/BusinessContext'
import { useLoad } from '@/hooks/useLoad'
import { deleteVocabulary, listVocabulary, saveVocabulary } from '@/services/knowledge'
import type { VocabularyEntry } from '@/types'

export default function VocabularyTab() {
  const { business } = useBusiness()
  const businessId = business!.id
  const { data: entries, loading, error, reload } = useLoad(() => listVocabulary(businessId))
  const [editing, setEditing] = useState<VocabularyEntry | 'new' | null>(null)
  const [deleting, setDeleting] = useState<VocabularyEntry | null>(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  async function confirmDelete() {
    if (!deleting) return
    setBusy(true)
    try {
      await deleteVocabulary(deleting.id)
      await reload()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not delete.')
    } finally { setBusy(false); setDeleting(null) }
  }

  if (loading && !entries) return <Spinner label="Loading vocabulary" />
  if (error) return <Alert tone="error">{error}</Alert>

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-ink-soft">Teach INSIA the words your customers use, in any language or spelling. For example, “sabbat” means sneakers. Your vocabulary is private to your business.</p>
        <Button onClick={() => setEditing('new')}>Add entry</Button>
      </div>
      {actionError && <div className="mb-4"><Alert tone="error">{actionError}</Alert></div>}

      {(entries ?? []).length === 0 ? (
        <EmptyState icon={<Languages className="h-5 w-5" aria-hidden="true" />} title="No vocabulary yet" action={<Button onClick={() => setEditing('new')}>Add your first entry</Button>}>
          Add a word or expression and what it means.
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-sand bg-white shadow-soft">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead className="border-b border-sand bg-paper text-ink-soft">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Word or expression</th>
                <th scope="col" className="px-4 py-3 font-medium">Means</th>
                <th scope="col" className="px-4 py-3 font-medium">Notes</th>
                <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand-light">
              {entries!.map((e) => (
                <tr key={e.id}>
                  <td className="px-4 py-3 font-medium">{e.term}</td>
                  <td className="px-4 py-3">{e.meaning}</td>
                  <td className="px-4 py-3 text-ink-soft">{e.notes ?? ''}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-right">
                    <Button variant="ghost" onClick={() => setEditing(e)}>Edit</Button>
                    <Button variant="ghost" onClick={() => setDeleting(e)}>Delete</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <VocabularyEditor
          entry={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={async (input) => {
            await saveVocabulary(businessId, input, editing === 'new' ? undefined : editing.id)
            setEditing(null)
            await reload()
          }}
        />
      )}
      {deleting && (
        <ConfirmModal title="Delete this entry?" message={`“${deleting.term}” will be removed from your vocabulary.`} confirmLabel="Delete entry" busy={busy} onConfirm={() => void confirmDelete()} onClose={() => setDeleting(null)} />
      )}
    </div>
  )
}

function VocabularyEditor({ entry, onClose, onSave }: {
  entry: VocabularyEntry | null
  onClose: () => void
  onSave: (input: { term: string; meaning: string; notes: string }) => Promise<void>
}) {
  const [term, setTerm] = useState(entry?.term ?? '')
  const [meaning, setMeaning] = useState(entry?.meaning ?? '')
  const [notes, setNotes] = useState(entry?.notes ?? '')
  const [errors, setErrors] = useState<{ term?: string; meaning?: string }>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const found: typeof errors = {}
    if (!term.trim()) found.term = 'Enter the word or expression.'
    if (!meaning.trim()) found.meaning = 'Enter what it means.'
    setErrors(found)
    if (Object.keys(found).length) return
    setBusy(true)
    setFormError(null)
    try { await onSave({ term, meaning, notes }) } catch (err) { setFormError(err instanceof Error ? err.message : 'Could not save.'); setBusy(false) }
  }

  return (
    <Modal title={entry ? 'Edit entry' : 'Add entry'} onClose={onClose}>
      <form onSubmit={(e) => void submit(e)} noValidate className="space-y-5">
        {formError && <Alert tone="error">{formError}</Alert>}
        <TextField label="Word or expression" value={term} onChange={(e) => setTerm(e.target.value)} error={errors.term} maxLength={80} placeholder="sabbat" />
        <TextField label="Means" value={meaning} onChange={(e) => setMeaning(e.target.value)} error={errors.meaning} maxLength={200} placeholder="sneakers" />
        <TextField label="Notes" optional value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} hint="For example, the language or when it is used." />
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" loading={busy}>Save entry</Button>
        </div>
      </form>
    </Modal>
  )
}
