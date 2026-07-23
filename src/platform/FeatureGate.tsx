import type { ReactNode } from 'react'
import { useHasFeature, useHasModule } from './useCapabilities'

export function FeatureGate({
  module: moduleCode,
  feature,
  children,
  fallback = null,
}: {
  module: string
  feature?: string
  children: ReactNode
  fallback?: ReactNode
}) {
  const moduleOn = useHasModule(moduleCode)
  const featureOn = useHasFeature(moduleCode, feature ?? '')
  if (!moduleOn) return <>{fallback}</>
  if (feature && !featureOn) return <>{fallback}</>
  return <>{children}</>
}
