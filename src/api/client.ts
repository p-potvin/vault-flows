import type { Flow, ExecutionResult } from '../nodes/types'

// ---------------------------------------------------------------------------
// In-memory token store — intentionally never written to localStorage/cookie
// ---------------------------------------------------------------------------

let _token: string | null = null

export function setToken(token: string): void {
  _token = token
}

export function getToken(): string | null {
  return _token
}

// ---------------------------------------------------------------------------
// Core fetch wrapper
// ---------------------------------------------------------------------------

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers)

  if (_token !== null) {
    headers.set('Authorization', `Bearer ${_token}`)
  }

  const lang =
    (typeof localStorage !== 'undefined' ? localStorage.getItem('vw_lang') : null) ??
    navigator.language

  headers.set('Accept-Language', lang)
  headers.set('Accept', 'application/json')

  return fetch(`/api${path}`, { ...init, headers })
}

// ---------------------------------------------------------------------------
// Typed helpers
// ---------------------------------------------------------------------------

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const response = await apiFetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`POST ${path} failed [${response.status}]: ${text}`)
  }

  return response.json() as Promise<T>
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await apiFetch(path, { method: 'GET' })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`GET ${path} failed [${response.status}]: ${text}`)
  }

  return response.json() as Promise<T>
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function login(username: string, password: string): Promise<void> {
  const data = await apiPost<{ access_token: string }>('/auth/login', {
    username,
    password,
  })
  setToken(data.access_token)
}

export async function register(
  username: string,
  password: string,
  email?: string,
): Promise<void> {
  await apiPost<unknown>('/auth/register', {
    username,
    password,
    ...(email ? { email } : {}),
  })
  // Auto-login after successful registration
  await login(username, password)
}

export async function getMe(): Promise<{ id: string; username: string; role: string }> {
  return apiGet<{ id: string; username: string; role: string }>('/auth/me')
}

// ---------------------------------------------------------------------------
// Workflow endpoints
// ---------------------------------------------------------------------------

export async function runFlow(flow: Flow): Promise<ExecutionResult[]> {
  const data = await apiPost<{ results: ExecutionResult[] }>('/workflows/run', { flow })
  return data.results
}

export async function saveFlow(flow: Flow): Promise<Flow> {
  return apiPost<Flow>('/workflows', flow)
}

export async function listFlows(): Promise<Flow[]> {
  return apiGet<Flow[]>('/workflows')
}
