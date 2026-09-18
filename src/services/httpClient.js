const TOKEN_KEY = 'lv.token'
const CSRF_KEY = 'lv.csrf'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export function getCsrf() {
  let token = sessionStorage.getItem(CSRF_KEY)
  if (!token) {
    token = crypto.randomUUID()
    sessionStorage.setItem(CSRF_KEY, token)
  }
  return token
}

/**
 * Laravel Sanctum-ready HTTP client.
 * In production this talks to VITE_API_BASE (e.g. https://api.luckyverse.com).
 * CSRF is sent as X-XSRF-TOKEN; Sanctum cookie auth can replace bearer tokens.
 */
export async function request(path, { method = 'GET', body, auth = true, signal } = {}) {
  const base = import.meta.env.VITE_API_BASE || ''
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'X-XSRF-TOKEN': getCsrf(),
  }
  if (auth && getToken()) {
    headers.Authorization = `Bearer ${getToken()}`
  }
  const response = await fetch(`${base}${path}`, {
    method,
    headers,
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
    signal,
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    const error = new Error(payload.message || 'Request failed')
    error.status = response.status
    error.payload = payload
    throw error
  }
  if (response.status === 204) return null
  return response.json()
}
