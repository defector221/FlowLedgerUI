import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui'

/** Standard page shell — consistent vertical rhythm across modules. */
export function PageShell({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('space-y-6', className)}>{children}</div>
}

/**
 * Viewport-locked list layout: page header stays put while the table panel scrolls.
 * Use with ListTablePanel + `<Table fill stickyHeader />`.
 */
export function ListPageShell({
  header,
  children,
  className,
}: {
  header: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex h-[calc(100dvh-8.75rem)] min-h-[28rem] flex-col gap-4 overflow-hidden sm:h-[calc(100dvh-9.75rem)] lg:h-[calc(100dvh-11rem)]',
        className,
      )}
    >
      <div className="shrink-0">{header}</div>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">{children}</div>
    </div>
  )
}

/** Card that fills remaining height; put search/filters in `toolbar`, table (or empty state) as children. */
export function ListTablePanel({
  toolbar,
  children,
  className,
}: {
  toolbar?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <Card
      className={cn(
        'flex min-h-0 flex-1 flex-col overflow-hidden border-slate-200/90 bg-white shadow-[var(--shadow-soft)]',
        className,
      )}
    >
      {toolbar ? <div className="shrink-0 border-b border-slate-100 bg-white px-4 py-3">{toolbar}</div> : null}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
    </Card>
  )
}

/** Centered placeholder inside a ListTablePanel when there is no table yet. */
export function ListPanelMessage({ children }: { children: ReactNode }) {
  return (
    <div className="scrollbar-panel flex min-h-0 flex-1 items-center justify-center overflow-auto p-6">{children}</div>
  )
}

export function PageHeader({
  title,
  subtitle,
  actions,
  breadcrumbs,
}: {
  title: string
  subtitle?: ReactNode
  actions?: ReactNode
  breadcrumbs?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {breadcrumbs ? <div className="mb-2 text-sm text-slate-500">{breadcrumbs}</div> : null}
        <h1 className="page-title">{title}</h1>
        {subtitle ? <div className="page-subtitle">{subtitle}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}

export function SectionTitle({ title, detail }: { title: string; detail?: string }) {
  return (
    <div>
      <h2 className="section-title">{title}</h2>
      {detail ? <p className="section-detail">{detail}</p> : null}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="empty-state">
      <p className="empty-state-title">{title}</p>
      {description ? <p className="empty-state-desc">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

export function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  className,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon?: LucideIcon
  className?: string
}) {
  return (
    <Card className={cn('metric-card', className)}>
      <CardContent className="p-5">
        <div className="flex justify-between gap-2">
          <span className="text-sm font-medium text-slate-500">{label}</span>
          {Icon ? (
            <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700">
              <Icon className="size-4" />
            </span>
          ) : null}
        </div>
        <p className="stat-value">{value}</p>
        {hint ? <div className="mt-2 text-xs font-semibold text-slate-500">{hint}</div> : null}
      </CardContent>
    </Card>
  )
}
