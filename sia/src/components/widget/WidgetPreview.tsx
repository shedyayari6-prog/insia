import { useEffect, useRef, useState } from 'react'
import { Alert } from '@/components/ui/Feedback'

interface PreviewConfig {
  display_name: string
  business_name: string
  primary_color: string
  position: 'bottom-right' | 'bottom-left'
  welcome_message: string | null
  greeting_language: 'auto' | 'en' | 'fr' | 'ar'
  starter_questions: string[]
  logo_url: string | null
  show_status: boolean
  status_text: string
}

interface PreviewController { update(config: PreviewConfig): void; destroy(): void }

declare global {
  interface Window {
    InsiaWidget?: { preview(container: HTMLElement, config: PreviewConfig): PreviewController }
  }
}

let scriptPromise: Promise<void> | null = null

/** Loads the real widget script once. The preview therefore looks exactly like the installed widget. */
function loadWidgetScript(): Promise<void> {
  if (window.InsiaWidget) return Promise.resolve()
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = '/insia-widget.js'
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => { scriptPromise = null; reject(new Error('widget script failed to load')) }
    document.head.appendChild(s)
  })
  return scriptPromise
}

export function WidgetPreview({ config }: { config: PreviewConfig }) {
  const container = useRef<HTMLDivElement>(null)
  const controller = useRef<PreviewController | null>(null)
  const latest = useRef(config)
  latest.current = config
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    loadWidgetScript()
      .then(() => {
        if (cancelled || !container.current || !window.InsiaWidget) return
        controller.current = window.InsiaWidget.preview(container.current, latest.current)
      })
      .catch(() => setFailed(true))
    return () => {
      cancelled = true
      controller.current?.destroy()
      controller.current = null
    }
  }, [])

  useEffect(() => {
    controller.current?.update(config)
  }, [config])

  if (failed) return <Alert tone="error">The preview could not load. Refresh the page and try again.</Alert>
  return (
    <div
      ref={container}
      className={`flex flex-col gap-3 ${config.position === 'bottom-left' ? 'items-start' : 'items-end'}`}
      aria-label="Live preview of your website chatbot"
    />
  )
}
