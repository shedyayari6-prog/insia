import type {
  ApprovedAnswer, CatalogItem, CatalogKind, Confidence, EngineData, Entity, EntityResult, FactRecord, IntentName, IntentResult, Source, Token,
} from '../types.ts'
import { normalizeText } from '../normalization/normalize.ts'
import { matchWord } from '../matching/similarity.ts'
import { STOPWORDS } from '../tokenization/tokenize.ts'
import { canonicalColor, canonicalSize } from '../entities/recognize.ts'
import { FACILITIES } from '../dictionary/global.ts'
import type { InstructionEffects } from '../response/instructions.ts'

export interface Sentence { key: string; params?: Record<string, string>; verbatim?: string }

export interface Part {
  intent: IntentName
  outcome: 'answered' | 'missing' | 'clarify'
  confidence: Confidence
  sources: Source[]
  sentences: Sentence[]
  /** Parts with the same key (e.g. opening and closing hours) are rendered once. */
  dedupeKey?: string
  /** For clarification parts: the options offered and the intents to resume. */
  options?: { id: string; name: string }[]
}

export interface RetrievalContext {
  data: EngineData
  entities: EntityResult
  fx: InstructionEffects
}

// ---------------------------------------------------------------- small helpers
export const fmtPrice = (n: number, currency: string, unit?: string | null): string => {
  const num = Number.isInteger(n) ? String(n) : String(Number(n.toFixed(3)))
  return `${num} ${currency}${unit ? ` / ${unit}` : ''}`
}

const factSource = (f: FactRecord): Source => ({ type: 'fact', id: f.id, label: f.label })
const answerSource = (a: ApprovedAnswer): Source => ({ type: 'approved_answer', id: a.question_id, label: a.question })
const itemSource = (i: CatalogItem): Source => ({ type: 'catalog_item', id: i.id, label: i.name })
const FACT_LABELS: Partial<Record<string, ReadonlySet<string>>> = {
  opening_hours: new Set(['opening hours', 'business hours', 'hours', 'opening time', 'opening times', 'operating hours', 'working hours']),
}

/** Only verified, non-empty facts may be stated to customers. */
export function verifiedFact(data: EngineData, key: string): FactRecord | undefined {
  const isUsable = (f: FactRecord) => f.verified && f.value.trim() !== ''
  const keyed = data.facts.find((f) => f.key === key && isUsable(f))
  if (keyed) return keyed
  const labels = FACT_LABELS[key]
  return labels
    ? data.facts.find((f) => f.key === null && labels.has(normalizeText(f.label)) && isUsable(f))
    : undefined
}
function approved(data: EngineData, key: string): ApprovedAnswer | undefined {
  return data.answers.find((a) => a.template_key === key && a.answer.trim() !== '')
}
export function contactText(data: EngineData): string {
  const { phone, email } = data.business.contact_information
  return [phone, email].filter(Boolean).join(' / ')
}

const missing = (intent: IntentName, confidence: Confidence = 'LOW'): Part => ({ intent, outcome: 'missing', confidence, sources: [], sentences: [] })
const answered = (intent: IntentName, sentences: Sentence[], sources: Source[], confidence: Confidence = 'HIGH', dedupeKey?: string): Part =>
  ({ intent, outcome: 'answered', confidence, sentences, sources, dedupeKey })

/** Owner-approved answer first (by template key), otherwise a verified fact. */
function fromApprovedOrFact(
  intent: IntentName, data: EngineData, approvedKey: string, factKey: string, sentenceKey: string, param: string,
  extra: Record<string, string> = {}, dedupeKey?: string,
): Part {
  const a = approved(data, approvedKey)
  if (a) return answered(intent, [{ key: sentenceKey, verbatim: a.answer }], [answerSource(a)], 'HIGH', dedupeKey ?? `approved:${approvedKey}`)
  const f = verifiedFact(data, factKey)
  if (f) return answered(intent, [{ key: sentenceKey, params: { [param]: f.value, ...extra } }], [factSource(f)], 'HIGH', dedupeKey)
  return missing(intent)
}

const itemById = (data: EngineData, id: string | undefined) => data.catalog.find((c) => c.id === id)

const KIND_SINGLE: Record<CatalogKind, boolean> = { product: true, service: false, room: false, menu_item: false, vehicle: false, plan: false }

// ------------------------------------------------------------------ main entry
export function retrieve(intent: IntentResult, rc: RetrievalContext): Part {
  const { data, entities: ent, fx } = rc
  const name = intent.name
  const item = itemById(data, ent.item?.refId)
  const colorE = ent.entities.find((e) => e.type === 'COLOR')
  const sizeE = ent.entities.find((e) => e.type === 'SIZE')
  const place = ent.entities.find((e) => e.type === 'LOCATION')
  const facility = ent.entities.find((e) => e.type === 'FACILITY')
  const date = ent.entities.find((e) => e.type === 'DATE')
  const withConf = (p: Part): Part => (p.outcome === 'answered' && intent.confidence === 'MEDIUM' && p.confidence === 'HIGH' ? { ...p, confidence: 'MEDIUM' } : p)

  switch (name) {
    case 'GREETING': return answered(name, [{ key: 'greeting' }], [])
    case 'GOODBYE': return answered(name, [{ key: 'goodbye' }], [])
    case 'THANKS': return answered(name, [{ key: 'thanks' }], [])
    case 'HELP': return answered(name, [{ key: 'help', params: { business: data.business.business_name } }], [])

    case 'ASK_LOCATION': return withConf(fromApprovedOrFact(name, data, 'location', 'address', 'location', 'address'))
    case 'ASK_OPENING_HOURS':
    case 'ASK_CLOSING_HOURS': return withConf(fromApprovedOrFact(name, data, 'hours', 'opening_hours', 'hours', 'hours', {}, 'hours'))
    case 'ASK_CONTACT': {
      const a = approved(data, 'contact')
      if (a) return answered(name, [{ key: 'contact', verbatim: a.answer }], [answerSource(a)])
      const text = contactText(data)
      return text ? answered(name, [{ key: 'contact', params: { contact: text } }], [{ type: 'business', id: data.business.id, label: 'Contact details' }]) : missing(name)
    }
    case 'ASK_CHECK_IN': {
      const a = approved(data, 'checkin')
      if (a) return answered(name, [{ key: 'checkin', verbatim: a.answer }], [answerSource(a)], 'HIGH', 'approved:checkin')
      return fromApprovedOrFact(name, data, '__none__', 'checkin_time', 'checkin', 'time')
    }
    case 'ASK_CHECK_OUT': {
      const a = approved(data, 'checkin')
      if (a) return answered(name, [{ key: 'checkout', verbatim: a.answer }], [answerSource(a)], 'HIGH', 'approved:checkin')
      return fromApprovedOrFact(name, data, '__none__', 'checkout_time', 'checkout', 'time')
    }
    case 'ASK_ROOM_COUNT': return fromApprovedOrFact(name, data, 'rooms_count', 'rooms_count', 'rooms_count', 'count', { business: data.business.business_name })
    case 'ASK_ROOM_TYPES': {
      const p = fromApprovedOrFact(name, data, 'room_types', 'room_types', 'room_types', 'text')
      if (p.outcome === 'answered') return p
      const rooms = data.catalog.filter((c) => c.kind === 'room')
      return rooms.length ? answered(name, [{ key: 'room_types', params: { text: rooms.map((r) => r.name).join(', ') } }], rooms.map(itemSource)) : p
    }
    case 'ASK_ROOM_PRICE': {
      const p = fromApprovedOrFact(name, data, 'room_prices', 'room_prices', 'price_info', 'text')
      if (p.outcome === 'answered') return p
      const priced = data.catalog.filter((c) => c.kind === 'room' && c.price !== null)
      return priced.length ? priceList(name, priced) : missing(name)
    }
    case 'ASK_FACILITIES': return facilitiesPart(name, data, facility)
    case 'ASK_DELIVERY': {
      const a = approved(data, 'delivery')
      const f = verifiedFact(data, 'delivery_info')
      if (!a && !f) return missing(name)
      const text = a?.answer ?? f!.value
      const sources = [a ? answerSource(a) : factSource(f!)]
      const mentioned = place && normalizeText(text).includes(normalizeText(place.value))
      if (place && !mentioned) return answered(name, [{ key: 'delivery_place_unknown', params: { text, place: place.value } }], sources, 'MEDIUM', 'delivery')
      return answered(name, [{ key: 'delivery', verbatim: text }], sources, 'HIGH', 'delivery')
    }
    case 'ASK_PAYMENT_METHOD': return fromApprovedOrFact(name, data, 'payment', 'payment_methods', 'payment', 'text')
    case 'ASK_POLICIES': return policies(name, data, intent.topic)
    case 'ASK_REQUIREMENTS': return fromApprovedOrFact(name, data, 'documents', 'required_documents', 'requirements', 'text')
    case 'ASK_BUSINESS_DESCRIPTION': {
      const d = data.business.description.trim()
      return d ? answered(name, [{ key: 'description', verbatim: d }], [{ type: 'business', id: data.business.id, label: 'Business description' }]) : missing(name)
    }
    case 'ASK_DISCOUNT': return missing(name) // no discount data exists, so never invent one

    case 'ASK_SERVICE_DURATION': {
      if (ent.ambiguity) return clarify(name, ent.ambiguity.options)
      if (!item) return noItem(name, data)
      return item.duration_text
        ? answered(name, [{ key: 'duration', params: { name: item.name, duration: item.duration_text } }], [itemSource(item)], ent.item!.confidence)
        : missing(name)
    }
    case 'ASK_PRICE': {
      if (ent.ambiguity) {
        const options = ent.ambiguity.options.map((o) => itemById(data, o.id)).filter((x): x is CatalogItem => Boolean(x))
        const priced = options.filter((o) => o.price !== null)
        return priced.length ? priceList(name, priced) : clarify(name, ent.ambiguity.options)
      }
      if (item) return price(name, item, ent.item!, colorE, sizeE)
      const a = approved(data, 'pricing')
      if (a) return answered(name, [{ key: 'price_info', verbatim: a.answer }], [answerSource(a)])
      const f = verifiedFact(data, 'pricing_info')
      if (f) return answered(name, [{ key: 'price_info', params: { text: f.value } }], [factSource(f)])
      return noItem(name, data)
    }
    case 'ASK_AVAILABILITY':
    case 'ASK_STOCK': {
      if (ent.ambiguity) return clarify(name, ent.ambiguity.options)
      if (!item) return noItem(name, data)
      return availability(name, item, ent.item!, colorE, sizeE, fx, Boolean(date))
    }
    case 'ASK_ROOM_AVAILABILITY': {
      if (ent.ambiguity) return clarify(name, ent.ambiguity.options)
      if (item) return answered(name, [{ key: 'avail_room', params: { name: item.name } }], [itemSource(item)], ent.item!.confidence)
      const f = verifiedFact(data, 'room_types')
      if (f) return answered(name, [{ key: 'avail_room_generic', params: { text: f.value } }], [factSource(f)])
      const rooms = data.catalog.filter((c) => c.kind === 'room')
      return rooms.length
        ? answered(name, [{ key: 'avail_room_generic', params: { text: rooms.map((r) => r.name).join(', ') } }], rooms.map(itemSource))
        : missing(name)
    }
    case 'ASK_PRODUCT_DETAILS':
    case 'ASK_SERVICE_DETAILS': return details(name, data, ent, intent.topic)
    case 'PURCHASE_INTENT':
    case 'RESERVATION_INTENT':
    case 'APPOINTMENT_INTENT': return request(name, data, ent, fx)
    default: return missing(name)
  }
}

// ------------------------------------------------------------------ builders
function priceList(intent: IntentName, items: CatalogItem[]): Part {
  const list = items.map((i) => `${i.name} – ${fmtPrice(i.price!, i.currency, i.price_unit)}`).join('; ')
  return answered(intent, [{ key: 'price_list', params: { list } }], items.map(itemSource))
}

function clarify(intent: IntentName, options: { id: string; name: string }[]): Part {
  return { intent, outcome: 'clarify', confidence: 'MEDIUM', sources: [], sentences: [{ key: 'clarify_item', params: { options: options.map((o) => o.name).join(', ') } }], options }
}

function noItem(intent: IntentName, data: EngineData): Part {
  // The catalog is non-empty: ask which item. Otherwise there is simply nothing to look up.
  if (data.catalog.length) return { intent, outcome: 'clarify', confidence: 'LOW', sources: [], sentences: [{ key: 'clarify_item_missing' }], options: [] }
  return missing(intent)
}

function matchingVariants(item: CatalogItem, color?: Entity, size?: Entity) {
  return item.variants.filter((v) => {
    if (color && (!v.color || canonicalColor(v.color) !== color.value)) return false
    if (size && (!v.size || canonicalSize(v.size) !== size.value)) return false
    return true
  })
}
const variantLabel = (color?: Entity, size?: Entity, v?: { color: string | null; size: string | null }): string =>
  [v?.color ?? color?.value, v?.size ?? size?.value].filter(Boolean).join(', ')

function price(intent: IntentName, item: CatalogItem, e: Entity, color?: Entity, size?: Entity): Part {
  const conf = e.confidence
  if (color || size) {
    const match = matchingVariants(item, color, size).find((v) => v.price !== null)
    if (match) {
      return answered(intent, [{ key: 'price_variant', params: { name: item.name, variant: variantLabel(color, size, match), price: fmtPrice(match.price!, item.currency, item.price_unit) } }],
        [itemSource(item), { type: 'variant', id: match.id, label: variantLabel(color, size, match) }], conf)
    }
  }
  if (item.price !== null) return answered(intent, [{ key: 'price_item', params: { name: item.name, price: fmtPrice(item.price, item.currency, item.price_unit) } }], [itemSource(item)], conf)
  return { ...missing(intent, 'LOW'), sentences: [{ key: 'price_missing', params: { name: item.name } }], sources: [itemSource(item)] }
}

function availability(intent: IntentName, item: CatalogItem, e: Entity, color: Entity | undefined, size: Entity | undefined, fx: InstructionEffects, hasDate: boolean): Part {
  const src = [itemSource(item)]
  const conf = e.confidence
  const caveat: Sentence[] = hasDate ? [{ key: 'avail_caveat_dates' }] : []
  const stateIn = (key: string, params: Record<string, string>, sources: Source[]) =>
    answered(intent, [{ key: fx.stockCaution ? `${key}_caution` : key, params }, ...caveat], sources, conf)

  if (color || size) {
    const wanted = variantLabel(color, size)
    if (!item.variants.length) {
      return answered(intent, [{ key: 'avail_variant_unknown', params: { name: item.name, variant: wanted } }], src, 'MEDIUM')
    }
    const hits = matchingVariants(item, color, size)
    if (!hits.length) {
      const options = item.variants.map((v) => [v.color, v.size].filter(Boolean).join(' ')).join(', ')
      return answered(intent, [{ key: 'avail_variant_unlisted', params: { name: item.name, variant: wanted, options } }], src, conf)
    }
    const label = variantLabel(color, size, hits[0])
    const inStock = hits.find((v) => v.available && (v.stock_quantity === null || v.stock_quantity > 0))
    const sources = [...src, ...hits.map((v) => ({ type: 'variant' as const, id: v.id, label: variantLabel(color, size, v) }))]
    if (inStock && inStock.stock_quantity !== null) return stateIn('avail_variant_in', { name: item.name, variant: label }, sources)
    if (inStock) return answered(intent, [{ key: 'avail_variant_unknown', params: { name: item.name, variant: label } }], sources, conf)
    return answered(intent, [{ key: 'avail_variant_out', params: { name: item.name, variant: label } }], sources, conf)
  }

  if (KIND_SINGLE[item.kind]) {
    const tracked = item.variants.filter((v) => v.stock_quantity !== null || !v.available)
    if (tracked.length) {
      const any = tracked.some((v) => v.available && (v.stock_quantity === null || v.stock_quantity > 0))
      return any ? stateIn('avail_item_yes', { name: item.name }, src) : answered(intent, [{ key: 'avail_item_out', params: { name: item.name } }], src, conf)
    }
    return answered(intent, [{ key: 'avail_item_unknown', params: { name: item.name } }, ...caveat], src, conf)
  }
  return answered(intent, [{ key: 'avail_item_offered', params: { name: item.name } }, ...caveat], src, conf)
}

function facilitiesPart(intent: IntentName, data: EngineData, facility?: Entity): Part {
  if (facility) {
    const id = facility.value
    const factKey = id === 'parking' ? 'parking' : id === 'breakfast' ? 'breakfast' : null
    const dedicated = factKey ? verifiedFact(data, factKey) : undefined
    if (dedicated) return answered(intent, [{ key: 'topic_fact', params: { label: dedicated.label, text: dedicated.value } }], [factSource(dedicated)])
    const list = verifiedFact(data, 'facilities')
    const aliases = (FACILITIES[id] ?? [id]).map(normalizeText)
    const text = list ? normalizeText(list.value) : ''
    if (list && aliases.some((a) => text.includes(a))) {
      return answered(intent, [{ key: 'facility_yes', params: { facility: facility.value === id ? (FACILITIES[id]?.[0] ?? id) : facility.value } }], [factSource(list)])
    }
    // Not listed is NOT the same as "we don't have it".
    return answered(intent, [{ key: 'facility_unknown', params: { facility: FACILITIES[id]?.[0] ?? id } }], list ? [factSource(list)] : [], 'MEDIUM')
  }
  return fromApprovedOrFact(intent, data, 'facilities', 'facilities', 'facilities', 'text')
}

function policies(intent: IntentName, data: EngineData, topic?: string): Part {
  const pick = (approvedKey: string, factKey: string): { text: string; src: Source } | null => {
    const a = approved(data, approvedKey)
    if (a) return { text: a.answer, src: answerSource(a) }
    const f = verifiedFact(data, factKey)
    return f ? { text: f.value, src: factSource(f) } : null
  }
  const wanted = topic === 'cancellation' ? [pick('cancellation', 'cancellation_policy')]
    : topic === 'returns' ? [pick('returns', 'returns_policy')]
      : [pick('cancellation', 'cancellation_policy'), pick('returns', 'returns_policy')]
  const found = wanted.filter((x): x is { text: string; src: Source } => x !== null)
  if (!found.length) return missing(intent)
  return answered(intent, found.map((x) => ({ key: 'policy', verbatim: x.text })), found.map((x) => x.src))
}

function details(intent: IntentName, data: EngineData, ent: EntityResult, topic?: string): Part {
  if (ent.ambiguity) return clarify(intent, ent.ambiguity.options)
  const item = itemById(data, ent.item?.refId)
  if (topic === 'colors' || topic === 'sizes') return optionsPart(intent, data, item, ent, topic)
  if (!item) {
    if (topic === 'offer' || ent.item === null) {
      const items = data.catalog.slice(0, 12)
      if (items.length) return answered(intent, [{ key: 'offer_list', params: { list: items.map((i) => i.name).join(', ') } }], items.map(itemSource))
      if (intent === 'ASK_PRODUCT_DETAILS') {
        const products = verifiedFact(data, 'product_catalog') ?? verifiedFact(data, 'products_sold')
        if (products) return answered(intent, [{ key: 'offer_text', params: { text: products.value } }], [factSource(products)])
        const prices = verifiedFact(data, 'pricing_info')
        if (prices) return answered(intent, [{ key: 'price_info', params: { text: prices.value } }], [factSource(prices)])
      }
      const f = verifiedFact(data, 'services_list') ?? verifiedFact(data, 'product_catalog') ?? verifiedFact(data, 'menu')
      if (f) return answered(intent, [{ key: 'offer_text', params: { text: f.value } }], [factSource(f)])
    }
    return missing(intent)
  }
  const sentences: Sentence[] = []
  if (item.description?.trim()) sentences.push({ key: 'details', params: { name: item.name, text: item.description.trim() } })
  else sentences.push({ key: 'details_basic', params: { name: item.name } })
  if (item.price !== null) sentences.push({ key: 'price_item', params: { name: item.name, price: fmtPrice(item.price, item.currency, item.price_unit) } })
  if (item.duration_text) sentences.push({ key: 'duration', params: { name: item.name, duration: item.duration_text } })
  const colors = [...new Set(item.variants.map((v) => v.color).filter((x): x is string => Boolean(x)))]
  const sizes = [...new Set(item.variants.map((v) => v.size).filter((x): x is string => Boolean(x)))]
  if (colors.length) sentences.push({ key: 'options_colors', params: { list: colors.join(', ') } })
  if (sizes.length) sentences.push({ key: 'options_sizes', params: { list: sizes.join(', ') } })
  return answered(intent, sentences, [itemSource(item)], ent.item!.confidence)
}

/** "What colors / sizes?" lists only options that can currently be sold; untracked stock counts as listed. */
function optionsPart(intent: IntentName, data: EngineData, item: CatalogItem | undefined, ent: EntityResult, topic: 'colors' | 'sizes'): Part {
  if (!item) return noItem(intent, data)
  const field = topic === 'colors' ? 'color' : 'size'
  if (!item.variants.some((v) => v[field])) return missing(intent)
  const sellable = item.variants.filter((v) => v.available && (v.stock_quantity === null || v.stock_quantity > 0))
  const list = [...new Set(sellable.map((v) => v[field]).filter((x): x is string => Boolean(x)))]
  if (!list.length) return answered(intent, [{ key: 'avail_item_out', params: { name: item.name } }], [itemSource(item)], ent.item?.confidence ?? 'HIGH')
  return answered(intent, [{ key: topic === 'colors' ? 'options_colors' : 'options_sizes', params: { list: list.join(', ') } }], [itemSource(item)], ent.item?.confidence ?? 'HIGH')
}

function request(intent: IntentName, data: EngineData, ent: EntityResult, fx: InstructionEffects): Part {
  const item = itemById(data, ent.item?.refId)
  const bits: string[] = []
  if (item) bits.push(item.name)
  const people = ent.entities.find((e) => e.type === 'PEOPLE')
  if (people) bits.push(`${people.value} ${people.value === '1' ? 'person' : 'people'}`)
  const date = ent.entities.find((e) => e.type === 'DATE')
  if (date) bits.push(`${date.detail?.relative === 'next' ? 'next ' : ''}${date.value}`)
  const time = ent.entities.find((e) => e.type === 'TIME')
  if (time) bits.push(time.value)
  const summary = bits.join(', ')
  const key = intent === 'PURCHASE_INTENT' ? 'request_purchase' : intent === 'RESERVATION_INTENT' ? 'request_reservation' : 'request_appointment'

  const sentences: Sentence[] = []
  const sources: Source[] = []
  if (intent === 'PURCHASE_INTENT' && fx.deliveryBeforeOrder) {
    const d = verifiedFact(data, 'delivery_info')
    if (d) { sentences.push({ key: 'delivery', verbatim: d.value }); sources.push(factSource(d)) }
  }
  sentences.push({ key: summary ? key : `${key}_plain`, params: { summary } })
  const process = verifiedFact(data, 'booking_process')
  if (process) { sentences.push({ key: 'request_process', params: { text: process.value } }); sources.push(factSource(process)) }
  const contact = contactText(data)
  sentences.push(contact ? { key: 'contact_to_confirm', params: { contact } } : { key: 'contact_missing' })
  if (item) sources.push(itemSource(item))
  return answered(intent, sentences, sources, 'HIGH')
}

// ------------------------------------------------- approved question matching
export interface ApprovedMatch { answer: ApprovedAnswer; score: number; matchedPhrase: string }

/** Token-overlap (Dice) match of the message against approved questions and their aliases. */
export function matchApproved(tokens: Token[], answers: ApprovedAnswer[]): ApprovedMatch | null {
  const msg = tokens.map((t) => t.text).filter((t) => t.length > 1 && !STOPWORDS.has(t))
  if (!msg.length) return null
  let best: ApprovedMatch | null = null
  for (const a of answers) {
    if (!a.answer.trim()) continue
    for (const phrase of [a.question, ...a.aliases]) {
      const cand = normalizeText(phrase).split(' ').filter((t) => t.length > 1 && !STOPWORDS.has(t))
      if (!cand.length) continue
      let hits = 0
      for (const c of cand) if (msg.some((m) => matchWord(m, c, { allowSkeleton: false }) !== null)) hits++
      if (hits < Math.min(2, cand.length)) continue
      const score = (2 * hits) / (cand.length + msg.length)
      if (!best || score > best.score) best = { answer: a, score: Number(score.toFixed(2)), matchedPhrase: phrase }
    }
  }
  return best
}

/** Template keys that the intent resolvers already read, so a match on them adds nothing new. */
export const TEMPLATE_KEYS_HANDLED = new Set([
  'location', 'hours', 'contact', 'payment', 'cancellation', 'returns', 'delivery', 'rooms_count', 'room_types',
  'room_prices', 'checkin', 'facilities', 'documents', 'pricing',
])

export { answerSource }
