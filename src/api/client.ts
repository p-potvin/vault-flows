import type { Flow, ExecutionResult } from '../nodes/types'

// ---------------------------------------------------------------------------
// Token store — persisted to sessionStorage so a page refresh in the same
// tab doesn't log the user out. Clears automatically when the tab closes.
//
// Tradeoff vs in-memory-only: any script running in the page can read the
// token via sessionStorage. We accept that risk because vault-flows has no
// untrusted user-content injection points; the alternative (httpOnly cookie)
// would require pipelines to issue Set-Cookie and switch off Bearer auth.
//
// An in-memory mirror avoids reading sessionStorage on every fetch.
// ---------------------------------------------------------------------------

const TOKEN_KEY = 'vw_jwt'

let _token: string | null = (() => {
  try {
    return typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(TOKEN_KEY) : null
  } catch {
    return null
  }
})()

export function setToken(token: string): void {
  _token = token
  try {
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(TOKEN_KEY, token)
  } catch {
    /* sessionStorage unavailable — keep in-memory only */
  }
}

export function clearToken(): void {
  _token = null
  try {
    if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(TOKEN_KEY)
  } catch {
    /* ignore */
  }
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

export interface MeResponse {
  username: string
  is_admin: boolean
}

/** Validate the current JWT and fetch the user's identity. Throws on 401/403. */
export async function getMe(): Promise<MeResponse> {
  return apiGet<MeResponse>('/auth/me')
}

// ---------------------------------------------------------------------------
// Workflow endpoints
// ---------------------------------------------------------------------------

/**
 * Execute a flow graph through vaultwares-pipelines, which walks it
 * topologically and calls Ollama for each LLM node.
 * Returns one ExecutionResult per node, in execution order.
 */
export async function runFlow(flow: Flow): Promise<ExecutionResult[]> {
  const data = await apiPost<{ results: ExecutionResult[] }>('/flows/run', { flow })
  return data.results
}

export async function saveFlow(flow: Flow): Promise<Flow> {
  return apiPost<Flow>('/workflows', flow)
}

export async function listFlows(): Promise<Flow[]> {
  return apiGet<Flow[]>('/workflows')
}

// ---------------------------------------------------------------------------
// Pipelines workflow catalog (the seeded comfyui_graph workflows the SPA's
// WorkflowLibrary picker uses).
// ---------------------------------------------------------------------------

export interface PipelinesWorkflowStep {
  kind?: string
  graph?: Record<string, unknown>
  /** Maps each user-facing input key (e.g. "positive_prompt") to a dotted
   * path inside the comfyui_graph (e.g. "6.inputs.text"). */
  input_paths?: Record<string, string>
  /** Subset of input_paths keys whose values are upload-tokens that the
   * server resolves into ComfyUI input files at run time. */
  image_inputs?: string[]
}

export interface PipelinesWorkflow {
  id: string
  name: string
  category?: string | null
  description?: string | null
  steps?: PipelinesWorkflowStep[]
  pinned?: boolean
  favorite?: boolean
}

/** Fetch the catalog of seeded ComfyUI workflows from pipelines. */
export async function listPipelinesWorkflows(): Promise<PipelinesWorkflow[]> {
  return apiGet<PipelinesWorkflow[]>('/workflows')
}

/** Fetch a single seeded workflow (used when the cache misses on workflow_id). */
export async function getPipelinesWorkflow(id: string): Promise<PipelinesWorkflow> {
  return apiGet<PipelinesWorkflow>(`/workflows/${encodeURIComponent(id)}`)
}

// ---------------------------------------------------------------------------
// Workflow validation — verdict per workflow for the picker badges.
// ---------------------------------------------------------------------------

export type WorkflowVerdict =
  | 'pass'
  | 'broken_wiring'
  | 'blocked_subgraph'
  | 'blocked_unknown_pack'
  | 'blocked_missing_model'
  | 'empty'

export interface WorkflowValidationEntry {
  workflow_id: string
  verdict: WorkflowVerdict
  summary: string
  node_count: number
  error_count: number
}

export interface WorkflowValidationResponse {
  comfyui_reachable: boolean
  cached_at: number
  results: WorkflowValidationEntry[]
}

/** Validate every seeded workflow against ComfyUI's current /object_info. */
export async function listWorkflowValidations(): Promise<WorkflowValidationResponse> {
  return apiGet<WorkflowValidationResponse>('/flows/validation')
}

// ---------------------------------------------------------------------------
// Job progress (real-time ComfyUI progress + cancel)
// ---------------------------------------------------------------------------

export interface JobProgress {
  prompt_id?: string | null
  current_node_id?: string | number | null
  current_node_class?: string | null
  step?: number
  total?: number
  message?: string
  cached_nodes?: Array<string | number>
}

export interface JobSummary {
  id: string
  kind: string
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled' | string
  created_at: number
  updated_at: number
  requested_by?: Record<string, unknown> | null
  result?: Record<string, unknown> | null
  error?: string | null
  progress?: JobProgress | null
}

/** Fetch the caller's most recently-updated job; null when none match. */
export async function getRecentJob(opts: { kind?: string; status?: string } = {}): Promise<JobSummary | null> {
  const params = new URLSearchParams()
  if (opts.kind) params.set('kind', opts.kind)
  if (opts.status) params.set('status', opts.status)
  const q = params.toString()
  const path = q ? `/jobs/recent?${q}` : '/jobs/recent'
  // The endpoint returns `null` when no job matches — apiGet expects JSON, which is fine
  const r = await apiFetch(path, { method: 'GET' })
  if (!r.ok) {
    const text = await r.text()
    throw new Error(`GET ${path} failed [${r.status}]: ${text}`)
  }
  const body = await r.text()
  if (!body || body === 'null') return null
  return JSON.parse(body) as JobSummary
}

/** Mark a job canceled. Worker watches the job record and POSTs ComfyUI /interrupt. */
export async function cancelJob(jobId: string): Promise<JobSummary> {
  return apiPost<JobSummary>(`/jobs/${encodeURIComponent(jobId)}/cancel`, {})
}

// ---------------------------------------------------------------------------
// Uploads
// ---------------------------------------------------------------------------

export interface UploadImageResponse {
  token: string         // signed ref to embed as a node param.image_ref
  filename: string
  size_bytes: number
  mime: string
  expires_in: number
}

/**
 * Upload an image file to /uploads/image. The returned `token` is what an
 * image_input node embeds as `params.image_ref`. Build a preview URL with
 * `uploadPreviewUrl(token)` for the inline thumbnail.
 */
export async function uploadImage(file: File): Promise<UploadImageResponse> {
  const form = new FormData()
  form.append('file', file)

  const headers = new Headers()
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  // NOTE: don't set Content-Type — the browser sets multipart boundary itself.

  const lang =
    (typeof localStorage !== 'undefined' ? localStorage.getItem('vw_lang') : null) ??
    navigator.language
  headers.set('Accept-Language', lang)
  headers.set('Accept', 'application/json')

  const r = await fetch('/api/uploads/image', { method: 'POST', headers, body: form })
  if (!r.ok) {
    const text = await r.text()
    throw new Error(`Upload failed [${r.status}]: ${text}`)
  }
  return r.json() as Promise<UploadImageResponse>
}

/** Public URL for a previously-uploaded image (no Authorization needed; the token IS the credential). */
export function uploadPreviewUrl(uploadToken: string): string {
  return `/api/uploads/image/${uploadToken}`
}
