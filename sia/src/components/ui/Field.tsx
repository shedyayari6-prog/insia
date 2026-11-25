import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'

const control =
  'block w-full rounded-md border bg-white px-3 text-[0.95rem] text-ink placeholder:text-slate/80 transition-colors focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold disabled:bg-paper-deep disabled:text-ink-soft'

interface WrapProps {
  label: string
  error?: string
  hint?: string
  optional?: boolean
  children: (ids: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode
}

function FieldWrap({ label, error, hint, optional, children }: WrapProps) {
  const id = useId()
  const descId = `${id}-desc`
  const describedBy = error || hint ? descId : undefined
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-ink">
        <span>{label}</span>
        {optional && <span className="text-xs font-normal text-ink-soft">Optional</span>}
      </label>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {error ? (
        <p id={descId} role="alert" className="mt-1.5 text-sm text-[#9A3623]">
          {error}
        </p>
      ) : hint ? (
        <p id={descId} className="mt-1.5 text-sm text-ink-soft">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

type Common = { label: string; error?: string; hint?: string; optional?: boolean }

export function TextField({ label, error, hint, optional, className = '', ...rest }: Common & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <FieldWrap label={label} error={error} hint={hint} optional={optional}>
      {({ id, describedBy, invalid }) => (
        <input
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid}
          className={`${control} h-11 ${invalid ? 'border-[#B4452F]' : 'border-sand'} ${className}`}
          {...rest}
        />
      )}
    </FieldWrap>
  )
}

export function SelectField({
  label, error, hint, optional, children, className = '', ...rest
}: Common & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <FieldWrap label={label} error={error} hint={hint} optional={optional}>
      {({ id, describedBy, invalid }) => (
        <select
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid}
          className={`${control} h-11 ${invalid ? 'border-[#B4452F]' : 'border-sand'} ${className}`}
          {...rest}
        >
          {children}
        </select>
      )}
    </FieldWrap>
  )
}

export function TextAreaField({ label, error, hint, optional, className = '', ...rest }: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <FieldWrap label={label} error={error} hint={hint} optional={optional}>
      {({ id, describedBy, invalid }) => (
        <textarea
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid}
          className={`${control} min-h-[7.5rem] py-2.5 leading-6 ${invalid ? 'border-[#B4452F]' : 'border-sand'} ${className}`}
          {...rest}
        />
      )}
    </FieldWrap>
  )
}
