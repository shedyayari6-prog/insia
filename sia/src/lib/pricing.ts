/**
 * Pricing configuration. No final prices exist yet.
 * Set `price` (e.g. "$29"), `period` and `credits` on each plan when they are decided;
 * plans with a null price render as "Pricing to be announced".
 */
export interface Plan {
  id: string
  name: string
  summary: string
  price: string | null
  period: string | null
  credits: string | null
  features: string[]
  featured?: boolean
}

export const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    summary: 'For a single business getting its first chatbot online.',
    price: null,
    period: null,
    credits: null,
    features: ['One business profile', 'Website chatbot', 'Monthly credit allowance'],
  },
  {
    id: 'growth',
    name: 'Growth',
    summary: 'For businesses answering customers on several channels.',
    price: null,
    period: null,
    credits: null,
    features: ['Everything in Starter', 'Messaging channel integrations', 'Larger credit allowance'],
    featured: true,
  },
  {
    id: 'scale',
    name: 'Scale',
    summary: 'For teams with high conversation volume or custom needs.',
    price: null,
    period: null,
    credits: null,
    features: ['Everything in Growth', 'Developer API access', 'Highest credit allowance'],
  },
]
