import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui'
import { Switch } from '@/components/ui'

export function SectionCard({
  title,
  description,
  children,
  className,
  actions,
}: {
  title: string
  description?: string
  children: ReactNode
  className?: string
  actions?: ReactNode
}) {
  return (
    <Card
      className={cn(
        'overflow-hidden border-slate-200/90 bg-white shadow-[var(--shadow-soft)] transition-shadow duration-200 hover:shadow-[0_8px_30px_rgb(15_23_42/0.06)]',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h2>
          {description ? <p className="mt-1 text-sm leading-relaxed text-slate-500">{description}</p> : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      <CardContent className="p-6">{children}</CardContent>
    </Card>
  )
}

export function SettingsField({
  label,
  htmlFor,
  hint,
  error,
  className,
  children,
}: {
  label: string
  htmlFor?: string
  hint?: string
  error?: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="block text-[13px] font-medium text-slate-700">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-rose-600" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs leading-relaxed text-slate-500">{hint}</p>
      ) : null}
    </div>
  )
}

export function SettingSwitch({
  title,
  description,
  checked,
  onCheckedChange,
  id,
}: {
  title: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  id?: string
}) {
  const switchId = id ?? title.replace(/\s+/g, '-').toLowerCase()
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200/90 bg-slate-50/40 px-4 py-3.5 transition-colors hover:bg-slate-50">
      <div className="min-w-0 pr-2">
        <label htmlFor={switchId} className="cursor-pointer text-sm font-medium text-slate-900">
          {title}
        </label>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{description}</p>
      </div>
      <Switch id={switchId} checked={checked} onCheckedChange={onCheckedChange} aria-label={title} className="mt-0.5 shrink-0" />
    </div>
  )
}

export function StickyActionBar({
  dirty,
  saving,
  onSave,
  onReset,
  formId,
  saveLabel = 'Save Changes',
}: {
  dirty: boolean
  saving?: boolean
  onSave?: () => void
  onReset: () => void
  formId?: string
  saveLabel?: string
}) {
  return (
    <div className="sticky bottom-0 z-10 -mx-3 border-t border-slate-200/80 bg-white/90 px-3 py-3 backdrop-blur-xl sm:-mx-0 sm:rounded-t-2xl sm:border sm:border-b-0 sm:border-slate-200/90 sm:px-5 sm:shadow-[0_-8px_30px_rgb(15_23_42/0.04)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {dirty ? (
            <span className="inline-flex items-center gap-2 font-medium text-amber-800">
              <span className="size-1.5 rounded-full bg-amber-500" aria-hidden />
              Unsaved changes
            </span>
          ) : (
            <span>All changes saved</span>
          )}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onReset}
            disabled={!dirty || saving}
            className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Reset
          </button>
          <button
            type={formId ? 'submit' : 'button'}
            form={formId}
            onClick={formId ? undefined : onSave}
            disabled={!dirty || saving}
            className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-teal-600 to-teal-700 px-4 text-sm font-semibold text-white shadow-[0_1px_0_rgb(255_255_255/0.18)_inset,0_8px_18px_rgb(13_148_136/0.28)] transition hover:from-teal-500 hover:to-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <>
                <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />
                Saving…
              </>
            ) : (
              saveLabel
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export function previewInvoiceNumber(prefix: string, format: string) {
  const fy = '25-26'
  const padded = (width: number) => '1'.padStart(Math.max(1, width), '0')
  return (format || '{PREFIX}/{FY}/{SEQ:6}')
    .replaceAll('{PREFIX}', prefix || 'INV')
    .replaceAll('{FY}', fy)
    .replace(/\{SEQ(?::(\d+))?\}/g, (_, digits) => padded(digits ? Number(digits) : 6))
}
