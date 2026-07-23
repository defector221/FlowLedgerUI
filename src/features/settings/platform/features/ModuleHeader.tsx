import { ChevronDown } from 'lucide-react'
import { Badge } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { ModuleCatalogItem } from '@/platform'
import { FeatureToggle } from './FeatureToggle'
import { moduleIcon } from './feature-types'

export function ModuleHeader({
  module,
  editionLabel,
  featureCount,
  enabledCount,
  moduleEnabled,
  expanded,
  onToggleExpanded,
  onModuleToggle,
  coreLocked,
}: {
  module: ModuleCatalogItem
  editionLabel?: string
  featureCount: number
  enabledCount: number
  moduleEnabled: boolean
  expanded: boolean
  onToggleExpanded: () => void
  onModuleToggle: (enabled: boolean) => void
  coreLocked?: boolean
}) {
  const Icon = moduleIcon(module.code)
  const switchId = `module-${module.code}`

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[var(--shadow-soft)] sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="flex min-w-0 items-start gap-3">
        <button
          type="button"
          onClick={onToggleExpanded}
          aria-expanded={expanded}
          aria-controls={`module-panel-${module.code}`}
          className="grid size-11 shrink-0 place-items-center rounded-xl bg-slate-900 text-white transition hover:bg-slate-800"
        >
          <Icon className="size-5" aria-hidden />
        </button>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 id={`module-title-${module.code}`} className="text-lg font-semibold tracking-tight text-slate-900">
              {module.displayName}
            </h3>
            {editionLabel ? <Badge variant="outline">{editionLabel}</Badge> : null}
            <Badge variant={moduleEnabled ? 'success' : 'neutral'}>{moduleEnabled ? 'Module on' : 'Module off'}</Badge>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">
            {module.description || `${module.category} module`}
          </p>
          <p className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-400">
            {enabledCount}/{featureCount} features enabled
            {module.dependencies.length ? ` · depends on ${module.dependencies.join(', ')}` : ''}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3 self-end sm:self-center">
        <FeatureToggle
          id={switchId}
          checked={moduleEnabled}
          disabled={coreLocked}
          label={`${moduleEnabled ? 'Disable' : 'Enable'} ${module.displayName} module`}
          onCheckedChange={onModuleToggle}
        />
        <button
          type="button"
          onClick={onToggleExpanded}
          aria-expanded={expanded}
          aria-controls={`module-panel-${module.code}`}
          className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50"
          aria-label={expanded ? `Collapse ${module.displayName}` : `Expand ${module.displayName}`}
        >
          <ChevronDown className={cn('size-4 transition-transform duration-200', expanded && 'rotate-180')} />
        </button>
      </div>
    </div>
  )
}
