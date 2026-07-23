import { EmptyState } from '@/components/layout/PageChrome'
import { Badge, Skeleton } from '@/components/ui'
import type { AuditLogResponse } from '@/types/api'
import { classifyAction, entityDisplayName, formatAbsoluteDate, resolveModule } from '../audit-model'
import { AuditActionBadge } from './AuditActionBadge'

export function AuditTimeline({
  rows,
  loading,
  onOpen,
}: {
  rows: AuditLogResponse[]
  loading?: boolean
  onOpen: (id: string) => void
}) {
  if (loading) {
    return (
      <div className="space-y-4 p-5">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="flex gap-4">
            <Skeleton className="h-10 w-14" />
            <Skeleton className="h-20 flex-1 rounded-xl" />
          </div>
        ))}
      </div>
    )
  }

  if (!rows.length) {
    return (
      <div className="flex min-h-[18rem] items-center justify-center p-6">
        <EmptyState title="No timeline events" description="Try a wider date range or clear module filters." />
      </div>
    )
  }

  return (
    <ol className="space-y-0 p-5">
      {rows.map((row, index) => {
        const when = formatAbsoluteDate(row.createdAt)
        return (
          <li key={row.id} className="relative flex gap-4 pb-6">
            {index < rows.length - 1 ? (
              <span className="absolute left-[2.15rem] top-10 h-[calc(100%-1.5rem)] w-px bg-slate-200" aria-hidden />
            ) : null}
            <div className="w-14 shrink-0 pt-1 text-right">
              <p className="text-sm font-semibold text-slate-900">{when.time}</p>
              <p className="text-[11px] text-slate-500">{when.day}</p>
            </div>
            <button
              type="button"
              onClick={() => onOpen(row.id)}
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-[var(--shadow-soft)] transition duration-150 hover:border-teal-200 hover:shadow-[var(--shadow-lift)]"
            >
              <div className="flex flex-wrap items-center gap-2">
                <AuditActionBadge action={row.action} />
                <Badge variant="outline">{resolveModule(row.entityType)}</Badge>
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {entityDisplayName(row)} · {classifyAction(row.action)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {row.userName ?? 'System'}
                {row.userEmail ? ` · ${row.userEmail}` : ''}
              </p>
            </button>
          </li>
        )
      })}
    </ol>
  )
}
