import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { TextField } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Feedback'
import { requestPasswordReset } from '@/services/auth'
import { isEmail } from '@/lib/validation'
import { ROUTES } from '@/lib/constants'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [fieldError, setFieldError] = useState<string | undefined>()
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!isEmail(email)) { setFieldError('Enter a valid email address.'); return }
    setFieldError(undefined)
    setLoading(true)
    try {
      await requestPasswordReset(email)
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the reset email. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your email and we’ll send you a link to choose a new password."
      footer={<Link to={ROUTES.login} className="font-medium text-ink underline underline-offset-4">Back to log in</Link>}
    >
      {sent ? (
        <Alert tone="success">If an account exists for {email.trim()}, a reset link is on its way. Check your inbox and spam folder.</Alert>
      ) : (
        <form onSubmit={(e) => void onSubmit(e)} noValidate className="space-y-5">
          {error && <Alert tone="error">{error}</Alert>}
          <TextField label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={fieldError} />
          <Button type="submit" size="lg" className="w-full" loading={loading}>Send reset link</Button>
        </form>
      )}
    </AuthLayout>
  )
}
