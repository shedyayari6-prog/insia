import { ButtonLink } from '@/components/ui/Button'
import { ROUTES } from '@/lib/constants'

export default function NotFound() {
  return (
    <section className="py-24">
      <div className="container-page">
        <h1 className="text-4xl font-medium">Page not found</h1>
        <p className="mt-3 max-w-md text-lg text-ink-soft">The page you’re looking for doesn’t exist or has moved.</p>
        <ButtonLink to={ROUTES.home} className="mt-8">Back to home</ButtonLink>
      </div>
    </section>
  )
}
