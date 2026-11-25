export type BusinessCategory =
  | 'hotel'
  | 'restaurant'
  | 'online_shop'
  | 'physical_shop'
  | 'gym'
  | 'car_rental'
  | 'travel_agency'
  | 'real_estate'
  | 'beauty_salon'
  | 'clinic'
  | 'service_provider'
  | 'other'

export interface ProfilePreferences {
  product_updates?: boolean
}

export interface Profile {
  id: string
  full_name: string | null
  preferences: ProfilePreferences
  created_at: string
  updated_at: string
}

export interface ContactInformation {
  email?: string
  phone?: string
}

export interface Business {
  id: string
  owner_id: string
  business_name: string
  business_type: BusinessCategory
  custom_business_type: string | null
  country: string
  city: string
  description: string
  preferred_language: string
  contact_information: ContactInformation
  website: string | null
  onboarding_completed: boolean
  onboarding_step: number
  created_at: string
  updated_at: string
}

/** Fields the owner edits in onboarding and in Business Profile. */
export interface BusinessFormValues {
  business_name: string
  business_type: BusinessCategory
  custom_business_type: string
  country: string
  city: string
  description: string
  preferred_language: string
  contact_email: string
  contact_phone: string
  website: string
}

export type FieldErrors<T> = Partial<Record<keyof T, string>>

// ---------- Phase 2: knowledge ----------
export type Verification = 'verified' | 'incomplete' | 'needs_input'
export type QuestionStatus = 'active' | 'disabled'

export interface BusinessFact {
  id: string
  business_id: string
  key: string | null
  label: string
  value: string
  verified: boolean
  created_at: string
  updated_at: string
}

export interface KnowledgeAnswer {
  id: string
  business_id: string
  question_id: string
  language: string
  answer_text: string
}

export interface KnowledgeAlias {
  id: string
  business_id: string
  question_id: string
  phrase: string
}

export interface KnowledgeQuestion {
  id: string
  business_id: string
  question: string
  status: QuestionStatus
  verification: Verification
  template_key: string | null
  created_at: string
  updated_at: string
  knowledge_answers: KnowledgeAnswer[]
  knowledge_aliases: KnowledgeAlias[]
}

export interface BusinessInstruction {
  id: string
  business_id: string
  instruction: string
  enabled: boolean
  created_at: string
}

export interface VocabularyEntry {
  id: string
  business_id: string
  term: string
  meaning: string
  notes: string | null
  created_at: string
}

// ---------- Phase 3: catalog ----------
export type CatalogKindValue = 'product' | 'service' | 'room' | 'menu_item' | 'vehicle' | 'plan'

export interface CatalogVariantRow {
  id: string
  business_id: string
  item_id: string
  color: string | null
  size: string | null
  price: number | null
  stock_quantity: number | null
  available: boolean
}

export interface CatalogItemRow {
  id: string
  business_id: string
  kind: CatalogKindValue
  name: string
  description: string | null
  price: number | null
  currency: string
  price_unit: string | null
  duration_text: string | null
  active: boolean
  catalog_item_aliases: { id: string; alias: string }[]
  catalog_variants: CatalogVariantRow[]
}
