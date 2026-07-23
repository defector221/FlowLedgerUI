import { cn } from '@/lib/utils'

export function FilterChipBar({
  chips,
  onSelect,
}: {
  chips: Array<{ id: string; label: string; active?: boolean }>
  onSelect: (id: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2" role="toolbar" aria-label="Module filters">
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          onClick={() => onSelect(chip.id)}
          aria-pressed={chip.active}
          className={cn(
            'rounded-full border px-3 py-1.5 text-xs font-semibold transition duration-150',
            chip.active
              ? 'border-teal-600 bg-teal-600 text-white shadow-sm'
              : 'border-slate-200 bg-white text-slate-600 hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800',
          )}
        >
          {chip.label}
        </button>
      ))}
    </div>
  )
}
