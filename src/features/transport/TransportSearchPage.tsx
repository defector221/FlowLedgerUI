import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ListPageShell, ListTablePanel, PageHeader } from '@/components/layout/PageChrome'
import { transportApi } from '@/services/api'
import { Badge, Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, Table } from '@/components/ui'

export function TransportSearchPage() {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [params, setParams] = useState<Record<string, string>>({})
  const { data = [], isFetching } = useQuery({
    queryKey: ['transport', 'search', params],
    queryFn: () => transportApi.search(params),
    enabled: Object.keys(params).length > 0,
  })
  return (
    <ListPageShell
      header={
        <PageHeader
          title="Shipment search"
          subtitle="Find shipments by number, LR, e-way bill, status or date range."
        />
      }
    >
      <ListTablePanel
        toolbar={
          <div className="grid gap-4 md:grid-cols-5">
            <div>
              <Label>Search</Label>
              <Input
                className="mt-1.5"
                placeholder="Shipment, LR, e-way…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={status || '__all__'} onValueChange={(v) => setStatus(v === '__all__' ? '' : v)}>
                <SelectTrigger className="mt-1.5">{status || 'All statuses'}</SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All statuses</SelectItem>
                  {[
                    'DRAFT',
                    'SUBMITTED',
                    'APPROVED',
                    'ASSIGNED',
                    'DISPATCHED',
                    'IN_TRANSIT',
                    'DELIVERED',
                    'CLOSED',
                    'CANCELLED',
                  ].map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>From</Label>
              <Input className="mt-1.5" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <Label>To</Label>
              <Input className="mt-1.5" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <Button
              className="self-end"
              onClick={() =>
                setParams({
                  ...(query && { q: query }),
                  ...(status && { status }),
                  ...(from && { from }),
                  ...(to && { to }),
                })
              }
            >
              {isFetching ? 'Searching…' : 'Search'}
            </Button>
          </div>
        }
      >
        <Table fill stickyHeader>
          <thead>
            <tr className="border-b">
              <th className="p-3 text-xs text-slate-500">SHIPMENT</th>
              <th className="p-3 text-xs text-slate-500">LR / E-WAY</th>
              <th className="p-3 text-xs text-slate-500">DESTINATION</th>
              <th className="p-3 text-xs text-slate-500">STATUS</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.id} className="border-b">
                <td className="p-3">
                  <Link className="font-medium text-teal-700 hover:underline" to={`/transport/shipments/${row.id}`}>
                    {row.shipmentNumber}
                  </Link>
                </td>
                <td className="p-3">{row.legs?.[0]?.lrNumber ?? row.ewayBillNumber ?? '—'}</td>
                <td className="p-3">{row.shipToPartyName ?? row.shipToAddress ?? '—'}</td>
                <td className="p-3">
                  <Badge>{row.status}</Badge>
                </td>
              </tr>
            ))}
            {!data.length && (
              <tr>
                <td colSpan={4} className="py-16 text-center text-sm text-slate-500">
                  Enter filters to search shipments.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </ListTablePanel>
    </ListPageShell>
  )
}
