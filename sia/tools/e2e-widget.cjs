/**
 * Real-browser end-to-end test of the website widget against tools/mock-widget-server.ts.
 * Optional developer tool: needs `npm i -D playwright` and `npx playwright install chromium`.
 *   1) npx tsx tools/mock-widget-server.ts
 *   2) node tools/e2e-widget.cjs
 */
const { chromium } = require('playwright')
const fs = require('node:fs')

const BASE = process.env.BASE ?? 'http://localhost:8787'
const API = `${BASE}/functions/v1`
const SHOTS = process.env.SHOTS ?? '/tmp/shots'
const KEY = (n) => `wk_${n.toString(16).padStart(32, '0')}`
const page_url = (n, api = API) => `${BASE}/widget-test.html?key=${KEY(n)}&api=${encodeURIComponent(api)}`
fs.mkdirSync(SHOTS, { recursive: true })

const results = []
async function test(name, fn) {
  try { await fn(); results.push([true, name]); console.log('PASS', name) }
  catch (e) { results.push([false, name]); console.log('FAIL', name, '\n    ', String(e.message).split('\n').slice(0, 4).join('\n     ')) }
}
const eq = (a, b, msg) => { if (a !== b) throw new Error(`${msg ?? 'expected'}: got ${JSON.stringify(a)}, wanted ${JSON.stringify(b)}`) }
const ok = (c, msg) => { if (!c) throw new Error(msg) }

async function openWidget(page, n) {
  await page.goto(page_url(n))
  await page.locator('button.launcher').waitFor({ state: 'visible', timeout: 5000 })
  await page.locator('button.launcher').click()
  await page.locator('.panel').waitFor({ state: 'visible' })
}
async function say(page, text) {
  const input = page.locator('.form input')
  await input.fill(text)
  await input.press('Enter')
}
const lastBot = (page) => page.locator('.msg.bot:not(.typing)').last()
async function waitForReply(page, re) {
  await page.waitForFunction(() => !document.querySelector('[data-insia-widget]').shadowRoot.querySelector('.typing'), null, { timeout: 8000 }).catch(() => {})
  await page.locator('.msg.bot', { hasText: re }).last().waitFor({ timeout: 8000 })
}

;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))

  await test('1. shop: launcher at bottom-right, opens, shows name, status, welcome and starter questions', async () => {
    await openWidget(page, 1)
    const box = await page.locator('button.launcher').boundingBox()
    ok(box.x > 1280 - 120 && box.y > 800 - 120, `launcher not bottom-right: ${JSON.stringify(box)}`)
    ok(await page.locator('.head b').innerText() === 'Urban Assistant', 'bot name')
    ok((await page.locator('.status').innerText()).includes('Online'), 'status shown')
    const welcome = await page.locator('.log .msg.bot').first().innerText()
    ok(welcome.includes('assistant of Urban Threads'), `welcome should name the business, got: ${welcome}`)
    eq(await page.locator('.chip').count(), 3, 'starter chips')
    await page.screenshot({ path: `${SHOTS}/1-shop-desktop-open.png` })
  })

  await test('2. clicking a starter question gets a real answer from the engine', async () => {
    await page.locator('.chip', { hasText: 'How much is the hoodie?' }).click()
    await waitForReply(page, /65 TND/)
    eq(await page.locator('.chip').count(), 0, 'chips disappear after the first question')
  })

  await test('3. related follow-up questions keep context ("What colors?")', async () => {
    await say(page, 'Do you have hoodies?')
    await waitForReply(page, /hoodie/i)
    await say(page, 'What colors?')
    await waitForReply(page, /Available colors: Black\./)
    const text = await page.locator('.log').innerText()
    ok(!/White/.test(text), 'sold-out White must not be offered')
    await page.screenshot({ path: `${SHOTS}/3-shop-conversation.png` })
  })

  await test('4. reloading the page restores the conversation', async () => {
    await page.reload()
    await page.locator('button.launcher').click()
    await page.locator('.msg.user', { hasText: 'What colors?' }).waitFor({ timeout: 5000 })
    ok((await page.locator('.log').innerText()).includes('Available colors: Black.'), 'bot reply restored')
  })

  await test('5. optional contact details are saved on the conversation', async () => {
    await page.locator('button[aria-label="Chat options"]').click()
    await page.locator('.menu button', { hasText: 'Share contact details' }).click()
    await page.locator('.contact input[aria-label="Email"]').fill('not-an-email')
    await page.locator('.contact button.primary').click()
    await page.locator('.contact [role=alert]').waitFor()
    await page.locator('.contact input[aria-label="Email"]').fill('amel@example.com')
    await page.locator('.contact input[aria-label="Name"]').fill('Amel')
    await page.locator('.contact button.primary').click()
    await page.locator('.msg.note', { hasText: 'Thank you' }).waitFor()
    const state = await (await fetch(`${BASE}/__mock/conversations`)).json()
    const conv = state.conversations.find((c) => c.customer_email === 'amel@example.com')
    ok(conv && conv.customer_name === 'Amel', 'contact stored')
    ok(conv.customer_phone === undefined, 'no invented phone')
  })

  await test('6. "Start a new conversation" clears the chat and closes the old one', async () => {
    await page.locator('button[aria-label="Chat options"]').click()
    await page.locator('.menu button', { hasText: 'Start a new conversation' }).click()
    eq(await page.locator('.msg.user').count(), 0, 'no customer messages left')
    await page.waitForTimeout(300)
    const state = await (await fetch(`${BASE}/__mock/conversations`)).json()
    ok(state.conversations.some((c) => c.customer_email === 'amel@example.com' && c.status === 'closed'), 'old conversation closed')
  })

  await test('7. Escape closes the panel and returns focus to the launcher', async () => {
    await page.keyboard.press('Escape')
    await page.locator('.panel').waitFor({ state: 'hidden' })
    ok(await page.evaluate(() => document.querySelector('[data-insia-widget]').shadowRoot.activeElement?.classList.contains('launcher')), 'focus on launcher')
  })

  await test('8. hotel: bottom-left, gold color keeps readable dark text, answers rooms question', async () => {
    const p = await ctx.newPage()
    await openWidget(p, 2)
    const box = await p.locator('button.launcher').boundingBox()
    ok(box.x < 100, `launcher not on the left: ${JSON.stringify(box)}`)
    const color = await p.locator('.head').evaluate((n) => getComputedStyle(n).color)
    eq(color, 'rgb(23, 26, 31)', 'dark text on gold')
    await p.locator('.chip', { hasText: 'double rooms' }).click()
    await waitForReply(p, /Double Room/)
    ok(/can't check availability/.test(await p.locator('.log').innerText()), 'availability caveat')
    ok((await p.locator('.status').innerText()).includes('Replies instantly'), 'custom status text')
    await p.screenshot({ path: `${SHOTS}/8-hotel-left-gold.png` })
    await say(p, 'How many rooms do you have and what time is check in?')
    await waitForReply(p, /24/)
    ok((await p.locator('.log').innerText()).includes('14:00'), 'check-in time')
    await p.close()
  })

  await test('9. restaurant: French interface, answers opening hours, safe fallback for missing knowledge', async () => {
    const p = await ctx.newPage()
    await openWidget(p, 3)
    ok((await p.locator('.log .msg.bot').first().innerText()).startsWith('Bonjour'), 'French welcome')
    eq(await p.locator('.form input').getAttribute('placeholder'), 'Écrivez votre message…')
    await p.locator('.chip').click()
    await waitForReply(p, /12:00–23:00/)
    await say(p, 'Do you offer airport transfers?')
    await waitForReply(p, /pas encore|don't have that information/i)
    ok(!/\boui\b|\byes\b/i.test(await p.locator('.msg.bot').last().innerText()), 'no invented yes')
    await p.screenshot({ path: `${SHOTS}/9-restaurant-fr.png` })
    await p.close()
  })

  await test('10. gym: Arabic interface is right-to-left; membership question answered', async () => {
    const p = await ctx.newPage()
    await openWidget(p, 4)
    eq(await p.locator('.panel').getAttribute('dir'), 'rtl')
    ok(/[\u0600-\u06FF]/.test(await p.locator('.log .msg.bot').first().innerText()), 'Arabic welcome')
    await say(p, 'How much is the monthly membership?')
    await waitForReply(p, /80 TND/)
    ok((await p.locator('.msg.user').first().getAttribute('dir')) === 'auto', 'each bubble takes its own direction')
    await p.screenshot({ path: `${SHOTS}/10-gym-rtl.png` })
    await p.close()
  })

  await test('11. disabled and domain-restricted widgets render nothing', async () => {
    for (const n of [5, 8, 99]) {
      const p = await ctx.newPage()
      await p.goto(page_url(n))
      await p.waitForTimeout(1200)
      eq(await p.locator('[data-insia-widget]').count(), 0, `widget ${n} rendered`)
      await p.close()
    }
  })

  await test('12. owner-written text is never executed as HTML', async () => {
    const p = await ctx.newPage()
    let dialog = false
    p.on('dialog', () => { dialog = true })
    await openWidget(p, 7)
    const welcome = await p.locator('.log .msg.bot').first().innerText()
    ok(welcome.includes('<img src=x'), 'markup shown as text')
    eq(await p.locator('.log img').count(), 0, 'no injected image')
    eq(await p.evaluate(() => window.__xss), undefined, 'handler did not run')
    ok(!dialog, 'no dialog')
    await say(p, '<script>window.__xss=2</script> hoodie price')
    await waitForReply(p, /65 TND/)
    eq(await p.evaluate(() => window.__xss), undefined, 'message did not run')
    await p.close()
  })

  await test('13. two different customers have separate conversations and context', async () => {
    const other = await browser.newContext({ viewport: { width: 1280, height: 800 } })
    const a = await other.newPage()
    await openWidget(a, 1)
    await say(a, 'Do you have hoodies?')
    await waitForReply(a, /hoodie/i)
    const ctxB = await browser.newContext({ viewport: { width: 1280, height: 800 } })
    const b = await ctxB.newPage()
    await openWidget(b, 1)
    await say(b, 'How much?')
    await waitForReply(b, /Which product or service/i)
    ok(!/65/.test(await b.locator('.log').innerText()), 'customer B must not inherit customer A context')
    await other.close(); await ctxB.close()
  })

  await test('14. two businesses on two widgets stay separate', async () => {
    const p = await ctx.newPage()
    await openWidget(p, 6)
    await say(p, 'How much is the hoodie?')
    await waitForReply(p, /99 TND/)
    ok(!/65/.test(await p.locator('.log').innerText()), 'other shop price absent')
    await p.close()
  })

  await test('15. mobile: the open chat fills the screen and the launcher hides', async () => {
    const m = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
    const p = await m.newPage()
    await openWidget(p, 1)
    const box = await p.locator('.panel').boundingBox()
    ok(box.width >= 388 && box.height >= 840, `panel not full screen: ${JSON.stringify(box)}`)
    ok(!(await p.locator('button.launcher').isVisible()), 'launcher hidden while open')
    await say(p, 'Where are you located?')
    await waitForReply(p, /Rue Ibn Khaldoun/)
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
    ok(!overflow, 'no horizontal scroll')
    await p.screenshot({ path: `${SHOTS}/15-mobile.png` })
    await m.close()
  })

  await test('16. network failure shows a friendly error, not a crash', async () => {
    const p = await ctx.newPage()
    await openWidget(p, 1)
    await p.route('**/widget-chat', (r) => r.abort())
    await say(p, 'hello')
    await p.locator('.msg.error').waitFor({ timeout: 5000 })
    ok((await p.locator('.msg.error').innerText()).includes('Could not reach'), 'friendly message')
    await p.close()
  })

  await test('17. unreachable configuration endpoint renders nothing and does not throw', async () => {
    const p = await ctx.newPage()
    const errs = []
    p.on('pageerror', (e) => errs.push(String(e)))
    await p.goto(page_url(1, 'http://localhost:9/functions/v1'))
    await p.waitForTimeout(1200)
    eq(await p.locator('[data-insia-widget]').count(), 0)
    eq(errs.length, 0, 'page errors')
    await p.close()
  })

  ok(errors.length === 0, `uncaught page errors: ${errors.join(' | ')}`)
  await browser.close()
  const failed = results.filter((r) => !r[0]).length
  console.log(`\n${results.length - failed} passed, ${failed} failed`)
  process.exit(failed ? 1 : 0)
})()
