import type { ReactNode } from 'react'

function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="py-14 sm:py-20">
      <div className="container-page max-w-3xl">
        <h1 className="text-4xl font-medium sm:text-5xl">{title}</h1>
        <div role="note" className="mt-6 rounded-md border border-sand bg-white px-4 py-3 text-sm text-ink-soft">
          This is a draft for the initial release and has not been reviewed by a lawyer. Replace it with your final legal text before accepting real customers.
        </div>
        <div className="prose-legal">{children}</div>
      </div>
    </section>
  )
}

export function Privacy() {
  return (
    <LegalPage title="Privacy policy">
      <h2>What we collect</h2>
      <p>When you create an account we collect your email address and password (stored securely by our authentication provider). During setup we collect your name and the business details you enter, such as business name, category, location, description and contact details.</p>
      <h2>How we use it</h2>
      <p>We use this information to provide your account, show your business profile and prepare your chatbot. We don’t sell your personal information.</p>
      <h2>Where it is stored</h2>
      <p>Your data is stored with Supabase. Access to your business data is restricted to your own account.</p>
      <h2>Your choices</h2>
      <p>You can view and edit your business information and account details in the dashboard. To delete your account or data, contact us using the details you will find here before launch.</p>
    </LegalPage>
  )
}

export function Terms() {
  return (
    <LegalPage title="Terms of service">
      <h2>Using INSIA</h2>
      <p>You may use INSIA to create and manage a chatbot for your own business. You are responsible for the information you provide and for keeping your login details secure.</p>
      <h2>Acceptable use</h2>
      <p>Do not use INSIA for unlawful, deceptive or harmful purposes, or to interfere with the service.</p>
      <h2>Service changes</h2>
      <p>INSIA is under active development. Features may change, and some sections of the product are marked as coming in a later phase. Pricing and the credit-based usage model will be published before paid use begins.</p>
      <h2>Contact</h2>
      <p>Contact details will be published here before launch.</p>
    </LegalPage>
  )
}
