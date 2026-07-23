import './modules'

export {
  registerModule,
  getNavEntries,
  isPlatformModuleEnabled,
  isPlatformFeatureEnabled,
  platformCodeForRbac,
} from './registry'
export { useCapabilities, useHasModule, useHasFeature, CAPABILITIES_QUERY_KEY } from './useCapabilities'
export { FeatureGate } from './FeatureGate'
export { RequirePlatformFeature } from './RequirePlatformFeature'
export type * from './types'
