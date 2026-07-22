import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Boxes,
  LineChart,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { aiApi } from '@/services/api'
import { cn } from '@/lib/utils'
import { EmptyState, MetricCard, PageHeader } from '@/components/layout/PageChrome'
import { Skeleton } from '@/components/ui'

const TYPES = [
  {
    id: 'SALES' as const,
    label: 'Sales',
    detail: 'Revenue trend',
    icon: TrendingUp,
  },
  {
    id: 'DEMAND' as const,
    label: 'Demand',
    detail: 'Volume outlook',
    icon: LineChart,
  },
  {
    id: 'CASHFLOW' as const,
    label: 'Cash flow',
    detail: 'Liquidity view',
    icon: Wallet,
  },
  {
    id: 'INVENTORY' as const,
    label: 'Inventory',
    detail: 'Stock trajectory',
    icon: Boxes,
  },
]

function formatNumber(n: number) {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 0,
  }).format(n)
}

export function AiAnalyticsPage() {
  const [type, setType] = useState<(typeof TYPES)[number]['id']>('SALES')
  const activeMeta = TYPES.find((t) => t.id === type) ?? TYPES[0]

  const forecast = useQuery({
    queryKey: ['ai-forecast', type],
    queryFn: () => aiApi.forecasts(type),
  })

  const data = forecast.data
  const points = data?.points ?? []

  const stats = useMemo(() => {
    if (!points.length) return null
    const latest = points[points.length - 1]
    const max = Math.max(...points.map((p) => Math.max(Number(p.actual) || 0, Number(p.forecast) || 0)), 1)
    const avgForecast =
      points.reduce((s, p) => s + (Number(p.forecast) || 0), 0) / Math.max(points.length, 1)
    return { latest, max, avgForecast }
  }, [points])

  const summaryEntries = Object.entries(data?.summary ?? {}).slice(0, 6)

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Analytics"
        subtitle="Heuristic forecasts for planning. Not a substitute for audited financial reports."
      />

      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[var(--shadow-soft)]">
        <div className="border-b border-slate-100 bg-gradient-to-r from-teal-50/70 via-white to-sky-50/40 px-4 py-4 sm:px-5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Forecast model</p>
          <p className="mt-0.5 font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-slate-900">
            {activeMeta.label} outlook
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {TYPES.map(({ id, label, detail, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setType(id)}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition',
                  type === id
                    ? 'border-teal-200 bg-teal-50/80 shadow-sm ring-1 ring-teal-100'
                    : 'border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 grid size-9 place-items-center rounded-lg',
                    type === id ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600',
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-slate-900">{label}</span>
                  <span className="text-xs text-slate-500">{detail}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {forecast.isLoading ? (
            <div className="grid gap-4 md:grid-cols-3">
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
            </div>
          ) : null}

          {data && !data.enabled ? (
            <EmptyState title="Analytics disabled" description={data.message} />
          ) : null}

          {data?.enabled ? (
            <div className="space-y-5">
              {data.message ? (
                <p className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm leading-relaxed text-slate-600">
                  {data.message}
                </p>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-3">
                <MetricCard
                  label="Latest period"
                  value={
                    stats
                      ? formatNumber(Number(stats.latest.forecast || stats.latest.actual) || 0)
                      : '—'
                  }
                  hint={stats?.latest.period ?? 'No periods'}
                  icon={activeMeta.icon}
                />
                <MetricCard
                  label="Avg forecast"
                  value={stats ? formatNumber(Math.round(stats.avgForecast)) : '—'}
                  hint={`${points.length} period${points.length === 1 ? '' : 's'}`}
                  icon={LineChart}
                />
                <MetricCard
                  label="Run"
                  value={data.runId ? String(data.runId).slice(0, 8) : '—'}
                  hint={data.type}
                  icon={TrendingUp}
                />
              </div>

              {summaryEntries.length ? (
                <div className="rounded-2xl border border-slate-100 bg-white">
                  <div className="border-b border-slate-100 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Summary signals
                    </p>
                  </div>
                  <dl className="grid gap-px bg-slate-100 sm:grid-cols-2 lg:grid-cols-3">
                    {summaryEntries.map(([k, v]) => (
                      <div key={k} className="bg-white px-4 py-3">
                        <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                          {k.replace(/_/g, ' ')}
                        </dt>
                        <dd className="mt-1 text-sm font-semibold text-slate-800">{String(v)}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : null}

              {!points.length ? (
                <EmptyState
                  title="No forecast points"
                  description="Not enough historical data yet for this model type."
                />
              ) : (
                <div>
                  <div className="mb-3 flex items-end justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        Period breakdown
                      </p>
                      <p className="text-sm text-slate-600">Actual vs forecast</p>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="size-2 rounded-full bg-slate-400" /> Actual
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="size-2 rounded-full bg-teal-500" /> Forecast
                      </span>
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {points.map((p) => {
                      const actual = Number(p.actual) || 0
                      const fc = Number(p.forecast) || 0
                      const max = stats?.max ?? 1
                      return (
                        <div
                          key={p.period}
                          className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm transition hover:border-teal-200/80"
                        >
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                            {p.period}
                          </p>
                          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-slate-900">
                            {formatNumber(fc || actual)}
                          </p>
                          <div className="mt-4 space-y-2">
                            <BarRow label="Actual" value={actual} max={max} tone="slate" />
                            <BarRow label="Forecast" value={fc} max={max} tone="teal" />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function BarRow({
  label,
  value,
  max,
  tone,
}: {
  label: string
  value: number
  max: number
  tone: 'slate' | 'teal'
}) {
  const pct = Math.max(2, Math.round((value / max) * 100))
  return (
    <div>
      <div className="mb-1 flex justify-between text-[11px] text-slate-500">
        <span>{label}</span>
        <span className="font-medium text-slate-700">{formatNumber(value)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            tone === 'teal' ? 'bg-teal-500' : 'bg-slate-400',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
