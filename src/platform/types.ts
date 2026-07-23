export type PlatformModuleCode =
  | 'DASHBOARD'
  | 'SALES'
  | 'PURCHASE'
  | 'INVENTORY'
  | 'PAYMENTS'
  | 'ACCOUNTING'
  | 'CRM'
  | 'REPORTS'
  | 'TRANSPORT'
  | 'RETAIL'
  | 'AI'
  | 'SETTINGS'
  | 'AUDIT'
  | 'WAREHOUSE'
  | 'MANUFACTURING'
  | 'HR'

export type CapabilitiesResponse = {
  editionCode: string
  modules: Record<string, boolean>
  features: Record<string, boolean>
  moduleDetails: OrganizationModuleResponse[]
  featureDetails: OrganizationFeatureResponse[]
}

export type OrganizationModuleResponse = {
  moduleCode: string
  enabled: boolean
  licensed: boolean
  trial: boolean
  expiresAt: string | null
  configuration: string
  effectivelyEnabled: boolean
}

export type OrganizationFeatureResponse = {
  moduleCode: string
  featureCode: string
  enabled: boolean
  licensed: boolean
  trial: boolean
  expiresAt: string | null
  configuration: string
  effectivelyEnabled: boolean
}

export type ModuleCatalogItem = {
  code: string
  displayName: string
  description: string | null
  icon: string | null
  category: string
  version: string
  core: boolean
  enabledByDefault: boolean
  status: string
  dependencies: string[]
}

export type ModuleFeatureCatalogItem = {
  moduleCode: string
  featureCode: string
  displayName: string
  description: string | null
  enabledByDefault: boolean
  status: string
}

export type EditionResponse = {
  code: string
  displayName: string
  description: string | null
  rank: number
  moduleCodes: string[]
}

export type OrganizationEditionResponse = {
  editionCode: string
  displayName: string
  description: string | null
}

/** Maps UI RBAC module keys to platform catalog codes. */
export const RBAC_TO_PLATFORM: Record<string, PlatformModuleCode> = {
  dashboard: 'DASHBOARD',
  sales: 'SALES',
  purchases: 'PURCHASE',
  products: 'INVENTORY',
  categories: 'INVENTORY',
  warehouses: 'WAREHOUSE',
  inventory: 'INVENTORY',
  customers: 'CRM',
  suppliers: 'PURCHASE',
  payments: 'PAYMENTS',
  accounting: 'ACCOUNTING',
  reports: 'REPORTS',
  transport: 'TRANSPORT',
  retail: 'RETAIL',
  leads: 'CRM',
  marketing: 'CRM',
  templates: 'SETTINGS',
  settings: 'SETTINGS',
  users: 'SETTINGS',
  billing: 'SETTINGS',
  audit: 'AUDIT',
  ai: 'AI',
  aiRecommendations: 'AI',
  aiWorkflow: 'AI',
}
