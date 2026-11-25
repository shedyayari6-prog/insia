import { describe, expect, it } from 'vitest'
import { normalizeText, detectScript, looseForm, skeleton } from '../normalization/normalize.ts'
import { tokenize } from '../tokenization/tokenize.ts'
import { matchConcepts } from '../dictionary/index.ts'
import { applyVocabulary } from '../dictionary/vocabulary.ts'
import { detectLanguage } from '../normalization/language.ts'
import { editDistance, matchWord } from '../matching/similarity.ts'
import { processMessage } from '../pipeline/process.ts'
import { loadContext } from '../context/context.ts'
import type { ConversationContext, EngineData } from '../types.ts'
import { HOODIE_A, businessA, businessB } from './fixtures.ts'

const concepts = (text: string) => matchConcepts(tokenize(normalizeText(text))).map((c) => c.concept)
const run = (message: string, data: EngineData = businessA(), context: unknown = null) => processMessage({ message, data, context })

describe('normalization', () => {
  it('folds accents, apostrophes and case without touching the original', () => {
    expect(normalizeText("Où est l'Hôtel ?")).toBe('ou est l hotel')
  })
  it('folds Arabic letter variants and removes diacritics', () => {
    expect(normalizeText('أَهْلاً')).toBe('اهلا')
    expect(normalizeText('مدرسة')).toBe('مدرسه')
  })
  it('converts Arabic-Indic digits and keeps Arabizi digits', () => {
    expect(normalizeText('٦٥ دينار')).toBe('65 دينار')
    expect(normalizeText('9addech?')).toBe('9addech')
  })
  it('shortens long letter runs', () => {
    expect(normalizeText('saleeeeem')).toBe('saleem')
  })
  it('detects script', () => {
    expect(detectScript('hello')).toBe('latin')
    expect(detectScript('مرحبا')).toBe('arabic')
    expect(detectScript('slm مرحبا')).toBe('mixed')
  })
  it('keeps a loose form that merges spelling variants', () => {
    expect(looseForm('hoodie')).toBe(looseForm('hudi'))
    expect(looseForm('hoodies')).toBe(looseForm('hoodie'))
    expect(skeleton('b9addesh')).toBe(skeleton('b9dch'))
  })
})

describe('matching', () => {
  it('computes edit distance', () => {
    expect(editDistance('kitten', 'sitting')).toBe(3)
    expect(editDistance('ab', 'ba')).toBe(1)
  })
  it('requires exact matches for short words', () => {
    expect(matchWord('prc', 'price')).toBeNull()
    expect(matchWord('wn', 'win')).toBeNull()
    expect(matchWord('time', 'types')).toBeNull()
  })
  it('allows a small typo in a long word', () => {
    expect(matchWord('delivry', 'delivery')?.method).toBe('fuzzy')
  })
})

describe('dictionary', () => {
  it.each(['slm', 'salam', 'salem', 'saleeem', 'selem', 'Aslema'])('%s is a greeting', (w) => {
    expect(concepts(w)).toContain('GREETING')
  })
  it('maps Derja price words', () => {
    for (const w of ['9addech', 'ch7al', 'b9dch', 'bgdch', 'b9addesh', 'soum']) expect(concepts(w)).toContain('PRICE')
  })
  it('maps delivery and location aliases', () => {
    expect(concepts('fama livraison')).toContain('DELIVERY')
    expect(concepts('twaslou')).toContain('DELIVERY')
    expect(concepts('win mawjoudin')).toContain('LOCATION')
    expect(concepts('adresse')).toContain('LOCATION')
  })
  it('prefers the longest phrase', () => {
    expect(concepts('how many')).toEqual(['HOW_MANY'])
  })
  it('does not turn everyday words into concepts', () => {
    expect(concepts('time')).toEqual([])
    expect(concepts('xyz hdi ok')).toEqual([])
  })
  it('detects languages and mixed messages', () => {
    expect(detectLanguage(tokenize(normalizeText('Do you have double rooms?'))).language).toBe('en')
    expect(detectLanguage(tokenize(normalizeText('Avez-vous une chambre pour vendredi ?'))).language).toBe('fr')
    expect(detectLanguage(tokenize(normalizeText('chnowa 9addech el hoodi barcha'))).language).toBe('derja')
    expect(detectLanguage(tokenize(normalizeText('قداش الثمن'))).language).not.toBe('en')
    expect(detectLanguage(tokenize(normalizeText('Slm, do you have double rooms?'))).mixed).toBe(true)
  })
})

describe('business vocabulary is private', () => {
  it('applies only the vocabulary it is given', () => {
    const a = applyVocabulary(tokenize('prix sabbat'), businessA().vocabulary)
    const b = applyVocabulary(tokenize('prix sabbat'), businessB().vocabulary)
    expect(a.tokens.map((t) => t.text)).toEqual(['prix', 'sneakers'])
    expect(a.expansions).toHaveLength(1)
    expect(b.tokens.map((t) => t.text)).toEqual(['prix', 'sabbat'])
    expect(b.expansions).toHaveLength(0)
  })
  it('answers a vocabulary-defined word from the catalog', () => {
    const r = run('9addech sabbat')
    expect(r.reply).toContain('120 TND')
  })
})

describe('Test A: product price ("bgdch elhoodi")', () => {
  const r = run('bgdch elhoodi')
  it('recognises price intent and the hoodie, and retrieves the price from the catalog', () => {
    expect(r.intents).toContain('ASK_PRICE')
    expect(r.debug.entities.some((e) => e.type === 'PRODUCT' && e.value === 'Hoodie')).toBe(true)
    expect(r.reply).toContain('65 TND')
    expect(r.status).toBe('answered')
  })
  it('replies in Derja, preserving the product name', () => {
    expect(r.language).toBe('derja')
    expect(r.reply).toContain('Hoodie')
  })
  it('reads the price from the data, not from the code', () => {
    const data = businessA()
    data.catalog = data.catalog.map((c) => (c.id === 'a-hoodie' ? { ...c, price: 71.5 } : c))
    expect(run('bgdch elhoodi', data).reply).toContain('71.5 TND')
  })
})

describe('products listed in business facts', () => {
  it.each([
    ['hoodies', 'product_catalog', 'Hoodies, Sneakers, Basket'],
    ['sneakers', 'pricing_info', 'Hoodie: 65 DT; Sneakers: 110 DT; Basket: 85 DT'],
  ])('answers a listed product mention: %s', (message, key, value) => {
    const data = businessA()
    data.catalog = []
    data.facts = [{ id: `fact-${key}`, key, label: key, value, verified: true }]
    const r = run(message, data)
    expect(r.status).toBe('answered')
    expect(r.reply).toContain(value)
    expect(r.debug.sources.some((s) => s.id === `fact-${key}`)).toBe(true)
  })

  it('does not answer from an unverified product list', () => {
    const data = businessA()
    data.catalog = []
    data.facts = [{ id: 'fact-product_catalog', key: 'product_catalog', label: 'Products', value: 'Hoodies, Sneakers', verified: false }]
    expect(run('hoodies', data).status).toBe('fallback')
  })
})

describe('Test B: typo variation ("b9addesh el hudi?")', () => {
  it('still finds price intent and the hoodie', () => {
    const r = run('b9addesh el hudi?')
    expect(r.intents).toContain('ASK_PRICE')
    expect(r.reply).toContain('65 TND')
    expect(r.confidence).toBe('HIGH')
  })
})

describe('Test C: availability with colour and size ("Fama hoodie noir taille L?")', () => {
  const r = run('Fama hoodie noir taille L?')
  it('extracts product, colour and size', () => {
    const types = r.debug.entities.map((e) => `${e.type}:${e.value}`)
    expect(types).toContain('PRODUCT:Hoodie')
    expect(types).toContain('COLOR:black')
    expect(types).toContain('SIZE:L')
    expect(r.intents).toContain('ASK_AVAILABILITY')
  })
  it('looks up the right variant', () => {
    expect(r.debug.sources.some((s) => s.type === 'variant' && s.id === 'a-h-bl')).toBe(true)
    expect(r.reply).toMatch(/disponible/i)
  })
  it('reports out of stock for the black XL variant', () => {
    const out = run('Is the black hoodie available in size XL?')
    expect(out.reply).toMatch(/out of stock/i)
  })
  it('does not claim stock when it is not tracked', () => {
    const w = run('do you have the white hoodie in size L?')
    expect(w.reply).toMatch(/can't confirm current stock/i)
  })
  it('honours a "never promise stock" instruction', () => {
    const data = businessA()
    data.instructions = [{ id: 'i1', instruction: 'Never promise stock availability without checking inventory.' }]
    const w = run('Is the black hoodie available in size L?', data)
    expect(w.reply).toMatch(/currently listed as available/i)
    expect(w.debug.instructions.applied).toHaveLength(1)
  })
  it('says so when a requested variant is not listed', () => {
    expect(run('hoodie rouge taille L').reply).toMatch(/Options indiquées/)
    expect(run('Do you have the red hoodie in size L?').reply).toMatch(/Listed options: Black L, Black XL, White L/)
  })
})

describe('Test D: business information ("How many rooms do you have?")', () => {
  it('retrieves the verified room count', () => {
    const r = run('How many rooms do you have?')
    expect(r.intents).toContain('ASK_ROOM_COUNT')
    expect(r.reply).toContain('42')
    expect(r.debug.sources.some((s) => s.id === 'fact-rooms_count')).toBe(true)
  })
  it('answers rooms and swimming pool together', () => {
    const r = run('How many rooms do you have and do you have a swimming pool?')
    expect(r.intents).toEqual(expect.arrayContaining(['ASK_ROOM_COUNT', 'ASK_FACILITIES']))
    expect(r.reply).toContain('42')
    expect(r.reply).toMatch(/pool/i)
  })
})

describe('Test E: multiple questions', () => {
  it('answers location and closing hours', () => {
    const r = run('Where are you located and what time do you close?')
    expect(r.intents).toEqual(expect.arrayContaining(['ASK_LOCATION', 'ASK_CLOSING_HOURS']))
    expect(r.reply).toContain('12 Rue de la Paix')
    expect(r.reply).toContain('9:00–19:00')
    expect(r.status).toBe('answered')
  })
  it('uses the owner-approved answer text for location', () => {
    expect(run('Where are you located?').reply).toContain('next to the post office')
  })
  it('handles the Derja double question', () => {
    const r = run("Win mawjoudin w chnowa wa9t l'ouverture?")
    expect(r.intents).toEqual(expect.arrayContaining(['ASK_LOCATION', 'ASK_OPENING_HOURS']))
    expect(r.reply).toContain('12 Rue de la Paix')
    expect(r.reply).toContain('9:00–19:00')
  })
  it('answers delivery to a place and delivery cost without inventing coverage', () => {
    const r = run('Do you deliver to Sousse and how much does delivery cost?')
    expect(r.intents).toContain('ASK_DELIVERY')
    expect(r.reply).toContain('7 TND')
    expect(r.reply).toMatch(/can't confirm delivery to Sousse/i)
    expect(r.reply.match(/7 TND/g)).toHaveLength(1)
  })
})

describe('Test F: conversation context', () => {
  it('resolves "How much?" to the hoodie from the previous turn', () => {
    const first = run('Do you have hoodies?')
    expect(first.intents).toContain('ASK_AVAILABILITY')
    expect(first.context.lastItemId).toBe('a-hoodie')
    const second = run('How much?', businessA(), first.context)
    expect(second.debug.contextUsed).toBe(true)
    expect(second.reply).toContain('Hoodie')
    expect(second.reply).toContain('65 TND')
  })
  it('resolves "What about the price?" to the room category', () => {
    const first = run('Do you have double rooms?')
    expect(first.context.lastItemKind).toBe('room')
    const second = run('What about the price?', businessA(), first.context)
    expect(second.reply).toContain('150 TND / night')
  })
  it('asks which item when there is no context', () => {
    const r = run('How much?')
    expect(r.status).toBe('clarification')
    expect(r.reply).toMatch(/Which product or service/i)
  })
  it('ignores expired context', () => {
    const first = run('Do you have hoodies?')
    const stale: ConversationContext = { ...first.context, updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() }
    expect(loadContext(stale, new Date())).toBeNull()
    expect(run('How much?', businessA(), stale).status).toBe('clarification')
  })
  it('never reuses an item that does not exist in this business', () => {
    const first = run('Do you have hoodies?')
    const data = businessA()
    data.catalog = data.catalog.filter((c) => c.id !== 'a-hoodie')
    expect(run('How much?', data, first.context).status).toBe('clarification')
  })
  it('rejects malformed stored context', () => {
    expect(loadContext('nope', new Date())).toBeNull()
    expect(loadContext({ updatedAt: 42 }, new Date())).toBeNull()
  })
  it('asks for clarification between similar items and accepts the answer', () => {
    const data = businessA()
    data.catalog = [
      { ...HOODIE_A, id: 'h-black', name: 'Black Hoodie', price: 65, variants: [] },
      { ...HOODIE_A, id: 'h-red', name: 'Red Hoodie', price: 70, variants: [] },
    ]
    const first = run('Do you have hoodies?', data)
    expect(first.status).toBe('clarification')
    expect(first.reply).toMatch(/Black Hoodie, Red Hoodie/)
    const second = run('the red one', data, first.context)
    expect(second.intents).toContain('ASK_AVAILABILITY')
    expect(second.reply).toContain('Red Hoodie')
    // a price question lists every option instead of guessing
    expect(run('How much are hoodies?', data).reply).toMatch(/Black Hoodie – 65 TND; Red Hoodie – 70 TND/)
  })
})

describe('Test G: unknown information', () => {
  it('does not invent an answer for airport transfers', () => {
    const r = run('Do you offer airport transfers?')
    expect(r.status).toBe('fallback')
    expect(r.confidence).toBe('LOW')
    expect(r.reply).toMatch(/don't have that information/i)
    expect(r.reply).toContain('+216 70 000 000')
    expect(r.reply).not.toMatch(/yes/i)
  })
  it('never says a room is available or a reservation is confirmed', () => {
    const r = run('Hello, I want to book a room for two people next Friday.')
    expect(r.intents).toEqual(expect.arrayContaining(['GREETING', 'RESERVATION_INTENT']))
    expect(r.reply).toMatch(/can't confirm a reservation/i)
    expect(r.reply).not.toMatch(/confirmed|is booked|reserved for you/i)
    const types = r.debug.entities.map((e) => `${e.type}:${e.value}`)
    expect(types).toContain('PEOPLE:2')
    expect(types).toContain('DATE:friday')
  })
  it('does not invent discounts', () => {
    const r = run('Do you have any discount?')
    expect(r.reply).toMatch(/don't have verified information about discounts/i)
  })
  it('never states unverified facts', () => {
    const r = run('Do you have parking?')
    expect(r.reply).not.toMatch(/free parking/i)
  })
  it('does not claim a facility is absent just because it is not listed', () => {
    const r = run('Do you have a sauna?')
    expect(r.reply).not.toMatch(/no sauna|we don't have a sauna/i)
  })
  it('says a missing business fact is unknown', () => {
    const data = businessA()
    data.facts = data.facts.filter((f) => f.key !== 'opening_hours')
    const r = run('What are your opening hours?', data)
    expect(r.status).toBe('fallback')
    expect(r.reply).toMatch(/opening hours/i)
  })
  it('uses a verified custom fact labeled opening hours', () => {
    const data = businessA()
    data.facts = [{ id: 'custom-hours', key: null, label: 'Opening hours', value: 'Tue–Sun 10:00–18:00', verified: true }]
    const r = run('What are your opening hours?', data)
    expect(r.status).toBe('answered')
    expect(r.reply).toContain('Tue–Sun 10:00–18:00')
    expect(r.debug.sources.some((s) => s.id === 'custom-hours')).toBe(true)
  })
  it('does not use an unverified custom opening-hours fact', () => {
    const data = businessA()
    data.facts = [{ id: 'custom-hours', key: null, label: 'Opening hours', value: 'Tue–Sun 10:00–18:00', verified: false }]
    const r = run('What are your opening hours?', data)
    expect(r.status).toBe('fallback')
    expect(r.reply).not.toContain('Tue–Sun 10:00–18:00')
  })
})

describe('Test H: business isolation', () => {
  it('serves each business only its own data', () => {
    const a = run('bgdch elhoodi', businessA())
    const b = run('bgdch elhoodi', businessB())
    expect(a.reply).toContain('65 TND')
    expect(b.reply).toContain('99 TND')
    expect(b.reply).not.toContain('65')
    expect(a.reply).not.toContain('99')
  })
  it('does not leak addresses, rooms, sources or vocabulary', () => {
    const b = run('Where are you located?', businessB())
    expect(b.reply).toContain('Avenue Habib Bourguiba')
    expect(b.reply).not.toContain('Rue de la Paix')
    const rooms = run('How many rooms do you have?', businessB())
    expect(rooms.reply).not.toContain('42')
    expect(rooms.status).toBe('fallback')
    const sabbat = run('9addech sabbat', businessB())
    expect(sabbat.reply).not.toContain('120')
    expect(JSON.stringify(sabbat.debug)).not.toContain('biz-a')
    expect(JSON.stringify(b.sources)).not.toContain('a-')
  })
  it('does not carry context across businesses', () => {
    const first = run('Do you have hoodies?', businessA())
    const other = run('How much?', businessB(), first.context)
    expect(other.reply).not.toContain('65')
  })
  it('uses the other business preferred language only when the customer language is unknown', () => {
    expect(run('?', businessB()).language).toBe('fr')
    expect(run('Where are you located?', businessB()).language).toBe('en')
  })
})

describe('Test I: mixed language ("Slm, do you have double rooms?")', () => {
  const r = run('Slm, do you have double rooms?')
  it('recognises the greeting and the room category', () => {
    expect(r.intents).toEqual(expect.arrayContaining(['GREETING', 'ASK_ROOM_AVAILABILITY']))
    expect(r.debug.entities.some((e) => e.type === 'ROOM_CATEGORY' && e.value === 'Double Room')).toBe(true)
  })
  it('replies without promising availability', () => {
    expect(r.reply).toContain('Hello!')
    expect(r.reply).toContain('Double Room')
    expect(r.reply).toMatch(/can't check availability for specific dates/i)
    expect(r.language).toBe('en')
  })
  it('answers in French when the customer writes French', () => {
    const fr = run('Bonjour, avez-vous une chambre double ?')
    expect(fr.language).toBe('fr')
    expect(fr.reply).toMatch(/Bonjour/)
  })
  it('does not treat "How many rooms" as a room-type question', () => {
    const rc = run('How many rooms do you have?')
    expect(rc.debug.entities.some((e) => e.type === 'ROOM_CATEGORY')).toBe(false)
  })
})

describe('Test J: no false matching', () => {
  it.each(['xyz', 'hdi', 'ok', 'wn', 'prc', 'asdf qwer', 'the', 'l', '??', 'time to go', 'tipes'])('%s produces no confident answer', (msg) => {
    const r = run(msg)
    expect(r.intents.filter((i) => i.startsWith('ASK_') || i.endsWith('_INTENT'))).toEqual([])
    expect(r.status).toBe('fallback')
    expect(r.confidence).toBe('LOW')
  })
  it('keeps spelling similarity separate from confidence', () => {
    const r = run('9addech hodie')
    expect(r.debug.spellingSimilarity).toBeLessThanOrEqual(1)
    expect(['HIGH', 'MEDIUM', 'LOW']).toContain(r.debug.confidence.overall)
  })
  it('asks the customer to confirm a loose item match', () => {
    const data = businessA()
    data.catalog = data.catalog.map((c) => (c.id === 'a-pt' ? { ...c, name: 'Personal Training', aliases: [] } : c))
    const r = run('how much is personal trainin?', data)
    expect(r.reply).toContain('40 TND')
    expect(r.reply).toMatch(/I understood you mean Personal Training/)
    expect(r.confidence).toBe('MEDIUM')
  })
})

describe('language of the reply', () => {
  it('uses the Arabic pack for Arabic-script messages', () => {
    const r = run('قداش الثمن')
    expect(r.language).toBe('ar')
    expect(r.reply).toMatch(/[\u0600-\u06FF]/)
  })
  it('detects a lowercase Derja place name and does not claim coverage', () => {
    const r = run('tawsiil lel sousse 9addech')
    expect(r.debug.entities.some((e) => e.type === 'LOCATION' && e.value === 'Sousse')).toBe(true)
    expect(r.reply).toMatch(/Sousse/)
  })
})

describe('other behaviour', () => {
  it('answers greetings, thanks and goodbye without business data', () => {
    expect(run('hello').reply).toBe('Hello! How can I help you?')
    expect(run('merci').language).toBe('fr')
    expect(run('thanks').reply).toBe("You're welcome!")
    expect(run('bye').intents).toEqual(['GOODBYE'])
  })
  it('matches an owner-approved custom question exactly', () => {
    const r = run('Do you accept pets?')
    expect(r.reply).toBe('Small pets are welcome.')
    expect(r.debug.sources[0]?.id).toBe('qa-pets')
  })
  it('answers service duration', () => {
    expect(run('how long is personal training?').reply).toContain('1 hour')
  })
  it('answers check-in and check-out together', () => {
    const r = run('What time is check in and check out?')
    expect(r.reply).toContain('14:00')
    expect(r.reply).toContain('11:00')
  })
  it('answers policies from verified facts', () => {
    expect(run('what is your cancellation policy?').reply).toContain('48 hours')
  })
  it('never exposes debug-only data in the reply', () => {
    const r = run('bgdch elhoodi')
    expect(r.reply).not.toMatch(/ASK_|HIGH|MEDIUM|confidence|a-hoodie/)
  })
  it('keeps the original message in debug and never modifies it', () => {
    expect(run('  Slm   !! ').debug.original).toBe('Slm   !!')
  })
})
