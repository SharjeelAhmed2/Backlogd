import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth, type RegisterInput } from '../auth/AuthContext'
import { Field } from '../components/Field'
import { ApiError } from '../lib/api'
import { AuthLayout, FormError, SubmitButton } from './AuthLayout'

const empty: RegisterInput = { email: '', username: '', displayName: '', password: '' }

export function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState(empty)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const set = (key: keyof RegisterInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setFieldErrors({})
    try {
      await register(form)
      navigate('/app', { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        setFieldErrors(err.fieldErrors)
      } else {
        setError('Something went wrong')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout title="Create your log" subtitle="One account for every film, show and game.">
      <form onSubmit={onSubmit} className="space-y-4">
        <FormError message={error} />
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={form.email}
          onChange={set('email')}
          error={fieldErrors.email}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Username"
            name="username"
            autoComplete="username"
            required
            pattern="[A-Za-z0-9_]{3,30}"
            title="3-30 letters, numbers or underscores"
            value={form.username}
            onChange={set('username')}
            error={fieldErrors.username}
          />
          <Field
            label="Display name"
            name="displayName"
            placeholder="Optional"
            value={form.displayName}
            onChange={set('displayName')}
            error={fieldErrors.displayName}
          />
        </div>
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          hint="At least 8 characters"
          value={form.password}
          onChange={set('password')}
          error={fieldErrors.password}
        />
        <SubmitButton busy={busy}>Create account</SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Already logging?{' '}
        <Link to="/login" className="text-brand hover:underline">
          Log in
        </Link>
      </p>
    </AuthLayout>
  )
}
