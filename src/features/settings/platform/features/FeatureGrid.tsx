import { FeatureCard } from './FeatureCard'
import type { ModuleFeatureCatalogItem } from '@/platform'
import { Skeleton } from '@/components/ui'

export function FeatureGrid({
  features,
  isEnabled,
  moduleEnabled,
  onToggle,
  loading,
}: {
  features: ModuleFeatureCatalogItem[]
  isEnabled: (feature: ModuleFeatureCatalogItem) => boolean
  moduleEnabled: boolean
  onToggle: (feature: ModuleFeatureCatalogItem, enabled: boolean) => void
  loading?: boolean
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-[var(--shadow-soft)]">
            <div className="flex items-start justify-between">
              <Skeleton className="size-10 rounded-xl" />
              <Skeleton className="h-5 w-16 rounded-md" />
            </div>
            <Skeleton className="mt-4 h-5 w-2/3" />
            <Skeleton className="mt-2 h-4 w-full" />
            <Skeleton className="mt-1 h-4 w-4/5" />
          </div>
        ))}
      </div>
    )
  }

  if (!features.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-10 text-center text-sm text-slate-500">
        No features match your search or filters.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {features.map((feature) => (
        <FeatureCard
          key={`${feature.moduleCode}.${feature.featureCode}`}
          feature={feature}
          enabled={isEnabled(feature)}
          moduleEnabled={moduleEnabled}
          onToggle={(enabled) => onToggle(feature, enabled)}
        />
      ))}
    </div>
  )
}
