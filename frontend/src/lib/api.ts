const TOKEN_KEY = 'backlogd.token'

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // storage unavailable (private mode) – session just won't persist
  }
}

export class ApiError extends Error {
  status: number
  fieldErrors: Record<string, string>

  constructor(status: number, message: string, fieldErrors: Record<string, string> = {}) {
    super(message)
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

/** Spring returns RFC 9457 problem details; turn them into a readable message. */
async function toApiError(res: Response): Promise<ApiError> {
  try {
    const body = await res.json()
    const fieldErrors: Record<string, string> = {}
    for (const e of body.errors ?? body.fieldErrors ?? []) {
      if (e.field) fieldErrors[e.field] = e.defaultMessage ?? e.message
    }
    const message =
      body.detail && !body.detail.startsWith('Invalid request content')
        ? body.detail
        : Object.keys(fieldErrors).length
          ? 'Please fix the highlighted fields'
          : body.title ?? `Request failed (${res.status})`
    return new ApiError(res.status, message, fieldErrors)
  } catch {
    if (res.status >= 500 || res.status === 0) {
      return new ApiError(res.status, 'Server is unreachable – is the backend running?')
    }
    return new ApiError(res.status, `Request failed (${res.status})`)
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let res: Response
  try {
    res = await fetch(`/api${path}`, { ...init, headers })
  } catch {
    throw new ApiError(0, 'Server is unreachable – is the backend running?')
  }
  if (!res.ok) throw await toApiError(res)
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}
