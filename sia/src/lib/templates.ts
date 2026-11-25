import type { Business, BusinessCategory, Verification } from '@/types'

/** A detail the owner can provide about their business. */
export interface FactField {
  key: string
  label: string
  kind: 'text' | 'longtext'
  placeholder?: string
}

/** A likely customer question. `answer` may contain {fact_key} placeholders. */
export interface SuggestedQuestion {
  key: string
  question: string
  aliases: string[]
  answer: string
  requires: string[]
}

const f = (key: string, label: string, kind: FactField['kind'] = 'text', placeholder?: string): FactField => ({
  key, label, kind, placeholder,
})

const FIELD_LIST: FactField[] = [
  f('address', 'Address', 'text', 'Street, city'),
  f('map_coordinates', 'Map coordinates', 'text', 'Latitude, longitude'),
  f('opening_hours', 'Opening hours', 'longtext', 'Mon–Fri 9:00–18:00, Sat 9:00–13:00'),
  f('payment_methods', 'Payment methods', 'text', 'Cash, card, bank transfer'),
  f('cancellation_policy', 'Cancellation policy', 'longtext'),
  f('returns_policy', 'Returns policy', 'longtext'),
  f('delivery_info', 'Delivery (areas, delay, cost)', 'longtext'),
  f('booking_process', 'How customers book or reserve', 'longtext'),
  f('pricing_info', 'Prices', 'longtext', 'Main prices or price ranges'),
  f('services_list', 'Services or offers', 'longtext'),
  // hotel
  f('rooms_count', 'Number of rooms', 'text'),
  f('room_types', 'Room categories', 'longtext'),
  f('room_prices', 'Room prices', 'longtext'),
  f('checkin_time', 'Check-in time', 'text', '14:00'),
  f('checkout_time', 'Check-out time', 'text', '11:00'),
  f('facilities', 'Facilities', 'longtext'),
  f('parking', 'Parking', 'text'),
  f('breakfast', 'Breakfast', 'text'),
  f('reservation_contact', 'Reservation contact information', 'text'),
  // restaurant
  f('menu', 'Menu', 'longtext', 'Main dishes and prices'),
  f('reservations_info', 'Table reservations', 'text'),
  // shops
  f('product_catalog', 'Main products or categories', 'longtext'),
  f('sizes_colors', 'Available sizes and colors', 'longtext'),
  f('stock_policy', 'Stock and availability', 'longtext'),
  f('products_sold', 'Products you sell', 'longtext'),
  // gym
  f('membership_plans', 'Membership plans and prices', 'longtext'),
  f('equipment', 'Available equipment', 'longtext'),
  f('classes', 'Classes', 'longtext'),
  f('trainers', 'Trainers', 'longtext'),
  f('trial_policy', 'Trial sessions', 'text'),
  // car rental
  f('vehicle_types', 'Vehicle types', 'longtext'),
  f('required_documents', 'Required documents', 'longtext'),
  f('deposit', 'Deposit', 'text'),
  f('min_age', 'Minimum driver age', 'text'),
  f('insurance', 'Insurance', 'longtext'),
  // travel
  f('destinations', 'Destinations', 'longtext'),
  f('visa_help', 'Visa assistance', 'text'),
  // real estate
  f('property_types', 'Property types', 'longtext'),
  f('areas_covered', 'Areas covered', 'longtext'),
  f('viewing_process', 'How viewings work', 'longtext'),
  f('agency_fees', 'Agency fees', 'text'),
  // clinic
  f('specialties', 'Specialties', 'longtext'),
  f('accepted_insurance', 'Accepted insurance', 'text'),
  f('emergency_info', 'Emergency information', 'text'),
  // services
  f('service_area', 'Service area', 'text'),
]

export const FIELD_CATALOG: Record<string, FactField> = Object.fromEntries(FIELD_LIST.map((x) => [x.key, x]))

/** Values derived from the business record rather than stored as facts. */
export const DERIVED_LABELS: Record<string, string> = {
  business_name: 'Business name',
  city: 'City',
  country: 'Country',
  contact: 'Contact details',
  contact_email: 'Contact email',
  contact_phone: 'Contact phone',
  website: 'Website',
}

const q = (key: string, question: string, requires: string[], answer: string, aliases: string[] = []): SuggestedQuestion => ({
  key, question, requires, answer, aliases,
})

const QUESTION_LIST: SuggestedQuestion[] = [
  q('location', 'Where are you located?', ['address'], 'We are located at {address}.', ['What is your address?', 'Where can I find you?']),
  q('hours', 'What are your opening hours?', ['opening_hours'], 'Our opening hours: {opening_hours}', ['When are you open?', 'What time do you close?']),
  q('contact', 'How can I contact you?', ['contact'], 'You can reach us on {contact}.', ['What is your phone number?', 'Do you have an email?']),
  q('payment', 'What payment methods do you accept?', ['payment_methods'], 'We accept: {payment_methods}.', ['Can I pay by card?']),
  q('cancellation', 'What is your cancellation policy?', ['cancellation_policy'], '{cancellation_policy}', ['Can I cancel?']),
  q('returns', 'What is your returns policy?', ['returns_policy'], '{returns_policy}', ['Can I return an item?', 'Can I get a refund?']),
  q('delivery', 'Do you offer delivery?', ['delivery_info'], '{delivery_info}', ['How long does delivery take?', 'How much is delivery?']),
  q('booking', 'How do I make a booking?', ['booking_process'], '{booking_process}', ['How can I book?', 'How do I make an appointment?']),
  q('pricing', 'How much does it cost?', ['pricing_info'], 'Our prices: {pricing_info}', ['What are your prices?']),
  q('services', 'What services do you offer?', ['services_list'], 'We offer: {services_list}', ['What do you do?']),
  // hotel
  q('rooms_count', 'How many rooms do you have?', ['rooms_count'], 'We have {rooms_count} rooms.'),
  q('room_types', 'What room types do you have?', ['room_types'], 'Our rooms: {room_types}', ['Do you have double rooms?']),
  q('room_prices', 'How much is a room?', ['room_prices'], 'Room prices: {room_prices}', ['What is the price per night?']),
  q('checkin', 'What time are check-in and check-out?', ['checkin_time', 'checkout_time'], 'Check-in is at {checkin_time} and check-out is at {checkout_time}.'),
  q('facilities', 'What facilities do you offer?', ['facilities'], 'Our facilities: {facilities}'),
  q('parking', 'Do you have parking?', ['parking'], 'Parking: {parking}'),
  q('breakfast', 'Is breakfast included?', ['breakfast'], 'Breakfast: {breakfast}'),
  q('reserve_hotel', 'How can I reserve a room?', ['reservation_contact'], 'To reserve, please contact: {reservation_contact}'),
  // restaurant
  q('menu', 'What is on the menu?', ['menu'], 'Our menu: {menu}', ['Can I see the menu?']),
  q('table_reservation', 'Can I reserve a table?', ['reservations_info'], '{reservations_info}'),
  // shops
  q('products', 'What products do you sell?', ['product_catalog'], 'We sell: {product_catalog}', ['What do you have?']),
  q('products_physical', 'What do you sell in your shop?', ['products_sold'], 'We sell: {products_sold}'),
  q('sizes_colors', 'Which sizes and colors are available?', ['sizes_colors'], '{sizes_colors}'),
  q('stock', 'Is an item in stock?', ['stock_policy'], '{stock_policy}'),
  // gym
  q('plans', 'What membership plans do you offer?', ['membership_plans'], 'Our membership plans: {membership_plans}', ['How much is a membership?']),
  q('equipment', 'What equipment do you have?', ['equipment'], 'Our equipment: {equipment}'),
  q('classes', 'Do you offer classes?', ['classes'], 'Our classes: {classes}'),
  q('trainers', 'Do you have personal trainers?', ['trainers'], '{trainers}'),
  q('trial', 'Can I try a session first?', ['trial_policy'], '{trial_policy}'),
  // car rental
  q('vehicles', 'What vehicles do you have?', ['vehicle_types'], 'Our vehicles: {vehicle_types}', ['Which cars can I rent?']),
  q('documents', 'What documents do I need?', ['required_documents'], 'Required documents: {required_documents}'),
  q('deposit', 'Is a deposit required?', ['deposit'], 'Deposit: {deposit}'),
  q('min_age', 'What is the minimum driver age?', ['min_age'], 'The minimum driver age is {min_age}.'),
  q('insurance', 'Is insurance included?', ['insurance'], '{insurance}'),
  // travel
  q('destinations', 'Which destinations do you offer?', ['destinations'], 'Our destinations: {destinations}'),
  q('visa', 'Do you help with visas?', ['visa_help'], '{visa_help}'),
  // real estate
  q('property_types', 'What types of property do you handle?', ['property_types'], '{property_types}'),
  q('areas', 'Which areas do you cover?', ['areas_covered'], 'We cover: {areas_covered}'),
  q('viewing', 'How can I arrange a viewing?', ['viewing_process'], '{viewing_process}'),
  q('fees', 'What are your fees?', ['agency_fees'], '{agency_fees}'),
  // clinic
  q('specialties', 'Which specialties do you offer?', ['specialties'], 'Our specialties: {specialties}'),
  q('insurance_accepted', 'Do you accept my insurance?', ['accepted_insurance'], 'Accepted insurance: {accepted_insurance}'),
  q('emergency', 'What should I do in an emergency?', ['emergency_info'], '{emergency_info}'),
  // services
  q('service_area', 'Which areas do you serve?', ['service_area'], 'We serve: {service_area}'),
]

export const QUESTION_CATALOG: Record<string, SuggestedQuestion> = Object.fromEntries(QUESTION_LIST.map((x) => [x.key, x]))

const COMMON_FIELDS = ['address', 'opening_hours', 'payment_methods']
const COMMON_QUESTIONS = ['location', 'hours', 'contact', 'payment']

export const CATEGORY_CONFIG: Record<BusinessCategory, { fields: string[]; questions: string[] }> = {
  hotel: {
    fields: ['address', 'map_coordinates', 'rooms_count', 'room_types', 'room_prices', 'checkin_time', 'checkout_time', 'facilities', 'parking', 'breakfast', 'reservation_contact', 'cancellation_policy'],
    questions: ['location', 'contact', 'rooms_count', 'room_types', 'room_prices', 'checkin', 'facilities', 'parking', 'breakfast', 'reserve_hotel', 'cancellation'],
  },
  restaurant: {
    fields: [...COMMON_FIELDS, 'menu', 'delivery_info', 'reservations_info'],
    questions: [...COMMON_QUESTIONS, 'menu', 'delivery', 'table_reservation'],
  },
  online_shop: {
    fields: ['product_catalog', 'pricing_info', 'sizes_colors', 'stock_policy', 'delivery_info', 'returns_policy', 'payment_methods'],
    questions: ['contact', 'payment', 'products', 'pricing', 'sizes_colors', 'stock', 'delivery', 'returns'],
  },
  physical_shop: {
    fields: [...COMMON_FIELDS, 'products_sold', 'returns_policy', 'delivery_info'],
    questions: [...COMMON_QUESTIONS, 'products_physical', 'returns', 'delivery'],
  },
  gym: {
    fields: [...COMMON_FIELDS, 'membership_plans', 'equipment', 'classes', 'trainers', 'trial_policy'],
    questions: [...COMMON_QUESTIONS, 'plans', 'equipment', 'classes', 'trainers', 'trial'],
  },
  car_rental: {
    fields: [...COMMON_FIELDS, 'vehicle_types', 'pricing_info', 'required_documents', 'deposit', 'min_age', 'insurance'],
    questions: [...COMMON_QUESTIONS, 'vehicles', 'pricing', 'documents', 'deposit', 'min_age', 'insurance'],
  },
  travel_agency: {
    fields: [...COMMON_FIELDS, 'destinations', 'services_list', 'booking_process', 'visa_help', 'cancellation_policy'],
    questions: [...COMMON_QUESTIONS, 'destinations', 'services', 'booking', 'visa', 'cancellation'],
  },
  real_estate: {
    fields: [...COMMON_FIELDS, 'property_types', 'areas_covered', 'viewing_process', 'agency_fees'],
    questions: [...COMMON_QUESTIONS, 'property_types', 'areas', 'viewing', 'fees'],
  },
  beauty_salon: {
    fields: [...COMMON_FIELDS, 'services_list', 'pricing_info', 'booking_process', 'cancellation_policy'],
    questions: [...COMMON_QUESTIONS, 'services', 'pricing', 'booking', 'cancellation'],
  },
  clinic: {
    fields: [...COMMON_FIELDS, 'specialties', 'booking_process', 'accepted_insurance', 'emergency_info'],
    questions: [...COMMON_QUESTIONS, 'specialties', 'booking', 'insurance_accepted', 'emergency'],
  },
  service_provider: {
    fields: [...COMMON_FIELDS, 'services_list', 'pricing_info', 'booking_process', 'service_area', 'cancellation_policy'],
    questions: [...COMMON_QUESTIONS, 'services', 'pricing', 'booking', 'service_area', 'cancellation'],
  },
  other: {
    fields: [...COMMON_FIELDS, 'services_list', 'pricing_info', 'booking_process'],
    questions: [...COMMON_QUESTIONS, 'services', 'pricing', 'booking'],
  },
}

const defined = <T,>(x: T | undefined): x is T => x !== undefined

export function fieldsFor(category: BusinessCategory): FactField[] {
  return CATEGORY_CONFIG[category].fields.map((k) => FIELD_CATALOG[k]).filter(defined)
}

export function questionsFor(category: BusinessCategory): SuggestedQuestion[] {
  return CATEGORY_CONFIG[category].questions.map((k) => QUESTION_CATALOG[k]).filter(defined)
}

export function labelFor(key: string): string {
  return FIELD_CATALOG[key]?.label ?? DERIVED_LABELS[key] ?? key
}

// ---------------------------------------------------------------------------
// Pure logic
// ---------------------------------------------------------------------------

type FactLike = { key: string | null; value: string }
type BusinessLike = Pick<Business, 'business_name' | 'city' | 'country' | 'contact_information' | 'website'>

/** Flat key → value map from stored facts plus values derived from the business record. */
export function buildFactMap(business: BusinessLike | null, facts: FactLike[]): Record<string, string> {
  const map: Record<string, string> = {}
  for (const fact of facts) {
    const v = fact.value.trim()
    if (fact.key && v) map[fact.key] = v
  }
  if (business) {
    map.business_name = business.business_name
    map.city = business.city
    map.country = business.country
    const { email, phone } = business.contact_information
    if (phone) map.contact_phone = phone
    if (email) map.contact_email = email
    const parts = [phone, email].filter((x): x is string => Boolean(x))
    if (parts.length) map.contact = parts.join(' or ')
    if (business.website) map.website = business.website
  }
  return map
}

const PLACEHOLDER = /\{([a-z][a-z0-9_]*)\}/g

/** Fills {placeholders}. Returns text = null if any value is missing. Never invents values. */
export function composeAnswer(template: string, facts: Record<string, string>): { text: string | null; missing: string[] } {
  const missing: string[] = []
  const text = template.replace(PLACEHOLDER, (_m, key: string) => {
    const value = facts[key]
    if (!value) {
      if (!missing.includes(key)) missing.push(key)
      return ''
    }
    return value
  })
  return { text: missing.length ? null : text.trim(), missing }
}

export function evaluateSuggestion(
  suggestion: SuggestedQuestion,
  facts: Record<string, string>,
): { answer: string; verification: Verification; missing: string[] } {
  const missing = suggestion.requires.filter((k) => !facts[k])
  if (missing.length === 0) {
    const { text } = composeAnswer(suggestion.answer, facts)
    return text ? { answer: text, verification: 'verified', missing: [] } : { answer: '', verification: 'needs_input', missing: [] }
  }
  const verification: Verification = missing.length < suggestion.requires.length ? 'incomplete' : 'needs_input'
  return { answer: '', verification, missing }
}

/** Verification state for an owner-edited answer. */
export function deriveVerification(answer: string, markedVerified: boolean): Verification {
  if (!answer.trim()) return 'needs_input'
  return markedVerified ? 'verified' : 'incomplete'
}

/** One alias per line; trims, drops empties and case-insensitive duplicates. */
export function parseAliases(text: string, max = 20): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of text.split(/\r?\n/)) {
    const phrase = raw.trim().slice(0, 500)
    const k = phrase.toLowerCase()
    if (!phrase || seen.has(k)) continue
    seen.add(k)
    out.push(phrase)
    if (out.length >= max) break
  }
  return out
}

export interface SavedTemplateQuestion {
  template_key: string | null
  status: 'active' | 'disabled'
  verification: Verification
  answer_text: string | null
}

export interface SuggestionItem {
  key: string
  question: string
  aliases: string[]
  answer: string
  verification: Verification
  enabled: boolean
  missing: string[]
}

/**
 * Builds the Q&A review list. A saved, non-empty answer is kept as the owner left it;
 * otherwise the answer is composed from facts. Questions without an answer start disabled.
 */
export function buildSuggestionItems(
  category: BusinessCategory,
  facts: Record<string, string>,
  saved: SavedTemplateQuestion[],
): SuggestionItem[] {
  return questionsFor(category).map((s) => {
    const prior = saved.find((x) => x.template_key === s.key)
    const evaluated = evaluateSuggestion(s, facts)
    if (prior?.answer_text?.trim()) {
      return {
        key: s.key, question: s.question, aliases: s.aliases,
        answer: prior.answer_text, verification: prior.verification,
        enabled: prior.status === 'active', missing: [],
      }
    }
    return {
      key: s.key, question: s.question, aliases: s.aliases,
      answer: evaluated.answer, verification: evaluated.verification,
      enabled: evaluated.answer !== '', missing: evaluated.missing,
    }
  })
}
