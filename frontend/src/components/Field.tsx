import type { InputHTMLAttributes } from 'react'

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
  hint?: string
}

export function Field({ label, error, hint, id, ...input }: Props) {
  const fieldId = id ?? input.name
  return (
    <label htmlFor={fieldId} className="block">
      <span className="mb-1.5 block text-sm font-medium text-text/90">{label}</span>
      <input
        id={fieldId}
        {...input}
        aria-invalid={!!error}
        className={`w-full rounded-xl border bg-ink/60 px-4 py-3 text-sm text-text outline-none transition placeholder:text-muted/60 focus:border-brand focus:ring-4 focus:ring-brand/15 ${
          error ? 'border-red-400/70' : 'border-line'
        }`}
      />
      {error ? (
        <span className="mt-1.5 block text-xs text-red-300">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-xs text-muted">{hint}</span>
      ) : null}
    </label>
  )
}
