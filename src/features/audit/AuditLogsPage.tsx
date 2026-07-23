import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { auditApi } from '@/services/api'
import { getApiErrorMessage } from '@/lib/api-error'
import { cn } from '@/lib/utils'
import {
  EmptyState,
  ListPageShell,
  ListPanelMessage,
  ListTablePanel,
  PageHeader,
} from '@/components/layout/PageChrome'
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Input,
  Skeleton,
  Table,
} from '@/components/ui'
import type { AuditLogResponse } from '@/types/api'

const PAGE_SIZE_OPTIONS = [20, 50, 100] as const

export function AuditLogsPage() {
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(20)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [action, setAction] = useState('')
  const [entityType, setEntityType] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(0)
    }, 300)
    return () => window.clearTimeout(handle)
  }, [searchInput])

  const listQuery = useQuery({
    queryKey: ['audit-logs', page, size, search, action, entityType, from, to],
    queryFn: () =>
      auditApi.list({
        page,
        size,
        ...(search ? { search } : {}),
        ...(action ? { action } : {}),
        ...(entityType ? { entityType } : {}),
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
      }),
    placeholderData: (previous) => previous,
  })

  const detailQuery = useQuery({
    queryKey: ['audit-logs', selectedId],
    queryFn: () => auditApi.get(selectedId!),
    enabled: !!selectedId,
  })

  const pageData = listQuery.data
  const rows = pageData?.content ?? []
  const totalElements = pageData?.totalElements ?? 0
  const totalPages = Math.max(1, pageData?.totalPages ?? 1)
  const fromRow = totalElements === 0 ? 0 : page * size + 1
  const toRow = Math.min(totalElements, page * size + rows.length)
  const detail = detailQuery.data
  const hasFilters = Boolean(search || action || entityType || from || to)

  const clearFilters = () => {
    setSearchInput('')
    setSearch('')
    setAction('')
    setEntityType('')
    setFrom('')
    setTo('')
    setPage(0)
  }

  return (
    <ListPageShell
      header={
        <PageHeader
          title="Audit log"
          subtitle="Track important activity across your organization."
        />
      }
    >
      <ListTablePanel
        toolbar={
          <div className="space-y-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-slate-400" />
                <Input
                  className="pl-9"
                  placeholder="Search action, entity, IP, or entity ID…"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                />
              </div>
              <Input
                className="lg:w-40"
                placeholder="Action"
                value={action}
                onChange={(event) => {
                  setAction(event.target.value)
                  setPage(0)
                }}
              />
              <Input
                className="lg:w-44"
                placeholder="Entity type"
                value={entityType}
                onChange={(event) => {
                  setEntityType(event.target.value)
                  setPage(0)
                }}
              />
              <Input
                type="date"
                className="lg:w-40"
                value={from}
                onChange={(event) => {
                  setFrom(event.target.value)
                  setPage(0)
                }}
                aria-label="From date"
              />
              <Input
                type="date"
                className="lg:w-40"
                value={to}
                onChange={(event) => {
                  setTo(event.target.value)
                  setPage(0)
                }}
                aria-label="To date"
              />
              {hasFilters ? (
                <Button type="button" variant="ghost" onClick={clearFilters}>
                  Clear
                </Button>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <p>
                {listQuery.isLoading
                  ? 'Loading events…'
                  : totalElements
                    ? `Showing ${fromRow}–${toRow} of ${totalElements.toLocaleString()} events`
                    : 'No events match these filters'}
              </p>
              <label className="flex items-center gap-2">
                <span>Rows</span>
                <select
                  className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700"
                  value={size}
                  onChange={(event) => {
                    setSize(Number(event.target.value))
                    setPage(0)
                  }}
                >
                  {PAGE_SIZE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        }
      >
        {listQuery.isLoading && !pageData ? (
          <ListPanelMessage>
            <div className="w-full max-w-4xl space-y-3">
              {[1, 2, 3, 4, 5].map((id) => (
                <Skeleton key={id} className="h-12 w-full" />
              ))}
            </div>
          </ListPanelMessage>
        ) : listQuery.isError ? (
          <ListPanelMessage>
            <EmptyState title="Couldn’t load audit log" description={getApiErrorMessage(listQuery.error)} />
          </ListPanelMessage>
        ) : rows.length ? (
          <>
            <Table fill stickyHeader>
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Action
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Entity
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Performed by
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    IP
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50"
                    onClick={() => setSelectedId(row.id)}
                  >
                    <td className="px-3 py-3">
                      <ActionBadge action={row.action} />
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      <div className="font-medium text-slate-900">{formatEntityType(row.entityType)}</div>
                      {row.entityId ? (
                        <div className="mt-0.5 font-mono text-[11px] text-slate-400">{row.entityId}</div>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      <div className="font-medium text-slate-900">{row.userName ?? 'System / unknown'}</div>
                      {row.userEmail ? <div className="text-xs text-slate-500">{row.userEmail}</div> : null}
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-slate-500">{row.ipAddress ?? '—'}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-slate-600">
                      {new Date(row.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
              <p className="text-xs text-slate-500">
                Page {page + 1} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page <= 0 || listQuery.isFetching}
                  onClick={() => setPage((current) => Math.max(0, current - 1))}
                >
                  <ChevronLeft className="size-4" />
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page + 1 >= totalPages || listQuery.isFetching}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <ListPanelMessage>
            <EmptyState
              title={hasFilters ? 'No matching events' : 'No audit events yet'}
              description={
                hasFilters
                  ? 'Try clearing filters or widening the date range.'
                  : 'Creating invoices, payments, and other changes will appear here.'
              }
              action={
                hasFilters ? (
                  <Button type="button" variant="outline" onClick={clearFilters}>
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          </ListPanelMessage>
        )}
      </ListTablePanel>

      <Dialog open={!!selectedId} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogTitle className="text-lg font-semibold text-slate-900">Audit event details</DialogTitle>
          {detailQuery.isLoading ? (
            <p className="mt-4 text-sm text-slate-500">Loading details…</p>
          ) : detailQuery.isError ? (
            <p className="mt-4 text-sm text-rose-600">{getApiErrorMessage(detailQuery.error)}</p>
          ) : detail ? (
            <AuditDetail detail={detail} />
          ) : null}
        </DialogContent>
      </Dialog>
    </ListPageShell>
  )
}

function AuditDetail({ detail }: { detail: AuditLogResponse }) {
  return (
    <div className="mt-4 space-y-5">
      <dl className="grid gap-3 sm:grid-cols-2">
        <DetailField label="Action" value={formatAuditAction(detail.action)} />
        <DetailField label="Entity" value={formatEntityType(detail.entityType)} />
        <DetailField label="Entity ID" value={detail.entityId ?? '—'} mono />
        <DetailField label="When" value={new Date(detail.createdAt).toLocaleString()} />
        <DetailField
          label="Performed by"
          value={
            detail.userName
              ? `${detail.userName}${detail.userEmail ? ` (${detail.userEmail})` : ''}`
              : 'System / unknown'
          }
        />
        <DetailField label="IP address" value={detail.ipAddress ?? '—'} mono />
      </dl>
      {detail.userAgent ? (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">User agent</p>
          <p className="mt-1 break-all text-sm text-slate-700">{detail.userAgent}</p>
        </div>
      ) : null}
      <JsonBlock label="Request details" value={detail.newValue} />
      <JsonBlock label="Previous value" value={detail.oldValue} />
    </div>
  )
}

function ActionBadge({ action }: { action: string }) {
  const tone = actionTone(action)
  return (
    <span
      className={cn(
        'inline-flex rounded-md px-2 py-1 text-xs font-semibold tracking-wide',
        tone === 'create' && 'bg-teal-50 text-teal-800',
        tone === 'update' && 'bg-sky-50 text-sky-800',
        tone === 'delete' && 'bg-rose-50 text-rose-800',
        tone === 'other' && 'bg-slate-100 text-slate-700',
      )}
    >
      {formatAuditAction(action)}
    </span>
  )
}

function actionTone(action: string): 'create' | 'update' | 'delete' | 'other' {
  const value = action.toUpperCase()
  if (value.includes('DELETE') || value.includes('REMOVE') || value.includes('CANCEL')) return 'delete'
  if (value.includes('CREATE') || value.includes('POST') || value.includes('ADD')) return 'create'
  if (value.includes('UPDATE') || value.includes('PUT') || value.includes('PATCH') || value.includes('EDIT')) {
    return 'update'
  }
  return 'other'
}

function formatAuditAction(action: string) {
  return action.replaceAll('_', ' ')
}

function formatEntityType(entityType: string) {
  return entityType
    .replaceAll(/([a-z])([A-Z])/g, '$1 $2')
    .replaceAll('_', ' ')
    .replaceAll('/', ' / ')
}

function DetailField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className={cn('mt-1 text-sm text-slate-900', mono && 'break-all font-mono text-xs')}>{value}</dd>
    </div>
  )
}

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  if (value == null || (typeof value === 'object' && value !== null && Object.keys(value as object).length === 0)) {
    return null
  }
  let text: string
  try {
    text = JSON.stringify(value, null, 2)
  } catch {
    text = String(value)
  }
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <pre className="mt-1 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800">
        {text}
      </pre>
    </div>
  )
}
