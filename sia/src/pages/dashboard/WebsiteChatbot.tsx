import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { ImagePlus, RotateCcw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Alert, EmptyState, Spinner } from '@/components/ui/Feedback'
import { Badge } from '@/components/ui/Badge'
import { Panel, PageHeader } from '@/components/ui/Card'
import { SelectField, TextAreaField, TextField } from '@/components/ui/Field'
import { ConfirmModal } from '@/components/ui/Modal'
import { InstallPanel } from '@/components/widget/InstallPanel'
import { WidgetPreview } from '@/components/widget/WidgetPreview'
import { useBusiness } from '@/contexts/BusinessContext'
import { useLoad } from '@/hooks/useLoad'
import {
  DEFAULT_WIDGET_FORM, restoreDefaults, toFormValues, toPreviewConfig, toRowPatch, validateWidget, type WidgetErrors,
} from '@/lib/widgetDefaults'
import { deleteLogoFile, getWidgetSettings, regenerateWidgetKey, saveWidgetSettings, uploadLogo } from '@/services/widget'
import type { GreetingLanguage, WidgetFormValues, WidgetPosition, WidgetSettingsRow } from '@/types/widget'

type Message = { tone: 'success' | 'error'; text: string }

export default function WebsiteChatbot() {
  const { business } = useBusiness()
  const businessId = business!.id
  const { data, loading, error } = useLoad(() => getWidgetSettings(businessId))

  const [row, setRow] = useState<WidgetSettingsRow | null>(null)
  const [form, setForm] = useState<WidgetFormValues>(DEFAULT_WIDGET_FORM)
  const [errors, setErrors] = useState<WidgetErrors>({})
  const [message, setMessage] = useState<Message | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [confirm, setConfirm] = useState<'restore' | 'regenerate' | null>(null)
  const [confirmBusy, setConfirmBusy] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (data) { setRow(data); setForm(toFormValues(data)) }
  }, [data])

  const dirty = row ? JSON.stringify(form) !== JSON.stringify(toFormValues(row)) : false
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const set = <K extends keyof WidgetFormValues>(key: K, value: WidgetFormValues[K]) => setForm((f) => ({ ...f, [key]: value }))

  async function save() {
    setMessage(null)
    const found = validateWidget(form)
    setErrors(found)
    if (Object.keys(found).length) { setMessage({ tone: 'error', text: 'Fix the highlighted fields and save again.' }); return }
    setSaving(true)
    try {
      const previousLogo = row?.logo_url ?? null
      const saved = await saveWidgetSettings(businessId, toRowPatch(form))
      if (previousLogo && previousLogo !== saved.logo_url) void deleteLogoFile(previousLogo).catch(() => undefined)
      setRow(saved)
      setForm(toFormValues(saved))
      setMessage({ tone: 'success', text: saved.enabled ? 'Saved. Your chatbot is live on websites that have the installation code.' : 'Saved. Your chatbot is hidden until you turn it on.' })
    } catch (e) {
      setMessage({ tone: 'error', text: e instanceof Error ? e.message : 'Could not save.' })
    } finally { setSaving(false) }
  }

  async function onLogo(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setMessage(null)
    setUploading(true)
    try {
      set('logo_url', await uploadLogo(businessId, file))
    } catch (err) {
      setMessage({ tone: 'error', text: err instanceof Error ? err.message : 'Could not upload the logo.' })
    } finally { setUploading(false) }
  }

  async function confirmAction() {
    setConfirmBusy(true)
    try {
      if (confirm === 'restore') {
        setForm((f) => restoreDefaults(f))
        setErrors({})
        setMessage({ tone: 'success', text: 'Defaults restored in the form. Select “Save changes” to apply them.' })
      } else if (confirm === 'regenerate') {
        const next = await regenerateWidgetKey(businessId)
        setRow((r) => (r ? { ...r, public_key: next.public_key } : next))
        setMessage({ tone: 'success', text: 'New installation code created. Replace the old code on your website.' })
      }
    } catch (e) {
      setMessage({ tone: 'error', text: e instanceof Error ? e.message : 'Something went wrong.' })
    } finally { setConfirmBusy(false); setConfirm(null) }
  }

  if (loading && !row) return <Spinner label="Loading your website chatbot" />
  if (error) return <Alert tone="error">{error}</Alert>
  if (!row) return <EmptyState icon={<ImagePlus className="h-5 w-5" aria-hidden="true" />} title="Settings unavailable">Reload the page to try again.</EmptyState>

  return (
    <>
      <PageHeader
        title="Website Chatbot"
        description="Put your chatbot on your own website. It answers visitors using the knowledge you added, and every conversation appears in Conversations."
        actions={<Badge tone={row.enabled ? 'success' : 'neutral'}>{row.enabled ? 'Published' : 'Hidden'}</Badge>}
      />
      {message && <div className="mb-5"><Alert tone={message.tone}>{message.text}</Alert></div>}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <div className="space-y-6">
          <Panel title="Visibility">
            <label className="flex items-start gap-3">
              <input type="checkbox" className="mt-1 h-4 w-4 rounded border-sand accent-ink" checked={form.enabled} onChange={(e) => set('enabled', e.target.checked)} />
              <span>
                <span className="block text-sm font-medium">Show the chatbot on my website</span>
                <span className="block text-sm text-ink-soft">When off, the installation code does nothing and visitors see no chat.</span>
              </span>
            </label>
          </Panel>

          <Panel title="Appearance">
            <div className="space-y-5">
              <TextField label="Chatbot name" optional value={form.bot_name} onChange={(e) => set('bot_name', e.target.value)} error={errors.bot_name} maxLength={60} placeholder={business!.business_name} hint="Shown at the top of the chat. Leave empty to use your business name." />
              <div className="flex items-end gap-3">
                <input type="color" aria-label="Pick a color" value={/^#[0-9a-fA-F]{6}$/.test(form.primary_color) ? form.primary_color : '#171A1F'} onChange={(e) => set('primary_color', e.target.value.toUpperCase())} className="h-11 w-14 shrink-0 cursor-pointer rounded-md border border-sand bg-white p-1" />
                <div className="flex-1"><TextField label="Main color" value={form.primary_color} onChange={(e) => set('primary_color', e.target.value)} error={errors.primary_color} maxLength={7} hint="Text color adjusts automatically so it stays readable." /></div>
              </div>
              <fieldset>
                <legend className="mb-2 text-sm font-medium">Button position</legend>
                <div className="flex gap-3">
                  {([['bottom-right', 'Bottom right'], ['bottom-left', 'Bottom left']] as [WidgetPosition, string][]).map(([value, label]) => (
                    <label key={value} className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${form.position === value ? 'border-gold bg-paper-deep' : 'border-sand bg-white'}`}>
                      <input type="radio" name="position" className="accent-ink" checked={form.position === value} onChange={() => set('position', value)} />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div>
                <p className="mb-1.5 text-sm font-medium">Logo <span className="text-xs font-normal text-ink-soft">Optional</span></p>
                <div className="flex flex-wrap items-center gap-3">
                  {form.logo_url ? <img src={form.logo_url} alt="Current logo" className="h-12 w-12 rounded-full border border-sand object-cover" /> : <div className="flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-sand text-ink-soft"><ImagePlus className="h-5 w-5" aria-hidden="true" /></div>}
                  <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" aria-label="Upload logo" onChange={(e) => void onLogo(e)} />
                  <Button variant="secondary" loading={uploading} onClick={() => fileInput.current?.click()}>{form.logo_url ? 'Replace logo' : 'Upload logo'}</Button>
                  {form.logo_url && <Button variant="ghost" onClick={() => set('logo_url', null)}><Trash2 className="h-4 w-4" aria-hidden="true" /> Remove</Button>}
                </div>
                <p className="mt-1.5 text-sm text-ink-soft">PNG, JPG or WebP, up to 512 KB. A square image works best.</p>
              </div>
            </div>
          </Panel>

          <Panel title="Messages">
            <div className="space-y-5">
              <TextAreaField label="Welcome message" optional value={form.welcome_message} onChange={(e) => set('welcome_message', e.target.value)} error={errors.welcome_message} maxLength={300} className="!min-h-[5rem]" hint="The first message visitors see. Leave empty to use a friendly default in the chosen language." />
              <SelectField label="Chat language" value={form.greeting_language} onChange={(e) => set('greeting_language', e.target.value as GreetingLanguage)} hint="Language of the buttons and the default welcome. Replies always follow the language the visitor writes in.">
                <option value="auto">Automatic (visitor’s browser language)</option>
                <option value="en">English</option>
                <option value="fr">French</option>
                <option value="ar">Arabic</option>
              </SelectField>
              <fieldset>
                <legend className="text-sm font-medium">Suggested questions <span className="text-xs font-normal text-ink-soft">Optional, up to 4</span></legend>
                {errors.starter_questions && <p role="alert" className="mt-1 text-sm text-[#9A3623]">{errors.starter_questions}</p>}
                <div className="mt-2 space-y-3">
                  {form.starter_questions.map((q, i) => (
                    <TextField key={i} label={`Question ${i + 1}`} value={q} maxLength={80} placeholder={['Where are you located?', 'What are your opening hours?', 'How can I contact you?', ''][i]} onChange={(e) => set('starter_questions', form.starter_questions.map((x, k) => (k === i ? e.target.value : x)))} />
                  ))}
                </div>
              </fieldset>
            </div>
          </Panel>

          <Panel title="Availability and access">
            <div className="space-y-5">
              <label className="flex items-start gap-3">
                <input type="checkbox" className="mt-1 h-4 w-4 rounded border-sand accent-ink" checked={form.show_status} onChange={(e) => set('show_status', e.target.checked)} />
                <span>
                  <span className="block text-sm font-medium">Show a status line under the name</span>
                  <span className="block text-sm text-ink-soft">For example “Online” or “Replies instantly”. Only turn this on if it is true for your business.</span>
                </span>
              </label>
              {form.show_status && <TextField label="Status text" value={form.status_text} onChange={(e) => set('status_text', e.target.value)} error={errors.status_text} maxLength={30} />}
              <TextAreaField label="Allowed websites" optional value={form.allowed_domains} onChange={(e) => set('allowed_domains', e.target.value)} error={errors.allowed_domains} className="!min-h-[5rem]" placeholder={'www.mybusiness.com\nshop.mybusiness.com'} hint="One per line. Leave empty to allow any website. If you list websites, the chat only appears on those." />
            </div>
          </Panel>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button variant="secondary" onClick={() => setConfirm('restore')}><RotateCcw className="h-4 w-4" aria-hidden="true" /> Restore defaults</Button>
            <div className="flex items-center gap-3">
              {dirty && <span className="text-sm text-ink-soft">Unsaved changes</span>}
              <Button onClick={() => void save()} loading={saving} disabled={!dirty}>Save changes</Button>
            </div>
          </div>

          <InstallPanel publicKey={row.public_key} enabled={row.enabled} />

          <Panel title="Installation code security" description="If you shared the code with someone you no longer trust, create a new one.">
            <Button variant="danger" onClick={() => setConfirm('regenerate')}>Create a new installation code</Button>
          </Panel>
        </div>

        <aside className="xl:sticky xl:top-6" aria-label="Preview">
          <Panel title="Live preview" description="This is exactly how visitors will see your chat.">
            <WidgetPreview config={toPreviewConfig(form, business!.business_name)} />
          </Panel>
        </aside>
      </div>

      {confirm === 'restore' && (
        <ConfirmModal
          title="Restore default settings?" confirmLabel="Restore defaults" busy={confirmBusy} onClose={() => setConfirm(null)} onConfirm={() => void confirmAction()}
          message="This resets the name, color, position, logo, welcome message, suggested questions and status line. It keeps your visibility setting and allowed websites. Nothing changes on your website until you save."
        />
      )}
      {confirm === 'regenerate' && (
        <ConfirmModal
          title="Create a new installation code?" confirmLabel="Create new code" busy={confirmBusy} onClose={() => setConfirm(null)} onConfirm={() => void confirmAction()}
          message="The current code stops working immediately. You will need to replace it on every website where it is installed."
        />
      )}
    </>
  )
}
