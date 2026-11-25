// WidgetStore backed by Supabase. Used ONLY by the public widget Edge Functions, with the service-role
// key that exists only inside the function runtime (never in the browser).
// Because the service role bypasses RLS, every query below filters by business_id explicitly,
// and conversations are additionally bound to the visitor's session hash.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { loadEngineData } from './loadEngineData.ts'
import type { EngineData } from './engine/types.ts'
import type {
  ContactDetails, ExchangeInput, StoredConversation, StoredMessage, WidgetSettings, WidgetStore,
} from './widget/types.ts'

const CONVERSATION_COLUMNS = 'id, business_id, session_hash, status, context, message_count'
const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])

export class SupabaseWidgetStore implements WidgetStore {
  constructor(private db: SupabaseClient) {}

  async getWidgetByKey(key: string): Promise<WidgetSettings | null> {
    const { data, error } = await this.db
      .from('widget_settings').select('*, businesses(business_name)').eq('public_key', key).maybeSingle()
    if (error) throw error
    if (!data) return null
    const b = data.businesses as { business_name: string } | { business_name: string }[] | null
    const businessName = (Array.isArray(b) ? b[0]?.business_name : b?.business_name) ?? ''
    return {
      business_id: data.business_id, public_key: data.public_key, enabled: data.enabled, primary_color: data.primary_color,
      position: data.position, bot_name: data.bot_name, welcome_message: data.welcome_message, greeting_language: data.greeting_language,
      starter_questions: strings(data.starter_questions), logo_url: data.logo_url, show_status: data.show_status,
      status_text: data.status_text, allowed_domains: strings(data.allowed_domains), business_name: businessName,
    }
  }

  async getConversation(id: string, businessId: string): Promise<StoredConversation | null> {
    const { data, error } = await this.db
      .from('conversations').select(CONVERSATION_COLUMNS).eq('id', id).eq('business_id', businessId).eq('channel', 'website').maybeSingle()
    if (error) throw error
    return data as StoredConversation | null
  }

  async createConversation(input: { business_id: string; session_hash: string; first_message: string }): Promise<StoredConversation> {
    const { data, error } = await this.db
      .from('conversations')
      .insert({ business_id: input.business_id, channel: 'website', session_hash: input.session_hash, first_message: input.first_message, status: 'open' })
      .select(CONVERSATION_COLUMNS).single()
    if (error) throw error
    return data as StoredConversation
  }

  loadEngineData(businessId: string): Promise<EngineData> {
    return loadEngineData(this.db, businessId)
  }

  async appendExchange(input: ExchangeInput): Promise<void> {
    const { conversation: conv } = input
    const t0 = input.now
    const t1 = new Date(t0.getTime() + 1)
    const { error: msgError } = await this.db.from('messages').insert([
      {
        conversation_id: conv.id, business_id: conv.business_id, sender_type: 'customer', original_content: input.customerText,
        normalized_content: input.normalized, detected_language: input.language, metadata: {}, created_at: t0.toISOString(),
      },
      {
        conversation_id: conv.id, business_id: conv.business_id, sender_type: 'bot', original_content: input.reply,
        detected_language: input.language, response_status: input.status, metadata: input.metadata, created_at: t1.toISOString(),
      },
    ])
    if (msgError) throw msgError
    const { error } = await this.db.from('conversations')
      .update({ context: input.context, last_message_at: t1.toISOString(), message_count: conv.message_count + 2 })
      .eq('id', conv.id).eq('business_id', conv.business_id)
    if (error) throw error
  }

  async listMessages(conversationId: string, businessId: string, limit: number): Promise<StoredMessage[]> {
    const { data, error } = await this.db
      .from('messages').select('sender_type, original_content, created_at')
      .eq('conversation_id', conversationId).eq('business_id', businessId).order('created_at', { ascending: true }).limit(limit)
    if (error) throw error
    return (data ?? []) as StoredMessage[]
  }

  async setContact(conversationId: string, businessId: string, contact: ContactDetails): Promise<void> {
    const patch: Record<string, string> = {}
    if (contact.name) patch.customer_name = contact.name
    if (contact.email) patch.customer_email = contact.email
    if (contact.phone) patch.customer_phone = contact.phone
    if (!Object.keys(patch).length) return
    const { error } = await this.db.from('conversations').update(patch).eq('id', conversationId).eq('business_id', businessId)
    if (error) throw error
  }

  async closeConversation(conversationId: string, businessId: string): Promise<void> {
    const { error } = await this.db.from('conversations')
      .update({ status: 'closed', closed_at: new Date().toISOString() }).eq('id', conversationId).eq('business_id', businessId)
    if (error) throw error
  }

  async rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
    const { data, error } = await this.db.rpc('check_rate_limit', { p_key: key, p_limit: limit, p_window_seconds: windowSeconds })
    if (error) throw error
    return data === true
  }
}
