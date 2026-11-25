import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MailCheck } from 'lucide-react'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { TextField } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Feedback'
import { signUp } from '@/services/auth'
import { isEmail } from '@/lib/validation'
import { ROUTES } from '@/lib/constants'

export default function Register() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirm?: string }>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    const next: typeof errors = {}
    if (!isEmail(email)) next.email = 'Enter a valid email address.'
    if (password.length < 8) next.password = 'Use at least 8 characters.'
    if (confirm !== password) next.confirm = 'The passwords do not match.'
    setErrors(next)
    if (Object.keys(next).length) return
    setLoading(true)
    try {
      const { needsEmailConfirmation } = await signUp(email, password)
      if (needsEmailConfirmation) setSentTo(email.trim())
      else navigate(ROUTES.onboarding, { replace: true })
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not create your account. Try again.')
    } finally {
      setLoading(false)
    }
  }

  if (sentTo) {
    return (
      <AuthLayout title="Check your email" footer={<Link to={ROUTES.login} className="font-medium text-ink underline underline-offset-4">Back to log in</Link>}>
        <div className="flex gap-3 rounded-lg border border-sand bg-white p-5">
          <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-gold-dark" aria-hidden="true" />
          <p className="leading-7 text-ink-soft">
            We sent a confirmation link to <strong className="text-ink">{sentTo}</strong>. Open it to activate your account, then log in to set up your business.
          </p>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Create your INSIA account"
      subtitle="You’ll set up your business profile in the next step."
      footer={<>Already have an account? <Link to={ROUTES.login} className="font-medium text-ink underline underline-offset-4">Log in</Link></>}
    >
      <form onSubmit={(e) => void onSubmit(e)} noValidate className="space-y-5">
        {formError && <Alert tone="error">{formError}</Alert>}
        <TextField label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
        <TextField label="Password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} hint="At least 8 characters." />
        <TextField label="Confirm password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={errors.confirm} />
        <Button type="submit" size="lg" className="w-full" loading={loading}>Create account</Button>
        <p className="text-xs leading-5 text-ink-soft">
          By creating an account you agree to the <Link to={ROUTES.terms} className="underline underline-offset-2">Terms of service</Link> and <Link to={ROUTES.privacy} className="underline underline-offset-2">Privacy policy</Link>.
        </p>
      </form>
    </AuthLayout>
  )
}
