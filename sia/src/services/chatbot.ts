import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { DebugInfo, ResponseStatus, Source } from '../../supabase/functions/_shared/engine/types'
import { ServiceError } from './auth'

export interface ChatbotReply {
  reply: string
  status: ResponseStatus
  conversation_id: string
  language: string
  confidence: string
  sources: Source[]
  debug?: DebugInfo
}

/** Sends a message to the same backend engine that future channels will use. */
export async function sendTestMessage(businessId: string, message: string, conversationId: string | null): Promise<ChatbotReply> {
  const { data, error } = await supabase.functions.invoke('chatbot-process', {
    body: { business_id: businessId, conversation_id: conversationId, message, debug: true },
  })
  if (error) {
    if (error instanceof FunctionsHttpError) {
      let detail = 'The chatbot could not process this message.'
      try {
        const body = (await error.context.json()) as { error?: string; detail?: string }
        if (body.error) detail = body.detail ? `${body.error} (${body.detail})` : body.error
      } catch { /* keep the generic message */ }
      throw new ServiceError(detail)
    }
    if (error instanceof FunctionsFetchError) {
      throw new ServiceError('Could not reach the chatbot service. Make sure the chatbot-process function is deployed.')
    }
    throw new ServiceError('The chatbot service returned an unexpected error.')
  }
  return data as ChatbotReply
}
