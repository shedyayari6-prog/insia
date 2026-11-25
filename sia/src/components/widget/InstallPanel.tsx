import { useState } from 'react'
import { Check, Copy, ExternalLink } from 'lucide-react'
import { Alert } from '@/components/ui/Feedback'
import { Button } from '@/components/ui/Button'
import { Panel } from '@/components/ui/Card'
import { buildSnippet, buildTestPageUrl, isLocalOrigin } from '@/lib/widgetDefaults'

const GUIDES: { name: string; steps: string[] }[] = [
  {
    name: 'A website you or a developer built (HTML)',
    steps: ['Open the page file (for most sites, one shared footer or layout file).', 'Paste the code just before the closing </body> tag.', 'Save and upload the file, then refresh your website.'],
  },
  {
    name: 'WordPress',
    steps: ['Install a free plugin that adds code to your footer, such as “WPCode” or “Insert Headers and Footers”.', 'Open the plugin, choose the footer scripts area, and paste the code.', 'Save, then refresh your website.'],
  },
  {
    name: 'Shopify',
    steps: ['Go to Online Store → Themes → the “…” menu next to your theme → Edit code.', 'Open layout/theme.liquid.', 'Paste the code just before </body> and save.'],
  },
  {
    name: 'Wix',
    steps: ['Go to Settings → Custom code (this can need a paid plan).', 'Choose Add custom code and paste the code.', 'Set it to load on All pages, placed at the end of the body, then apply.'],
  },
  {
    name: 'Squarespace',
    steps: ['Go to Settings → Advanced → Code Injection (this can need a Business plan).', 'Paste the code into the Footer box.', 'Save, then refresh your website.'],
  },
  {
    name: 'Webflow',
    steps: ['Open Project settings → Custom code.', 'Paste the code into the Footer code box.', 'Save and publish your site (custom code needs a paid site plan).'],
  },
]

export function InstallPanel({ publicKey, enabled }: { publicKey: string; enabled: boolean }) {
  const [copied, setCopied] = useState(false)
  const origin = window.location.origin
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? ''
  const snippet = buildSnippet(origin, supabaseUrl, publicKey)
  const testUrl = buildTestPageUrl(origin, supabaseUrl, publicKey)

  async function copy() {
    try {
      await navigator.clipboard.writeText(snippet)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Panel title="Install on your website" description="Copy this code once. You don’t need to change it again when you update your chatbot’s look.">
      <div className="space-y-5">
        {!enabled && <Alert tone="info">Your chatbot is hidden. The code below works, but visitors won’t see the chat until you turn on “Show the chatbot on my website” and save.</Alert>}
        {isLocalOrigin(origin) && (
          <Alert tone="info">
            INSIA is currently running on your own computer ({window.location.host}). Other people’s websites can’t load the chat from there. Publish INSIA to a public address first (for example on Vercel), then copy this code again.
          </Alert>
        )}
        <div>
          <pre className="overflow-x-auto rounded-md bg-ink p-4 text-xs leading-6 text-sand" aria-label="Installation code"><code>{snippet}</code></pre>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={() => void copy()}>
              {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
              {copied ? 'Copied' : 'Copy code'}
            </Button>
            <a href={testUrl} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-sand bg-white px-4 text-sm font-medium text-ink hover:border-slate">
              <ExternalLink className="h-4 w-4" aria-hidden="true" /> Open a test page
            </a>
          </div>
          <p className="mt-3 text-sm text-ink-soft">This code contains only your public chat ID. It carries no passwords or private keys, so it is safe to put on a public page.</p>
        </div>

        <div>
          <h3 className="font-display text-lg font-medium">Where to paste it</h3>
          <p className="mt-1 text-sm text-ink-soft">Menus can look slightly different depending on your website builder. If you get stuck, send this page to the person who manages your website.</p>
          <div className="mt-3 divide-y divide-sand-light rounded-md border border-sand">
            {GUIDES.map((g) => (
              <details key={g.name} className="group px-4 py-3">
                <summary className="cursor-pointer text-sm font-medium">{g.name}</summary>
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-ink-soft">
                  {g.steps.map((s) => <li key={s}>{s}</li>)}
                </ol>
              </details>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  )
}
