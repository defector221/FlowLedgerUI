import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'

const TOKEN_KEY = 'flowledger.auth'
export type AuthSession = { accessToken: string; refreshToken: string; user: { id?: string; name?: string; email?: string; role?: string } }

export const getSession = (): AuthSession | null => {
  try { return JSON.parse(localStorage.getItem(TOKEN_KEY) ?? 'null') }
  catch { return null }
}
export const setSession = (session: AuthSession | null) => {
  if (session) localStorage.setItem(TOKEN_KEY, JSON.stringify(session))
  else localStorage.removeItem(TOKEN_KEY)
}

export const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1' })

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
    if (error.response?.status !== 401 || request?._retry || !getSession()?.refreshToken) return Promise.reject(error)
    request._retry = true
    refreshing ??= axios.post(`${api.defaults.baseURL}/auth/refresh`, { refreshToken: getSession()?.refreshToken })
      .then(({ data }) => {
        const payload = data.data ?? data
        const current = getSession()
        if (!current?.refreshToken) return null
        setSession({ accessToken: payload.accessToken, refreshToken: payload.refreshToken ?? current.refreshToken, user: payload.user ?? current.user })
        return payload.accessToken as string
      })
      .catch(() => { setSession(null); return null })
      .finally(() => { refreshing = null })
    const token = await refreshing
    if (!token) return Promise.reject(error)
    request.headers.Authorization = `Bearer ${token}`
    return api(request)
  },
)
