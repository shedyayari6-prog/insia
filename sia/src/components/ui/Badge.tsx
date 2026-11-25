import type { Verification } from '@/types'

export function Badge({ tone = 'neutral', children }: { tone?: 'neutral' | 'gold' | 'success' | 'warn'; children: string }) {
  const styles = {
    neutral: 'border-sand text-ink-soft',
    gold: 'border-gold text-gold-dark',
    success: 'border-[#BFD3BC] bg-[#EFF5EE] text-[#2F5A2B]',
    warn: 'border-[#E6D2A4] bg-[#FBF5E6] text-[#7A5A12]',
  }[tone]
  return <span className={`inline-flex shrink-0 items-center rounded border px-2 py-0.5 text-xs font-medium ${styles}`}>{children}</span>
}

export function VerificationBadge({ value }: { value: Verification }) {
  if (value === 'verified') return <Badge tone="success">Verified</Badge>
  if (value === 'incomplete') return <Badge tone="warn">Incomplete</Badge>
  return <Badge tone="neutral">Needs your input</Badge>
}
