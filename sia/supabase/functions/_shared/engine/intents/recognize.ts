import type { ConceptMatch, Confidence, EntityResult, IntentName, IntentResult } from '../types.ts'

/** Intents that need a catalog item (explicit, from context, or via clarification). */
export const ITEM_INTENTS: ReadonlySet<IntentName> = new Set<IntentName>([
  'ASK_PRICE', 'ASK_AVAILABILITY', 'ASK_STOCK', 'ASK_SERVICE_DURATION', 'ASK_PRODUCT_DETAILS', 'ASK_ROOM_AVAILABILITY',
])

const SOCIAL: ReadonlySet<IntentName> = new Set<IntentName>(['GREETING', 'GOODBYE', 'THANKS', 'HELP'])
export const isSocial = (n: IntentName): boolean => SOCIAL.has(n)

const conf = (m: ConceptMatch): Confidence => (m.method === 'exact' || m.method === 'loose' ? 'HIGH' : 'MEDIUM')

/**
 * Detects ALL intents in a message (never stops at the first). Intents are derived from
 * dictionary concepts plus entities, so the same rules serve every business category.
 */
export function recognizeIntents(concepts: ConceptMatch[], ent: EntityResult): IntentResult[] {
  const first = new Map<string, ConceptMatch>()
  for (const c of concepts) if (!first.has(c.concept)) first.set(c.concept, c)
  const has = (n: string) => first.has(n)
  const out: IntentResult[] = []
  const add = (name: IntentName, trigger: ConceptMatch | null, confidence?: Confidence, topic?: string) => {
    if (out.some((i) => i.name === name && i.topic === topic)) return
    out.push({ name, confidence: confidence ?? (trigger ? conf(trigger) : 'MEDIUM'), position: trigger?.tokenStart ?? 99, trigger: trigger?.phrase ?? 'entity', topic })
  }

  const roomItem = ent.entities.some((e) => e.type === 'ROOM_CATEGORY')
  const hasItem = Boolean(ent.item) || Boolean(ent.ambiguity)
  const facility = ent.entities.find((e) => e.type === 'FACILITY')
  const hasVariantAttr = ent.entities.some((e) => e.type === 'COLOR' || e.type === 'SIZE')

  if (has('GREETING')) add('GREETING', first.get('GREETING')!)
  if (has('GOODBYE')) add('GOODBYE', first.get('GOODBYE')!)
  if (has('THANKS')) add('THANKS', first.get('THANKS')!)
  if (has('HELP')) add('HELP', first.get('HELP')!)

  if (has('LOCATION')) add('ASK_LOCATION', first.get('LOCATION')!)
  if (has('OPENING')) add('ASK_OPENING_HOURS', first.get('OPENING')!)
  if (has('CLOSING')) add('ASK_CLOSING_HOURS', first.get('CLOSING')!)
  if (has('CONTACT')) add('ASK_CONTACT', first.get('CONTACT')!)
  if (has('CHECKIN')) add('ASK_CHECK_IN', first.get('CHECKIN')!)
  if (has('CHECKOUT')) add('ASK_CHECK_OUT', first.get('CHECKOUT')!)

  // Price: "price of delivery" is a delivery-cost question, not an item price.
  if (has('PRICE')) {
    const p = first.get('PRICE')!
    if (has('DELIVERY') && !hasItem) add('ASK_DELIVERY', first.get('DELIVERY')!, undefined, 'cost')
    else if (!hasItem && (has('ROOM') || roomItem)) add('ASK_ROOM_PRICE', p)
    else add('ASK_PRICE', p)
  }
  if (has('DELIVERY') && !out.some((i) => i.name === 'ASK_DELIVERY')) {
    const topic = has('DURATION') ? 'time' : undefined
    add('ASK_DELIVERY', first.get('DELIVERY')!, undefined, topic)
  }
  if (has('HOW_MANY') && has('ROOM') && !hasItem) add('ASK_ROOM_COUNT', first.get('HOW_MANY')!)
  if (has('TYPES') && has('ROOM')) add('ASK_ROOM_TYPES', first.get('TYPES')!)

  if (has('HAVE') || has('STOCK')) {
    const t = first.get('HAVE') ?? first.get('STOCK')!
    if (has('STOCK') && (hasItem || !facility)) add('ASK_STOCK', first.get('STOCK')!)
    else if (hasItem && roomItem) add('ASK_ROOM_AVAILABILITY', t)
    else if (hasItem) add('ASK_AVAILABILITY', t)
    else if (facility) add('ASK_FACILITIES', t)
    else if (has('ROOM') && !has('HOW_MANY') && !has('TYPES')) add('ASK_ROOM_AVAILABILITY', t)
  }
  if (!out.some((i) => i.name === 'ASK_FACILITIES') && (facility || has('FACILITIES'))) {
    add('ASK_FACILITIES', first.get('FACILITIES') ?? null, 'HIGH')
  }

  // "What colors?" / "Which sizes?" are questions about an item's options (the item may come from context).
  // Exact matches only: the loose plural handling would otherwise read "size L" as "which sizes?".
  const colorQ = first.get('COLOR_QUERY')
  const sizeQ = first.get('SIZE_QUERY')
  if (colorQ?.method === 'exact') add('ASK_PRODUCT_DETAILS', colorQ, undefined, 'colors')
  if (sizeQ?.method === 'exact') add('ASK_PRODUCT_DETAILS', sizeQ, undefined, 'sizes')

  if (has('PAYMENT')) add('ASK_PAYMENT_METHOD', first.get('PAYMENT')!)
  if (has('DISCOUNT')) add('ASK_DISCOUNT', first.get('DISCOUNT')!)
  if (has('PURCHASE')) add('PURCHASE_INTENT', first.get('PURCHASE')!)
  if (has('RESERVATION')) add('RESERVATION_INTENT', first.get('RESERVATION')!)
  if (has('APPOINTMENT')) add('APPOINTMENT_INTENT', first.get('APPOINTMENT')!)

  if (has('POLICY_CANCEL')) add('ASK_POLICIES', first.get('POLICY_CANCEL')!, undefined, 'cancellation')
  if (has('POLICY_RETURN')) add('ASK_POLICIES', first.get('POLICY_RETURN')!, undefined, 'returns')
  if (has('POLICY') && !out.some((i) => i.name === 'ASK_POLICIES')) add('ASK_POLICIES', first.get('POLICY')!, undefined, 'general')
  if (has('ABOUT') || (has('DETAILS') && !hasItem && first.get('DETAILS')!.phrase === 'tell me about')) {
    add('ASK_BUSINESS_DESCRIPTION', first.get('ABOUT') ?? first.get('DETAILS')!)
  }
  if (has('OFFER')) add('ASK_SERVICE_DETAILS', first.get('OFFER')!, undefined, 'offer')
  if (has('DURATION') && !has('DELIVERY')) add('ASK_SERVICE_DURATION', first.get('DURATION')!)
  if (has('REQUIREMENTS')) add('ASK_REQUIREMENTS', first.get('REQUIREMENTS')!)

  // A named item with a colour/size and no other commercial question means "is it available?".
  const commercial = out.some((i) => ['ASK_PRICE', 'ASK_AVAILABILITY', 'ASK_STOCK', 'ASK_ROOM_AVAILABILITY'].includes(i.name))
  if (ent.item && hasVariantAttr && !commercial) add('ASK_AVAILABILITY', null, 'MEDIUM')

  // A bare item mention (or "details") becomes a details request.
  const substantive = out.filter((i) => !isSocial(i.name))
  if (ent.item && (has('DETAILS') || substantive.length === 0)) {
    const kind = ent.item.type === 'PRODUCT' || ent.item.type === 'MENU_ITEM' || ent.item.type === 'VEHICLE' ? 'ASK_PRODUCT_DETAILS' : 'ASK_SERVICE_DETAILS'
    add(kind, first.get('DETAILS') ?? null, has('DETAILS') ? 'HIGH' : 'MEDIUM')
  }
  return out.sort((a, b) => a.position - b.position)
}
