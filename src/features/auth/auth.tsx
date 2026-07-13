import { createContext, useContext, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { api, getSession, setSession, type AuthSession } from '@/lib/api-client'

type AuthValue = { session: AuthSession | null; login: (email: string, password: string) => Promise<void>; logout: () => Promise<void> }
const AuthContext = createContext<AuthValue | null>(null)
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setCurrent] = useState(getSession)
  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password })
    const result = data.data ?? data
    const next: AuthSession = { accessToken: result.accessToken, refreshToken: result.refreshToken, user: result.user ?? { email, name: result.name, role: result.role } }
    setSession(next); setCurrent(next)
  }
  const logout = async () => { try { if (session?.refreshToken) await api.post('/auth/logout', { refreshToken: session.refreshToken }) } finally { setSession(null); setCurrent(null) } }
  return <AuthContext.Provider value={{ session, login, logout }}>{children}</AuthContext.Provider>
}
export const useAuth = () => { const value = useContext(AuthContext); if (!value) throw new Error('useAuth must be used inside AuthProvider'); return value }
export function ProtectedRoute({ children }: { children: ReactNode }) { const { session } = useAuth(); const location = useLocation(); return session ? <>{children}</> : <Navigate to="/login" state={{ from: location }} replace /> }
