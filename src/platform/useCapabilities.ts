import { useQuery } from '@tanstack/react-query'
import { platformApi } from '@/services/api'
import type { CapabilitiesResponse } from './types'
import { isPlatformFeatureEnabled, isPlatformModuleEnabled } from './registry'

export const CAPABILITIES_QUERY_KEY = ['platform', 'capabilities'] as const

export function useCapabilities() {
  return useQuery({
    queryKey: CAPABILITIES_QUERY_KEY,
    queryFn: () => platformApi.capabilities(),
    staleTime: 5_000,
    refetchOnWindowFocus: true,
  })
}

export function useHasModule(moduleCode: string) {
  const { data } = useCapabilities()
  return isPlatformModuleEnabled(data, moduleCode)
}

export function useHasFeature(moduleCode: string, featureCode: string) {
  const { data } = useCapabilities()
  return isPlatformFeatureEnabled(data, moduleCode, featureCode)
}

export function useCapabilitiesData(): CapabilitiesResponse | undefined {
  return useCapabilities().data
}
