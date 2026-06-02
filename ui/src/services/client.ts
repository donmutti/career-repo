export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const isFormData = options?.body instanceof FormData
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: isFormData ? options?.headers : {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!res.ok) {
    let code = 'UNKNOWN_ERROR'
    let message = `HTTP ${res.status}`
    let details: unknown
    try {
      const body = await res.json()
      const payload = typeof body.detail === 'object' && body.detail !== null ? body.detail : body
      code = payload.code ?? code
      message = payload.message ?? message
      details = payload.details
    } catch {
      // ignore parse errors
    }
    throw new ApiError(res.status, code, message, details)
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

// System
export const system = {
  status: () => apiFetch<{ profile_exists: boolean; version: string; db_ok: boolean; active_agent_runs: number }>('/system/status'),
}

// Profile
export const profile = {
  get: () => apiFetch<unknown>('/profile'),
  create: (data: unknown) => apiFetch<unknown>('/profile', {method: 'POST', body: JSON.stringify(data)}),
  patch: (data: unknown) => apiFetch<unknown>('/profile', {method: 'PATCH', body: JSON.stringify(data)}),
  uploadAvatar: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return apiFetch<unknown>('/profile/avatar', {method: 'POST', body: form})
  },
  avatarUrl: () => `/api/profile/avatar`,
  workExperiences: {
    list: () => apiFetch<unknown>('/profile/work-experiences'),
    get: (id: string) => apiFetch<unknown>(`/profile/work-experiences/${id}`),
    create: (data: unknown) => apiFetch<unknown>('/profile/work-experiences', {method: 'POST', body: JSON.stringify(data)}),
    patch: (id: string, data: unknown) => apiFetch<unknown>(`/profile/work-experiences/${id}`, {method: 'PATCH', body: JSON.stringify(data)}),
    delete: (id: string) => apiFetch<void>(`/profile/work-experiences/${id}`, {method: 'DELETE'}),
    projects: {
      list: (experienceId: string) => apiFetch<unknown>(`/profile/work-experiences/${experienceId}/projects`),
      create: (experienceId: string, data: unknown) => apiFetch<unknown>(`/profile/work-experiences/${experienceId}/projects`, {method: 'POST', body: JSON.stringify(data)}),
      update: (projectId: string, data: unknown) => apiFetch<unknown>(`/profile/work-experiences/projects/${projectId}`, {method: 'PATCH', body: JSON.stringify(data)}),
      delete: (projectId: string) => apiFetch<void>(`/profile/work-experiences/projects/${projectId}`, {method: 'DELETE'}),
    },
  },
  resumes: {
    list: () => apiFetch<unknown>('/profile/resumes'),
    upload: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return apiFetch<unknown>('/profile/resumes', {method: 'POST', body: form})
    },
    delete: (id: string) => apiFetch<void>(`/profile/resumes/${id}`, {method: 'DELETE'}),
    fileUrl: (id: string, originalName: string) => `/api/profile/resumes/${id}/file/${encodeURIComponent(originalName)}`,
    parseWorkExperience: (id: string) => apiFetch<{run_id: string}>(`/profile/resumes/${id}/parse-work-experience`, {method: 'POST'}),
    activeParseRun: () => apiFetch<{run_id: string | null}>('/profile/resumes/parse-work-experience/active'),
  },
}

// Opportunities
export const opportunities = {
  list: () => apiFetch<unknown>('/opportunities'),
  get: (id: string) => apiFetch<unknown>(`/opportunities/${id}`),
  create: (data: unknown) => apiFetch<unknown>('/opportunities', {method: 'POST', body: JSON.stringify(data)}),
  patch: (id: string, data: unknown) => apiFetch<unknown>(`/opportunities/${id}`, {method: 'PATCH', body: JSON.stringify(data)}),
  delete: (id: string) => apiFetch<void>(`/opportunities/${id}`, {method: 'DELETE'}),
  history: (id: string) => apiFetch<unknown>(`/opportunities/${id}/history`),
  agentRuns: (id: string) => apiFetch<unknown>(`/opportunities/${id}/agent-runs`),
  source: (id: string) => apiFetch<unknown>(`/opportunities/${id}/source`, {method: 'POST'}),
  attachments: (id: string) => apiFetch<unknown>(`/opportunities/${id}/attachments`),
  addAttachment: (id: string, data: unknown) => apiFetch<unknown>(`/opportunities/${id}/attachments`, {method: 'POST', body: JSON.stringify(data)}),
  generateCoverLetter: (id: string) => apiFetch<{run_id: string}>(`/opportunities/${id}/cover-letter`, {method: 'POST'}),
  activeCoverLetterRun: (id: string) => apiFetch<{run_id: string | null}>(`/opportunities/${id}/cover-letter/active`),
  comments: (id: string) => apiFetch<unknown>(`/opportunities/${id}/comments`),
  addComment: (id: string, data: unknown) => apiFetch<unknown>(`/opportunities/${id}/comments`, {method: 'POST', body: JSON.stringify(data)}),
  updateComment: (id: string, data: unknown) => apiFetch<unknown>(`/comments/${id}`, {method: 'PATCH', body: JSON.stringify(data)}),
  deleteComment: (id: string) => apiFetch<void>(`/comments/${id}`, {method: 'DELETE'}),
  similar: (id: string) => apiFetch<unknown>(`/opportunities/${id}/similar`),
  dismissSimilar: (id: string, neighborId: string) => apiFetch<void>(`/opportunities/${id}/similar/${neighborId}`, {method: 'DELETE'}),
  absorb: (id: string, neighborId: string) => apiFetch<void>(`/opportunities/${id}/absorb/${neighborId}`, {method: 'POST'}),
  setUrl: (id: string, url: string) => apiFetch<unknown>(`/opportunities/${id}/url`, {method: 'PATCH', body: JSON.stringify({url})}),
}

// Inbox
export const inbox = {
  activeScan: () => apiFetch<{ run_id: string | null }>('/inbox/scan/active'),
  scan: (params?: { from_date?: string; to_date?: string }) => apiFetch<unknown>('/inbox/scan', {method: 'POST', body: JSON.stringify(params ?? {})}),
  status: () => apiFetch<{ last_scanned_at: string | null }>('/inbox/status'),
  counts: () => apiFetch<{ today: number; yesterday: number; last7: number; last30: number }>('/inbox/counts'),
  sortedCounts: () => apiFetch<Record<string, [number, number]>>('/inbox/sorted-counts'),
  list: (params?: { from_date?: string; to_date?: string }) => {
    const q = new URLSearchParams()
    if (params?.from_date) q.set('from_date', params.from_date)
    if (params?.to_date) q.set('to_date', params.to_date)
    const qs = q.toString()
    return apiFetch<unknown>(`/inbox${qs ? `?${qs}` : ''}`)
  },
  get: (id: string) => apiFetch<unknown>(`/inbox/${id}`),
  extractOpportunities: (email_id: string) => apiFetch<unknown>(`/inbox/${email_id}/extract`, {method: 'POST'}),
  emailOpportunities: (email_id: string) => apiFetch<unknown>(`/inbox/${email_id}/opportunities`),
  patchEmailOpportunity: (eo_id: string, data: { status: string; opportunity_id?: string }) => apiFetch<unknown>(`/inbox/opportunities/${eo_id}`, {method: 'PATCH', body: JSON.stringify(data)}),
  declinePending: (emailIds: string[]) => apiFetch<{ count: number }>('/inbox/opportunities/decline-pending', {method: 'POST', body: JSON.stringify({email_ids: emailIds})}),
  delete: (email_id: string) => apiFetch<void>(`/inbox/${email_id}`, {method: 'DELETE'}),
  clear: () => apiFetch<void>('/inbox/clear', {method: 'DELETE'}),
}

// Attachments
export const attachments = {
  downloadUrl: (id: string) => `/api/attachments/${id}/download`,
  delete: (id: string) => apiFetch<void>(`/attachments/${id}`, {method: 'DELETE'}),
}

// Agent runs
export const agentRuns = {
  list: () => apiFetch<unknown>('/agent-runs'),
  get: (id: string) => apiFetch<unknown>(`/agent-runs/${id}`),
  cancel: (id: string) => apiFetch<unknown>(`/agent-runs/${id}`, {method: 'DELETE'}),
}
