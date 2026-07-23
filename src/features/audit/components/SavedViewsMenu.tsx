import { Bookmark } from 'lucide-react'
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui'
import { SAVED_VIEWS, todayIso, type ActivityFiltersState, type SavedViewId } from '../audit-model'

export function SavedViewsMenu({ onApply }: { onApply: (viewId: SavedViewId, filters: ActivityFiltersState) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Bookmark className="size-3.5" />
          Saved views
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {SAVED_VIEWS.map((view) => (
          <DropdownMenuItem
            key={view.id}
            onSelect={() => {
              const filters = {
                search: '',
                action: '',
                entityType: '',
                module: 'All' as const,
                from: '',
                to: '',
                severity: 'all' as const,
                ipAddress: '',
                ...view.filters,
              }
              if (view.id === 'today') {
                filters.from = todayIso()
                filters.to = todayIso()
              }
              onApply(view.id, filters)
            }}
          >
            <span className="min-w-0">
              <span className="block text-sm font-medium text-slate-900">{view.label}</span>
              <span className="block text-xs text-slate-500">{view.description}</span>
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
