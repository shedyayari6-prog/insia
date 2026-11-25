import { Route, Routes } from 'react-router-dom'
import { isSupabaseConfigured } from '@/lib/supabase'
import { ConfigError } from '@/components/ui/ConfigError'
import { ProtectedRoute, PublicOnlyRoute, RequireOnboarded } from '@/components/navigation/Guards'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { DashboardLayout, DASHBOARD_NAV } from '@/components/layout/DashboardLayout'
import Landing from '@/pages/public/Landing'
import Pricing from '@/pages/public/Pricing'
import About from '@/pages/public/About'
import { Privacy, Terms } from '@/pages/public/Legal'
import NotFound from '@/pages/public/NotFound'
import Login from '@/pages/auth/Login'
import Register from '@/pages/auth/Register'
import ForgotPassword from '@/pages/auth/ForgotPassword'
import ResetPassword from '@/pages/auth/ResetPassword'
import Onboarding from '@/pages/onboarding/Onboarding'
import Overview from '@/pages/dashboard/Overview'
import BusinessProfile from '@/pages/dashboard/BusinessProfile'
import KnowledgeCenter from '@/pages/dashboard/KnowledgeCenter'
import TestChatbot from '@/pages/dashboard/TestChatbot'
import Settings from '@/pages/dashboard/Settings'
import ComingSoon from '@/pages/dashboard/ComingSoon'
import WebsiteChatbot from '@/pages/dashboard/WebsiteChatbot'
import Conversations from '@/pages/dashboard/Conversations'
import ConversationDetail from '@/pages/dashboard/ConversationDetail'

const SOON_ROUTES = DASHBOARD_NAV.filter((n) => n.soon)

export default function App() {
  if (!isSupabaseConfigured) return <ConfigError />
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<Landing />} />
        <Route path="pricing" element={<Pricing />} />
        <Route path="about" element={<About />} />
        <Route path="privacy" element={<Privacy />} />
        <Route path="terms" element={<Terms />} />
      </Route>

      <Route element={<PublicOnlyRoute />}>
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
      </Route>
      <Route path="reset-password" element={<ResetPassword />} />

      <Route element={<ProtectedRoute />}>
        <Route path="onboarding" element={<Onboarding />} />
        <Route element={<RequireOnboarded />}>
          <Route path="dashboard" element={<DashboardLayout />}>
            <Route index element={<Overview />} />
            <Route path="business" element={<BusinessProfile />} />
            <Route path="knowledge" element={<KnowledgeCenter />} />
            <Route path="test" element={<TestChatbot />} />
            <Route path="website-chatbot" element={<WebsiteChatbot />} />
            <Route path="conversations" element={<Conversations />} />
            <Route path="conversations/:id" element={<ConversationDetail />} />
            <Route path="settings" element={<Settings />} />
            {SOON_ROUTES.map((n) => (
              <Route key={n.to} path={n.to.replace('/dashboard/', '')} element={<ComingSoon label={n.label} icon={n.icon} />} />
            ))}
          </Route>
        </Route>
      </Route>

      <Route element={<PublicLayout />}>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
