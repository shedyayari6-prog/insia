import type { LucideIcon } from 'lucide-react'
import { EmptyState } from '@/components/ui/Feedback'
import { PageHeader } from '@/components/ui/Card'

const COPY: Record<string, string> = {
  'Knowledge Center': 'This is where you will teach INSIA the details of your business.',
  'Learning Center': 'This is where you will review questions INSIA could not answer and improve its answers.',
  Conversations: 'This is where you will read conversations between customers and your chatbot.',
  Customers: 'This is where you will see customers and the opportunities found in their conversations.',
  Channels: 'This is where you will connect WhatsApp, social platforms and your website chatbot.',
  'Developer Center': 'This is where you will manage API access for your own applications.',
  Credits: 'This is where you will see your credit balance and usage.',
}

export default function ComingSoon({ label, icon: Icon }: { label: string; icon: LucideIcon }) {
  return (
    <>
      <PageHeader title={label} />
      <EmptyState icon={<Icon className="h-5 w-5" aria-hidden="true" />} title="Coming in a later phase">
        <p>{COPY[label] ?? 'This section is not available yet.'}</p>
        <p className="mt-2">Nothing here needs your attention right now.</p>
      </EmptyState>
    </>
  )
}
