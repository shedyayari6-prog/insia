import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { getProfile } from '@/services/profile'
import type { Profile } from '@/types'

interface AuthState {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  /** True while the user arrived from a password-reset email link. */
  isRecovery: boolean
  refreshProfile: () => Promise<void>
  setProfile: (p: Profile) => void
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isRecovery, setIsRecovery] = useState(false)

  useEffect(() => {
    let active = true
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active) setSession(data.session)
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false)
      })

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next)
      if (event === 'PASSWORD_RECOVERY') setIsRecovery(true)
      if (event === 'SIGNED_OUT') {
        setProfile(null)
        setIsRecovery(false)
      }
    })
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const userId = session?.user.id
  const refreshProfile = useCallback(async () => {
    if (!userId) return
    try {
      setProfile(await getProfile(userId))
    } catch {
      setProfile(null)
    }
  }, [userId])

  useEffect(() => {
    if (!userId) return
    void refreshProfile()
  }, [userId, refreshProfile])

  const value = useMemo<AuthState>(
    () => ({ session, user: session?.user ?? null, profile, loading, isRecovery, refreshProfile, setProfile }),
    [session, profile, loading, isRecovery, refreshProfile],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
