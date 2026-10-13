import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api'
import type { CatalogItem, LogEntry, LogInput, MediaKind } from './types'

const LOGS = ['logs'] as const

/** All of the user's entries, newest activity first. Pages filter client-side. */
export function useLogs() {
  return useQuery({ queryKey: LOGS, queryFn: () => api<LogEntry[]>('/logs') })
}

export function useSaveLog() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: LogInput }) =>
      id
        ? api<LogEntry>(`/logs/${id}`, { method: 'PUT', body: JSON.stringify(input) })
        : api<LogEntry>('/logs', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: LOGS }),
  })
}

export function useDeleteLog() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api<void>(`/logs/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: LOGS }),
  })
}

export function useSearchSources() {
  return useQuery({
    queryKey: ['search-sources'],
    queryFn: () => api<Record<MediaKind, boolean>>('/search/sources'),
    staleTime: 5 * 60_000,
  })
}

export function useCatalogSearch(kind: MediaKind, query: string, enabled: boolean) {
  const q = query.trim()
  return useQuery({
    queryKey: ['search', kind, q],
    queryFn: () => api<CatalogItem[]>(`/search?kind=${kind}&q=${encodeURIComponent(q)}`),
    enabled: enabled && q.length >= 2,
    staleTime: 10 * 60_000,
    retry: false,
  })
}
