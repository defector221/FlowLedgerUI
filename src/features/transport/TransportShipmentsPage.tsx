import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { PageHeader, ListPageShell, ListTablePanel, ListPanelMessage } from '@/components/layout/PageChrome'
import { transportApi } from '@/services/api'
import { Badge, Button, Table } from '@/components/ui'

const openStatuses = [
  'DRAFT',
  'SUBMITTED',
  'APPROVED',
  'ASSIGNED',
  'LOADING',
  'LOADED',
  'PARTIALLY_DISPATCHED',
  'DISPATCHED',
  'IN_TRANSIT',
]

export function TransportShipmentsPage() {
  const { data: shipments = [], isLoading } = useQuery({
    queryKey: ['transport', 'shipments'],
    queryFn: () => transportApi.shipments.list(),
  })
  return (
    <ListPageShell
      header={
        <PageHeader
          title="Shipments"
          subtitle="Track dispatch, transit and delivery across source documents."
          actions={
            <Button asChild>
              <Link to="/transport/search">Advanced search</Link>
            </Button>
          }
        />
      }
    >
      <ListTablePanel>
        {isLoading ? (
          <ListPanelMessage>
            <p className="text-sm text-slate-500">Loading shipments…</p>
          </ListPanelMessage>
        ) : (
          <Table fill stickyHeader>
            <thead>
              <tr className="border-b">
                <th className="p-3 text-xs text-slate-500">SHIPMENT</th>
                <th className="p-3 text-xs text-slate-500">SOURCE</th>
                <th className="p-3 text-xs text-slate-500">DESTINATION</th>
                <th className="p-3 text-xs text-slate-500">EXPECTED DELIVERY</th>
                <th className="p-3 text-xs text-slate-500">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((shipment) => (
                <tr key={shipment.id} className="border-b">
                  <td className="p-3">
                    <Link
                      className="font-medium text-teal-700 hover:underline"
                      to={`/transport/shipments/${shipment.id}`}
                    >
                      {shipment.shipmentNumber}
                    </Link>
                  </td>
                  <td className="p-3">{shipment.sourceDocumentType ?? '—'}</td>
                  <td className="p-3">{shipment.shipToPartyName ?? shipment.shipToAddress ?? '—'}</td>
                  <td className="p-3">
                    {shipment.expectedDeliveryDate ? new Date(shipment.expectedDeliveryDate).toLocaleString() : '—'}
                  </td>
                  <td className="p-3">
                    <Badge
                      variant={
                        openStatuses.includes(shipment.status)
                          ? 'warning'
                          : shipment.status === 'DELIVERED' || shipment.status === 'CLOSED'
                            ? 'success'
                            : 'neutral'
                      }
                    >
                      {shipment.status}
                    </Badge>
                  </td>
                </tr>
              ))}
              {!shipments.length && (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-sm text-slate-500">
                    No shipments found. Create one from a delivery challan.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        )}
      </ListTablePanel>
    </ListPageShell>
  )
}
