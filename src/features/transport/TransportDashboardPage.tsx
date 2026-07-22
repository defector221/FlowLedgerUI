import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageChrome'
import { transportApi } from '@/services/api'
import { Card, CardContent } from '@/components/ui'

export function TransportDashboardPage() {
  const { data: shipments = [] } = useQuery({
    queryKey: ['transport', 'shipments'],
    queryFn: () => transportApi.shipments.list(),
  })
  const cards = [
    {
      label: 'Open shipments',
      value: shipments.filter((row) => !['DELIVERED', 'CLOSED', 'CANCELLED'].includes(row.status)).length,
      to: '/transport/shipments',
    },
    {
      label: 'In transit',
      value: shipments.filter((row) => ['DISPATCHED', 'IN_TRANSIT'].includes(row.status)).length,
      to: '/transport/shipments?status=IN_TRANSIT',
    },
    {
      label: 'Awaiting approval',
      value: shipments.filter((row) => row.status === 'SUBMITTED').length,
      to: '/transport/shipments?status=SUBMITTED',
    },
    {
      label: 'Delayed',
      value: shipments.filter(
        (row) =>
          row.expectedDeliveryDate &&
          new Date(row.expectedDeliveryDate) < new Date() &&
          !['DELIVERED', 'CLOSED', 'CANCELLED'].includes(row.status),
      ).length,
      to: '/transport/search?delayed=true',
    },
  ]
  return (
    <div className="space-y-6">
      <PageHeader title="Transport dashboard" subtitle="A live overview of shipment operations." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Link key={card.label} to={card.to}>
            <Card className="h-full transition hover:border-teal-200">
              <CardContent className="p-5">
                <p className="text-sm text-slate-500">{card.label}</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{card.value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
