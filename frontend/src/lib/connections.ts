import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api'

export type Provider = 'MAL' | 'STEAM' | 'LETTERBOXD'

export type Connection = {
  provider: Provider
  account: string
  lastSyncedAt: string | null
  lastSummary: string | null
}

export type ConnectionsResponse = {
  connections: Connection[]
  available: Record<Provider, boolean>
}

export type ImportResult = {
  total: number
  imported: number
  alreadyLogged: number
  notOnAniList: number
}

const KEY = ['connections'] as const

export function useConnections() {
  return useQuery({ queryKey: KEY, queryFn: () => api<ConnectionsResponse>('/connections') })
}

export function useMalImport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (username: string) =>
      api<ImportResult>('/connections/mal/import', { method: 'POST', body: JSON.stringify({ username }) }),
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
