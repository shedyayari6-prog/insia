import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ButtonLink } from '@/components/ui/Button'
import { BUSINESS_CATEGORIES, ROUTES } from '@/lib/constants'
import {
  ApiPreview, ChannelsPreview, ChatPreview, KnowledgePreview, LearningPreview, OpportunityPreview,
} from '@/components/previews/Previews'

function Split({ id, title, children, preview, flip, tone = 'paper' }: {
  id?: string; title: string; children: ReactNode; preview: ReactNode; flip?: boolean; tone?: 'paper' | 'white'
}) {
  return (
    <section id={id} className={`border-t border-sand/70 py-16 sm:py-24 ${tone === 'white' ? 'bg-white' : ''}`}>
      <div className="container-page grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div className={flip ? 'lg:order-2' : ''}>
          <h2 className="text-3xl font-medium leading-tight sm:text-4xl">{title}</h2>
          <div className="mt-4 max-w-xl space-y-4 text-lg leading-8 text-ink-soft">{children}</div>
        </div>
        <div className={flip ? 'lg:order-1' : ''}>{preview}</div>
      </div>
    </section>
  )
}

const STEPS = [
  ['Describe your business', 'Tell INSIA what you do, where you are and how customers reach you.'],
  ['Add what you know', 'Add the details customers ask about, such as hours, services, policies and answers.'],
  ['Connect where customers write', 'Put the chatbot on your website and the messaging channels you already use.'],
  ['Review and improve', 'See the questions INSIA couldn’t answer and add the answers once.'],
]

export default function Landing() {
  return (
    <>
      {/* 1. Hero */}
      <section className="pb-16 pt-14 sm:pb-24 sm:pt-20">
        <div className="container-page grid items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          <div>
            <h1 className="text-[2.6rem] font-medium leading-[1.05] sm:text-6xl lg:text-[4.25rem]">
              Your business. Your knowledge. One smarter way to communicate.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-ink-soft sm:text-xl sm:leading-9">
              Create a chatbot that understands your business, answers customers and learns from the questions they ask.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <ButtonLink to={ROUTES.register} size="lg">Get started</ButtonLink>
              <a href="#how-it-works" className="inline-flex h-12 items-center justify-center rounded-md border border-sand bg-white px-6 text-base font-medium hover:border-slate">Explore the platform</a>
            </div>
          </div>
          <ChatPreview />
        </div>
      </section>

      {/* 2. How INSIA works */}
      <section id="how-it-works" className="border-t border-sand/70 bg-white py-16 sm:py-24">
        <div className="container-page">
          <h2 className="max-w-2xl text-3xl font-medium sm:text-4xl">How INSIA works</h2>
          <ol className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(([t, d], i) => (
              <li key={t} className="border-t-2 border-gold pt-5">
                <p className="font-display text-sm text-ink-soft">Step {i + 1}</p>
                <h3 className="mt-1 text-xl font-medium">{t}</h3>
                <p className="mt-2 leading-7 text-ink-soft">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 3. Universal business support */}
      <section className="border-t border-sand/70 py-16 sm:py-24">
        <div className="container-page grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:gap-16">
          <div>
            <h2 className="text-3xl font-medium leading-tight sm:text-4xl">Built for any kind of business</h2>
            <p className="mt-4 max-w-xl text-lg leading-8 text-ink-soft">
              A hotel and a gym get asked very different questions. INSIA starts from your category and your own details, and doesn’t force every business into one script. If your category isn’t listed, you can enter your own.
            </p>
          </div>
          <ul className="flex flex-wrap content-start gap-2.5" aria-label="Business categories">
            {BUSINESS_CATEGORIES.filter((c) => c.value !== 'other').map((c) => (
              <li key={c.value} className="rounded-md border border-sand bg-white px-4 py-2.5 text-[0.95rem] font-medium">{c.label}</li>
            ))}
            <li className="rounded-md border border-dashed border-slate px-4 py-2.5 text-[0.95rem] text-ink-soft">Your own category</li>
          </ul>
        </div>
      </section>

      {/* 4. Business-specific knowledge */}
      <Split title="Answers that come from your business" tone="white" preview={<KnowledgePreview />}>
        <p>INSIA answers from what you tell it about your services, prices, hours and policies, so customers get your information, not a generic reply.</p>
        <p>You stay in control of what the chatbot knows and can change it at any time.</p>
      </Split>

      {/* 5. Automatic learning */}
      <Split title="It gets better with every question" flip preview={<LearningPreview />}>
        <p>When a customer asks something INSIA can’t answer yet, the question is collected for you to review.</p>
        <p>Add the answer once and it is available for every customer who asks next.</p>
      </Split>

      {/* 6. Customer opportunity detection */}
      <Split title="Notice customers who are ready to act" tone="white" preview={<OpportunityPreview />}>
        <p>A question about dates, quotes or availability often means someone is ready to book or buy. INSIA flags those conversations so you can follow up.</p>
      </Split>

      {/* 7. WhatsApp and social integrations */}
      <Split title="Meet customers where they already write" flip preview={<ChannelsPreview />}>
        <p>INSIA is being built to work on WhatsApp and social messaging platforms, with every conversation gathered in one place.</p>
        <p>These integrations are planned for a later release.</p>
      </Split>

      {/* 8. Website chatbot and developer API */}
      <Split title="On your website, or inside your own software" tone="white" preview={<ApiPreview />}>
        <p>Add a chatbot to your website, or let your developers connect INSIA to your own applications through an API.</p>
        <p>The website chatbot and the developer API are planned for a later release.</p>
      </Split>

      {/* 9. Credit-based usage */}
      <section className="bg-ink py-16 text-paper sm:py-24">
        <div className="container-page grid items-center gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <h2 className="text-3xl font-medium leading-tight sm:text-4xl">Pay for what your chatbot actually does</h2>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-sand">
              INSIA uses a credit-based usage model. Plans include credits, and conversations use them as they happen. Pricing will be published before launch.
            </p>
          </div>
          <div className="flex lg:justify-end">
            <Link to={ROUTES.pricing} className="inline-flex h-12 items-center justify-center rounded-md bg-paper px-6 text-base font-medium text-ink hover:bg-white">See how pricing works</Link>
          </div>
        </div>
      </section>

      {/* Closing call to action */}
      <section className="py-16 sm:py-24">
        <div className="container-page flex flex-wrap items-center justify-between gap-6">
          <h2 className="max-w-xl text-3xl font-medium leading-tight sm:text-4xl">Get your business ready for its first conversation.</h2>
          <ButtonLink to={ROUTES.register} size="lg">Get started</ButtonLink>
        </div>
      </section>
    </>
  )
}
