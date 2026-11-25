import type { CatalogItem, EngineData } from '../types.ts'

// Sample businesses of different industries, used to prove one engine and one widget serve them all.
// All data is test data. Prices and hours here are never baked into the engine.

const fact = (key: string, value: string) => ({ id: `${key}-fact`, key, label: key, value, verified: true })
const item = (over: Partial<CatalogItem> & Pick<CatalogItem, 'id' | 'kind' | 'name'>): CatalogItem => ({
  description: null, price: null, currency: 'TND', price_unit: null, duration_text: null, aliases: [], variants: [], ...over,
})
const base = (id: string, name: string, over: Partial<EngineData>): EngineData => ({
  business: {
    id, business_name: name, business_type: 'other', custom_business_type: null, country: 'Tunisia', city: 'Tunis',
    description: `${name} is a sample business used only in tests.`, preferred_language: 'en',
    contact_information: { phone: '+216 71 000 000' }, website: null,
  },
  facts: [], answers: [], catalog: [], vocabulary: [], instructions: [], ...over,
})

/** Clothing shop. Black is in stock, white is sold out. */
export const clothingShop = (): EngineData => base('biz-shop', 'Urban Threads', {
  facts: [fact('address', '8 Rue Ibn Khaldoun, Tunis'), fact('opening_hours', 'Mon–Sat 10:00–20:00'), fact('delivery_info', 'Delivery takes 2–3 days. Delivery costs 7 TND.')],
  catalog: [
    item({
      id: 'shop-hoodie', kind: 'product', name: 'Hoodie', price: 65, aliases: ['sweat'],
      variants: [
        { id: 'sh-bl', color: 'Black', size: 'L', price: null, stock_quantity: 5, available: true },
        { id: 'sh-bm', color: 'Black', size: 'M', price: null, stock_quantity: 2, available: true },
        { id: 'sh-wm', color: 'White', size: 'M', price: null, stock_quantity: 0, available: true },
      ],
    }),
    item({ id: 'shop-jeans', kind: 'product', name: 'Jeans', price: 90 }),
  ],
})

/** A second shop with different prices, for isolation tests. */
export const otherShop = (): EngineData => base('biz-shop2', 'Style Hub', {
  facts: [fact('address', '3 Avenue de Carthage, Sousse')],
  catalog: [item({ id: 'shop2-hoodie', kind: 'product', name: 'Hoodie', price: 99 })],
})

export const hotel = (): EngineData => base('biz-hotel', 'Hotel Medina', {
  facts: [
    fact('address', '1 Place de la Kasbah, Tunis'), fact('rooms_count', '24'), fact('checkin_time', '14:00'),
    fact('checkout_time', '11:00'), fact('facilities', 'Swimming pool, Wi-Fi, Breakfast room'),
  ],
  catalog: [
    item({ id: 'hotel-double', kind: 'room', name: 'Double Room', price: 180, price_unit: 'night' }),
    item({ id: 'hotel-single', kind: 'room', name: 'Single Room', price: 120, price_unit: 'night' }),
    item({ id: 'hotel-suite', kind: 'room', name: 'Suite', price: 320, price_unit: 'night' }),
  ],
})

export const restaurant = (): EngineData => base('biz-resto', 'Chez Karim', {
  facts: [fact('address', '15 Rue de Marseille, Tunis'), fact('opening_hours', 'Tue–Sun 12:00–23:00, closed on Mondays'), fact('payment_methods', 'Cash and bank card')],
  catalog: [
    item({ id: 'resto-couscous', kind: 'menu_item', name: 'Couscous', price: 18 }),
    item({ id: 'resto-brik', kind: 'menu_item', name: 'Brik', price: 6 }),
  ],
})

export const gym = (): EngineData => base('biz-gym', 'Iron Gym', {
  facts: [fact('address', '22 Avenue Habib Bourguiba, Tunis'), fact('opening_hours', 'Mon–Fri 6:00–22:00, Sat 8:00–18:00')],
  catalog: [
    item({ id: 'gym-monthly', kind: 'plan', name: 'Monthly Membership', price: 80, price_unit: 'month' }),
    item({ id: 'gym-annual', kind: 'plan', name: 'Annual Membership', price: 800, price_unit: 'year' }),
    item({ id: 'gym-pt', kind: 'service', name: 'Personal Training', price: 50, duration_text: '1 hour' }),
  ],
})
