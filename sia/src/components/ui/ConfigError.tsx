import { Logo } from './Logo'

export function ConfigError() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-5">
      <div className="w-full max-w-lg rounded-lg border border-sand bg-white p-8 shadow-soft">
        <Logo />
        <h1 className="mt-6 text-2xl font-medium">Supabase isn’t configured</h1>
        <p className="mt-3 leading-7 text-ink-soft">
          Create a <code className="rounded bg-paper-deep px-1.5 py-0.5 text-sm">.env</code> file from{' '}
          <code className="rounded bg-paper-deep px-1.5 py-0.5 text-sm">.env.example</code>, set{' '}
          <code className="rounded bg-paper-deep px-1.5 py-0.5 text-sm">VITE_SUPABASE_URL</code> and{' '}
          <code className="rounded bg-paper-deep px-1.5 py-0.5 text-sm">VITE_SUPABASE_ANON_KEY</code>, then restart the dev server.
        </p>
      </div>
    </main>
  )
}
