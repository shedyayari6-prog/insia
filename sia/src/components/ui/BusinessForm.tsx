import { COUNTRY_SUGGESTIONS, BUSINESS_CATEGORIES, LANGUAGES } from '@/lib/constants'
import { SelectField, TextAreaField, TextField } from '@/components/ui/Field'
import type { BusinessCategory, BusinessFormValues, FieldErrors } from '@/types'

interface Props {
  values: BusinessFormValues
  errors: FieldErrors<BusinessFormValues>
  onChange: (next: BusinessFormValues) => void
}

export function BusinessForm({ values, errors, onChange }: Props) {
  const set = <K extends keyof BusinessFormValues>(key: K, value: BusinessFormValues[K]) =>
    onChange({ ...values, [key]: value })

  return (
    <div className="space-y-5">
      <TextField label="Business name" value={values.business_name} onChange={(e) => set('business_name', e.target.value)} error={errors.business_name} maxLength={120} autoComplete="organization" />
      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField label="Business category" value={values.business_type} onChange={(e) => set('business_type', e.target.value as BusinessCategory)} error={errors.business_type}>
          {BUSINESS_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </SelectField>
        <SelectField label="Preferred language" value={values.preferred_language} onChange={(e) => set('preferred_language', e.target.value)} error={errors.preferred_language} hint="The language INSIA will use with your customers by default.">
          {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
        </SelectField>
      </div>
      {values.business_type === 'other' && (
        <TextField label="Your category" value={values.custom_business_type} onChange={(e) => set('custom_business_type', e.target.value)} error={errors.custom_business_type} maxLength={80} placeholder="For example: Dental laboratory" />
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <TextField label="Country" list="country-suggestions" value={values.country} onChange={(e) => set('country', e.target.value)} error={errors.country} maxLength={80} autoComplete="country-name" />
          <datalist id="country-suggestions">{COUNTRY_SUGGESTIONS.map((c) => <option key={c} value={c} />)}</datalist>
        </div>
        <TextField label="City" value={values.city} onChange={(e) => set('city', e.target.value)} error={errors.city} maxLength={80} autoComplete="address-level2" />
      </div>
      <TextAreaField label="Business description" value={values.description} onChange={(e) => set('description', e.target.value)} error={errors.description} maxLength={2000} hint="What you offer and who your customers are. INSIA will use this as its starting point." />
      <fieldset>
        <legend className="mb-3 text-sm font-medium">Contact information</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField label="Contact email" type="email" value={values.contact_email} onChange={(e) => set('contact_email', e.target.value)} error={errors.contact_email} autoComplete="email" />
          <TextField label="Contact phone" type="tel" value={values.contact_phone} onChange={(e) => set('contact_phone', e.target.value)} error={errors.contact_phone} autoComplete="tel" hint="Add at least an email or a phone number." />
        </div>
      </fieldset>
      <TextField label="Website" optional value={values.website} onChange={(e) => set('website', e.target.value)} error={errors.website} placeholder="example.com" autoComplete="url" />
    </div>
  )
}
