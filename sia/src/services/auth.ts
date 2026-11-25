import { supabase } from '@/lib/supabase'
import { ROUTES } from '@/lib/constants'

export class ServiceError extends Error {}

function friendly(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return 'The email or password is incorrect.'
  if (m.includes('email not confirmed')) return 'Confirm your email address first. Check your inbox for the link.'
  if (m.includes('user already registered')) return 'An account with this email already exists. Log in instead.'
  if (m.includes('password should be at least')) return 'Use a password with at least 8 characters.'
  if (m.includes('rate limit') || m.includes('too many')) return 'Too many attempts. Wait a few minutes and try again.'
  if (m.includes('same password')) return 'Choose a password different from your current one.'
  if (m.includes('failed to fetch') || m.includes('network')) return 'Could not reach the server. Check your connection and try again.'
  return message
}

export async function signUp(email: string, password: string): Promise<{ needsEmailConfirmation: boolean }> {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { emailRedirectTo: `${window.location.origin}${ROUTES.login}` },
  })
  if (error) throw new ServiceError(friendly(error.message))
  // When email confirmation is enabled, no session is returned until the link is opened.
  return { needsEmailConfirmation: !data.session }
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
  if (error) throw new ServiceError(friendly(error.message))
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw new ServiceError(friendly(error.message))
}

export async function requestPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${window.location.origin}${ROUTES.resetPassword}`,
  })
  if (error) throw new ServiceError(friendly(error.message))
}

export async function updatePassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw new ServiceError(friendly(error.message))
}

/** Confirms the current password by re-authenticating before a password change. */
export async function verifyCurrentPassword(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new ServiceError('Your current password is incorrect.')
}
