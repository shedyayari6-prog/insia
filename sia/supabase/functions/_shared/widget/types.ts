import type { ConversationContext, EngineData, ResponseStatus } from '../engine/types.ts'

export type WidgetPosition = 'bottom-right' | 'bottom-left'
export type GreetingLanguage = 'auto' | 'en' | 'fr' | 'ar'

/** Widget row as the server sees it (never sent to browsers as-is). */
export interface WidgetSettings {
  business_id: string
  public_key: string
  enabled: boolean
  primary_color: string
  position: WidgetPosition
  bot_name: string | null
  welcome_message: string | null
  greeting_language: GreetingLanguage
  starter_questions: string[]
  logo_url: string | null
  show_status: boolean
  status_text: string
  allowed_domains: string[]
  business_name: string
}

/** The only fields a visitor's browser may receive. */
export interface PublicWidgetConfig {
  display_name: string
  business_name: string
  primary_color: string
  position: WidgetPosition
  welcome_message: string | null
  greeting_language: GreetingLanguage
  starter_questions: string[]
  logo_url: string | null
  show_status: boolean
  status_text: string
}

export interface StoredConversation {
  id: string
  business_id: string
  session_hash: string | null
  status: 'open' | 'closed'
  context: unknown
  message_count: number
}

export interface StoredMessage { sender_type: 'customer' | 'bot' | 'owner'; original_content: string; created_at: string }

export interface ExchangeInput {
  conversation: StoredConversation
  customerText: string
  normalized: string
  language: string
  reply: string
  status: ResponseStatus
  metadata: Record<string, unknown>
  context: ConversationContext
  now: Date
}

export interface ContactDetails { name?: string; email?: string; phone?: string }

/** Everything the handler needs from persistence. Implemented over Supabase and in memory. */
export interface WidgetStore {
  getWidgetByKey(key: string): Promise<WidgetSettings | null>
  getConversation(id: string, businessId: string): Promise<StoredConversation | null>
  createConversation(input: { business_id: string; session_hash: string; first_message: string }): Promise<StoredConversation>
  loadEngineData(businessId: string): Promise<EngineData>
  appendExchange(input: ExchangeInput): Promise<void>
  listMessages(conversationId: string, businessId: string, limit: number): Promise<StoredMessage[]>
  setContact(conversationId: string, businessId: string, contact: ContactDetails): Promise<void>
  closeConversation(conversationId: string, businessId: string): Promise<void>
  /** Returns true when the call is within the limit. */
  rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean>
}

export interface WidgetRequest {
  method: string
  query: Record<string, string | undefined>
  body: unknown
  origin: string | null
  ip: string | null
}

export interface WidgetResponse {
  status: number
  body: unknown
  headers?: Record<string, string>
}

export interface HandlerDeps {
  store: WidgetStore
  /** SHA-256 hex of a string. Injected so this module stays free of runtime-specific APIs. */
  hash: (input: string) => Promise<string>
  now?: () => Date
  log?: (error: unknown) => void
}
