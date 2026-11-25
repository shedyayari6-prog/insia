import { processMessage } from '../engine/pipeline/process.ts'
import type { HandlerDeps, StoredConversation, WidgetRequest, WidgetResponse, WidgetSettings } from './types.ts'
import {
  LIMITS, cleanMessage, isValidId, isValidPublicKey, isValidSessionToken, originAllowed, sanitizeContact, toPublicConfig,
} from './helpers.ts'

const json = (status: number, body: unknown, headers?: Record<string, string>): WidgetResponse => ({ status, body, headers })
const NOT_FOUND = json(404, { error: 'Chat is not available.' })
const FORBIDDEN = json(403, { error: 'This website is not allowed to show this chat.' })
const TOO_MANY = json(429, { error: 'You are sending messages too quickly. Please wait a moment and try again.', code: 'rate_limited' })
const GENERIC = json(500, { error: 'Something went wrong. Please try again.' })

/** GET: the browser-safe configuration of one widget, found by its public key. */
export async function handleConfig(req: WidgetRequest, deps: HandlerDeps): Promise<WidgetResponse> {
  try {
    if (req.method !== 'GET') return json(405, { error: 'Method not allowed.' })
    const key = req.query.key
    if (!isValidPublicKey(key)) return NOT_FOUND
    const widget = await deps.store.getWidgetByKey(key)
    if (!widget || !widget.enabled) return NOT_FOUND
    if (!originAllowed(req.origin, widget.allowed_domains)) return FORBIDDEN
    return json(200, toPublicConfig(widget), { 'Cache-Control': 'public, max-age=60', Vary: 'Origin' })
  } catch (error) {
    deps.log?.(error)
    return GENERIC
  }
}

/** POST: message | history | contact | end. The business is derived from the public key, never from the client. */
export async function handleChat(req: WidgetRequest, deps: HandlerDeps): Promise<WidgetResponse> {
  try {
    return await chat(req, deps)
  } catch (error) {
    deps.log?.(error)
    return GENERIC
  }
}

async function chat(req: WidgetRequest, deps: HandlerDeps): Promise<WidgetResponse> {
  const { store, hash } = deps
  const now = deps.now ?? (() => new Date())
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed.' })
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) return json(400, { error: 'Invalid request.' })
  const body = req.body as Record<string, unknown>

  const action = body.action === undefined ? 'message' : body.action
  if (action !== 'message' && action !== 'history' && action !== 'contact' && action !== 'end') return json(400, { error: 'Invalid request.' })
  if (!isValidPublicKey(body.public_key)) return NOT_FOUND
  if (!isValidSessionToken(body.session_token)) return json(400, { error: 'Invalid session.' })
  if (body.conversation_id !== undefined && body.conversation_id !== null && !isValidId(body.conversation_id)) return json(400, { error: 'Invalid request.' })

  // The business comes from the validated public key.
  const widget: WidgetSettings | null = await store.getWidgetByKey(body.public_key)
  if (!widget || !widget.enabled) return NOT_FOUND
  if (!originAllowed(req.origin, widget.allowed_domains)) return FORBIDDEN

  const sessionHash = await hash(body.session_token)

  // Throttling: per session, per network address (hashed, never stored raw), and per business.
  const sessionLimit = action === 'message' ? LIMITS.perSessionPerMinute : LIMITS.perSessionOtherPerMinute
  if (!(await store.rateLimit(`s:${sessionHash}:${action === 'message' ? 'm' : 'o'}`, sessionLimit, 60))) return TOO_MANY
  if (req.ip && !(await store.rateLimit(`i:${await hash(`ip:${req.ip}`)}`, LIMITS.perIpPerMinute, 60))) return TOO_MANY
  if (action === 'message' && !(await store.rateLimit(`b:${widget.business_id}`, LIMITS.perBusinessPerHour, 3600))) return TOO_MANY

  // A conversation is reachable only with the session token that created it, inside this business.
  let conv: StoredConversation | null = null
  if (typeof body.conversation_id === 'string') {
    conv = await store.getConversation(body.conversation_id, widget.business_id)
    if (!conv || conv.session_hash !== sessionHash) return json(404, { error: 'Conversation not found.', code: 'conversation_not_found' })
  }

  if (action === 'history') {
    if (!conv) return json(200, { messages: [], status: 'none' })
    const messages = await store.listMessages(conv.id, widget.business_id, LIMITS.historyLimit)
    return json(200, {
      status: conv.status,
      messages: messages.map((m) => ({ role: m.sender_type === 'customer' ? 'customer' : 'bot', text: m.original_content, at: m.created_at })),
    })
  }

  if (action === 'end') {
    if (conv) await store.closeConversation(conv.id, widget.business_id)
    return json(200, { ok: true })
  }

  if (action === 'contact') {
    if (!conv) return json(400, { error: 'Send a message first, then you can share your contact details.' })
    const parsed = sanitizeContact(body.contact)
    if (!parsed.ok) return json(400, { error: parsed.error })
    await store.setContact(conv.id, widget.business_id, parsed.contact)
    return json(200, { ok: true })
  }

  // ---- message
  const message = cleanMessage(body.message)
  if (!message.ok) return json(400, { error: message.error })
  if (conv?.status === 'closed') return json(409, { error: 'This conversation was closed.', code: 'conversation_closed' })
  if (conv && conv.message_count >= LIMITS.maxConversationMessages) {
    return json(409, { error: 'This conversation is full. Please start a new one.', code: 'conversation_full' })
  }

  // The SAME engine as the dashboard test and every future channel.
  const data = await store.loadEngineData(widget.business_id)
  const result = processMessage({ message: message.text, data, context: conv?.context ?? null, now: now() })

  const conversation = conv ?? await store.createConversation({
    business_id: widget.business_id, session_hash: sessionHash, first_message: message.text.slice(0, 200),
  })
  await store.appendExchange({
    conversation, customerText: message.text, normalized: result.normalized.slice(0, 4000), language: result.language,
    reply: result.reply, status: result.status, context: result.context, now: now(),
    metadata: { intents: result.intents, confidence: result.confidence, sources: result.sources.map((s) => ({ type: s.type, id: s.id })) },
  })

  // Visitors get the reply only: no debug, no sources, no confidence details.
  return json(200, { reply: result.reply, status: result.status, conversation_id: conversation.id, language: result.language })
}
