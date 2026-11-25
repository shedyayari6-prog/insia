import { useState, type FormEvent } from 'react'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Feedback'
import { Panel, PageHeader } from '@/components/ui/Card'
import { BusinessForm } from '@/components/ui/BusinessForm'
import { BusinessSummary } from '@/components/ui/BusinessSummary'
import { useBusiness } from '@/contexts/BusinessContext'
import { toFormValues } from '@/services/business'
import { validateBusiness } from '@/lib/validation'
import type { BusinessFormValues, FieldErrors } from '@/types'

export default function BusinessProfile() {
  const { business, save } = useBusiness()
  const [editing, setEditing] = useState(false)
  const [values, setValues] = useState<BusinessFormValues>(toFormValues(business))
  const [errors, setErrors] = useState<FieldErrors<BusinessFormValues>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  function startEditing() {
    setValues(toFormValues(business))
    setErrors({})
    setFormError(null)
    setSaved(false)
    setEditing(true)
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    const found = validateBusiness(values)
    setErrors(found)
    if (Object.keys(found).length) return
    setBusy(true)
    try {
      await save(values)
      setEditing(false)
      setSaved(true)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save your changes. Try again.')
    } finally { setBusy(false) }
  }

  return (
    <>
      <PageHeader
        title="Business Profile"
        description="The basics INSIA knows about your business."
        actions={!editing && <Button variant="secondary" onClick={startEditing}><Pencil className="h-4 w-4" aria-hidden="true" /> Edit profile</Button>}
      />
      {saved && !editing && <div className="mb-5"><Alert tone="success">Changes saved.</Alert></div>}
      {editing ? (
        <Panel>
          <form onSubmit={(e) => void onSubmit(e)} noValidate className="space-y-6">
            {formError && <Alert tone="error">{formError}</Alert>}
            <BusinessForm values={values} errors={errors} onChange={setValues} />
            <div className="flex flex-wrap justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setEditing(false)} disabled={busy}>Cancel</Button>
              <Button type="submit" loading={busy}>Save changes</Button>
            </div>
          </form>
        </Panel>
      ) : (
        <Panel><BusinessSummary values={toFormValues(business)} /></Panel>
      )}
    </>
  )
}
