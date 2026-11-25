import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { BusinessProvider, useBusiness } from '@/contexts/BusinessContext'
import { Alert, FullPageSpinner } from '@/components/ui/Feedback'
import { Button } from '@/components/ui/Button'
import { ROUTES } from '@/lib/constants'

/** Requires a signed-in user; provides the business context to everything inside. */
export function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <FullPageSpinner />
  if (!user) return <Navigate to={ROUTES.login} replace state={{ from: location.pathname }} />
  return (
    <BusinessProvider>
      <Outlet />
    </BusinessProvider>
  )
}

/** Login/register are not shown to signed-in users. */
export function PublicOnlyRoute() {
  const { user, loading, isRecovery } = useAuth()
  if (loading) return <FullPageSpinner />
  if (user && !isRecovery) return <Navigate to={ROUTES.dashboard} replace />
  return <Outlet />
}

/** Dashboard routes need completed onboarding. */
export function RequireOnboarded() {
  const { business, loading, error, reload } = useBusiness()
  if (loading) return <FullPageSpinner />
  if (error)
    return (
      <div className="mx-auto max-w-md px-5 py-24 text-center">
        <Alert tone="error">{error}</Alert>
        <Button className="mt-4" variant="secondary" onClick={() => void reload()}>Try again</Button>
      </div>
    )
  if (!business?.onboarding_completed) return <Navigate to={ROUTES.onboarding} replace />
  return <Outlet />
}
