import type { CatalogItem, CatalogKind, Confidence, Entity, EntityResult, EntityType, EngineData, Token } from '../types.ts'
import { normalizeText } from '../normalization/normalize.ts'
import { articleVariants, matchWord } from '../matching/similarity.ts'
import { STOPWORDS } from '../tokenization/tokenize.ts'
import { buildIndex, matchConcepts, type PhraseIndex } from '../dictionary/index.ts'
import {
  COLORS, FACILITIES, NEXT_WORDS, NUMBER_WORDS, PEOPLE_WORDS, RELATIVE_DAYS, SIZE_TOKENS, SIZE_WORDS, WEEKDAYS,
} from '../dictionary/global.ts'

const ENTITY_TYPE: Record<CatalogKind, EntityType> = {
  product: 'PRODUCT', service: 'SERVICE', room: 'ROOM_CATEGORY', menu_item: 'MENU_ITEM', vehicle: 'VEHICLE', plan: 'MEMBERSHIP_PLAN',
}

// Static indexes (tenant-independent, safe to reuse).
let staticIdx: { colors: PhraseIndex; facilities: PhraseIndex; weekdays: PhraseIndex; relative: PhraseIndex; people: Set<string>; sizeWords: Set<string> } | null = null
function idx() {
  staticIdx ??= {
    colors: buildIndex(COLORS),
    facilities: buildIndex(FACILITIES),
    weekdays: buildIndex(WEEKDAYS),
    relative: buildIndex(RELATIVE_DAYS),
    people: new Set(PEOPLE_WORDS.map(normalizeText)),
    sizeWords: new Set(SIZE_WORDS.map(normalizeText)),
  }
  return staticIdx
}

const strongOnly = (m: { method: string }) => m.method === 'exact' || m.method === 'loose'

/** Canonical colour id for free text such as a variant's colour ("Noir" -> "black"). */
export function canonicalColor(text: string): string {
  const t = normalizeText(text)
  const hit = matchConcepts(t.split(' ').map((x, index) => ({ text: x, index })), idx().colors).find(strongOnly)
  return hit ? hit.concept : t
}

export function canonicalSize(text: string): string {
  const t = normalizeText(text)
  return SIZE_TOKENS[t] ?? text.trim().toUpperCase()
}

// Generic category words ("room") must not, on their own, identify a specific catalog item.
const GENERIC_WORDS = new Set(['room', 'rooms', 'chambre', 'chambres', 'ghorfa', 'ghorfet', 'غرفه', 'غرف'].map(normalizeText))

interface ItemScore { item: CatalogItem; score: number; fuzzy: boolean }

function scoreItems(tokens: Token[], catalog: CatalogItem[]): ItemScore[] {
  const msgTokens = tokens.map((t) => t.text).filter((t) => !STOPWORDS.has(t) && t.length > 1)
  if (!msgTokens.length) return []
  const results: ItemScore[] = []
  for (const item of catalog) {
    let best: ItemScore | null = null
    for (const label of [item.name, ...item.aliases]) {
      const all = normalizeText(label).split(' ').filter((t) => t && !STOPWORDS.has(t))
      const specific = all.filter((t) => !GENERIC_WORDS.has(t))
      const nameTokens = specific.length ? specific : all
      if (!nameTokens.length) continue
      let sum = 0
      let matched = 0
      let fuzzy = false
      for (const nt of nameTokens) {
        let top = 0
        let topFuzzy = false
        for (const mt of msgTokens) {
          for (const variant of articleVariants(mt)) {
            const m = matchWord(variant, nt, { allowSkeleton: false })
            if (m && m.similarity > top) { top = m.similarity; topFuzzy = m.method === 'fuzzy' }
          }
        }
        if (top > 0) { sum += top; matched++; fuzzy ||= topFuzzy }
      }
      if (!matched) continue
      // Accept when at least half of the name's words are present (all of it for one-word names).
      const coverage = matched / nameTokens.length
      if (coverage < (nameTokens.length === 1 ? 1 : 0.5)) continue
      const score = sum / nameTokens.length
      if (!best || score > best.score) best = { item, score, fuzzy }
    }
    if (best) results.push(best)
  }
  return results.sort((a, b) => b.score - a.score)
}

export function recognizeEntities(msg: { tokens: Token[]; original: string }, data: EngineData): EntityResult {
  const entities: Entity[] = []
  const { tokens, original } = msg
  const i = idx()

  // ---- catalog items (products, services, rooms, menu items, vehicles, plans)
  let item: Entity | null = null
  let ambiguity: EntityResult['ambiguity'] = null
  const scored = scoreItems(tokens, data.catalog)
  if (scored.length) {
    const top = scored[0]!
    const ties = scored.filter((s) => s.score >= top.score - 0.05)
    if (ties.length > 1) {
      ambiguity = { options: ties.slice(0, 5).map((s) => ({ id: s.item.id, name: s.item.name })) }
      for (const t of ties.slice(0, 5)) {
        entities.push({ type: ENTITY_TYPE[t.item.kind], value: t.item.name, refId: t.item.id, confidence: 'MEDIUM', similarity: t.score })
      }
    } else {
      const confidence: Confidence = top.score >= 0.95 && !top.fuzzy ? 'HIGH' : 'MEDIUM'
      item = { type: ENTITY_TYPE[top.item.kind], value: top.item.name, refId: top.item.id, confidence, similarity: top.score }
      entities.push(item)
    }
  }

  // ---- colours (exact/loose only: never fuzzy)
  const itemNameTokens = item ? normalizeText(item.value).split(' ') : []
  for (const m of matchConcepts(tokens, i.colors).filter(strongOnly)) {
    if (itemNameTokens.some((t) => matchWord(t, m.phrase, { allowFuzzy: false, allowSkeleton: false }))) continue // colour is part of the item's name
    entities.push({ type: 'COLOR', value: m.concept, confidence: 'HIGH', similarity: m.similarity })
  }

  // ---- sizes
  const sizeSeen = new Set<string>()
  const addSize = (raw: string, similarity = 1) => {
    const v = canonicalSize(raw)
    if (sizeSeen.has(v)) return
    sizeSeen.add(v)
    entities.push({ type: 'SIZE', value: v, confidence: 'HIGH', similarity })
  }
  tokens.forEach((t, k) => {
    const prev = tokens[k - 1]?.text
    const afterSizeWord = prev !== undefined && i.sizeWords.has(prev)
    if (afterSizeWord && (SIZE_TOKENS[t.text] || /^\d{1,3}$/.test(t.text))) addSize(t.text)
    else if (['xs', 'xl', 'xxl', 'xxxl', '2xl', '3xl', 'xxs'].includes(t.text)) addSize(t.text)
  })
  // A standalone capital S/M/L ("hoodie noir L") is a size; lowercase "l" is usually a Derja article.
  for (const m of original.matchAll(/(?<![\p{L}\p{N}'’])([SML])(?![\p{L}\p{N}'’])/gu)) addSize(m[1]!)

  // ---- dates and times
  const rel = matchConcepts(tokens, i.relative).filter(strongOnly)
  for (const m of rel) entities.push({ type: 'DATE', value: m.concept, confidence: 'HIGH', similarity: m.similarity })
  const nextIdx = tokens.findIndex((t) => NEXT_WORDS.map(normalizeText).includes(t.text))
  for (const m of matchConcepts(tokens, i.weekdays).filter(strongOnly)) {
    const near = nextIdx >= 0 && Math.abs(nextIdx - m.tokenStart) <= 1
    entities.push({ type: 'DATE', value: m.concept, confidence: 'HIGH', similarity: m.similarity, detail: near ? { relative: 'next' } : undefined })
  }
  for (const m of original.matchAll(/(?<!\d)(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?(?!\d)/g)) {
    entities.push({ type: 'DATE', value: m[3] ? `${m[1]}/${m[2]}/${m[3]}` : `${m[1]}/${m[2]}`, confidence: 'MEDIUM', similarity: 1 })
  }
  for (const m of original.matchAll(/(?<!\d)([01]?\d|2[0-3])\s?(?::|h)\s?([0-5]\d)?(?![\p{L}\d])/giu)) {
    if (m[2] === undefined && !/h/i.test(m[0])) continue
    entities.push({ type: 'TIME', value: `${m[1]!.padStart(2, '0')}:${m[2] ?? '00'}`, confidence: 'MEDIUM', similarity: 1 })
  }

  // ---- people ("for two people", "2 personnes")
  tokens.forEach((t, k) => {
    const n = /^\d{1,2}$/.test(t.text) ? Number(t.text) : NUMBER_WORDS[t.text]
    if (n === undefined) return
    const next = tokens[k + 1]?.text
    if (next && i.people.has(next)) entities.push({ type: 'PEOPLE', value: String(n), confidence: 'HIGH', similarity: 1 })
  })

  // ---- facilities (pool, wifi, parking...)
  for (const m of matchConcepts(tokens, i.facilities).filter(strongOnly)) {
    entities.push({ type: 'FACILITY', value: m.concept, confidence: 'HIGH', similarity: m.similarity })
  }

  // ---- place names after a preposition ("deliver to Sousse"). Not validated against any list.
  const weekdayWords = new Set(Object.values(WEEKDAYS).flat().map(normalizeText))
  for (const m of original.matchAll(/(?:^|[\s,])(?:to|in|at|à|vers|lel|ila|fi|fil)\s+([A-ZÀ-ÝÇ][\p{L}-]+(?:\s+[A-ZÀ-ÝÇ][\p{L}-]+)?)/gu)) {
    const place = m[1]!
    if (weekdayWords.has(normalizeText(place))) continue
    entities.push({ type: 'LOCATION', value: place, confidence: 'MEDIUM', similarity: 1 })
  }

  // Derja prepositions are often typed in lowercase ("tawsiil lel sousse"): accept one unknown word.
  if (!entities.some((e) => e.type === 'LOCATION')) {
    const hit = original.match(/(?:^|\s)(?:lel|ila|vers)\s+([a-zà-ÿ]{4,})(?=[\s?!.,]|$)/iu)
    const word = hit?.[1] ? normalizeText(hit[1]) : ''
    const known = word ? matchConcepts([{ text: word, index: 0 }]).length > 0 || STOPWORDS.has(word) : true
    if (word && !known) entities.push({ type: 'LOCATION', value: hit![1]!.charAt(0).toUpperCase() + hit![1]!.slice(1), confidence: 'MEDIUM', similarity: 1 })
  }

  return { entities, item, ambiguity }
}
