import { ButtonLink } from '@/components/ui/Button'
import { LogoMark } from '@/components/ui/Logo'
import { ROUTES } from '@/lib/constants'

export default function About() {
  return (
    <section className="py-14 sm:py-20">
      <div className="container-page grid gap-12 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <h1 className="text-4xl font-medium leading-tight sm:text-5xl">About INSIA</h1>
          <div className="mt-6 max-w-2xl space-y-5 text-lg leading-8 text-ink-soft">
            <p>Businesses answer the same questions every day: opening hours, prices, availability, policies. INSIA is a platform that lets a business turn what it knows into a chatbot that can answer those questions for it.</p>
            <p>The chatbot is built around your own information, not a generic script. When customers ask something it can’t answer, you see the question and teach INSIA the answer, so it improves over time.</p>
            <p>INSIA is in early development. This site covers account creation and your business profile. Knowledge management, conversations, messaging channels, the developer API and credits are planned for later releases.</p>
          </div>
          <ButtonLink to={ROUTES.register} size="lg" className="mt-9">Get started</ButtonLink>
        </div>
        <div className="hidden items-start justify-center lg:flex">
          <div className="rounded-lg border border-sand bg-white p-12"><LogoMark className="w-44" /></div>
        </div>
      </div>
    </section>
  )
}
