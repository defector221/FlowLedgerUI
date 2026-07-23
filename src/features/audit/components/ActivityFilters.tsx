import type { ReactNode } from 'react'
import { Search, X } from 'lucide-react'
import { Button, Input, Label } from '@/components/ui'
import { cn } from '@/lib/utils'
import { MODULE_CHIPS, type ActivityFiltersState, type AuditModule, type AuditSeverity } from '../audit-model'
import { FilterChipBar } from './FilterChipBar'

export function ActivityFilters({
  draft,
  searchInput,
  onSearchInputChange,
  onChange,
  onClear,
  activeChips,
  onRemoveChip,
}: {
  draft: ActivityFiltersState
  searchInput: string
  onSearchInputChange: (value: string) => void
  onChange: (next: ActivityFiltersState) => void
  onClear: () => void
  activeChips: Array<{ id: string; label: string }>
  onRemoveChip: (id: string) => void
}) {
  const set = <K extends keyof ActivityFiltersState>(key: K, value: ActivityFiltersState[K]) => {
    onChange({ ...draft, [key]: value })
  }

  return (
    <section className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-[var(--shadow-soft)] sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Filters</h2>
          <p className="text-xs text-slate-500">Narrow activity by module, action, actor, or time.</p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onClear}>
          <X className="size-3.5" />
          Clear filters
        </Button>
      </div>

      <FilterChipBar
        chips={MODULE_CHIPS.map((chip) => ({
          id: chip.id,
          label: chip.label,
          active: draft.module === chip.id,
        }))}
        onSelect={(id) => set('module', id as AuditModule | 'All')}
      />

      {activeChips.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {activeChips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => onRemoveChip(chip.id)}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
            >
              {chip.label}
              <X className="size-3" />
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="relative md:col-span-2 xl:col-span-2">
          <Label className="mb-1.5 block text-xs text-slate-500">Search</Label>
          <Search className="pointer-events-none absolute left-3 top-[2.15rem] size-4 text-slate-400" />
          <Input
            className="pl-9"
            value={searchInput}
            onChange={(event) => onSearchInputChange(event.target.value)}
            placeholder="Action, entity, email, user, IP, UUID…"
            aria-label="Search audit activity"
          />
        </div>
        <Field label="Action">
          <Input
            value={draft.action}
            onChange={(event) => set('action', event.target.value)}
            placeholder="CREATE, UPDATE, DELETE…"
          />
        </Field>
        <Field label="Entity type">
          <Input
            value={draft.entityType}
            onChange={(event) => set('entityType', event.target.value)}
            placeholder="Invoice, Product…"
          />
        </Field>
        <Field label="Severity">
          <select
            className={selectClass}
            value={draft.severity}
            onChange={(event) => set('severity', event.target.value as AuditSeverity | 'all')}
          >
            <option value="all">All severities</option>
            <option value="information">Information</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
            <option value="security">Security</option>
          </select>
        </Field>
        <Field label="IP address">
          <Input
            value={draft.ipAddress}
            onChange={(event) => set('ipAddress', event.target.value)}
            placeholder="203.0.113…"
          />
        </Field>
        <Field label="From">
          <Input type="date" value={draft.from} onChange={(event) => set('from', event.target.value)} />
        </Field>
        <Field label="To">
          <Input type="date" value={draft.to} onChange={(event) => set('to', event.target.value)} />
        </Field>
      </div>
    </section>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs text-slate-500">{label}</Label>
      {children}
    </div>
  )
}

const selectClass = cn(
  'flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900',
  'shadow-[0_1px_2px_rgb(15_23_42/0.03)] outline-none transition',
  'focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10',
)
