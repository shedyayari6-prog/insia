import type { ConversationContext, EngineData, EntityResult, IntentName, IntentResult, Entity } from '../types.ts'
import { ITEM_INTENTS, isSocial } from '../intents/recognize.ts'

/** Context older than this is ignored, so stale references never leak into a new topic. */
export const CONTEXT_TTL_MS = 30 * 60 * 1000

export function emptyContext(now: Date): ConversationContext {
  return { lastIntents: [], updatedAt: now.toISOString() }
}

/** Validates stored context (jsonb from the database is untrusted) and applies the expiry. */
export function loadContext(raw: unknown, now: Date): ConversationContext | null {
  if (!raw || typeof raw !== 'object') return null
  const c = raw as Partial<ConversationContext>
  if (typeof c.updatedAt !== 'string') return null
  const age = now.getTime() - Date.parse(c.updatedAt)
  if (!Number.isFinite(age) || age > CONTEXT_TTL_MS || age < -60_000) return null
  return {
    lastItemId: typeof c.lastItemId === 'string' ? c.lastItemId : undefined,
    lastItemName: typeof c.lastItemName === 'string' ? c.lastItemName : undefined,
    lastItemKind: c.lastItemKind,
    lastColor: typeof c.lastColor === 'string' ? c.lastColor : undefined,
    lastSize: typeof c.lastSize === 'string' ? c.lastSize : undefined,
    lastIntents: Array.isArray(c.lastIntents) ? (c.lastIntents.filter((x) => typeof x === 'string') as IntentName[]) : [],
    pending: c.pending && Array.isArray(c.pending.options) ? c.pending : undefined,
    updatedAt: c.updatedAt,
  }
}

export interface ContextResolution {
  entities: EntityResult
  /** Intents carried over from a clarification question the customer just answered. */
  carriedIntents: IntentName[]
  used: boolean
}

/**
 * Resolves references like "How much?" against the previous turn.
 * 1) A pending clarification ("Which one?") is answered by naming one of the options.
 * 2) An item-needing question with no item takes the last item of this conversation.
 * Only items that still exist in THIS business's catalog are ever reused.
 */
export function resolveWithContext(
  ctx: ConversationContext | null,
  entities: EntityResult,
  intents: IntentResult[],
  data: EngineData,
): ContextResolution {
  const none: ContextResolution = { entities, carriedIntents: [], used: false }
  if (!ctx) return none
  const exists = (id: string) => data.catalog.some((c) => c.id === id)

  if (ctx.pending && !entities.ambiguity) {
    const pick = entities.item && ctx.pending.options.find((o) => o.id === entities.item!.refId)
    if (pick) return { entities, carriedIntents: ctx.pending.intents, used: true }
  }

  const needsItem = intents.some((i) => ITEM_INTENTS.has(i.name))
  const variantOnly = entities.entities.some((e) => e.type === 'COLOR' || e.type === 'SIZE') && !intents.some((i) => !isSocial(i.name))
  if (!entities.item && !entities.ambiguity && (needsItem || variantOnly) && ctx.lastItemId && ctx.lastItemName && exists(ctx.lastItemId)) {
    const item: Entity = {
      type: entities.entities.find((e) => e.type === 'PRODUCT') ? 'PRODUCT' : kindToType(ctx.lastItemKind),
      value: ctx.lastItemName, refId: ctx.lastItemId, confidence: 'HIGH', similarity: 1, fromContext: true,
    }
    return { entities: { ...entities, item, entities: [item, ...entities.entities] }, carriedIntents: [], used: true }
  }
  return none
}

function kindToType(kind: ConversationContext['lastItemKind']): Entity['type'] {
  switch (kind) {
    case 'service': return 'SERVICE'
    case 'room': return 'ROOM_CATEGORY'
    case 'menu_item': return 'MENU_ITEM'
    case 'vehicle': return 'VEHICLE'
    case 'plan': return 'MEMBERSHIP_PLAN'
    default: return 'PRODUCT'
  }
}

export function updateContext(
  prev: ConversationContext | null,
  now: Date,
  intents: IntentName[],
  ent: EntityResult,
  data: EngineData,
  asked: { options: { id: string; name: string }[]; intents: IntentName[] } | null,
): ConversationContext {
  const next: ConversationContext = { lastIntents: intents, updatedAt: now.toISOString() }
  const item = ent.item ? data.catalog.find((c) => c.id === ent.item!.refId) : undefined
  if (item) {
    next.lastItemId = item.id
    next.lastItemName = item.name
    next.lastItemKind = item.kind
  } else if (prev?.lastItemId && !asked) {
    next.lastItemId = prev.lastItemId
    next.lastItemName = prev.lastItemName
    next.lastItemKind = prev.lastItemKind
  }
  next.lastColor = ent.entities.find((e) => e.type === 'COLOR')?.value ?? prev?.lastColor
  next.lastSize = ent.entities.find((e) => e.type === 'SIZE')?.value ?? prev?.lastSize
  if (asked) next.pending = asked
  return next
}
