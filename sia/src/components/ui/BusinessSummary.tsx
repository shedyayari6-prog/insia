import { categoryLabel, languageLabel } from '@/lib/constants'
import type { BusinessFormValues } from '@/types'

export function BusinessSummary({ values }: { values: BusinessFormValues }) {
  const rows: [string, string][] = [
    ['Business name', values.business_name],
    ['Category', categoryLabel(values.business_type, values.custom_business_type)],
    ['Location', [values.city, values.country].filter(Boolean).join(', ')],
    ['Preferred language', languageLabel(values.preferred_language)],
    ['Contact email', values.contact_email || 'Not provided'],
    ['Contact phone', values.contact_phone || 'Not provided'],
    ['Website', values.website || 'Not provided'],
    ['Description', values.description],
  ]
  return (
    <dl className="divide-y divide-sand-light">
      {rows.map(([k, v]) => (
        <div key={k} className="grid gap-1 py-3 sm:grid-cols-[11rem_1fr] sm:gap-4">
          <dt className="text-sm text-ink-soft">{k}</dt>
          <dd className="whitespace-pre-wrap break-words text-sm font-medium">{v}</dd>
        </div>
      ))}
    </dl>
  )
}
