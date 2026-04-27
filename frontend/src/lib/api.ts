const BASE = '/api'

async function req(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(opts.headers as Record<string, string> ?? {}) },
    ...opts,
  })
  if (res.status === 401) {
    window.location.reload()
    return null
  }
  if (!res.ok) {
    console.error(`[api] ${opts.method ?? 'GET'} ${path} → ${res.status}`)
    return null
  }
  // Handle non-JSON responses (CSV downloads etc)
  const ct = res.headers.get('content-type') ?? ''
  if (ct.includes('application/json')) return res.json()
  return res.blob()
}

export const api = {
  get: (path: string) => req(path),
  post: (path: string, body: unknown) => req(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: (path: string, body: unknown) => req(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path: string) => req(path, { method: 'DELETE' }),
}
