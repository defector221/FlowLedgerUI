import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader, ListPageShell, ListTablePanel, ListPanelMessage } from '@/components/layout/PageChrome'
import { Select, SelectContent, SelectItem, SelectTrigger, Table } from '@/components/ui'
import { retailApi } from '@/services/api'
import { RetailModuleGate } from './RetailModuleGate'

export function RetailInventoryPage() {
  const [storeId, setStoreId] = useState('')
  const stores = useQuery({ queryKey: ['retail', 'stores'], queryFn: () => retailApi.stores.list() })
  const locations = useQuery({
    queryKey: ['retail', 'locations', storeId],
    queryFn: () => retailApi.inventory.locations.list(storeId),
    enabled: !!storeId,
  })

  return (
    <RetailModuleGate title="Inventory">
      <ListPageShell
        header={
          <PageHeader
            title="Retail inventory"
            subtitle="Store inventory locations (shelf, rack, backroom)."
            actions={
              <Select value={storeId} onValueChange={setStoreId}>
                <SelectTrigger className="w-[14rem]">
                  {stores.data?.find((s) => s.id === storeId)?.name ?? 'Select store'}
                </SelectTrigger>
                <SelectContent>
                  {(stores.data ?? []).map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
          />
        }
      >
        <ListTablePanel>
          {!storeId ? (
            <ListPanelMessage>
              <p className="text-sm text-slate-500">Select a store to view locations.</p>
            </ListPanelMessage>
          ) : locations.isLoading ? (
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
                {(locations.data ?? []).map((row) => (
                  <tr key={row.id} className="border-b">
                    <td className="p-3 font-mono text-sm">{row.code}</td>
                    <td className="p-3">{row.name}</td>
                    <td className="p-3 text-sm">{row.locationType}</td>
                  </tr>
                ))}
                {!locations.data?.length && (
                  <tr>
                    <td colSpan={3} className="py-16 text-center text-sm text-slate-500">
                      No locations for this store.
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
