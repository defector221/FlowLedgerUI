import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui'

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const

export function ActivityPagination({
  page,
  size,
  totalElements,
  totalPages,
  busy,
  onPageChange,
  onSizeChange,
}: {
  page: number
  size: number
  totalElements: number
  totalPages: number
  busy?: boolean
  onPageChange: (page: number) => void
  onSizeChange: (size: number) => void
}) {
  const fromRow = totalElements === 0 ? 0 : page * size + 1
  const toRow = Math.min(totalElements, (page + 1) * size)

  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-slate-500">
        {totalElements
          ? `Showing ${fromRow.toLocaleString()}–${toRow.toLocaleString()} of ${totalElements.toLocaleString()}`
          : 'No results'}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-xs text-slate-500">
          Rows
          <select
            className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700"
            value={size}
            onChange={(event) => onSizeChange(Number(event.target.value))}
          >
            {PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs text-slate-500">
          Page
          <input
            type="number"
            min={1}
            max={Math.max(1, totalPages)}
            value={page + 1}
            onChange={(event) => {
              const next = Number(event.target.value)
              if (!Number.isFinite(next)) return
              onPageChange(Math.min(Math.max(next, 1), Math.max(1, totalPages)) - 1)
            }}
            className="h-8 w-16 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700"
            aria-label="Jump to page"
          />
          <span>of {Math.max(1, totalPages)}</span>
        </label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 0 || busy}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="size-4" />
          Previous
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page + 1 >= totalPages || busy}
          onClick={() => onPageChange(page + 1)}
        >
          Next
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}
