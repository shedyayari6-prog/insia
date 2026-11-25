export type WidgetPosition = 'bottom-right' | 'bottom-left'
export type GreetingLanguage = 'auto' | 'en' | 'fr' | 'ar'

export interface WidgetSettingsRow {
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
  created_at: string
  updated_at: string
}

/** Editable form state. Text fields are plain strings so inputs stay controlled. */
export interface WidgetFormValues {
  enabled: boolean
  primary_color: string
  position: WidgetPosition
  bot_name: string
  welcome_message: string
  greeting_language: GreetingLanguage
  starter_questions: string[]
  logo_url: string | null
  show_status: boolean
  status_text: string
  allowed_domains: string
}

export type ConversationStatus = 'open' | 'closed'
export type ConversationChannel = 'dashboard_test' | 'website' | 'whatsapp' | 'instagram' | 'messenger' | 'api'

export interface ConversationRow {
  id: string
  business_id: string
  channel: ConversationChannel
  status: ConversationStatus
  customer_name: string | null
  customer_email: string | null
  customer_phone: string | null
  first_message: string | null
  message_count: number
  created_at: string
  last_message_at: string
  closed_at: string | null
}

export interface ConversationMessage {
  id: string
  sender_type: 'customer' | 'bot' | 'owner'
  original_content: string
  detected_language: string | null
  response_status: 'answered' | 'partial' | 'clarification' | 'fallback' | null
  created_at: string
}
