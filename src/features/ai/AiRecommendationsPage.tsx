import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Check, Lightbulb, ShieldAlert, X } from 'lucide-react'
import { toast } from 'sonner'
import { aiApi, type AiRecommendation } from '@/services/api'
import { getApiErrorMessage } from '@/lib/api-error'
import { cn } from '@/lib/utils'
import { EmptyState, MetricCard, PageHeader } from '@/components/layout/PageChrome'
import { Badge, Button, Skeleton } from '@/components/ui'

const STATUS_FILTERS = [
  { value: 'NEW', label: 'New' },
  { value: 'ACKNOWLEDGED', label: 'Acknowledged' },
  { value: 'DISMISSED', label: 'Dismissed' },
  { value: 'ALL', label: 'All' },
] as const

function priorityStyles(priority?: string) {
  const p = (priority ?? '').toUpperCase()
  if (p === 'CRITICAL' || p === 'HIGH') {
    return {
      bar: 'bg-rose-500',
      badge: 'border-rose-200 bg-rose-50 text-rose-800',
      icon: ShieldAlert,
    }
  }
  if (p === 'MEDIUM') {
    return {
      bar: 'bg-amber-500',
      badge: 'border-amber-200 bg-amber-50 text-amber-900',
      icon: AlertTriangle,
    }
  }
  return {
    bar: 'bg-slate-400',
    badge: 'border-slate-200 bg-slate-50 text-slate-700',
    icon: Lightbulb,
  }
}

function formatWhen(iso?: string) {
  if (!iso) return ''
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return ''
  }
}

function confidencePct(value?: number) {
  if (value == null || Number.isNaN(value)) return null
  const n = value <= 1 ? value * 100 : value
  return Math.max(0, Math.min(100, Math.round(n)))
}

export function AiRecommendationsPage() {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<string>('NEW')

  const list = useQuery({
    queryKey: ['ai-recommendations', status],
    queryFn: () => aiApi.recommendations(status === 'ALL' ? undefined : status),
  })

  const allNew = useQuery({
    queryKey: ['ai-recommendations', 'NEW', 'summary'],
    queryFn: () => aiApi.recommendations('NEW'),
    staleTime: 30_000,
  })

  const ack = useMutation({
    mutationFn: (id: string) => aiApi.ack(id),
    onSuccess: () => {
      toast.success('Recommendation acknowledged')
      void queryClient.invalidateQueries({ queryKey: ['ai-recommendations'] })
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const dismiss = useMutation({
    mutationFn: (id: string) => aiApi.dismiss(id),
    onSuccess: () => {
      toast.success('Recommendation dismissed')
      void queryClient.invalidateQueries({ queryKey: ['ai-recommendations'] })
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const rows = list.data ?? []
  const highCount = useMemo(
    () =>
      (allNew.data ?? []).filter((r) => {
        const p = (r.priority ?? '').toUpperCase()
        return p === 'HIGH' || p === 'CRITICAL'
      }).length,
    [allNew.data],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recommendations"
        subtitle="Proactive ERP insights from heuristics and events. Review and act in your normal workflows — nothing is posted automatically."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Open insights" value={allNew.data?.length ?? '—'} hint="Status: New" icon={Lightbulb} />
        <MetricCard label="High priority" value={highCount || '0'} hint="Needs attention soon" icon={ShieldAlert} />
        <MetricCard
          label="Showing"
          value={list.isLoading ? '…' : rows.length}
          hint={STATUS_FILTERS.find((f) => f.value === status)?.label ?? status}
          icon={AlertTriangle}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[var(--shadow-soft)]">
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50/90 via-white to-teal-50/30 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Insight inbox</p>
            <p className="text-sm text-slate-600">Filter by review status</p>
          </div>
          <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100/90 p-1">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setStatus(f.value)}
                className={cn(
                  'cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition',
                  status === f.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {list.isLoading ? (
            <div className="space-y-3 p-5">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : null}

          {!list.isLoading && !rows.length ? (
            <div className="p-10">
              <EmptyState
                title="No recommendations"
                description="Insights appear after relevant ERP activity when AI is enabled. Try creating products or customers, or check back after transactions."
              />
            </div>
          ) : null}

          {rows.map((r) => (
            <RecommendationRow
              key={r.id}
              item={r}
              busy={ack.isPending || dismiss.isPending}
              onAck={() => ack.mutate(r.id)}
              onDismiss={() => dismiss.mutate(r.id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function RecommendationRow({
  item,
  busy,
  onAck,
  onDismiss,
}: {
  item: AiRecommendation
  busy: boolean
  onAck: () => void
  onDismiss: () => void
}) {
  const styles = priorityStyles(item.priority)
  const Icon = styles.icon
  const conf = confidencePct(item.confidence)
  const actionable = item.status === 'NEW' || item.status === 'OPEN'

  return (
    <article className="relative flex gap-0 transition hover:bg-slate-50/60">
      <div className={cn('w-1 shrink-0 self-stretch', styles.bar)} />
      <div className="flex min-w-0 flex-1 flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl border border-slate-100 bg-white text-slate-600 shadow-sm">
              <Icon className="size-4" />
            </span>
            <div className="min-w-0">
              <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                <Badge variant="outline" className="font-medium">
                  {(item.type ?? '').replace(/_/g, ' ')}
                </Badge>
                <span
                  className={cn(
                    'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                    styles.badge,
                  )}
                >
                  {item.priority || 'Info'}
                </span>
                <Badge variant="neutral">{item.status}</Badge>
                {item.createdAt ? (
                  <span className="text-[11px] text-slate-400">{formatWhen(item.createdAt)}</span>
                ) : null}
              </div>
              <h3 className="font-[family-name:var(--font-display)] text-base font-semibold tracking-tight text-slate-900">
                {item.title}
              </h3>
              {item.description ? (
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{item.description}</p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {item.reason ? (
              <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3.5 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Why</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">{item.reason}</p>
              </div>
            ) : null}
            {item.suggestedAction ? (
              <div className="rounded-xl border border-teal-100 bg-teal-50/50 px-3.5 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-teal-700/70">Suggested action</p>
                <p className="mt-1 text-xs leading-relaxed text-teal-900">{item.suggestedAction}</p>
              </div>
            ) : null}
          </div>

          {conf != null ? (
            <div className="max-w-xs">
              <div className="mb-1 flex justify-between text-[10px] font-medium uppercase tracking-wide text-slate-400">
                <span>Confidence</span>
                <span>{conf}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-500"
                  style={{ width: `${conf}%` }}
                />
              </div>
            </div>
          ) : null}
        </div>

        {actionable ? (
          <div className="flex shrink-0 gap-2 sm:flex-col">
            <Button size="sm" className="cursor-pointer gap-1.5" onClick={onAck} disabled={busy}>
              <Check className="size-3.5" />
              Acknowledge
            </Button>
            <Button size="sm" variant="outline" className="cursor-pointer gap-1.5" onClick={onDismiss} disabled={busy}>
              <X className="size-3.5" />
              Dismiss
            </Button>
          </div>
        ) : null}
      </div>
    </article>
  )
}
