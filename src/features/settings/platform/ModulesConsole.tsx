import { Lock, Puzzle } from 'lucide-react'
import { Badge, Button, Card, CardContent, Skeleton, Switch } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { ModuleCatalogItem, OrganizationModuleResponse } from '@/platform'

function statusLabel(mod: OrganizationModuleResponse | undefined, catalog: ModuleCatalogItem) {
  if (catalog.status === 'COMING_SOON') return 'Coming soon'
  if (!mod) return 'Not provisioned'
  if (mod.trial && mod.effectivelyEnabled) return 'Trial'
  if (mod.effectivelyEnabled) return 'Enabled'
  return 'Disabled'
}

export function ModulesConsole({
  catalog,
  orgModuleByCode,
  featureCountByModule,
  isCustomEdition,
  loading,
  toggling,
  onToggle,
  onConfigure,
  onSwitchToCustom,
}: {
  catalog: ModuleCatalogItem[]
  orgModuleByCode: Map<string, OrganizationModuleResponse>
  featureCountByModule: Map<string, number>
  isCustomEdition: boolean
  loading?: boolean
  toggling?: boolean
  onToggle: (moduleCode: string, enabled: boolean) => void
  onConfigure: (moduleCode: string) => void
  onSwitchToCustom: () => void
}) {
  if (loading) {
    return (
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-44 rounded-2xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {!isCustomEdition ? (
        <Card className="border-amber-200/80 bg-amber-50/60 shadow-[var(--shadow-soft)]">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-800">
                <Puzzle className="size-5" aria-hidden />
              </span>
              <div>
                <p className="font-semibold text-slate-900">Switch to Custom to manage modules freely</p>
                <p className="mt-0.5 text-sm text-slate-600">
                  You can still toggle modules now — they apply immediately to the sidebar and app. Custom keeps your
                  selection if you change edition presets later.
                </p>
              </div>
            </div>
            <Button type="button" size="sm" onClick={onSwitchToCustom} className="shrink-0">
              Use Custom edition
            </Button>
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-slate-500">
          Custom edition is active. Enable or disable modules below — changes apply immediately.
        </p>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {catalog.map((mod) => {
          const entitlement = orgModuleByCode.get(mod.code)
          const label = statusLabel(entitlement, mod)
          const enabled = entitlement?.effectivelyEnabled === true
          const featureCount = featureCountByModule.get(mod.code) ?? 0
          const locked = mod.status === 'COMING_SOON' || mod.core

          return (
            <Card
              key={mod.code}
              className={cn(
                'transition-shadow duration-200 hover:shadow-[0_8px_24px_rgb(15_23_42/0.06)]',
                enabled && 'border-teal-200/80',
              )}
            >
              <CardContent className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">{mod.displayName}</p>
                    <p className="text-xs text-slate-500">{mod.code}</p>
                  </div>
                  <Badge variant={enabled ? 'success' : 'neutral'}>{label}</Badge>
                </div>
                <p className="text-sm text-slate-600">{mod.description}</p>
                <p className="text-xs text-slate-400">
                  v{mod.version}
                  {mod.dependencies.length ? ` · depends on ${mod.dependencies.join(', ')}` : ''}
                  {featureCount ? ` · ${featureCount} features` : ''}
                </p>
                <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`mod-switch-${mod.code}`}
                      checked={enabled}
                      disabled={toggling || locked}
                      onCheckedChange={(checked) => onToggle(mod.code, checked)}
                      aria-label={`${enabled ? 'Disable' : 'Enable'} ${mod.displayName}`}
                    />
                    <label htmlFor={`mod-switch-${mod.code}`} className="text-sm text-slate-600">
                      {locked ? (
                        <span className="inline-flex items-center gap-1 text-slate-400">
                          <Lock className="size-3.5" aria-hidden />
                          {mod.core ? 'Core' : 'Unavailable'}
                        </span>
                      ) : enabled ? (
                        'On'
                      ) : (
                        'Off'
                      )}
                    </label>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={featureCount === 0}
                    title={featureCount === 0 ? 'No feature flags for this module' : 'Open feature console'}
                    onClick={() => onConfigure(mod.code)}
                  >
                    Configure
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
