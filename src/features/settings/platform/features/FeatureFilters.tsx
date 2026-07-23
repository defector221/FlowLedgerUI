import { cn } from '@/lib/utils'
import type { FeatureFilter } from './feature-types'

const FILTERS: { id: FeatureFilter; label: string }[] = [
  { id: 'active_modules', label: 'Active modules' },
  { id: 'all', label: 'All modules' },
  { id: 'enabled', label: 'Enabled' },
  { id: 'disabled', label: 'Disabled' },
  { id: 'beta', label: 'Beta' },
]

export function FeatureFilters({
  value,
  onChange,
}: {
  value: FeatureFilter
  onChange: (value: FeatureFilter) => void
}) {
  return (
    <div
      className="inline-flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1"
      role="tablist"
      aria-label="Filter features by status"
    >
      {FILTERS.map((filter) => {
        const active = value === filter.id
        return (
          <button
            key={filter.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(filter.id)}
            className={cn(
              'h-9 cursor-pointer rounded-lg px-3 text-sm font-medium transition-colors duration-150',
              active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:bg-white/60 hover:text-slate-900',
            )}
          >
            {filter.label}
          </button>
        )
      })}
    </div>
  )
}
