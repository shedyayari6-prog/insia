import { supabase } from '@/lib/supabase'
import { likePattern } from '@/lib/search'
import { dayBounds } from '@/lib/time'
import type { ConversationMessage, ConversationRow, ConversationStatus } from '@/types/widget'
import { ServiceError } from './auth'

export const PAGE_SIZE = 30

export interface ConversationFilters {
  search: string
  status: 'all' | ConversationStatus
  /** customers = every real channel (default), website, test = the owner's own test chats */
  source: 'customers' | 'website' | 'test'
  from: string
  to: string
}

export const DEFAULT_FILTERS: ConversationFilters = { search: '', status: 'all', source: 'customers', from: '', to: '' }

const COLUMNS =
  'id, business_id, channel, status, customer_name, customer_email, customer_phone, first_message, message_count, created_at, last_message_at, closed_at'

/** Conversations of ONE business (RLS also enforces this). Fetches one extra row to know if more exist. */
export async function listConversations(
  businessId: string, filters: ConversationFilters, page: number,
): Promise<{ rows: ConversationRow[]; hasMore: boolean }> {
  let ids: string[] = []
  const term = likePattern(filters.search)
  if (term) {
    const found = await supabase
      .from('messages').select('conversation_id').eq('business_id', businessId).ilike('original_content', `%${term}%`).limit(200)
    if (found.error) throw new ServiceError('Could not search conversations.')
    ids = [...new Set<string>((found.data ?? []).map((m: { conversation_id: string }) => m.conversation_id))]
  }

  let q = supabase.from('conversations').select(COLUMNS).eq('business_id', businessId)
  if (filters.status !== 'all') q = q.eq('status', filters.status)
  if (filters.source === 'customers') q = q.neq('channel', 'dashboard_test')
  else if (filters.source === 'website') q = q.eq('channel', 'website')
  else q = q.eq('channel', 'dashboard_test')
  const from = dayBounds(filters.from)
  const to = dayBounds(filters.to)
  if (from) q = q.gte('last_message_at', from.start)
  if (to) q = q.lte('last_message_at', to.end)
  if (term) {
    const parts = [`first_message.ilike.%${term}%`, `customer_name.ilike.%${term}%`, `customer_email.ilike.%${term}%`, `customer_phone.ilike.%${term}%`]
    if (ids.length) parts.push(`id.in.(${ids.join(',')})`)
    q = q.or(parts.join(','))
  }
  const start = page * PAGE_SIZE
  const { data, error } = await q.order('last_message_at', { ascending: false }).range(start, start + PAGE_SIZE)
  if (error) throw new ServiceError('Could not load conversations.')
  const rows = (data ?? []) as ConversationRow[]
  return { rows: rows.slice(0, PAGE_SIZE), hasMore: rows.length > PAGE_SIZE }
}

export async function getConversation(businessId: string, id: string): Promise<ConversationRow | null> {
  const { data, error } = await supabase.from('conversations').select(COLUMNS).eq('id', id).eq('business_id', businessId).maybeSingle()
  if (error) throw new ServiceError('Could not load the conversation.')
  return data as ConversationRow | null
}

export async function listConversationMessages(businessId: string, conversationId: string): Promise<ConversationMessage[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('id, sender_type, original_content, detected_language, response_status, created_at')
    .eq('business_id', businessId).eq('conversation_id', conversationId)
    .order('created_at', { ascending: true }).limit(500)
  if (error) throw new ServiceError('Could not load the messages.')
  return (data ?? []) as ConversationMessage[]
}

export async function setConversationStatus(businessId: string, id: string, status: ConversationStatus): Promise<void> {
  const { error } = await supabase
    .from('conversations')
    .update({ status, closed_at: status === 'closed' ? new Date().toISOString() : null })
    .eq('id', id).eq('business_id', businessId)
  if (error) throw new ServiceError(status === 'closed' ? 'Could not close the conversation.' : 'Could not reopen the conversation.')
}
