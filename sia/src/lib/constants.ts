import type { BusinessCategory, CatalogKindValue } from '@/types'

export const BUSINESS_CATEGORIES: { value: BusinessCategory; label: string }[] = [
  { value: 'hotel', label: 'Hotel' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'online_shop', label: 'Online shop' },
  { value: 'physical_shop', label: 'Physical shop' },
  { value: 'gym', label: 'Gym' },
  { value: 'car_rental', label: 'Car rental' },
  { value: 'travel_agency', label: 'Travel agency' },
  { value: 'real_estate', label: 'Real estate' },
  { value: 'beauty_salon', label: 'Beauty salon' },
  { value: 'clinic', label: 'Clinic' },
  { value: 'service_provider', label: 'Service provider' },
  { value: 'other', label: 'Other (enter your own)' },
]

export const LANGUAGES: { value: string; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'French' },
  { value: 'ar', label: 'Arabic' },
  { value: 'es', label: 'Spanish' },
  { value: 'de', label: 'German' },
  { value: 'it', label: 'Italian' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'tr', label: 'Turkish' },
]

export const COUNTRY_SUGGESTIONS = [
  'Algeria', 'Egypt', 'Jordan', 'Kuwait', 'Lebanon', 'Libya', 'Morocco', 'Oman', 'Qatar',
  'Saudi Arabia', 'Tunisia', 'United Arab Emirates', 'France', 'Germany', 'Italy', 'Spain',
  'Portugal', 'Turkey', 'United Kingdom', 'United States', 'Canada', 'Belgium', 'Netherlands',
  'Switzerland', 'Senegal', "Côte d'Ivoire",
]

export function categoryLabel(value: BusinessCategory, custom?: string | null): string {
  if (value === 'other' && custom) return custom
  return BUSINESS_CATEGORIES.find((c) => c.value === value)?.label ?? value
}

export function languageLabel(code: string): string {
  return LANGUAGES.find((l) => l.value === code)?.label ?? code
}

export const ROUTES = {
  home: '/',
  pricing: '/pricing',
  about: '/about',
  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  privacy: '/privacy',
  terms: '/terms',
  onboarding: '/onboarding',
  dashboard: '/dashboard',
} as const

export const CATALOG_KINDS: { value: CatalogKindValue; label: string }[] = [
  { value: 'product', label: 'Product' },
  { value: 'service', label: 'Service' },
  { value: 'room', label: 'Room' },
  { value: 'menu_item', label: 'Menu item' },
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'plan', label: 'Membership plan' },
]
