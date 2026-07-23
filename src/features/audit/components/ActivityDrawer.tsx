import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Copy, Download, ExternalLink, X } from 'lucide-react'
import { toast } from 'sonner'
import { auditApi } from '@/services/api'
import { getApiErrorMessage } from '@/lib/api-error'
import { Badge, Button, Skeleton } from '@/components/ui'
import {
  downloadText,
  entityDisplayName,
  extractAuditMeta,
  formatAbsoluteDate,
  formatRelativeTime,
  initials,
  parseUserAgent,
  relatedRecordPath,
  resolveModule,
  resolveSeverity,
  resolveStatus,
} from '../audit-model'
import { AuditActionBadge } from './AuditActionBadge'
import { AuditStatusChip } from './AuditStatusChip'
import { DiffViewer } from './DiffViewer'
import { JsonViewer } from './JsonViewer'

export function ActivityDrawer({
  eventId,
  open,
  onClose,
}: {
  eventId: string | null
  open: boolean
  onClose: () => void
}) {
  const detailQuery = useQuery({
    queryKey: ['audit-logs', eventId],
    queryFn: () => auditApi.get(eventId!),
    enabled: open && !!eventId,
  })

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  const detail = detailQuery.data
  const meta = detail ? extractAuditMeta(detail) : null
  const agent = detail ? parseUserAgent(detail.userAgent) : null
  const related = detail ? relatedRecordPath(detail) : null

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Activity details">
      <button type="button" className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]" aria-label="Close drawer" onClick={onClose} />
      <aside className="relative z-10 flex h-full w-full max-w-[500px] translate-x-0 flex-col border-l border-slate-200 bg-white shadow-[var(--shadow-lift)] transition-transform duration-200">
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Activity details</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">
              {detail ? entityDisplayName(detail) : 'Loading event…'}
            </h2>
          </div>
          <Button type="button" size="icon" variant="ghost" onClick={onClose} aria-label="Close">
            <X className="size-4" />
          </Button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {detailQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : detailQuery.isError ? (
            <p className="text-sm text-rose-600">{getApiErrorMessage(detailQuery.error)}</p>
          ) : detail ? (
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2">
                <AuditStatusChip status={resolveStatus(detail.action)} />
                <AuditActionBadge action={detail.action} />
                <Badge variant="outline">{resolveModule(detail.entityType)}</Badge>
                <Badge variant="neutral">{resolveSeverity(detail.action, detail.entityType)}</Badge>
              </div>

              <section className="grid gap-3 sm:grid-cols-2">
                <Meta label="Action" value={detail.action} />
                <Meta label="Module" value={resolveModule(detail.entityType)} />
                <Meta label="Entity" value={entityDisplayName(detail)} />
                <Meta label="Entity ID" value={detail.entityId ?? '—'} mono />
                <Meta label="Status" value={resolveStatus(detail.action)} />
                <Meta
                  label="Timestamp"
                  value={`${formatAbsoluteDate(detail.createdAt).day} ${formatAbsoluteDate(detail.createdAt).time} (${formatRelativeTime(detail.createdAt)})`}
                />
                <Meta label="API endpoint" value={meta?.path ?? '—'} mono />
                <Meta label="HTTP method" value={meta?.httpMethod ?? '—'} />
                <Meta label="Response code" value={meta?.responseStatus ?? '—'} />
                <Meta label="Request ID" value={detail.id} mono />
                <Meta label="Correlation ID" value={detail.entityId ?? detail.id} mono />
                <Meta label="IP address" value={detail.ipAddress ?? '—'} mono />
              </section>

              <section className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-teal-400 to-teal-700 text-xs font-semibold text-white">
                    {initials(detail.userName, detail.userEmail)}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{detail.userName ?? 'System / unknown'}</p>
                    <p className="text-xs text-slate-500">{detail.userEmail ?? 'No email on record'}</p>
                  </div>
                </div>
                {agent ? (
                  <p className="mt-3 text-xs text-slate-500">
                    {agent.device} · {agent.browser} · {agent.os}
                  </p>
                ) : null}
              </section>

              <DiffViewer before={detail.oldValue} after={asRequestDiff(detail.newValue)} />
              <JsonViewer label="Event payload" value={detail.newValue} />
              {detail.oldValue ? <JsonViewer label="Previous value" value={detail.oldValue} defaultExpanded={false} /> : null}
            </div>
          ) : null}
        </div>

        {detail ? (
          <footer className="flex flex-wrap gap-2 border-t border-slate-100 px-5 py-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(detail.id)
                  toast.success('UUID copied')
                } catch {
                  toast.error('Unable to copy')
                }
              }}
            >
              <Copy className="size-3.5" />
              Copy UUID
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                downloadText(`audit-${detail.id}.json`, JSON.stringify(detail, null, 2), 'application/json')
              }
            >
              <Download className="size-3.5" />
              Download JSON
            </Button>
            {related ? (
              <Button type="button" variant="outline" size="sm" asChild>
                <Link to={related}>
                  <ExternalLink className="size-3.5" />
                  Open record
                </Link>
              </Button>
            ) : null}
          </footer>
        ) : null}
      </aside>
    </div>
  )
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-sm text-slate-900 ${mono ? 'break-all font-mono text-xs' : ''}`}>{value}</p>
    </div>
  )
}

function asRequestDiff(newValue: unknown) {
  if (!newValue || typeof newValue !== 'object') return newValue
  const record = newValue as Record<string, unknown>
  return record.request ?? record.result ?? newValue
}
