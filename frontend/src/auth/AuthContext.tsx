import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, getToken, setToken } from '../lib/api'

export type User = {
  id: string
  email: string
  username: string
  displayName: string
  createdAt: string
}

type AuthResponse = { token: string; user: User }

export type RegisterInput = {
  email: string
  username: string
  displayName?: string
  password: string
}

type AuthState = {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (input: RegisterInput) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(() => getToken() !== null)

  // Restore the session from a saved token
  useEffect(() => {
    if (!getToken()) return
    api<User>('/me')
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setLoading(false))
  }, [])

  const accept = useCallback((res: AuthResponse) => {
    setToken(res.token)
    setUser(res.user)
  }, [])

  const login = useCallback(
    async (email: string, password: string) => {
      accept(await api<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }))
    },
    [accept],
  )

  const register = useCallback(
    async (input: RegisterInput) => {
      accept(await api<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(input) }))
    },
    [accept],
  )

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading, login, register, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
