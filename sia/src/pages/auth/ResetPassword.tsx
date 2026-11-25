import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { TextField } from '@/components/ui/Field'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Alert, FullPageSpinner } from '@/components/ui/Feedback'
import { useAuth } from '@/contexts/AuthContext'
import { updatePassword } from '@/services/auth'
import { ROUTES } from '@/lib/constants'

export default function ResetPassword() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  if (authLoading) return <FullPageSpinner />

  if (!user) {
    return (
      <AuthLayout title="This reset link isn’t valid" subtitle="The link may have expired or already been used.">
        <ButtonLink to={ROUTES.forgotPassword} size="lg" className="w-full">Request a new link</ButtonLink>
      </AuthLayout>
    )
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    const next: typeof errors = {}
    if (password.length < 8) next.password = 'Use at least 8 characters.'
    if (confirm !== password) next.confirm = 'The passwords do not match.'
    setErrors(next)
    if (Object.keys(next).length) return
    setLoading(true)
    try {
      await updatePassword(password)
      setDone(true)
      window.setTimeout(() => navigate(ROUTES.dashboard, { replace: true }), 1500)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not update your password. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Choose a new password" footer={<Link to={ROUTES.dashboard} className="underline underline-offset-4">Skip and go to dashboard</Link>}>
      {done ? (
        <Alert tone="success">Password updated. Taking you to your dashboard…</Alert>
      ) : (
        <form onSubmit={(e) => void onSubmit(e)} noValidate className="space-y-5">
          {formError && <Alert tone="error">{formError}</Alert>}
          <TextField label="New password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} hint="At least 8 characters." />
          <TextField label="Confirm new password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={errors.confirm} />
          <Button type="submit" size="lg" className="w-full" loading={loading}>Update password</Button>
        </form>
      )}
    </AuthLayout>
  )
}
