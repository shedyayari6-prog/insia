import { supabase } from '@/lib/supabase'
import { normalizeWebsite } from '@/lib/validation'
import type { Business, BusinessFormValues } from '@/types'
import { ServiceError } from './auth'

export async function getMyBusiness(ownerId: string): Promise<Business | null> {
  const { data, error } = await supabase.from('businesses').select('*').eq('owner_id', ownerId).maybeSingle()
  if (error) throw new ServiceError('Could not load your business.')
  return data as Business | null
}

export function toRow(v: BusinessFormValues) {
  const email = v.contact_email.trim()
  const phone = v.contact_phone.trim()
  const website = normalizeWebsite(v.website)
  return {
    business_name: v.business_name.trim(),
    business_type: v.business_type,
    custom_business_type: v.business_type === 'other' ? v.custom_business_type.trim() : null,
    country: v.country.trim(),
    city: v.city.trim(),
    description: v.description.trim(),
    preferred_language: v.preferred_language,
    contact_information: {
      ...(email ? { email } : {}),
      ...(phone ? { phone } : {}),
    },
    website: website || null,
  }
}

export function toFormValues(b: Business | null): BusinessFormValues {
  return {
    business_name: b?.business_name ?? '',
    business_type: b?.business_type ?? 'hotel',
    custom_business_type: b?.custom_business_type ?? '',
    country: b?.country ?? '',
    city: b?.city ?? '',
    description: b?.description ?? '',
    preferred_language: b?.preferred_language ?? 'en',
    contact_email: b?.contact_information.email ?? '',
    contact_phone: b?.contact_information.phone ?? '',
    website: b?.website ?? '',
  }
}

/** Creates the owner's business or updates it. Access is enforced by RLS. */
export async function saveBusiness(
  ownerId: string,
  values: BusinessFormValues,
  onboardingCompleted: boolean,
): Promise<Business> {
  const { data, error } = await supabase
    .from('businesses')
    .upsert(
      { owner_id: ownerId, ...toRow(values), onboarding_completed: onboardingCompleted },
      { onConflict: 'owner_id' },
    )
    .select('*')
    .single()
  if (error) throw new ServiceError('Could not save your business. Check the details and try again.')
  return data as Business
}

export async function completeOnboarding(business: Business): Promise<Business> {
  const { data, error } = await supabase
    .from('businesses')
    .update({ onboarding_completed: true, onboarding_step: 5 })
    .eq('id', business.id)
    .select('*')
    .single()
  if (error) throw new ServiceError('Could not finish setup. Try again.')
  return data as Business
}

export async function updateOnboardingStep(businessId: string, step: number): Promise<Business> {
  const { data, error } = await supabase
    .from('businesses')
    .update({ onboarding_step: step })
    .eq('id', businessId)
    .select('*')
    .single()
  if (error) throw new ServiceError('Could not save your progress. Try again.')
  return data as Business
}
