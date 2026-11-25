import { describe, expect, it } from 'vitest'
import { processMessage } from '../pipeline/process.ts'
import type { EngineData } from '../types.ts'
import { clothingShop, gym, hotel, restaurant } from './industries.ts'

const run = (message: string, data: EngineData, context: unknown = null) => processMessage({ message, data, context })

describe('"What colors?" follow-up (Phase 4 example)', () => {
  it('lists only colors that can currently be sold, using the previous question for context', () => {
    const first = run('Do you have hoodies?', clothingShop())
    const second = run('What colors?', clothingShop(), first.context)
    expect(second.debug.contextUsed).toBe(true)
    expect(second.intents).toContain('ASK_PRODUCT_DETAILS')
    expect(second.reply).toMatch(/Available colors: Black\./)
    expect(second.reply).not.toMatch(/White/)
  })
  it('lists sizes the same way', () => {
    const first = run('Do you have hoodies?', clothingShop())
    expect(run('Which sizes?', clothingShop(), first.context).reply).toMatch(/Available sizes: L, M\./)
  })
  it('works in French', () => {
    const first = run('Avez-vous des hoodies ?', clothingShop())
    const second = run('Quelles couleurs ?', clothingShop(), first.context)
    expect(second.language).toBe('fr')
    expect(second.reply).toMatch(/Couleurs disponibles : Black/)
  })
  it('names the item when asked directly', () => {
    expect(run('what colors does the hoodie come in?', clothingShop()).reply).toMatch(/Black/)
  })
  it('asks which item when there is no context', () => {
    const r = run('What colors?', clothingShop())
    expect(r.status).toBe('clarification')
  })
  it('does not invent options for an item that has none', () => {
    const first = run('Do you have jeans?', clothingShop())
    const r = run('What colors?', clothingShop(), first.context)
    expect(r.status).toBe('fallback')
    expect(r.reply).not.toMatch(/black|white|blue/i)
  })
  it('says the item is out of stock when every option is sold out', () => {
    const data = clothingShop()
    data.catalog = data.catalog.map((c) => (c.id === 'shop-hoodie' ? { ...c, variants: c.variants.map((v) => ({ ...v, stock_quantity: 0 })) } : c))
    const first = run('Do you have hoodies?', data)
    expect(run('What colors?', data, first.context).reply).toMatch(/out of stock/i)
  })
  it('does not turn "size L" into a size question', () => {
    const r = run('Is the black hoodie available in size L?', clothingShop())
    expect(r.intents).toEqual(['ASK_AVAILABILITY'])
  })
})

describe('the same engine answers every industry', () => {
  it('hotel: rooms and check-in in one message', () => {
    const r = run('How many rooms do you have and when can I check in?', hotel())
    expect(r.reply).toContain('24')
    expect(r.reply).toContain('14:00')
  })
  it('hotel: room price with context', () => {
    const first = run('Do you have double rooms?', hotel())
    expect(first.reply).toMatch(/can't check availability/i)
    expect(run('and the price?', hotel(), first.context).reply).toContain('180 TND / night')
  })
  it('restaurant: opening hours and a menu price', () => {
    expect(run('What are your opening hours?', restaurant()).reply).toContain('12:00–23:00')
    expect(run('How much is the couscous?', restaurant()).reply).toContain('18 TND')
  })
  it('gym: membership price and opening hours', () => {
    expect(run('How much is the monthly membership?', gym()).reply).toContain('80 TND / month')
    expect(run('What time do you open?', gym()).reply).toContain('6:00–22:00')
  })
  it('gym: personal training duration', () => {
    expect(run('how long is personal training?', gym()).reply).toContain('1 hour')
  })
})
