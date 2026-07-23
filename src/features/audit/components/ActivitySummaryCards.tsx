import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, Skeleton } from '@/components/ui'

export type SummaryMetric = {
  id: string
  label: string
  value: number | string
  subtitle: string
  trend?: string
  icon: LucideIcon
  tone?: 'teal' | 'sky' | 'amber' | 'rose' | 'violet' | 'slate'
}

const TONE: Record<NonNullable<SummaryMetric['tone']>, string> = {
  teal: 'bg-teal-50 text-teal-700',
  sky: 'bg-sky-50 text-sky-700',
  amber: 'bg-amber-50 text-amber-800',
  rose: 'bg-rose-50 text-rose-700',
  violet: 'bg-violet-50 text-violet-700',
  slate: 'bg-slate-100 text-slate-700',
}

export function ActivitySummaryCards({ metrics, loading }: { metrics: SummaryMetric[]; loading?: boolean }) {
  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="rounded-xl border-slate-200/90 shadow-[var(--shadow-soft)]">
            <CardContent className="space-y-3 p-4">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-3 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {metrics.map((metric) => {
        const Icon = metric.icon
        return (
          <Card
            key={metric.id}
            className="rounded-xl border-slate-200/90 shadow-[var(--shadow-soft)] transition duration-150 hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-[var(--shadow-lift)]"
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <span className={cn('grid size-9 place-items-center rounded-lg', TONE[metric.tone ?? 'teal'])}>
                  <Icon className="size-4" aria-hidden />
                </span>
                {metric.trend ? <span className="text-[11px] font-semibold text-teal-700">{metric.trend}</span> : null}
              </div>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">{metric.value}</p>
              <p className="mt-1 text-sm font-medium text-slate-800">{metric.label}</p>
              <p className="text-xs text-slate-500">{metric.subtitle}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
