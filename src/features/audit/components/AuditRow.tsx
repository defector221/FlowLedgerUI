import { memo } from 'react'
import { Copy, Download, ExternalLink, Eye, MoreHorizontal } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui'
import { cn } from '@/lib/utils'
import type { AuditLogResponse } from '@/types/api'
import {
  downloadText,
  entityDisplayName,
  formatAbsoluteDate,
  formatRelativeTime,
  highlightMatch,
  initials,
  parseUserAgent,
  relatedRecordPath,
  resolveModule,
  resolveStatus,
} from '../audit-model'
import { AuditActionBadge } from './AuditActionBadge'
import { AuditStatusChip } from './AuditStatusChip'

export const AuditRow = memo(function AuditRow({
  row,
  search,
  onOpen,
}: {
  row: AuditLogResponse
  search: string
  onOpen: (id: string) => void
}) {
  const navigate = useNavigate()
  const module = resolveModule(row.entityType)
  const status = resolveStatus(row.action)
  const agent = parseUserAgent(row.userAgent)
  const when = formatAbsoluteDate(row.createdAt)
  const entityName = entityDisplayName(row)
  const related = relatedRecordPath(row)

  const copyUuid = async () => {
    try {
      await navigator.clipboard.writeText(row.id)
      toast.success('Event UUID copied')
    } catch {
      toast.error('Unable to copy UUID')
    }
  }

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(row, null, 2))
      toast.success('Event JSON copied')
    } catch {
      toast.error('Unable to copy JSON')
    }
  }

  const downloadJson = () => {
    downloadText(`audit-${row.id}.json`, JSON.stringify(row, null, 2), 'application/json')
  }

  return (
    <>
      <tr
        className="hidden cursor-pointer border-b border-slate-100 transition duration-100 hover:bg-slate-50/90 lg:table-row"
        onClick={() => onOpen(row.id)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onOpen(row.id)
          }
        }}
        tabIndex={0}
        aria-label={`Open details for ${entityName}`}
      >
        <td className="px-3 py-3">
          <AuditStatusChip status={status} />
        </td>
        <td className="px-3 py-3">
          <AuditActionBadge action={row.action} />
        </td>
        <td className="px-3 py-3">
          <Badge variant="outline">{module}</Badge>
        </td>
        <td className="px-3 py-3">
          <div className="font-medium text-slate-900">
            <Highlight text={entityName} query={search} />
          </div>
          {row.entityId ? (
            <div className="mt-0.5 font-mono text-[11px] text-slate-400" title={row.entityId}>
              {row.entityId.slice(0, 8)}…
            </div>
          ) : null}
        </td>
        <td className="px-3 py-3">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-teal-400 to-teal-700 text-[10px] font-semibold text-white">
              {initials(row.userName, row.userEmail)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-slate-900">
                <Highlight text={row.userName ?? 'System'} query={search} />
              </span>
              <span className="block truncate text-xs text-slate-500">
                <Highlight text={row.userEmail ?? 'system@flowledger'} query={search} />
              </span>
            </span>
          </div>
        </td>
        <td className="px-3 py-3">
          <div className="font-mono text-xs text-slate-700">
            <Highlight text={row.ipAddress ?? '—'} query={search} />
          </div>
          <div className="text-[11px] text-slate-500">
            {agent.browser} · {agent.os}
          </div>
        </td>
        <td className="px-3 py-3">
          <div className="text-sm text-slate-800">{agent.device}</div>
          <div className="text-[11px] text-slate-500">
            {agent.browser} / {agent.os}
          </div>
        </td>
        <td className="px-3 py-3 whitespace-nowrap">
          <div className="text-sm font-medium text-slate-900">{when.day}</div>
          <div className="text-xs text-slate-500">
            {when.time} · {formatRelativeTime(row.createdAt)}
          </div>
        </td>
        <td className="px-3 py-3 text-right" onClick={(event) => event.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" size="icon" variant="ghost" aria-label="Row actions" className="size-8">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onSelect={() => onOpen(row.id)}>
                <Eye className="size-4 text-slate-500" />
                View details
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void copyUuid()}>
                <Copy className="size-4 text-slate-500" />
                Copy UUID
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void copyJson()}>
                <Copy className="size-4 text-slate-500" />
                Copy JSON
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={downloadJson}>
                <Download className="size-4 text-slate-500" />
                Download JSON
              </DropdownMenuItem>
              {related ? (
                <DropdownMenuItem onSelect={() => navigate(related)}>
                  <ExternalLink className="size-4 text-slate-500" />
                  Open related record
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </td>
      </tr>

      <tr className="border-b border-slate-100 lg:hidden">
        <td colSpan={9} className="p-3">
          <button
            type="button"
            onClick={() => onOpen(row.id)}
            className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-teal-200 hover:bg-teal-50/30"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-wrap gap-2">
                <AuditStatusChip status={status} />
                <AuditActionBadge action={row.action} />
                <Badge variant="outline">{module}</Badge>
              </div>
              <span className="text-[11px] text-slate-500">{formatRelativeTime(row.createdAt)}</span>
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-900">{entityName}</p>
            <p className="mt-1 text-xs text-slate-500">
              {row.userName ?? 'System'} · {row.ipAddress ?? 'No IP'} · {agent.browser}
            </p>
          </button>
        </td>
      </tr>
    </>
  )
})

function Highlight({ text, query }: { text: string; query: string }) {
  return (
    <>
      {highlightMatch(text, query).map((part, index) => (
        <span key={`${part.text}-${index}`} className={cn(part.match && 'rounded bg-amber-100 px-0.5 text-amber-900')}>
          {part.text}
        </span>
      ))}
    </>
  )
}
