import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { TextField } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Feedback'
import { signIn } from '@/services/auth'
import { isEmail } from '@/lib/validation'
import { ROUTES } from '@/lib/constants'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    const next: typeof errors = {}
    if (!isEmail(email)) next.email = 'Enter a valid email address.'
    if (!password) next.password = 'Enter your password.'
    setErrors(next)
    if (Object.keys(next).length) return
    setLoading(true)
    try {
      await signIn(email, password)
      navigate(ROUTES.dashboard, { replace: true })
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not log in. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Log in to INSIA"
      subtitle="Welcome back. Pick up where you left off."
      footer={<>New to INSIA? <Link to={ROUTES.register} className="font-medium text-ink underline underline-offset-4">Create an account</Link></>}
    >
      <form onSubmit={(e) => void onSubmit(e)} noValidate className="space-y-5">
        {formError && <Alert tone="error">{formError}</Alert>}
        <TextField label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
        <TextField label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} />
        <div className="text-right text-sm">
          <Link to={ROUTES.forgotPassword} className="text-ink-soft underline underline-offset-4 hover:text-ink">Forgot your password?</Link>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={loading}>Log in</Button>
      </form>
    </AuthLayout>
  )
}
