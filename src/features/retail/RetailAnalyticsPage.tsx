import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart3 } from 'lucide-react'
import { MetricCard, PageHeader, PageShell } from '@/components/layout/PageChrome'
import { Card, CardContent, Input, Label, Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui'
import { retailApi } from '@/services/api'
import { RetailModuleGate } from './RetailModuleGate'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export function RetailAnalyticsPage() {
  const [storeId, setStoreId] = useState('')
  const [date, setDate] = useState(todayIso)
  const stores = useQuery({ queryKey: ['retail', 'stores'], queryFn: () => retailApi.stores.list() })
  const daily = useQuery({
    queryKey: ['retail', 'daily-sales', storeId, date],
    queryFn: () => retailApi.analytics.dailySales({ storeId, date }),
    enabled: !!storeId,
  })

  return (
    <RetailModuleGate title="Analytics">
      <PageShell>
        <PageHeader title="Retail analytics" subtitle="Daily sales for a selected store." />
        <Card>
          <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Store</Label>
              <Select value={storeId} onValueChange={setStoreId}>
                <SelectTrigger>{stores.data?.find((s) => s.id === storeId)?.name ?? 'Select store'}</SelectTrigger>
                <SelectContent>
                  {(stores.data ?? []).map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {!storeId ? (
          <p className="text-sm text-slate-500">Select a store to load daily sales.</p>
        ) : daily.isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : daily.data ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Sales count" value={daily.data.saleCount} icon={BarChart3} />
            <MetricCard label="Subtotal" value={Number(daily.data.subtotal).toFixed(2)} />
            <MetricCard label="Tax" value={Number(daily.data.taxTotal).toFixed(2)} />
            <MetricCard label="Grand total" value={Number(daily.data.grandTotal).toFixed(2)} hint={daily.data.date} />
          </div>
        ) : (
          <p className="text-sm text-slate-500">No data.</p>
        )}
      </PageShell>
    </RetailModuleGate>
  )
}
