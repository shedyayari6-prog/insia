import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Feedback'
import { Panel, PageHeader } from '@/components/ui/Card'
import { TextField } from '@/components/ui/Field'
import { useAuth } from '@/contexts/AuthContext'
import { signOut, updatePassword, verifyCurrentPassword } from '@/services/auth'
import { updateProfile } from '@/services/profile'
import { ROUTES } from '@/lib/constants'

export default function Settings() {
  const { user, profile, setProfile } = useAuth()
  const navigate = useNavigate()

  // Account
  const [name, setName] = useState(profile?.full_name ?? '')
  const [nameError, setNameError] = useState<string | undefined>()
  const [accountMsg, setAccountMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const [accountBusy, setAccountBusy] = useState(false)

  // Password
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [pwErrors, setPwErrors] = useState<{ current?: string; next?: string; confirm?: string }>({})
  const [pwMsg, setPwMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const [pwBusy, setPwBusy] = useState(false)

  // Preferences
  const [productUpdates, setProductUpdates] = useState(Boolean(profile?.preferences.product_updates))
  const [prefMsg, setPrefMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const [prefBusy, setPrefBusy] = useState(false)

  const [logoutBusy, setLogoutBusy] = useState(false)

  async function saveAccount(e: FormEvent) {
    e.preventDefault()
    setAccountMsg(null)
    if (!name.trim()) { setNameError('Enter your full name.'); return }
    setNameError(undefined)
    setAccountBusy(true)
    try {
      setProfile(await updateProfile(user!.id, { full_name: name.trim() }))
      setAccountMsg({ tone: 'success', text: 'Account details saved.' })
    } catch (err) {
      setAccountMsg({ tone: 'error', text: err instanceof Error ? err.message : 'Could not save.' })
    } finally { setAccountBusy(false) }
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault()
    setPwMsg(null)
    const found: typeof pwErrors = {}
    if (!current) found.current = 'Enter your current password.'
    if (next.length < 8) found.next = 'Use at least 8 characters.'
    if (confirm !== next) found.confirm = 'The passwords do not match.'
    setPwErrors(found)
    if (Object.keys(found).length) return
    setPwBusy(true)
    try {
      await verifyCurrentPassword(user!.email ?? '', current)
      await updatePassword(next)
      setCurrent(''); setNext(''); setConfirm('')
      setPwMsg({ tone: 'success', text: 'Password updated.' })
    } catch (err) {
      setPwMsg({ tone: 'error', text: err instanceof Error ? err.message : 'Could not update your password.' })
    } finally { setPwBusy(false) }
  }

  async function savePrefs(e: FormEvent) {
    e.preventDefault()
    setPrefMsg(null)
    setPrefBusy(true)
    try {
      setProfile(await updateProfile(user!.id, { preferences: { ...profile?.preferences, product_updates: productUpdates } }))
      setPrefMsg({ tone: 'success', text: 'Preferences saved.' })
    } catch (err) {
      setPrefMsg({ tone: 'error', text: err instanceof Error ? err.message : 'Could not save.' })
    } finally { setPrefBusy(false) }
  }

  async function logout() {
    setLogoutBusy(true)
    try {
      await signOut()
      navigate(ROUTES.home, { replace: true })
    } finally { setLogoutBusy(false) }
  }

  return (
    <>
      <PageHeader title="Settings" description="Manage your account and sign-in details." />
      <div className="space-y-6">
        <Panel title="Account information">
          <form onSubmit={(e) => void saveAccount(e)} noValidate className="space-y-5">
            {accountMsg && <Alert tone={accountMsg.tone}>{accountMsg.text}</Alert>}
            <TextField label="Full name" value={name} onChange={(e) => setName(e.target.value)} error={nameError} maxLength={120} autoComplete="name" />
            <TextField label="Email" value={user?.email ?? ''} disabled readOnly hint="Your sign-in email can’t be changed here yet." />
            <div className="flex justify-end"><Button type="submit" loading={accountBusy}>Save changes</Button></div>
          </form>
        </Panel>

        <Panel title="Password" description="Choose a new password for signing in.">
          <form onSubmit={(e) => void changePassword(e)} noValidate className="space-y-5">
            {pwMsg && <Alert tone={pwMsg.tone}>{pwMsg.text}</Alert>}
            <TextField label="Current password" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} error={pwErrors.current} />
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField label="New password" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} error={pwErrors.next} hint="At least 8 characters." />
              <TextField label="Confirm new password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={pwErrors.confirm} />
            </div>
            <div className="flex justify-end"><Button type="submit" loading={pwBusy}>Update password</Button></div>
          </form>
        </Panel>

        <Panel title="Preferences">
          <form onSubmit={(e) => void savePrefs(e)} className="space-y-5">
            {prefMsg && <Alert tone={prefMsg.tone}>{prefMsg.text}</Alert>}
            <label className="flex items-start gap-3">
              <input type="checkbox" className="mt-1 h-4 w-4 rounded border-sand accent-ink" checked={productUpdates} onChange={(e) => setProductUpdates(e.target.checked)} />
              <span>
                <span className="block text-sm font-medium">Product updates by email</span>
                <span className="block text-sm text-ink-soft">We’ll use this choice when we start sending announcements.</span>
              </span>
            </label>
            <div className="flex justify-end"><Button type="submit" loading={prefBusy}>Save preferences</Button></div>
          </form>
        </Panel>

        <Panel title="Session">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-ink-soft">Signed in as {user?.email}.</p>
            <Button variant="danger" onClick={() => void logout()} loading={logoutBusy}>Log out</Button>
          </div>
        </Panel>
      </div>
    </>
  )
}
