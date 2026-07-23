import { useQuery } from '@tanstack/react-query'
import { PageHeader, ListPageShell, ListTablePanel, ListPanelMessage } from '@/components/layout/PageChrome'
import { Table } from '@/components/ui'
import { retailApi } from '@/services/api'
import { RetailModuleGate } from './RetailModuleGate'

export function RetailLabelsPage() {
  const templates = useQuery({
    queryKey: ['retail', 'label-templates'],
    queryFn: () => retailApi.labels.templates.list(),
  })

  return (
    <RetailModuleGate title="Labels">
      <ListPageShell
        header={<PageHeader title="Label templates" subtitle="Shelf and barcode label templates." />}
      >
        <ListTablePanel>
          {templates.isLoading ? (
            <ListPanelMessage>
              <p className="text-sm text-slate-500">Loading…</p>
            </ListPanelMessage>
          ) : (
            <Table fill stickyHeader>
              <thead>
                <tr className="border-b">
                  <th className="p-3 text-xs text-slate-500">Code</th>
                  <th className="p-3 text-xs text-slate-500">Name</th>
                  <th className="p-3 text-xs text-slate-500">Type</th>
                </tr>
              </thead>
              <tbody>
                {(templates.data ?? []).map((row) => (
                  <tr key={row.id} className="border-b">
                    <td className="p-3 font-mono text-sm">{row.code}</td>
                    <td className="p-3">{row.name}</td>
                    <td className="p-3 text-sm">{row.labelType ?? '—'}</td>
                  </tr>
                ))}
                {!templates.data?.length && (
                  <tr>
                    <td colSpan={3} className="py-16 text-center text-sm text-slate-500">
                      No label templates yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          )}
        </ListTablePanel>
      </ListPageShell>
    </RetailModuleGate>
  )
}
