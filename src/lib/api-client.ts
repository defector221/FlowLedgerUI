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
}

export const toAuthSession = (payload: LoginResponse): AuthSession => ({
  accessToken: payload.accessToken,
  refreshToken: payload.refreshToken,
  user: payload.user,
  activeOrganization: payload.activeOrganization,
  organizations: payload.organizations,
})

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:7070/api/v1',
})

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getSession()?.accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let refreshing: Promise<string | null> | null = null
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const request = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
    if (error.response?.status !== 401 || request?._retry || !getSession()?.refreshToken) {
      return Promise.reject(error)
    }
    request._retry = true
    refreshing ??= axios
      .post(`${api.defaults.baseURL}/auth/refresh`, { refreshToken: getSession()?.refreshToken })
      .then((response) => {
        const payload = unwrapApi<LoginResponse>(response)
        const next = toAuthSession(payload)
        setSession(next)
        return next.accessToken
      })
      .catch(() => {
        setSession(null)
        return null
      })
      .finally(() => {
        refreshing = null
      })
    const token = await refreshing
    if (!token) return Promise.reject(error)
    request.headers.Authorization = `Bearer ${token}`
    return api(request)
  },
)
