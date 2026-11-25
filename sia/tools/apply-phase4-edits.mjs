/**
 * Applies the few small edits Phase 4 needs in files you already have (and may have re-branded):
 *   - src/components/layout/DashboardLayout.tsx : Conversations becomes a real page; adds "Website Chatbot"
 *   - src/App.tsx                                : adds the three new routes
 *   - tsconfig.json                              : type-checks the widget code too
 * It is safe to run more than once. It changes nothing it cannot find, and tells you what to do by hand.
 *
 *   node tools/apply-phase4-edits.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const results = []
const report = (file, status, note = '') => results.push({ file, status, note })

function edit(file, fn) {
  if (!existsSync(file)) return report(file, 'MISSING', 'file not found: run this from the project root')
  const before = readFileSync(file, 'utf8')
  const out = fn(before)
  if (out === null) return
  if (out !== before) { writeFileSync(file, out); report(file, 'UPDATED') } else report(file, 'ALREADY OK')
}

// ---- DashboardLayout.tsx
edit('src/components/layout/DashboardLayout.tsx', (s) => {
  let out = s
  const notes = []
  // 1) Conversations is no longer "coming soon"
  const conv = /(\{\s*to:\s*'\/dashboard\/conversations'[^}]*?),\s*soon:\s*true(\s*\})/
  if (conv.test(out)) out = out.replace(conv, '$1$2')
  else if (!/'\/dashboard\/conversations'/.test(out)) notes.push('could not find the Conversations menu item')
  // 2) Website Chatbot menu item (before Channels)
  if (!out.includes('/dashboard/website-chatbot')) {
    const channels = /^([ \t]*)\{\s*to:\s*'\/dashboard\/channels'.*$/m
    const m = out.match(channels)
    if (m) out = out.replace(channels, `${m[1]}{ to: '/dashboard/website-chatbot', label: 'Website Chatbot', icon: Globe },\n${m[0]}`)
    else notes.push('could not find the Channels menu item to place Website Chatbot before it')
  }
  // 3) Globe icon import (tolerates trailing commas and multi-line import lists)
  if (out.includes('icon: Globe') && !/import\s*\{[^}]*\bGlobe\b[^}]*\}\s*from 'lucide-react'/.test(out)) {
    const imp = /import\s*\{([^}]*)\}\s*from 'lucide-react'/
    if (imp.test(out)) out = out.replace(imp, (_m, list) => `import {${list.replace(/[\s,]*$/, '')}, Globe,\n} from 'lucide-react'`)
    else notes.push("add Globe to the 'lucide-react' import")
  }
  if (notes.length) report('src/components/layout/DashboardLayout.tsx', 'MANUAL', notes.join('; '))
  return out
})

// ---- App.tsx
edit('src/App.tsx', (s) => {
  if (s.includes('WebsiteChatbot')) return s
  let out = s
  const imports = [
    "import WebsiteChatbot from '@/pages/dashboard/WebsiteChatbot'",
    "import Conversations from '@/pages/dashboard/Conversations'",
    "import ConversationDetail from '@/pages/dashboard/ConversationDetail'",
  ].join('\n')
  const lastImport = [...out.matchAll(/^import .*$/gm)].pop()
  if (!lastImport) { report('src/App.tsx', 'MANUAL', 'no imports found'); return null }
  out = out.slice(0, lastImport.index + lastImport[0].length) + '\n' + imports + out.slice(lastImport.index + lastImport[0].length)
  const settings = /^([ \t]*)<Route path="settings".*$/m
  const m = out.match(settings)
  if (!m) { report('src/App.tsx', 'MANUAL', 'imports added, but the routes could not be placed. See the README for the three <Route> lines'); return out }
  const pad = m[1]
  out = out.replace(settings,
    `${pad}<Route path="website-chatbot" element={<WebsiteChatbot />} />\n${pad}<Route path="conversations" element={<Conversations />} />\n${pad}<Route path="conversations/:id" element={<ConversationDetail />} />\n${m[0]}`)
  return out
})

// ---- tsconfig.json
edit('tsconfig.json', (s) => {
  if (s.includes('_shared/widget')) return s
  if (!s.includes('supabase/functions/_shared/engine')) { report('tsconfig.json', 'MANUAL', 'add "supabase/functions/_shared/widget" to "include"'); return null }
  return s.replace('"supabase/functions/_shared/engine"', '"supabase/functions/_shared/engine", "supabase/functions/_shared/widget"')
})

console.log('\nPhase 4 edits')
for (const r of results) console.log(`  ${r.status.padEnd(10)} ${r.file}${r.note ? `  (${r.note})` : ''}`)
if (results.some((r) => r.status === 'MANUAL' || r.status === 'MISSING')) { console.log('\nSome edits need to be done by hand; see the notes above and the README.'); process.exit(1) }
