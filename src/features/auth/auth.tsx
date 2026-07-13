import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getSession, setSession, type AuthSession } from '@/lib/api-client'
import { authApi, organizationApi } from '@/services/api'
import { canAccess, canAccessModule, canManageOrganization, canManageUsers, hasAnyRole, hasRole } from '@/lib/permissions'
import type { OrganizationResponse, RoleCode } from '@/types/api'

type AuthValue = {
  session: AuthSession | null
  organization: OrganizationResponse | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (payload: { organizationName: string; email: string; password: string; firstName: string; lastName?: string; phone?: string }) => Promise<void>
  logout: () => Promise<void>
  refreshOrganization: () => Promise<void>
  hasRole: (role: RoleCode) => boolean
  hasAnyRole: (roles: RoleCode[]) => boolean
  can: (permission: string) => boolean
  canAccessModule: (module: Parameters<typeof canAccessModule>[1]) => boolean
  canManageUsers: () => boolean
  canManageOrganization: () => boolean
  needsOnboarding: boolean
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setCurrent] = useState<AuthSession | null>(getSession)
  const [organization, setOrganization] = useState<OrganizationResponse | null>(null)

  const orgQuery = useQuery({
    queryKey: ['organization', 'current', session?.user.organizationId],
    queryFn: organizationApi.current,
    enabled: !!session,
    retry: false,
  })

  useEffect(() => {
    if (orgQuery.data) setOrganization(orgQuery.data)
    if (!session) setOrganization(null)
  }, [orgQuery.data, session])

  const refreshOrganization = useCallback(async () => {
    if (!session) return
    const org = await organizationApi.current()
    setOrganization(org)
  }, [session])

  const login = async (email: string, password: string) => {
    const result = await authApi.login(email, password)
    const next: AuthSession = { accessToken: result.accessToken, refreshToken: result.refreshToken, user: result.user }
    setSession(next)
    setCurrent(next)
  }

  const register = async (payload: { organizationName: string; email: string; password: string; firstName: string; lastName?: string; phone?: string }) => {
    const result = await authApi.register(payload)
    const next: AuthSession = { accessToken: result.accessToken, refreshToken: result.refreshToken, user: result.user }
    setSession(next)
    setCurrent(next)
  }

  const logout = async () => {
    try {
      if (session?.refreshToken) await authApi.logout(session.refreshToken)
    } finally {
      setSession(null)
      setCurrent(null)
      setOrganization(null)
    }
  }

  const roles = session?.user.roles
  const value = useMemo<AuthValue>(() => ({
    session,
    organization,
    isLoading: !!session && orgQuery.isLoading,
    login,
    register,
    logout,
    refreshOrganization,
    hasRole: (role) => hasRole(roles, role),
    hasAnyRole: (required) => hasAnyRole(roles, required),
    can: (permission) => canAccess(roles, permission),
    canAccessModule: (module) => canAccessModule(roles, module),
    canManageUsers: () => canManageUsers(roles),
    canManageOrganization: () => canManageOrganization(roles),
    needsOnboarding: !!session && !!organization && !organization.onboardingCompleted && hasRole(roles, 'ORGANIZATION_ADMIN'),
  }), [session, organization, orgQuery.isLoading, roles])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const location = useLocation()
  if (!session) return <Navigate to="/login" state={{ from: location }} replace />
  return <>{children}</>
}

export function RequireRole({ roles, children }: { roles: RoleCode[]; children: ReactNode }) {
  const { hasAnyRole } = useAuth()
  if (!hasAnyRole(roles)) return <Navigate to="/" replace />
  return <>{children}</>
}

export function OnboardingGuard({ children }: { children: ReactNode }) {
  const { needsOnboarding, isLoading } = useAuth()
  const location = useLocation()
  if (isLoading) return null
  if (needsOnboarding && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }
  if (!needsOnboarding && location.pathname === '/onboarding') {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}
