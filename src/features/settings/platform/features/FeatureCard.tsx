import { Settings2 } from 'lucide-react'
import { Badge, Button, Card, CardContent } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { ModuleFeatureCatalogItem } from '@/platform'
import { FeatureToggle } from './FeatureToggle'
import { featureIcon, statusForFeature, type FeatureStatus } from './feature-types'

function statusBadge(status: FeatureStatus) {
  switch (status) {
    case 'enabled':
      return <Badge variant="success">Enabled</Badge>
    case 'disabled':
      return <Badge variant="neutral">Disabled</Badge>
    case 'beta':
      return <Badge variant="warning">Beta</Badge>
    case 'preview':
      return <Badge variant="outline">Preview</Badge>
  }
}

export function FeatureCard({
  feature,
  enabled,
  moduleEnabled,
  dependencies,
  onToggle,
  onConfigure,
}: {
  feature: ModuleFeatureCatalogItem
  enabled: boolean
  moduleEnabled: boolean
  dependencies?: string[]
  onToggle: (enabled: boolean) => void
  onConfigure?: () => void
}) {
  const Icon = featureIcon(feature.featureCode, feature.moduleCode)
  const status = statusForFeature(enabled, feature.status)
  const blocked = !moduleEnabled
  const switchId = `feature-${feature.moduleCode}-${feature.featureCode}`

  return (
    <Card
      className={cn(
        'group h-full border-slate-200/90 shadow-[var(--shadow-soft)] transition-all duration-200',
        'hover:-translate-y-0.5 hover:border-teal-200/80 hover:shadow-[0_12px_28px_rgb(15_23_42/0.08)]',
        blocked && 'opacity-80',
      )}
    >
      <CardContent className="flex h-full flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-700 transition-colors group-hover:bg-teal-50 group-hover:text-teal-700">
            <Icon className="size-5" aria-hidden />
          </span>
          <div className="flex items-center gap-2">
            {statusBadge(status)}
            <FeatureToggle
              id={switchId}
              checked={enabled}
              disabled={blocked}
              label={`${enabled ? 'Disable' : 'Enable'} ${feature.displayName}`}
              onCheckedChange={onToggle}
            />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <label htmlFor={switchId} className="cursor-pointer text-base font-semibold text-slate-900">
            {feature.displayName}
          </label>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">
            {feature.description || `${feature.moduleCode}.${feature.featureCode}`}
          </p>
          {dependencies && dependencies.length > 0 ? (
            <p className="mt-2 text-xs text-slate-400" title={dependencies.join(', ')}>
              Depends on {dependencies.join(', ')}
            </p>
          ) : null}
          {blocked ? (
            <p className="mt-2 text-xs font-medium text-amber-700">Enable the module to use this feature.</p>
          ) : null}
        </div>

        {onConfigure ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-auto w-full justify-center"
            onClick={onConfigure}
            aria-label={`Configure ${feature.displayName}`}
          >
            <Settings2 className="size-3.5" />
            Configure
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}
