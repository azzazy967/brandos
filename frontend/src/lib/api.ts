const BASE_URL = '/api'

function getToken(): string | null {
  return localStorage.getItem('brandos_token')
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  })

  if (response.status === 401) {
    localStorage.removeItem('brandos_token')
    localStorage.removeItem('brandos_user')
    window.location.href = '/login'
    throw new ApiError(401, 'Unauthorized')
  }

  if (!response.ok) {
    let message = `Request failed: ${response.status}`
    try {
      const body = await response.json()
      message = body.message ?? body.error ?? message
    } catch {
      // ignore parse errors
    }
    throw new ApiError(response.status, message)
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

export const api = {
  get: <T = unknown>(path: string) => apiFetch<T>(path),

  post: <T = unknown>(path: string, body?: unknown) =>
    apiFetch<T>(path, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  put: <T = unknown>(path: string, body?: unknown) =>
    apiFetch<T>(path, {
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  del: <T = unknown>(path: string) =>
    apiFetch<T>(path, { method: 'DELETE' }),
}

export { ApiError }
