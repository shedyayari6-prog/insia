import type {
  Confidence, ConceptMatch, ConversationContext, DebugInfo, EngineData, IntentName, IntentResult, Lang, ProcessResult, Source,
} from '../types.ts'
import { detectScript, normalizeText } from '../normalization/normalize.ts'
import { detectLanguage } from '../normalization/language.ts'
import { STOPWORDS, tokenize } from '../tokenization/tokenize.ts'
import { matchWord } from '../matching/similarity.ts'
import { matchConcepts } from '../dictionary/index.ts'
import { applyVocabulary } from '../dictionary/vocabulary.ts'
import { recognizeEntities } from '../entities/recognize.ts'
import { ITEM_INTENTS, isSocial, recognizeIntents } from '../intents/recognize.ts'
import { loadContext, resolveWithContext, updateContext } from '../context/context.ts'
import { TEMPLATE_KEYS_HANDLED, answerSource, contactText, matchApproved, retrieve, verifiedFact, type Part, type Sentence } from '../retrieval/retrieve.ts'
import { interpretInstructions } from '../response/instructions.ts'
import { joinSentences, partsToText, renderSentence, topicLabel } from '../response/build.ts'

export interface ProcessInput {
  message: string
  data: EngineData
  /** Stored conversation context (untrusted jsonb) or null for a new conversation. */
  context: unknown
  now?: Date
}

const rank: Record<Confidence, number> = { HIGH: 2, MEDIUM: 1, LOW: 0 }
const lowest = (list: Confidence[], fallback: Confidence): Confidence =>
  list.length ? list.reduce((a, b) => (rank[b] < rank[a] ? b : a)) : fallback

const SAFE_PREFERRED: Lang[] = ['en', 'fr', 'ar']
const NON_PRODUCT_WORDS = new Set(['product', 'products', 'item', 'items', 'sell', 'selling', 'shop', 'catalog', 'category', 'categories'])

function mentionsFactListedProduct(tokens: ReturnType<typeof tokenize>, data: EngineData): boolean {
  const facts = ['product_catalog', 'products_sold', 'pricing_info']
    .map((key) => verifiedFact(data, key))
    .filter((fact) => fact !== undefined)
  const listedWords = facts.flatMap((fact) => tokenize(normalizeText(fact.value))
    .map((token) => token.text)
    .filter((word) => word.length >= 4 && !STOPWORDS.has(word) && !NON_PRODUCT_WORDS.has(word)))
  return tokens.some((token) => token.text.length >= 4 && !STOPWORDS.has(token.text)
    && listedWords.some((word) => matchWord(token.text, word, { allowSkeleton: false }) !== null))
}

/**
 * The full 12-stage pipeline. Pure and synchronous: all I/O (loading data, storing messages)
 * belongs to the caller, so the same engine serves the dashboard test, the widget and future channels.
 * Stage order differs slightly from the list in the spec: entities are recognised before intents
 * because several intents (price vs room price, availability vs facility) depend on what was named.
 */
export function processMessage(input: ProcessInput): ProcessResult {
  const now = input.now ?? new Date()
  const { data } = input
  const original = input.message.trim()

  // 1-2. business identification (the snapshot IS the business) and conversation context
  const prevContext = loadContext(input.context, now)

  // 3-5. normalisation, script/language, tokenisation
  const normalized = normalizeText(original)
  const baseTokens = tokenize(normalized)
  const language = detectLanguage(baseTokens)

  // 6. business vocabulary (private) then global dictionary
  const { tokens, expansions } = applyVocabulary(baseTokens, data.vocabulary)
  const concepts = matchConcepts(tokens)

  // 7-8. entities, context resolution, intents
  const entities0 = recognizeEntities({ tokens, original }, data)
  const intents0 = recognizeIntents(concepts, entities0)
  const resolution = resolveWithContext(prevContext, entities0, intents0, data)
  const entities = resolution.entities
  let intents = resolution.used ? recognizeIntents(concepts, entities) : intents0
  for (const carried of resolution.carriedIntents) {
    if (!intents.some((i) => i.name === carried)) intents = [...intents, { name: carried, confidence: 'HIGH', position: 99, trigger: 'clarification' }]
  }
  if (!intents.some((i) => !isSocial(i.name)) && mentionsFactListedProduct(tokens, data)) {
    intents = [...intents, { name: 'ASK_PRODUCT_DETAILS', confidence: 'MEDIUM', position: 0, trigger: 'verified product list', topic: 'offer' }]
  }

  const fx = interpretInstructions(data.instructions)
  const detected: Lang = language.language !== 'unknown'
    ? language.language
    : (SAFE_PREFERRED as string[]).includes(data.business.preferred_language) ? (data.business.preferred_language as Lang) : 'en'
  // Our Derja pack is written in Latin letters; Arabic-script customers get the Arabic pack.
  const lang: Lang = detected === 'derja' && detectScript(original) === 'arabic' ? 'ar' : detected

  // 9. knowledge retrieval
  const match = matchApproved(tokens, data.answers)
  const customMatch = match && match.score >= 0.9 && !(match.answer.template_key && TEMPLATE_KEYS_HANDLED.has(match.answer.template_key)) ? match : null
  let substantive = intents.filter((i) => !isSocial(i.name))
  const social = intents.filter((i) => isSocial(i.name))
  if (customMatch) substantive = [] // the owner's exact approved answer wins over generic handling

  const parts: Part[] = social.map((i) => retrieve(i, { data, entities, fx }))
  const prefixes: Sentence[] = []
  const reported: IntentResult[] = [...social]

  if (customMatch) {
    parts.push({ intent: 'GENERAL_QUESTION', outcome: 'answered', confidence: 'HIGH', sources: [answerSource(customMatch.answer)], sentences: [{ key: 'approved', verbatim: customMatch.answer.answer }] })
    reported.push({ name: 'GENERAL_QUESTION', confidence: 'HIGH', position: 0, trigger: customMatch.matchedPhrase })
  } else if (substantive.length === 0 && !social.length) {
    const guess: IntentName = /[?؟]|\b(what|how|where|when|why|who|quel|quelle|comment|pourquoi|chnowa|kifech|wa9t)\b/i.test(original) ? 'GENERAL_QUESTION' : 'UNKNOWN'
    reported.push({ name: guess, confidence: 'LOW', position: 0, trigger: 'none' })
    if (match && match.score >= 0.75) {
      parts.push({ intent: guess, outcome: 'answered', confidence: 'MEDIUM', sources: [answerSource(match.answer)], sentences: [{ key: 'did_you_mean_question', params: { question: match.answer.question } }, { key: 'approved', verbatim: match.answer.answer }] })
    } else {
      parts.push({ intent: guess, outcome: 'missing', confidence: 'LOW', sources: [], sentences: [] })
    }
  } else {
    for (const intent of substantive) {
      const part = retrieve(intent, { data, entities, fx })
      const trigger: ConceptMatch | undefined = concepts.find((c) => c.phrase === intent.trigger)
      if (trigger?.method === 'fuzzy' && part.outcome === 'answered') {
        part.sentences.unshift({ key: 'understood_as', params: { topic: topicLabel(lang, intent.name) } })
        part.confidence = 'MEDIUM'
      }
      parts.push(part)
      reported.push(intent)
    }
    // Confirm a loosely matched item once, before the first answer that depends on it.
    const e = entities.item
    if (e && !e.fromContext && e.confidence === 'MEDIUM' && substantive.some((i) => ITEM_INTENTS.has(i.name) || i.name === 'ASK_SERVICE_DETAILS')) {
      prefixes.push({ key: 'did_you_mean', params: { name: e.value } })
    }
  }

  // 10-11. confidence evaluation and response construction
  const sub = parts.filter((p) => !isSocial(p.intent))
  const answeredParts = sub.filter((p) => p.outcome === 'answered')
  const missingParts = sub.filter((p) => p.outcome === 'missing')
  const clarifyParts = sub.filter((p) => p.outcome === 'clarify')

  const social_ = parts.filter((p) => isSocial(p.intent))
  const sentences: string[] = []
  sentences.push(...partsToText(lang, social_))
  sentences.push(...prefixes.map((s) => renderSentence(lang, s)))
  sentences.push(...partsToText(lang, answeredParts))
  // Parts with a specific "price missing" style sentence keep it; otherwise explain what is missing.
  for (const p of missingParts) {
    if (p.sentences.length) sentences.push(...p.sentences.map((s) => renderSentence(lang, s)))
    else if (answeredParts.length || clarifyParts.length || sub.length > 1) sentences.push(renderSentence(lang, { key: 'missing_info', params: { topic: topicLabel(lang, p.intent) } }))
  }
  sentences.push(...partsToText(lang, clarifyParts))

  let status: ProcessResult['status']
  if (sub.length === 0) status = 'answered'
  else if (answeredParts.length === 0 && clarifyParts.length > 0) status = 'clarification'
  else if (answeredParts.length === 0) status = 'fallback'
  else status = missingParts.length || clarifyParts.length ? 'partial' : 'answered'

  if (status === 'fallback') {
    const contact = contactText(data)
    const generic = sub.length === 1 && sub[0]!.intent !== 'GENERAL_QUESTION' && sub[0]!.intent !== 'UNKNOWN' && !sub[0]!.sentences.length
      ? renderSentence(lang, { key: 'missing_info', params: { topic: topicLabel(lang, sub[0]!.intent) } })
      : renderSentence(lang, { key: 'fallback_generic' })
    sentences.push(generic)
    sentences.push(renderSentence(lang, contact ? { key: 'fallback_contact', params: { contact } } : { key: 'fallback_nocontact' }))
  }

  const reply = joinSentences(sentences)

  // Confidence values are kept separate: spelling similarity, intent, entity, overall.
  const intentConf = lowest(reported.filter((i) => !isSocial(i.name)).map((i) => i.confidence), social.length ? 'HIGH' : 'LOW')
  const entityConf = lowest(entities.entities.filter((e) => e.type !== 'LOCATION').map((e) => e.confidence), 'HIGH')
  const partConf = lowest(answeredParts.map((p) => p.confidence), 'HIGH')
  let overall: Confidence
  if (status === 'fallback') overall = 'LOW'
  else if (status === 'answered') overall = lowest([partConf, intentConf, entityConf], 'HIGH')
  else overall = 'MEDIUM'
  const spelling = Math.min(1, ...concepts.map((c) => c.similarity), ...(entities.item ? [entities.item.similarity] : []))

  // sources (de-duplicated)
  const sources: Source[] = []
  for (const p of parts) for (const s of p.sources) if (!sources.some((x) => x.type === s.type && x.id === s.id)) sources.push(s)

  // 12. context update
  const clarifyWithOptions = clarifyParts.find((p) => p.options && p.options.length)
  const asked = clarifyWithOptions
    ? { options: clarifyWithOptions.options!, intents: substantive.filter((i) => ITEM_INTENTS.has(i.name)).map((i) => i.name) }
    : null
  const context: ConversationContext = updateContext(prevContext, now, reported.map((i) => i.name), entities, data, asked)

  const debug: DebugInfo = {
    original,
    normalized,
    script: detectScript(original),
    language,
    tokens: tokens.map((t) => t.text),
    vocabularyExpansions: expansions,
    concepts,
    intents: reported,
    entities: entities.entities,
    sources,
    instructions: { applied: fx.applied, recorded: fx.recorded },
    contextUsed: resolution.used,
    spellingSimilarity: Number(spelling.toFixed(2)),
    confidence: { intent: intentConf, entity: entityConf, overall },
    parts: parts.map((p) => ({ intent: p.intent, outcome: p.outcome, confidence: p.confidence })),
  }

  return { reply, status, language: lang, confidence: overall, intents: reported.map((i) => i.name), sources, context, normalized, debug }
}
