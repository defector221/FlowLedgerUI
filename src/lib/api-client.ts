import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import type { LoginResponse, OrganizationAccessResponse, UserResponse } from '@/types/api'
import { unwrapApi } from '@/lib/api-response'

const TOKEN_KEY = 'flowledger.auth'

export type AuthSession = {
  accessToken: string
  refreshToken: string
  user: UserResponse
  activeOrganization: OrganizationAccessResponse
  organizations: OrganizationAccessResponse[]
}

type SessionListener = (session: AuthSession | null) => void

const sessionListeners = new Set<SessionListener>()

/** Subscribe to session writes (login, refresh, logout, force-clear). */
export function onAuthSessionChange(listener: SessionListener) {
  sessionListeners.add(listener)
  return () => {
    sessionListeners.delete(listener)
  }
}

function notifySessionListeners(session: AuthSession | null) {
  sessionListeners.forEach((listener) => {
    try {
      listener(session)
    } catch {
      // ignore subscriber errors
    }
  })
}

const PUBLIC_AUTH_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/invitation',
  '/auth/accept-invitation',
]

const PUBLIC_APP_PATHS = ['/login', '/register', '/forgot-password', '/reset-password', '/accept-invite']

function isPublicAuthUrl(url?: string) {
  if (!url) return false
  return PUBLIC_AUTH_PATHS.some((path) => url.includes(path))
}

function isPublicAppPath(pathname: string) {
  return PUBLIC_APP_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

export const isValidAuthSession = (value: unknown): value is AuthSession => {
  if (!value || typeof value !== 'object') return false
  const session = value as Partial<AuthSession>
  return !!(
    typeof session.accessToken === 'string' &&
    typeof session.refreshToken === 'string' &&
    session.user &&
    typeof session.user.id === 'string' &&
    session.activeOrganization &&
    typeof session.activeOrganization.id === 'string' &&
    Array.isArray(session.organizations)
  )
}

export const getSession = (): AuthSession | null => {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(TOKEN_KEY) ?? 'null')
    if (!isValidAuthSession(parsed)) {
      if (parsed !== null) localStorage.removeItem(TOKEN_KEY)
      return null
    }
    return parsed
  } catch {
    localStorage.removeItem(TOKEN_KEY)
    return null
  }
}

export const setSession = (session: AuthSession | null) => {
  if (session) localStorage.setItem(TOKEN_KEY, JSON.stringify(session))
  else localStorage.removeItem(TOKEN_KEY)
  notifySessionListeners(session)
}

export const toAuthSession = (payload: LoginResponse): AuthSession => ({
  accessToken: payload.accessToken,
  refreshToken: payload.refreshToken,
  user: payload.user,
  activeOrganization: payload.activeOrganization,
  organizations: payload.organizations,
})

let forcingLogout = false

/** Clear session and send the user to login when refresh is impossible/expired. */
export function forceLogoutToLogin(reason?: string) {
  if (forcingLogout) return
  forcingLogout = true
  setSession(null)
  if (typeof window === 'undefined') {
    forcingLogout = false
    return
  }
  const { pathname, search } = window.location
  if (isPublicAppPath(pathname)) {
    forcingLogout = false
    return
  }
  const from = `${pathname}${search}`
  const params = new URLSearchParams()
  if (from && from !== '/') params.set('from', from)
  if (reason) params.set('reason', reason)
  const query = params.toString()
  window.location.assign(query ? `/login?${query}` : '/login')
}

function resolveApiBaseUrl(): string {
  const configured = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim()
  const tunnelApi = 'https://apiflowledger.valiantxgroup.com/api/v1'
  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location
    const onLocalHost = hostname === 'localhost' || hostname === '127.0.0.1'
    const pointsAtLocalApi = !!configured && /localhost|127\.0\.0\.1/i.test(configured)

    // Public HTTPS pages must never call http://localhost (Safari mixed-content block).
    // Cloudflare tunnel: apiflowledger.valiantxgroup.com → localhost:7070
    if (!onLocalHost && (pointsAtLocalApi || !configured)) {
      return tunnelApi
    }
    if (protocol === 'https:' && configured?.startsWith('http://')) {
      return tunnelApi
    }
  }
  return configured || 'http://localhost:7070/api/v1'
}

export const api = axios.create({
  baseURL: resolveApiBaseUrl(),
})

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getSession()?.accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let refreshing: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getSession()?.refreshToken
  if (!refreshToken) return null
  try {
    const response = await axios.post(
      `${api.defaults.baseURL}/auth/refresh`,
      { refreshToken },
      { headers: { 'Content-Type': 'application/json' } },
    )
    const payload = unwrapApi<LoginResponse>(response)
    const next = toAuthSession(payload)
    setSession(next)
    return next.accessToken
  } catch {
    return null
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const request = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined
    if (error.response?.status !== 401 || !request) {
      return Promise.reject(error)
    }

    // Don't attempt token refresh for public auth endpoints (wrong password, etc.)
    if (isPublicAuthUrl(request.url)) {
      return Promise.reject(error)
    }

    // Already retried, or refresh itself failed via another path
    if (request._retry) {
      forceLogoutToLogin('session_expired')
      return Promise.reject(error)
    }

    if (!getSession()?.refreshToken) {
      forceLogoutToLogin('session_expired')
      return Promise.reject(error)
    }

    request._retry = true
    refreshing ??= refreshAccessToken().finally(() => {
      refreshing = null
    })

    const token = await refreshing
    if (!token) {
      forceLogoutToLogin('session_expired')
      return Promise.reject(error)
    }

    request.headers.Authorization = `Bearer ${token}`
    return api(request)
  },
)
