import type { EngineData } from '../engine/types.ts'
import type {
  ContactDetails, ExchangeInput, StoredConversation, StoredMessage, WidgetSettings, WidgetStore,
} from './types.ts'

export interface MemoryConversation extends StoredConversation {
  channel: 'website'
  first_message: string | null
  customer_name?: string
  customer_email?: string
  customer_phone?: string
  last_message_at: string
}

export interface MemoryMessage extends StoredMessage { conversation_id: string; business_id: string }

/** In-memory WidgetStore for tests and the local mock server. Same contract as the Supabase store. */
export class MemoryStore implements WidgetStore {
  conversations = new Map<string, MemoryConversation>()
  messages: MemoryMessage[] = []
  private counters = new Map<string, { window: number; count: number }>()
  private seq = 0

  constructor(
    private widgets: WidgetSettings[],
    private businesses: Record<string, () => EngineData>,
    private clock: () => Date = () => new Date(),
  ) {}

  async getWidgetByKey(key: string): Promise<WidgetSettings | null> {
    return this.widgets.find((w) => w.public_key === key) ?? null
  }

  async getConversation(id: string, businessId: string): Promise<StoredConversation | null> {
    const c = this.conversations.get(id)
    return c && c.business_id === businessId ? { ...c } : null
  }

  async createConversation(input: { business_id: string; session_hash: string; first_message: string }): Promise<StoredConversation> {
    this.seq += 1
    const id = `00000000-0000-4000-8000-${this.seq.toString(16).padStart(12, '0')}`
    const conv: MemoryConversation = {
      id, business_id: input.business_id, session_hash: input.session_hash, status: 'open', context: {}, message_count: 0,
      channel: 'website', first_message: input.first_message, last_message_at: this.clock().toISOString(),
    }
    this.conversations.set(id, conv)
    return { ...conv }
  }

  async loadEngineData(businessId: string): Promise<EngineData> {
    const make = this.businesses[businessId]
    if (!make) throw new Error(`unknown business ${businessId}`)
    return make()
  }

  async appendExchange(input: ExchangeInput): Promise<void> {
    const conv = this.conversations.get(input.conversation.id)
    if (!conv || conv.business_id !== input.conversation.business_id) throw new Error('conversation mismatch')
    const at = input.now.toISOString()
    this.messages.push(
      { conversation_id: conv.id, business_id: conv.business_id, sender_type: 'customer', original_content: input.customerText, created_at: at },
      { conversation_id: conv.id, business_id: conv.business_id, sender_type: 'bot', original_content: input.reply, created_at: new Date(input.now.getTime() + 1).toISOString() },
    )
    conv.context = input.context
    conv.message_count += 2
    conv.last_message_at = at
  }

  async listMessages(conversationId: string, businessId: string, limit: number): Promise<StoredMessage[]> {
    return this.messages
      .filter((m) => m.conversation_id === conversationId && m.business_id === businessId)
      .slice(0, limit)
      .map(({ sender_type, original_content, created_at }) => ({ sender_type, original_content, created_at }))
  }

  async setContact(conversationId: string, businessId: string, contact: ContactDetails): Promise<void> {
    const c = this.conversations.get(conversationId)
    if (!c || c.business_id !== businessId) return
    if (contact.name) c.customer_name = contact.name
    if (contact.email) c.customer_email = contact.email
    if (contact.phone) c.customer_phone = contact.phone
  }

  async closeConversation(conversationId: string, businessId: string): Promise<void> {
    const c = this.conversations.get(conversationId)
    if (c && c.business_id === businessId) c.status = 'closed'
  }

  async rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
    const window = Math.floor(this.clock().getTime() / 1000 / windowSeconds)
    const entry = this.counters.get(key)
    if (!entry || entry.window !== window) {
      this.counters.set(key, { window, count: 1 })
      return true
    }
    entry.count += 1
    return entry.count <= limit
  }
}
