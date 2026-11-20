import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api'

export type Provider = 'MAL' | 'STEAM' | 'LETTERBOXD'

export type Connection = {
  provider: Provider
  account: string
  displayName: string | null
  lastSyncedAt: string | null
  lastSummary: string | null
}

export type ConnectionsResponse = {
  connections: Connection[]
  available: Record<Provider, boolean>
}

/** Union of the MAL and Steam import results; fields a provider doesn't report are absent. */
export type ImportResult = {
  total: number
  imported: number
  alreadyLogged: number
  updated?: number
  notOnAniList?: number
  unmatched?: number
}

const KEY = ['connections'] as const

const importPaths: Partial<Record<Provider, { path: string; field: string }>> = {
  MAL: { path: '/connections/mal/import', field: 'username' },
  STEAM: { path: '/connections/steam/import', field: 'profile' },
}

export function useConnections() {
  return useQuery({ queryKey: KEY, queryFn: () => api<ConnectionsResponse>('/connections') })
}

export function useImport(provider: Provider) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (account: string) => {
      const target = importPaths[provider]
      if (!target) throw new Error(`${provider} import is not available`)
      return api<ImportResult>(target.path, { method: 'POST', body: JSON.stringify({ [target.field]: account }) })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: ['logs'] })
    },
  })
}

/** Uploads a Letterboxd export (ZIP or CSV). */
export function useLetterboxdUpload() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api<ImportResult>('/connections/letterboxd/import', { method: 'POST', body: form })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: ['logs'] })
    },
  })
}

export function useDisconnect() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (provider: Provider) => api<void>(`/connections/${provider}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
