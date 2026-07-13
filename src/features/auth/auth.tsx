import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getSession, setSession, toAuthSession, type AuthSession } from '@/lib/api-client'
import { authApi, organizationApi } from '@/services/api'
import {
  canAccess,
  canAccessModule,
  canManageOrganization,
  canManageUsers,
  hasAnyRole,
  hasRole,
} from '@/lib/permissions'
import type { OrganizationAccessResponse, OrganizationResponse, RoleCode } from '@/types/api'

type AuthValue = {
  session: AuthSession | null
  organization: OrganizationResponse | null
  activeOrganization: OrganizationAccessResponse | null
  organizations: OrganizationAccessResponse[]
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (payload: {
    organizationName: string
    email: string
    password: string
    firstName: string
    lastName?: string
    phone?: string
  }) => Promise<void>
  logout: () => Promise<void>
  switchOrganization: (organizationId: string) => Promise<void>
  createOrganization: (organizationName: string) => Promise<void>
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

function applySession(payload: Parameters<typeof toAuthSession>[0], setCurrent: (session: AuthSession) => void) {
  const next = toAuthSession(payload)
  setSession(next)
  setCurrent(next)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [session, setCurrent] = useState<AuthSession | null>(getSession)
  const [organization, setOrganization] = useState<OrganizationResponse | null>(null)

  useEffect(() => {
    if (session && !session.activeOrganization?.id) {
      setSession(null)
      setCurrent(null)
      setOrganization(null)
    }
  }, [session])

  const orgQuery = useQuery({
    queryKey: ['organization', 'current', session?.activeOrganization?.id],
    queryFn: organizationApi.current,
    enabled: !!session?.activeOrganization?.id,
    retry: false,
  })

  useEffect(() => {
    if (orgQuery.data) setOrganization(orgQuery.data)
    if (!session) setOrganization(null)
  }, [orgQuery.data, session])

  const clearTenantCache = useCallback(async () => {
    await queryClient.cancelQueries()
    queryClient.clear()
  }, [queryClient])

  const refreshOrganization = useCallback(async () => {
    const organizationId = session?.activeOrganization?.id
    if (!organizationId) return
    const org = await organizationApi.current()
    setOrganization(org)
    await queryClient.invalidateQueries({ queryKey: ['organization', 'current', organizationId] })
  }, [queryClient, session])

  const login = async (email: string, password: string) => {
    const result = await authApi.login(email, password)
    applySession(result, setCurrent)
  }

  const register = async (payload: {
    organizationName: string
    email: string
    password: string
    firstName: string
    lastName?: string
    phone?: string
  }) => {
    const result = await authApi.register(payload)
    applySession(result, setCurrent)
  }

  const switchOrganization = async (organizationId: string) => {
    const result = await authApi.switchOrganization(organizationId)
    await clearTenantCache()
    applySession(result, setCurrent)
  }

  const createOrganization = async (organizationName: string) => {
    const result = await authApi.createOrganization(organizationName)
    await clearTenantCache()
    applySession(result, setCurrent)
  }

  const logout = async () => {
    try {
      if (session?.refreshToken) await authApi.logout(session.refreshToken)
    } finally {
      setSession(null)
      setCurrent(null)
      setOrganization(null)
      await clearTenantCache()
    }
  }

  const activeOrganization = session?.activeOrganization ?? null
  const roles = activeOrganization?.roles
  const value = useMemo<AuthValue>(
    () => ({
      session,
      organization,
      activeOrganization,
      organizations: session?.organizations ?? [],
      isLoading: !!session && orgQuery.isLoading,
      login,
      register,
      logout,
      switchOrganization,
      createOrganization,
      refreshOrganization,
      hasRole: (role) => hasRole(roles, role),
      hasAnyRole: (required) => hasAnyRole(roles, required),
      can: (permission) => canAccess(roles, permission),
      canAccessModule: (module) => canAccessModule(roles, module),
      canManageUsers: () => canManageUsers(roles),
      canManageOrganization: () => canManageOrganization(roles),
      needsOnboarding:
        !!session && !!organization && !organization.onboardingCompleted && hasRole(roles, 'ORGANIZATION_ADMIN'),
    }),
    [session, organization, activeOrganization, orgQuery.isLoading, roles, clearTenantCache, refreshOrganization],
  )

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
  if (!session?.activeOrganization?.id) return <Navigate to="/login" state={{ from: location }} replace />
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
