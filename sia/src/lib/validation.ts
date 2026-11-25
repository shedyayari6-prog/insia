import type { BusinessFormValues, FieldErrors } from '@/types'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim())
}

export function normalizeWebsite(value: string): string {
  const v = value.trim()
  if (!v) return ''
  return /^https?:\/\//i.test(v) ? v : `https://${v}`
}

export function validateBusiness(v: BusinessFormValues): FieldErrors<BusinessFormValues> {
  const e: FieldErrors<BusinessFormValues> = {}
  if (!v.business_name.trim()) e.business_name = 'Enter your business name.'
  if (v.business_name.trim().length > 120) e.business_name = 'Use 120 characters or fewer.'
  if (v.business_type === 'other' && !v.custom_business_type.trim())
    e.custom_business_type = 'Enter your business category.'
  if (!v.country.trim()) e.country = 'Enter a country.'
  if (!v.city.trim()) e.city = 'Enter a city.'
  if (!v.preferred_language) e.preferred_language = 'Choose a language.'
  if (!v.description.trim()) e.description = 'Describe your business in a few sentences.'
  if (v.description.length > 2000) e.description = 'Use 2,000 characters or fewer.'
  const email = v.contact_email.trim()
  const phone = v.contact_phone.trim()
  if (!email && !phone) e.contact_email = 'Enter an email address or a phone number.'
  if (email && !isEmail(email)) e.contact_email = 'Enter a valid email address.'
  if (phone && !/^[+\d][\d\s().-]{5,24}$/.test(phone)) e.contact_phone = 'Enter a valid phone number.'
  if (v.website.trim()) {
    try {
      new URL(normalizeWebsite(v.website))
    } catch {
      e.website = 'Enter a valid website address.'
    }
  }
  return e
}
