// Shared engine types. Pure TypeScript: no Deno, browser or Supabase imports.

export type Lang = 'en' | 'fr' | 'ar' | 'derja'
export type Script = 'latin' | 'arabic' | 'mixed' | 'none'
export type Confidence = 'HIGH' | 'MEDIUM' | 'LOW'
export type ResponseStatus = 'answered' | 'partial' | 'clarification' | 'fallback'

export type IntentName =
  | 'GREETING' | 'GOODBYE' | 'THANKS' | 'HELP' | 'GENERAL_QUESTION' | 'UNKNOWN'
  | 'ASK_LOCATION' | 'ASK_CONTACT' | 'ASK_OPENING_HOURS' | 'ASK_CLOSING_HOURS'
  | 'ASK_BUSINESS_DESCRIPTION' | 'ASK_FACILITIES' | 'ASK_POLICIES'
  | 'ASK_PRICE' | 'ASK_AVAILABILITY' | 'ASK_STOCK' | 'ASK_PRODUCT_DETAILS' | 'ASK_SERVICE_DETAILS'
  | 'ASK_DELIVERY' | 'ASK_PAYMENT_METHOD' | 'ASK_DISCOUNT' | 'PURCHASE_INTENT'
  | 'ASK_ROOM_TYPES' | 'ASK_ROOM_PRICE' | 'ASK_ROOM_AVAILABILITY' | 'ASK_ROOM_COUNT'
  | 'RESERVATION_INTENT' | 'ASK_CHECK_IN' | 'ASK_CHECK_OUT'
  | 'APPOINTMENT_INTENT' | 'ASK_SERVICE_DURATION' | 'ASK_REQUIREMENTS'

export type MatchMethod = 'exact' | 'loose' | 'skeleton' | 'fuzzy' | 'vocabulary'

// ------------------------------------------------------------------ data snapshot
export interface BusinessRecord {
  id: string
  business_name: string
  business_type: string
  custom_business_type: string | null
  country: string
  city: string
  description: string
  preferred_language: string
  contact_information: { email?: string; phone?: string }
  website: string | null
}
export interface FactRecord { id: string; key: string | null; label: string; value: string; verified: boolean }
export interface ApprovedAnswer {
  question_id: string
  question: string
  aliases: string[]
  answer: string
  template_key: string | null
  verification: 'verified' | 'incomplete' | 'needs_input'
}
export type CatalogKind = 'product' | 'service' | 'room' | 'menu_item' | 'vehicle' | 'plan'
export interface VariantRecord {
  id: string
  color: string | null
  size: string | null
  price: number | null
  stock_quantity: number | null // null = stock not tracked
  available: boolean
}
export interface CatalogItem {
  id: string
  kind: CatalogKind
  name: string
  description: string | null
  price: number | null
  currency: string
  price_unit: string | null
  duration_text: string | null
  aliases: string[]
  variants: VariantRecord[]
}
export interface VocabularyRecord { id: string; term: string; meaning: string }
export interface InstructionRecord { id: string; instruction: string }

/** Everything the engine may read for ONE business. Built by the caller under RLS. */
export interface EngineData {
  business: BusinessRecord
  facts: FactRecord[]
  answers: ApprovedAnswer[]
  catalog: CatalogItem[]
  vocabulary: VocabularyRecord[]
  instructions: InstructionRecord[]
}

// ------------------------------------------------------------------ pipeline artefacts
export interface Token { text: string; index: number }

export interface NormalizedMessage {
  original: string
  normalized: string
  script: Script
  tokens: Token[]
}

export interface ConceptMatch {
  concept: string
  phrase: string
  tokenStart: number
  tokenEnd: number // exclusive
  similarity: number
  method: MatchMethod
}

export interface VocabularyExpansion { term: string; meaning: string; tokenIndex: number }

export interface LanguageResult {
  language: Lang | 'unknown'
  scores: Record<Lang, number>
  mixed: boolean
}

export interface IntentResult {
  name: IntentName
  confidence: Confidence
  position: number
  trigger: string
  /** Optional topic refinement, e.g. 'cancellation' | 'returns' | 'delivery_cost'. */
  topic?: string
}

export type EntityType =
  | 'PRODUCT' | 'SERVICE' | 'ROOM_CATEGORY' | 'MENU_ITEM' | 'VEHICLE' | 'MEMBERSHIP_PLAN'
  | 'COLOR' | 'SIZE' | 'DATE' | 'TIME' | 'PEOPLE' | 'LOCATION' | 'FACILITY'

export interface Entity {
  type: EntityType
  value: string
  /** Catalog item id for item entities. */
  refId?: string
  confidence: Confidence
  similarity: number
  fromContext?: boolean
  detail?: Record<string, string | number>
}

export interface Ambiguity { options: { id: string; name: string }[] }

export interface EntityResult {
  entities: Entity[]
  item: Entity | null
  ambiguity: Ambiguity | null
}

export interface Source {
  type: 'approved_answer' | 'fact' | 'catalog_item' | 'variant' | 'business'
  id: string
  label: string
}

export interface ConversationContext {
  lastItemId?: string
  lastItemName?: string
  lastItemKind?: CatalogKind
  lastColor?: string
  lastSize?: string
  lastIntents: IntentName[]
  pending?: { options: { id: string; name: string }[]; intents: IntentName[] }
  updatedAt: string
}

export interface DebugInfo {
  original: string
  normalized: string
  script: Script
  language: LanguageResult
  tokens: string[]
  vocabularyExpansions: VocabularyExpansion[]
  concepts: ConceptMatch[]
  intents: IntentResult[]
  entities: Entity[]
  sources: Source[]
  instructions: { applied: string[]; recorded: string[] }
  contextUsed: boolean
  spellingSimilarity: number
  confidence: { intent: Confidence; entity: Confidence; overall: Confidence }
  parts: { intent: IntentName; outcome: string; confidence: Confidence }[]
}

export interface ProcessResult {
  reply: string
  status: ResponseStatus
  language: Lang
  confidence: Confidence
  intents: IntentName[]
  sources: Source[]
  context: ConversationContext
  normalized: string
  debug: DebugInfo
}
