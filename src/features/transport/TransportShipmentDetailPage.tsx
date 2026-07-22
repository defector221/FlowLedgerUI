import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageChrome'
import { getApiErrorMessage } from '@/lib/api-error'
import { transportApi } from '@/services/api'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Table,
} from '@/components/ui'
import { ShipmentTimeline } from './ShipmentTimeline'

export function TransportShipmentDetailPage() {
  const { id = '' } = useParams()
  const queryClient = useQueryClient()
  const [vehicleId, setVehicleId] = useState('')
  const [driverId, setDriverId] = useState('')
  const { data: shipment, isLoading } = useQuery({
    queryKey: ['transport', 'shipment', id],
    queryFn: () => transportApi.shipments.get(id),
    enabled: !!id,
  })
  const { data: vehicles = [] } = useQuery({
    queryKey: ['transport', 'vehicles'],
    queryFn: () => transportApi.vehicles.list(),
  })
  const { data: drivers = [] } = useQuery({
    queryKey: ['transport', 'drivers'],
    queryFn: () => transportApi.drivers.list(),
  })

  const act = async (action: 'submit' | 'approve' | 'assign' | 'dispatch' | 'deliver' | 'close' | 'cancel') => {
    try {
      if (action === 'assign') {
        if (!vehicleId && !driverId) return toast.error('Select a vehicle or driver')
        await transportApi.shipments.assign(id, { vehicleId: vehicleId || undefined, driverId: driverId || undefined })
      } else if (action === 'approve') await transportApi.shipments.approve(id)
      else if (action === 'cancel') await transportApi.shipments.cancel(id)
      else await transportApi.shipments[action](id)
      await queryClient.invalidateQueries({ queryKey: ['transport', 'shipment', id] })
      await queryClient.invalidateQueries({ queryKey: ['transport', 'shipments'] })
      toast.success(`Shipment ${action} action completed`)
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }
  if (isLoading || !shipment) return <p className="py-20 text-center text-sm text-slate-500">Loading shipment…</p>

  const nextActions: Record<string, Array<'submit' | 'approve' | 'dispatch' | 'deliver' | 'close'>> = {
    DRAFT: ['submit'],
    SUBMITTED: ['approve'],
    ASSIGNED: ['dispatch'],
    APPROVED: ['dispatch'],
    DISPATCHED: ['deliver'],
    IN_TRANSIT: ['deliver'],
    DELIVERED: ['close'],
  }
  return (
    <div className="space-y-6">
      <PageHeader
        title={shipment.shipmentNumber}
        subtitle={`${shipment.sourceDocumentType ?? 'Manual shipment'} · ${shipment.shipToPartyName ?? shipment.shipToAddress ?? 'No destination'}`}
        actions={
          <>
            <Badge variant="warning">{shipment.status}</Badge>
            {(nextActions[shipment.status] ?? []).map((action) => (
              <Button key={action} onClick={() => act(action)}>
                {action[0].toUpperCase() + action.slice(1)}
              </Button>
            ))}
            {!['CLOSED', 'CANCELLED'].includes(shipment.status) && (
              <Button variant="outline" onClick={() => act('cancel')}>
                Cancel
              </Button>
            )}
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader>
              <h2 className="font-semibold">Shipment details</h2>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Detail
                label="Mode / type"
                value={`${shipment.transportMode ?? '—'} / ${shipment.transportType ?? '—'}`}
              />
              <Detail label="Transport company" value={shipment.transportCompanyName ?? '—'} />
              <Detail label="Expected dispatch" value={formatDate(shipment.expectedDispatchDate)} />
              <Detail label="Expected delivery" value={formatDate(shipment.expectedDeliveryDate)} />
              <Detail label="Freight" value={`${shipment.freightCharges ?? 0} · ${shipment.freightPaidBy ?? '—'}`} />
              <Detail label="E-way bill" value={shipment.ewayBillNumber ?? '—'} />
            </CardContent>
          </Card>
          {['APPROVED', 'SUBMITTED'].includes(shipment.status) && (
            <Card>
              <CardHeader>
                <h2 className="font-semibold">Assignment</h2>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Vehicle</Label>
                  <Select value={vehicleId} onValueChange={setVehicleId}>
                    <SelectTrigger>
                      {vehicles.find((v) => v.id === vehicleId)?.vehicleNumber ?? 'Select vehicle'}
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles
                        .filter((v) => v.currentStatus === 'AVAILABLE')
                        .map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.vehicleNumber}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Driver</Label>
                  <Select value={driverId} onValueChange={setDriverId}>
                    <SelectTrigger>{drivers.find((d) => d.id === driverId)?.name ?? 'Select driver'}</SelectTrigger>
                    <SelectContent>
                      {drivers
                        .filter((d) => d.currentStatus === 'AVAILABLE')
                        .map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={() => act('assign')}>Assign shipment</Button>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <h2 className="font-semibold">Lines</h2>
            </CardHeader>
            <CardContent>
              <Table>
                <thead>
                  <tr className="border-b">
                    <th className="p-3 text-xs text-slate-500">ITEM</th>
                    <th className="p-3 text-xs text-slate-500">QTY</th>
                    <th className="p-3 text-xs text-slate-500">BATCH / SERIAL</th>
                  </tr>
                </thead>
                <tbody>
                  {(shipment.lines ?? []).map((line) => (
                    <tr key={line.id ?? line.lineOrder} className="border-b">
                      <td className="p-3">{line.productName ?? line.description ?? '—'}</td>
                      <td className="p-3">
                        {line.quantity} {line.unitName ?? ''}
                      </td>
                      <td className="p-3">{line.batchNumber ?? line.serialNumber ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <h2 className="font-semibold">Legs</h2>
            </CardHeader>
            <CardContent className="space-y-3">
              {(shipment.legs ?? []).map((leg) => (
                <div key={leg.id ?? leg.sequenceNo} className="rounded-xl border p-4">
                  <p className="font-medium">
                    Leg {leg.sequenceNo} · {leg.transportCompanyName ?? 'Unassigned'}
                  </p>
                  <p className="text-sm text-slate-500">
                    {leg.vehicleNumberSnapshot ?? 'No vehicle'} · {leg.driverNameSnapshot ?? 'No driver'} · LR{' '}
                    {leg.lrNumber ?? '—'}
                  </p>
                </div>
              ))}
              {!shipment.legs?.length && <p className="py-6 text-center text-sm text-slate-500">No legs assigned.</p>}
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <h2 className="font-semibold">Timeline</h2>
          </CardHeader>
          <CardContent>
            <ShipmentTimeline events={shipment.events} />
          </CardContent>
        </Card>
      </div>
      {shipment.sourceDocumentType === 'DELIVERY_CHALLAN' && shipment.sourceDocumentId && (
        <Button variant="outline" asChild>
          <Link to={`/sales/challans/${shipment.sourceDocumentId}`}>View delivery challan</Link>
        </Button>
      )}
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-800">{value}</p>
    </div>
  )
}
function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString() : '—'
}
