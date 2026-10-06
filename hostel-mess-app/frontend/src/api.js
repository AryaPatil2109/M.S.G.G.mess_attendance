// Small helper around fetch() for talking to the Flask backend.
// The browser keeps the login cookie, so every call is authenticated automatically.

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

async function request(method, url, data) {
  const res = await fetch(url, {
    method,
    credentials: 'same-origin',
    headers: data ? { 'Content-Type': 'application/json' } : {},
    body: data ? JSON.stringify(data) : undefined,
  })
  let json = {}
  try {
    json = await res.json()
  } catch {
    /* empty body */
  }
  if (!res.ok) {
    if (res.status === 401 && !url.endsWith('/login') && !url.endsWith('/me')) {
      window.dispatchEvent(new Event('auth:expired'))
    }
    throw new ApiError(json.error || `Something went wrong (${res.status})`, res.status)
  }
  return json
}

export const api = {
  get: (url) => request('GET', url),
  post: (url, data = {}) => request('POST', url, data),
  put: (url, data = {}) => request('PUT', url, data),
  del: (url) => request('DELETE', url),
}
