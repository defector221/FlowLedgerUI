import type { NavEntry } from '@/components/layout/sidebar/nav-config'
import { NAV_ENTRIES } from '@/components/layout/sidebar/nav-config'
import type { CapabilitiesResponse, PlatformModuleCode } from './types'
import { RBAC_TO_PLATFORM } from './types'

export type RegisteredModule = {
  code: PlatformModuleCode
  nav?: NavEntry[]
}

const registry = new Map<string, RegisteredModule>()

export function registerModule(mod: RegisteredModule) {
  registry.set(mod.code, mod)
}

export function getRegisteredModules() {
  return [...registry.values()]
}

/** Default nav comes from legacy nav-config; filtered by capabilities. */
export function getNavEntries(_capabilities?: CapabilitiesResponse | null): NavEntry[] {
  return NAV_ENTRIES
}

export function platformCodeForRbac(moduleKey: string): PlatformModuleCode | undefined {
  return RBAC_TO_PLATFORM[moduleKey]
}

const CORE_FALLBACK_ON = new Set(['DASHBOARD', 'SALES', 'PURCHASE', 'INVENTORY', 'PAYMENTS', 'SETTINGS', 'AUDIT'])

function readModuleFlag(capabilities: CapabilitiesResponse, platformCode: string): boolean | undefined {
  if (Object.prototype.hasOwnProperty.call(capabilities.modules, platformCode)) {
    return capabilities.modules[platformCode] === true
  }
  const detail = capabilities.moduleDetails?.find((m) => m.moduleCode === platformCode)
  if (detail) return detail.effectivelyEnabled === true
  return undefined
}

export function isPlatformModuleEnabled(
  capabilities: CapabilitiesResponse | null | undefined,
  platformCode: string | undefined,
): boolean {
  if (!platformCode) return true
  // Until capabilities load, only expose core ERP — never flash optional modules as "on".
  if (!capabilities) return CORE_FALLBACK_ON.has(platformCode)

  const flag = readModuleFlag(capabilities, platformCode)
  if (flag !== undefined) return flag

  // Missing entitlement row: core stays visible during rollout; optional modules stay off
  return CORE_FALLBACK_ON.has(platformCode)
}

export function isPlatformFeatureEnabled(
  capabilities: CapabilitiesResponse | null | undefined,
  moduleCode: string,
  featureCode: string,
): boolean {
  if (!featureCode) return true
  if (!isPlatformModuleEnabled(capabilities, moduleCode)) return false
  if (!capabilities) return false

  const key = `${moduleCode}.${featureCode}`
  if (Object.prototype.hasOwnProperty.call(capabilities.features, key)) {
    return capabilities.features[key] === true
  }

  const detail = capabilities.featureDetails?.find((f) => f.moduleCode === moduleCode && f.featureCode === featureCode)
  if (detail) return detail.effectivelyEnabled === true

  // No org feature row yet — only treat as on when the parent module is on
  return isPlatformModuleEnabled(capabilities, moduleCode)
}
