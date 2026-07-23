import { EmptyState } from '@/components/layout/PageChrome'
import { Button, Skeleton, Table } from '@/components/ui'
import type { AuditLogResponse } from '@/types/api'
import { AuditRow } from './AuditRow'

export function AuditTable({
  rows,
  search,
  loading,
  hasFilters,
  onClearFilters,
  onOpen,
}: {
  rows: AuditLogResponse[]
  search: string
  loading?: boolean
  hasFilters?: boolean
  onClearFilters?: () => void
  onOpen: (id: string) => void
}) {
  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  if (!rows.length) {
    return (
      <div className="flex min-h-[18rem] items-center justify-center p-6">
        <EmptyState
          title="No events found"
          description={
            hasFilters
              ? 'Adjust your filters or clear them to widen the search.'
              : 'Organization activity will appear here as users create and update records.'
          }
          action={
            hasFilters && onClearFilters ? (
              <Button type="button" variant="outline" onClick={onClearFilters}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      </div>
    )
  }

  return (
    <Table fill stickyHeader>
      <thead className="hidden lg:table-header-group">
        <tr className="border-b border-slate-200">
          {['Status', 'Action', 'Module', 'Entity', 'Performed by', 'IP', 'Device', 'Date', 'Actions'].map((label) => (
            <th
              key={label}
              className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              {label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <AuditRow key={row.id} row={row} search={search} onOpen={onOpen} />
        ))}
      </tbody>
    </Table>
  )
}
