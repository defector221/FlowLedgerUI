import { Boxes, Layers3, ToggleLeft, ToggleRight } from 'lucide-react'
import { Card, CardContent, Skeleton } from '@/components/ui'
import { cn } from '@/lib/utils'

const STATS = [
  { key: 'modules', label: 'Modules', icon: Boxes, tone: 'text-teal-700 bg-teal-50' },
  { key: 'features', label: 'Features', icon: Layers3, tone: 'text-sky-700 bg-sky-50' },
  { key: 'enabled', label: 'Enabled', icon: ToggleRight, tone: 'text-emerald-700 bg-emerald-50' },
  { key: 'disabled', label: 'Disabled', icon: ToggleLeft, tone: 'text-slate-600 bg-slate-100' },
] as const

export function ModuleSummary({
  modules,
  features,
  enabled,
  disabled,
  loading,
}: {
  modules: number
  features: number
  enabled: number
  disabled: number
  loading?: boolean
}) {
  const values = { modules, features, enabled, disabled }

  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {STATS.map((stat) => (
          <Card key={stat.key} className="border-slate-200/90 shadow-[var(--shadow-soft)]">
            <CardContent className="flex items-center gap-3 p-4">
              <Skeleton className="size-10 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-6 w-10" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Feature statistics">
      {STATS.map((stat) => {
        const Icon = stat.icon
        return (
          <Card
            key={stat.key}
            className="border-slate-200/90 shadow-[var(--shadow-soft)] transition-shadow duration-200 hover:shadow-[0_8px_24px_rgb(15_23_42/0.06)]"
          >
            <CardContent className="flex items-center gap-3 p-4">
              <span className={cn('grid size-10 place-items-center rounded-xl', stat.tone)}>
                <Icon className="size-5" aria-hidden />
              </span>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{stat.label}</p>
                <p className="text-2xl font-semibold tracking-tight text-slate-900">{values[stat.key]}</p>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
