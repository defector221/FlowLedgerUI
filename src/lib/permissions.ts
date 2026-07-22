import type { RoleCode } from '@/types/api'

const ROLE_PERMISSIONS: Record<RoleCode, string[]> = {
  ORGANIZATION_ADMIN: ['*'],
  ACCOUNTANT: [
    'sales:read',
    'sales:write',
    'purchases:read',
    'purchases:write',
    'payments:read',
    'payments:write',
    'reports:read',
    'accounting:read',
    'accounting:write',
    'customers:read',
    'customers:write',
    'suppliers:read',
    'products:read',
    'products:write',
    'inventory:read',
    'transport:read',
    'AI_CHAT',
    'AI_RECOMMENDATION',
  ],
  SALES_MANAGER: [
    'sales:read',
    'sales:write',
    'customers:read',
    'customers:write',
    'products:read',
    'payments:read',
    'payments:write',
    'AI_CHAT',
  ],
  PURCHASE_MANAGER: [
    'purchases:read',
    'purchases:write',
    'suppliers:read',
    'suppliers:write',
    'products:read',
    'payments:read',
    'payments:write',
    'AI_CHAT',
  ],
  INVENTORY_MANAGER: [
    'inventory:read',
    'inventory:write',
    'products:read',
    'products:write',
    'warehouses:read',
    'warehouses:write',
    'categories:read',
    'categories:write',
    'transport:read',
    'AI_CHAT',
    'AI_RECOMMENDATION',
  ],
  VIEWER: [
    'sales:read',
    'purchases:read',
    'inventory:read',
    'customers:read',
    'suppliers:read',
    'products:read',
    'reports:read',
    'payments:read',
    'AI_CHAT',
  ],
}

export function hasRole(roles: RoleCode[] | undefined, role: RoleCode): boolean {
  return roles?.includes(role) ?? false
}

export function hasAnyRole(roles: RoleCode[] | undefined, required: RoleCode[]): boolean {
  return required.some((role) => hasRole(roles, role))
}

export function canAccess(roles: RoleCode[] | undefined, permission: string): boolean {
  if (!roles?.length) return false
  return roles.some((role) => {
    const permissions = ROLE_PERMISSIONS[role] ?? []
    return permissions.includes('*') || permissions.includes(permission)
  })
}

export function canManageUsers(roles: RoleCode[] | undefined): boolean {
  return hasRole(roles, 'ORGANIZATION_ADMIN')
}

export function canManageOrganization(roles: RoleCode[] | undefined): boolean {
  return hasRole(roles, 'ORGANIZATION_ADMIN')
}

export const MODULE_PERMISSIONS = {
  dashboard: 'sales:read',
  customers: 'customers:read',
  suppliers: 'suppliers:read',
  products: 'products:read',
  categories: 'products:read',
  warehouses: 'warehouses:read',
  inventory: 'inventory:read',
  sales: 'sales:read',
  purchases: 'purchases:read',
  leads: 'sales:read',
  marketing: 'sales:read',
  payments: 'payments:read',
  reports: 'reports:read',
  accounting: 'accounting:read',
  transport: 'transport:read',
  templates: 'sales:read',
  settings: 'org:read',
  billing: 'org:read',
  users: 'users:read',
  audit: 'reports:read',
  ai: 'AI_CHAT',
  aiRecommendations: 'AI_RECOMMENDATION',
  aiWorkflow: 'AI_WORKFLOW',
} as const

export function canAccessModule(roles: RoleCode[] | undefined, module: keyof typeof MODULE_PERMISSIONS): boolean {
  if (hasRole(roles, 'ORGANIZATION_ADMIN')) return true
  const permission = MODULE_PERMISSIONS[module]
  if (permission === 'org:read' || permission === 'users:read') return hasRole(roles, 'ORGANIZATION_ADMIN')
  return canAccess(roles, permission)
}
