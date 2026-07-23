import type { LucideIcon } from 'lucide-react'
import { FilePenLine, MoreVertical, StickyNote } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import {
  Badge,
  Button,
  Card,
  CardContent,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui'

export type DocumentSummaryField = {
  key: string
  label: string
  value: ReactNode
  detail?: ReactNode
  icon: LucideIcon
  iconTone?: 'violet' | 'blue' | 'teal' | 'amber' | 'rose' | 'slate'
  span?: 1 | 2
}

const ICON_TONES: Record<NonNullable<DocumentSummaryField['iconTone']>, string> = {
  violet: 'bg-violet-50 text-violet-600',
  blue: 'bg-sky-50 text-sky-600',
  teal: 'bg-teal-50 text-teal-700',
  amber: 'bg-amber-50 text-amber-700',
  rose: 'bg-rose-50 text-rose-600',
  slate: 'bg-slate-100 text-slate-600',
}

function formatCreatedAt(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function DocumentSummaryCard({
  title,
  documentNumber,
  status,
  statusVariant = 'default',
  createdAt,
  fields,
  notes,
  menuItems,
  className,
}: {
  title: string
  documentNumber?: string | null
  status?: ReactNode
  statusVariant?: 'default' | 'success' | 'warning' | 'danger'
  createdAt?: string | null
  fields: DocumentSummaryField[]
  notes?: ReactNode
  menuItems?: Array<{ label: string; onSelect: () => void; destructive?: boolean }>
  className?: string
}) {
  const createdLabel = formatCreatedAt(createdAt)

  return (
    <Card className={cn('overflow-hidden border-slate-200/90 shadow-[var(--shadow-soft)]', className)}>
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600">
              <FilePenLine className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">{title}</p>
              {documentNumber ? <p className="truncate text-xs font-medium text-slate-500">{documentNumber}</p> : null}
            </div>
          </div>
          {createdLabel ? <p className="mt-2 text-xs text-slate-400">Created: {createdLabel}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {status != null && status !== '' ? <Badge variant={statusVariant}>{status}</Badge> : null}
          {menuItems?.length ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="More actions" className="size-8 text-slate-500">
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {menuItems.map((item) => (
                  <DropdownMenuItem
                    key={item.label}
                    onSelect={item.onSelect}
                    className={item.destructive ? 'text-rose-600 focus:text-rose-700' : undefined}
                  >
                    {item.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>

      <CardContent className="p-0">
        <div className="grid sm:grid-cols-2">
          {fields.map((field, index) => {
            const Icon = field.icon
            const tone = ICON_TONES[field.iconTone ?? 'slate']
            const isLeft = index % 2 === 0
            return (
              <div
                key={field.key}
                className={cn(
                  'flex gap-3 border-slate-100 px-5 py-4 sm:px-6',
                  field.span === 2 && 'sm:col-span-2',
                  field.span !== 2 && isLeft && 'sm:border-r',
                  'border-b',
                )}
              >
                <span className={cn('mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg', tone)}>
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{field.label}</p>
                  <div className="mt-1 text-sm font-medium whitespace-pre-wrap text-slate-800">{field.value}</div>
                  {field.detail ? <div className="mt-1 text-xs text-slate-500">{field.detail}</div> : null}
                </div>
              </div>
            )
          })}
        </div>

        {notes != null && notes !== '' && notes !== '—' ? (
          <div className="flex gap-3 border-t border-slate-100 bg-slate-50/40 px-5 py-4 sm:px-6">
            <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-violet-50 text-violet-600">
              <StickyNote className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Notes</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{notes}</p>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
