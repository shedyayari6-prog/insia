import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'md' | 'lg'

export function buttonClasses(variant: Variant = 'primary', size: Size = 'md', extra = ''): string {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50'
  const sizes = { md: 'h-10 px-4 text-sm', lg: 'h-12 px-6 text-base' }
  const variants = {
    primary: 'bg-ink text-paper hover:bg-[#2A2E35]',
    secondary: 'border border-sand bg-white text-ink hover:border-slate',
    ghost: 'text-ink hover:bg-paper-deep',
    danger: 'border border-[#B4452F] bg-white text-[#9A3623] hover:bg-[#FBEFEC]',
  }
  return `${base} ${sizes[size]} ${variants[variant]} ${extra}`
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

export function Button({ variant, size, loading, disabled, children, className = '', ...rest }: ButtonProps) {
  return (
    <button className={buttonClasses(variant, size, className)} disabled={disabled || loading} {...rest}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  )
}

interface ButtonLinkProps extends LinkProps {
  variant?: Variant
  size?: Size
  children: ReactNode
}

export function ButtonLink({ variant, size, className = '', children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={buttonClasses(variant, size, className)} {...rest}>
      {children}
    </Link>
  )
}
