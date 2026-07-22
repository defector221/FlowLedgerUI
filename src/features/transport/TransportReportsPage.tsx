import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/layout/PageChrome'
import { transportApi } from '@/services/api'
import {
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Table,
} from '@/components/ui'

export function TransportReportsPage() {
  const [report, setReport] = useState('shipment-status')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [run, setRun] = useState(false)
  const {
    data = [],
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['transport', 'reports', report, from, to],
    queryFn: () => transportApi.reports(report, { ...(from && { from }), ...(to && { to }) }),
    enabled: run,
  })
  const columns = data[0] ? Object.keys(data[0]) : []
  return (
    <div className="space-y-6">
      <PageHeader title="Transport reports" subtitle="Analyze shipment status, delays and carrier performance." />
      <Card>
        <CardContent className="grid gap-4 p-5 md:grid-cols-4">
          <div>
            <Label>Report</Label>
            <Select value={report} onValueChange={setReport}>
              <SelectTrigger className="mt-1.5">{report.replaceAll('-', ' ')}</SelectTrigger>
              <SelectContent>
                {[
                  'shipment-status',
                  'delivery-performance',
                  'carrier-performance',
                  'freight-summary',
                  'delayed-shipments',
                ].map((v) => (
                  <SelectItem key={v} value={v}>
                    {v.replaceAll('-', ' ')}
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
            onClick={() => {
              setRun(true)
              if (run) refetch()
            }}
          >
            {isFetching ? 'Running…' : 'Run report'}
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          {data.length ? (
            <Table>
              <thead>
                <tr className="border-b">
                  {columns.map((c) => (
                    <th key={c} className="p-3 text-xs uppercase text-slate-500">
                      {c.replace(/([A-Z])/g, ' $1')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, index) => (
                  <tr key={index} className="border-b">
                    {columns.map((c) => (
                      <td key={c} className="p-3">
                        {String(row[c] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <p className="py-16 text-center text-sm text-slate-500">Run a report to view results.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
