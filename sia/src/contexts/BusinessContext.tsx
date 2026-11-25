import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { completeOnboarding, getMyBusiness, saveBusiness, updateOnboardingStep } from '@/services/business'
import type { Business, BusinessFormValues } from '@/types'

interface BusinessState {
  business: Business | null
  loading: boolean
  error: string | null
  reload: () => Promise<void>
  save: (values: BusinessFormValues, completed?: boolean) => Promise<Business>
  finishOnboarding: () => Promise<Business>
  /** Records the next onboarding step. Pass the id when the business was just created. */
  setOnboardingStep: (step: number, businessId?: string) => Promise<void>
}

const BusinessContext = createContext<BusinessState | undefined>(undefined)

export function BusinessProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setError(null)
    try {
      setBusiness(await getMyBusiness(userId))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your business.')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void reload()
  }, [reload])

  const save = useCallback(
    async (values: BusinessFormValues, completed?: boolean) => {
      if (!userId) throw new Error('Not signed in.')
      const next = await saveBusiness(userId, values, completed ?? business?.onboarding_completed ?? false)
      setBusiness(next)
      return next
    },
    [userId, business?.onboarding_completed],
  )

  const finishOnboarding = useCallback(async () => {
    if (!business) throw new Error('Save your business details first.')
    const next = await completeOnboarding(business)
    setBusiness(next)
    return next
  }, [business])

  const setOnboardingStep = useCallback(
    async (step: number, businessId?: string) => {
      const id = businessId ?? business?.id
      if (!id) return
      setBusiness(await updateOnboardingStep(id, step))
    },
    [business?.id],
  )

  const value = useMemo(
    () => ({ business, loading, error, reload, save, finishOnboarding, setOnboardingStep }),
    [business, loading, error, reload, save, finishOnboarding, setOnboardingStep],
  )
  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useBusiness(): BusinessState {
  const ctx = useContext(BusinessContext)
  if (!ctx) throw new Error('useBusiness must be used inside BusinessProvider')
  return ctx
}
