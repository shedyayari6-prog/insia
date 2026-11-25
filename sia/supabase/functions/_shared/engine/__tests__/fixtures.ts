import type { CatalogItem, EngineData } from '../types.ts'

export const HOODIE_A: CatalogItem = {
  id: 'a-hoodie', kind: 'product', name: 'Hoodie', description: 'Heavy cotton hoodie.', price: 65, currency: 'TND', price_unit: null,
  duration_text: null, aliases: ['sweat'],
  variants: [
    { id: 'a-h-bl', color: 'Black', size: 'L', price: null, stock_quantity: 3, available: true },
    { id: 'a-h-bxl', color: 'Black', size: 'XL', price: null, stock_quantity: 0, available: true },
    { id: 'a-h-wl', color: 'White', size: 'L', price: null, stock_quantity: null, available: true },
  ],
}

const base = (id: string, name: string, over: Partial<EngineData> = {}): EngineData => ({
  business: {
    id, business_name: name, business_type: 'other', custom_business_type: null, country: 'Tunisia', city: 'Tunis',
    description: 'A sample business used only in tests.', preferred_language: 'en',
    contact_information: { phone: '+216 70 000 000', email: 'contact@example.com' }, website: null,
  },
  facts: [], answers: [], catalog: [], vocabulary: [], instructions: [], ...over,
})

const fact = (key: string, value: string) => ({ id: `fact-${key}`, key, label: key, value, verified: true })

/** Business A: a mixed sample (shop + hotel + gym) to prove one engine serves every category. */
export function businessA(): EngineData {
  return base('biz-a', 'INSIA Concept', {
    facts: [
      fact('address', '12 Rue de la Paix, Tunis'),
      fact('opening_hours', 'Mon–Sat 9:00–19:00'),
      fact('rooms_count', '42'),
      fact('checkin_time', '14:00'),
      fact('checkout_time', '11:00'),
      fact('facilities', 'Swimming pool, Wi-Fi, Spa'),
      fact('delivery_info', 'Delivery takes 24–48 hours across Tunisia. Delivery costs 7 TND.'),
      fact('payment_methods', 'Cash, bank card'),
      fact('cancellation_policy', 'Free cancellation up to 48 hours before arrival.'),
      fact('room_types', 'Double and Single rooms'),
      { id: 'fact-unverified', key: 'parking', label: 'Parking', value: 'Free parking for all guests', verified: false },
    ],
    answers: [
      { question_id: 'qa-pets', question: 'Do you accept pets?', aliases: ['Are pets allowed?'], answer: 'Small pets are welcome.', template_key: null, verification: 'verified' },
      { question_id: 'qa-location', question: 'Where are you located?', aliases: [], answer: 'Find us at 12 Rue de la Paix, Tunis, next to the post office.', template_key: 'location', verification: 'verified' },
    ],
    catalog: [
      HOODIE_A,
      { id: 'a-sneakers', kind: 'product', name: 'Sneakers', description: null, price: 120, currency: 'TND', price_unit: null, duration_text: null, aliases: [], variants: [] },
      { id: 'a-double', kind: 'room', name: 'Double Room', description: null, price: 150, currency: 'TND', price_unit: 'night', duration_text: null, aliases: [], variants: [] },
      { id: 'a-single', kind: 'room', name: 'Single Room', description: null, price: 90, currency: 'TND', price_unit: 'night', duration_text: null, aliases: [], variants: [] },
      { id: 'a-pt', kind: 'service', name: 'Personal Training', description: null, price: 40, currency: 'TND', price_unit: null, duration_text: '1 hour', aliases: [], variants: [] },
    ],
    vocabulary: [{ id: 'v1', term: 'sabbat', meaning: 'sneakers' }],
  })
}

/** Business B: deliberately different data, to prove tenants never mix. */
export function businessB(): EngineData {
  return base('biz-b', 'Other Shop', {
    business: { ...base('biz-b', 'Other Shop').business, city: 'Sfax', preferred_language: 'fr', contact_information: { phone: '+216 74 111 111' } },
    facts: [fact('address', '5 Avenue Habib Bourguiba, Sfax')],
    catalog: [{ ...HOODIE_A, id: 'b-hoodie', price: 99, variants: [] }],
  })
}
