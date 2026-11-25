import { describe, expect, it } from 'vitest'
import { BUSINESS_CATEGORIES } from './constants'
import {
  CATEGORY_CONFIG, DERIVED_LABELS, FIELD_CATALOG, QUESTION_CATALOG, buildFactMap, buildSuggestionItems,
  composeAnswer, deriveVerification, evaluateSuggestion, fieldsFor, parseAliases, questionsFor,
} from './templates'
import type { BusinessCategory } from '@/types'

const categories = BUSINESS_CATEGORIES.map((c) => c.value)

describe('template data integrity', () => {
  it('has a config for every business category', () => {
    for (const c of categories) expect(CATEGORY_CONFIG[c]).toBeDefined()
  })

  it.each(categories)('%s: every field and question key exists in the catalogs', (c: BusinessCategory) => {
    for (const k of CATEGORY_CONFIG[c].fields) expect(FIELD_CATALOG[k], `field ${k}`).toBeDefined()
    for (const k of CATEGORY_CONFIG[c].questions) expect(QUESTION_CATALOG[k], `question ${k}`).toBeDefined()
  })

  it.each(categories)('%s: every required key is a category field or derived value', (c: BusinessCategory) => {
    const allowed = new Set([...fieldsFor(c).map((x) => x.key), ...Object.keys(DERIVED_LABELS)])
    for (const s of questionsFor(c)) for (const r of s.requires) expect(allowed.has(r), `${s.key} requires ${r}`).toBe(true)
  })

  it('every placeholder in an answer template is listed in requires', () => {
    for (const s of Object.values(QUESTION_CATALOG)) {
      const used = [...s.answer.matchAll(/\{([a-z0-9_]+)\}/g)].map((m) => m[1])
      for (const u of used) expect(s.requires, `${s.key} uses {${u}}`).toContain(u)
    }
  })
})

describe('composeAnswer', () => {
  it('fills placeholders', () => {
    expect(composeAnswer('Open {hours}.', { hours: '9-5' })).toEqual({ text: 'Open 9-5.', missing: [] })
  })
  it('never invents a missing value', () => {
    expect(composeAnswer('Open {hours} at {address}.', { hours: '9-5' })).toEqual({ text: null, missing: ['address'] })
  })
})

describe('evaluateSuggestion', () => {
  const checkin = QUESTION_CATALOG.checkin!
  it('is verified when all required facts exist', () => {
    const r = evaluateSuggestion(checkin, { checkin_time: '14:00', checkout_time: '11:00' })
    expect(r.verification).toBe('verified')
    expect(r.answer).toBe('Check-in is at 14:00 and check-out is at 11:00.')
  })
  it('is incomplete with no answer when only some facts exist', () => {
    const r = evaluateSuggestion(checkin, { checkin_time: '14:00' })
    expect(r).toEqual({ answer: '', verification: 'incomplete', missing: ['checkout_time'] })
  })
  it('needs input when nothing is known', () => {
    expect(evaluateSuggestion(checkin, {}).verification).toBe('needs_input')
  })
})

describe('buildFactMap', () => {
  const business = {
    business_name: 'Hotel X', city: 'Tunis', country: 'Tunisia', website: null,
    contact_information: { phone: '+216 70 000 000', email: 'a@b.co' },
  }
  it('derives contact from the business record and ignores blank facts', () => {
    const map = buildFactMap(business, [{ key: 'address', value: ' 1 Main St ' }, { key: 'parking', value: '  ' }, { key: null, value: 'custom' }])
    expect(map.address).toBe('1 Main St')
    expect(map.parking).toBeUndefined()
    expect(map.contact).toBe('+216 70 000 000 or a@b.co')
  })
})

describe('parseAliases / deriveVerification', () => {
  it('trims and removes case-insensitive duplicates', () => {
    expect(parseAliases(' Do you deliver? \n\ndo you deliver?\nFama livraison')).toEqual(['Do you deliver?', 'Fama livraison'])
  })
  it('derives verification from the answer and the checkbox', () => {
    expect(deriveVerification('  ', true)).toBe('needs_input')
    expect(deriveVerification('Yes', true)).toBe('verified')
    expect(deriveVerification('Yes', false)).toBe('incomplete')
  })
})

describe('buildSuggestionItems', () => {
  it('composes from facts and disables questions without answers', () => {
    const items = buildSuggestionItems('restaurant', { address: '5 Rue A' }, [])
    const loc = items.find((i) => i.key === 'location')!
    const hours = items.find((i) => i.key === 'hours')!
    expect(loc.enabled).toBe(true)
    expect(loc.answer).toBe('We are located at 5 Rue A.')
    expect(hours.enabled).toBe(false)
    expect(hours.verification).toBe('needs_input')
  })
  it('keeps an owner-edited saved answer', () => {
    const items = buildSuggestionItems('restaurant', { address: '5 Rue A' }, [
      { template_key: 'location', status: 'disabled', verification: 'incomplete', answer_text: 'Custom answer' },
    ])
    const loc = items.find((i) => i.key === 'location')!
    expect(loc).toMatchObject({ answer: 'Custom answer', enabled: false, verification: 'incomplete' })
  })
})
