import { supabase } from '@/lib/supabase'
import { newPublicKey } from '@/lib/widgetDefaults'
import type { WidgetSettingsRow } from '@/types/widget'
import { ServiceError } from './auth'

const LOGO_BUCKET = 'widget-logos'
const MAX_LOGO_BYTES = 512 * 1024
const LOGO_TYPES: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }

/** The widget row is created with the business. If it is missing (older accounts) it is created on first visit. */
export async function getWidgetSettings(businessId: string): Promise<WidgetSettingsRow> {
  const read = () => supabase.from('widget_settings').select('*').eq('business_id', businessId).maybeSingle()
  const first = await read()
  if (first.error) throw new ServiceError('Could not load your website chatbot settings.')
  if (first.data) return normalise(first.data as WidgetSettingsRow)
  const created = await supabase.from('widget_settings').insert({ business_id: businessId })
  if (created.error && created.error.code !== '23505') throw new ServiceError('Could not create your website chatbot settings.')
  const second = await read()
  if (second.error || !second.data) throw new ServiceError('Could not load your website chatbot settings.')
  return normalise(second.data as WidgetSettingsRow)
}

function normalise(row: WidgetSettingsRow): WidgetSettingsRow {
  const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])
  return { ...row, starter_questions: strings(row.starter_questions), allowed_domains: strings(row.allowed_domains) }
}

export async function saveWidgetSettings(businessId: string, patch: Record<string, unknown>): Promise<WidgetSettingsRow> {
  const { data, error } = await supabase.from('widget_settings').update(patch).eq('business_id', businessId).select('*').single()
  if (error) throw new ServiceError('Could not save your changes. Check the values and try again.')
  return normalise(data as WidgetSettingsRow)
}

/** Replaces the public key. The old installation code stops working immediately. */
export async function regenerateWidgetKey(businessId: string): Promise<WidgetSettingsRow> {
  return saveWidgetSettings(businessId, { public_key: newPublicKey() })
}

export async function uploadLogo(businessId: string, file: File): Promise<string> {
  const ext = LOGO_TYPES[file.type]
  if (!ext) throw new ServiceError('Use a PNG, JPG or WebP image.')
  if (file.size > MAX_LOGO_BYTES) throw new ServiceError('The logo must be 512 KB or smaller.')
  const path = `${businessId}/logo-${Date.now()}.${ext}`
  const { error } = await supabase.storage.from(LOGO_BUCKET).upload(path, file, { contentType: file.type, cacheControl: '3600', upsert: false })
  if (error) throw new ServiceError('Could not upload the logo. Try again.')
  return supabase.storage.from(LOGO_BUCKET).getPublicUrl(path).data.publicUrl
}

/** Best-effort removal of a previously uploaded logo file. */
export async function deleteLogoFile(url: string): Promise<void> {
  const marker = `/${LOGO_BUCKET}/`
  const i = url.indexOf(marker)
  if (i < 0) return
  await supabase.storage.from(LOGO_BUCKET).remove([decodeURIComponent(url.slice(i + marker.length).split('?')[0] ?? '')])
}
