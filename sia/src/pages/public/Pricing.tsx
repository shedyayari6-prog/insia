import { Check } from 'lucide-react'
import { ButtonLink } from '@/components/ui/Button'
import { PLANS } from '@/lib/pricing'
import { ROUTES } from '@/lib/constants'

export default function Pricing() {
  return (
    <>
      <section className="pb-10 pt-14 sm:pt-20">
        <div className="container-page">
          <h1 className="max-w-3xl text-4xl font-medium leading-tight sm:text-5xl">Pricing based on what your chatbot does</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-ink-soft">
            INSIA uses a credit-based usage model. Each plan includes a set of credits, and your chatbot uses credits as it handles conversations. Final prices and credit amounts have not been set yet.
          </p>
        </div>
      </section>

      <section className="pb-16 sm:pb-24">
        <div className="container-page grid gap-5 md:grid-cols-3">
          {PLANS.map((p) => (
            <article key={p.id} className={`flex flex-col rounded-lg border bg-white p-6 sm:p-7 ${p.featured ? 'border-gold shadow-lift' : 'border-sand shadow-soft'}`}>
              <h2 className="text-2xl font-medium">{p.name}</h2>
              <p className="mt-2 text-sm leading-6 text-ink-soft">{p.summary}</p>
              <div className="mt-6 border-y border-sand-light py-5">
                {p.price ? (
                  <p className="font-display text-4xl font-medium">{p.price}{p.period && <span className="text-base text-ink-soft"> / {p.period}</span>}</p>
                ) : (
                  <p className="font-display text-2xl text-ink-soft">Pricing to be announced</p>
                )}
                <p className="mt-1 text-sm text-ink-soft">{p.credits ? `${p.credits} credits included` : 'Credit amount to be announced'}</p>
              </div>
              <ul className="mt-5 flex-1 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2.5 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-gold-dark" aria-hidden="true" />{f}</li>
                ))}
              </ul>
              <ButtonLink to={ROUTES.register} variant={p.featured ? 'primary' : 'secondary'} className="mt-7 w-full">Get started</ButtonLink>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-sand/70 bg-white py-16 sm:py-20">
        <div className="container-page grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <h2 className="text-3xl font-medium">How credits work</h2>
          <div className="space-y-4 text-lg leading-8 text-ink-soft">
            <p>Credits measure usage. When your chatbot works for your customers, it uses credits from your balance.</p>
            <p>How many credits each action costs, and what each plan includes, will be published here before launch. Plans shown above are a layout preview and may change.</p>
          </div>
        </div>
      </section>
    </>
  )
}
