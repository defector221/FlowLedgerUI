import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { RefreshCw } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageChrome'
import { customerApi, organizationApi, salesApi, transportApi, warehouseApi } from '@/services/api'
import { getApiErrorMessage } from '@/lib/api-error'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Dialog,
  DialogContent,
  DialogTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Switch,
  Table,
} from '@/components/ui'
import { ShipmentTimeline } from '@/features/transport/ShipmentTimeline'

export function DeliveryChallanDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [shipmentOpen, setShipmentOpen] = useState(false)
  const [transportMode, setTransportMode] = useState('ROAD')
  const [transportType, setTransportType] = useState('THIRD_PARTY')
  const {
    data: challan,
    isLoading,
    refetch,
  } = useQuery({ queryKey: ['challan', id], queryFn: () => salesApi.getChallan(id), enabled: !!id })
  const { data: settings } = useQuery({ queryKey: ['organization', 'ops-settings'], queryFn: organizationApi.settings })
  const { data: shipments = [] } = useQuery({
    queryKey: ['transport', 'challan', id],
    queryFn: () => transportApi.shipmentsForSource('DELIVERY_CHALLAN', id),
    enabled: !!id && settings?.transportEnabled !== false,
  })
  const { data: customers = [] } = useQuery({
    queryKey: ['customers', 'challan-detail'],
    queryFn: () => customerApi.list({ size: 200 }),
  })
  const { data: warehouses = [] } = useQuery({ queryKey: ['warehouses'], queryFn: warehouseApi.list })
  const customer = customers.find((row) => row.id === challan?.customerId)
  const warehouse = warehouses.find((row) => row.id === challan?.warehouseId)

  const convert = async () => {
    try {
      const invoice = await salesApi.convertChallanToInvoice(id)
      await queryClient.invalidateQueries({ queryKey: ['challans'] })
      toast.success('Challan converted to invoice')
      if (invoice.id) navigate(`/sales/invoices/${String(invoice.id)}`)
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }
  const cancel = async () => {
    try {
      await salesApi.cancelChallan(id)
      await queryClient.invalidateQueries({ queryKey: ['challan', id] })
      toast.success('Challan cancelled')
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }
  const toggleTransport = async (checked: boolean) => {
    try {
      await salesApi.updateChallan(id, { transportRequired: checked })
      await queryClient.invalidateQueries({ queryKey: ['challan', id] })
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }
  const createShipment = async () => {
    if (!challan) return
    try {
      const shipment = await transportApi.shipments.create({
        sourceDocumentType: 'DELIVERY_CHALLAN',
        sourceDocumentId: challan.id,
        transportRequired: true,
        transportMode: transportMode as never,
        transportType: transportType as never,
        fromWarehouseId: challan.warehouseId,
        shipToPartyType: 'CUSTOMER',
        shipToPartyId: challan.customerId,
        freightCharges: 0,
        freightPaidBy: settings?.transportDefaultFreightPayer ?? 'SENDER',
        lines: (challan.items ?? []).map((item, lineOrder) => ({
          sourceLineId: item.id,
          productId: item.productId,
          description: item.description,
          quantity: Math.max(0, Number(item.quantity) - Number(item.quantityDispatched ?? 0)),
          lineOrder,
        })),
        legs: [],
      })
      await queryClient.invalidateQueries({ queryKey: ['transport', 'challan', id] })
      setShipmentOpen(false)
      toast.success('Shipment created')
      navigate(`/transport/shipments/${shipment.id}`)
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }
  if (isLoading || !challan)
    return <p className="py-20 text-center text-sm text-slate-500">Loading delivery challan…</p>

  const allEvents = shipments.flatMap((shipment) => shipment.events ?? [])
  return (
    <div className="space-y-6">
      <PageHeader
        title={challan.challanNumber}
        subtitle={`Delivery challan · ${challan.challanDate}`}
        actions={
          <>
            <Badge>{challan.status}</Badge>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="size-4" />
              Refresh
            </Button>
            <Button onClick={convert} disabled={challan.status === 'CANCELLED'}>
              Convert to invoice
            </Button>
            {challan.status === 'DRAFT' && (
              <Button variant="outline" onClick={cancel}>
                Cancel
              </Button>
            )}
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardContent className="grid gap-5 p-6 sm:grid-cols-2">
              <Detail
                label="Customer"
                value={challan.customerName ?? customer?.companyName ?? customer?.customerName ?? '—'}
              />
              <Detail label="Warehouse" value={challan.warehouseName ?? warehouse?.warehouseName ?? '—'} />
              <Detail label="Challan date" value={challan.challanDate} />
              <Detail label="Sales order" value={challan.salesOrderNumber ?? challan.salesOrderId ?? '—'} />
              <div className="sm:col-span-2">
                <Detail label="Notes" value={challan.notes ?? '—'} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <h2 className="font-semibold">Items</h2>
            </CardHeader>
            <CardContent>
              <Table>
                <thead>
                  <tr className="border-b">
                    <th className="p-3 text-xs text-slate-500">ITEM</th>
                    <th className="p-3 text-xs text-slate-500">QTY</th>
                    <th className="p-3 text-xs text-slate-500">DISPATCHED</th>
                    <th className="p-3 text-xs text-slate-500">REMAINING</th>
                  </tr>
                </thead>
                <tbody>
                  {(challan.items ?? []).map((item) => {
                    const dispatched = Number(item.quantityDispatched ?? 0)
                    return (
                      <tr key={item.id} className="border-b">
                        <td className="p-3">{item.productName ?? item.description ?? '—'}</td>
                        <td className="p-3">
                          {item.quantity} {item.unitName ?? ''}
                        </td>
                        <td className="p-3">{dispatched}</td>
                        <td className="p-3 font-medium">{Math.max(0, Number(item.quantity) - dispatched)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </Table>
            </CardContent>
          </Card>
          {settings?.transportEnabled && (
            <Card>
              <CardHeader>
                <div>
                  <h2 className="font-semibold">Transport</h2>
                  <p className="text-xs text-slate-500">Shipments linked to this challan.</p>
                </div>
                <Button size="sm" onClick={() => setShipmentOpen(true)}>
                  Create shipment
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="flex items-center justify-between rounded-xl border p-4 text-sm">
                  <span>
                    <b className="block">Transport required</b>
                    <small className="text-slate-500">
                      {settings.transportAllowOverride
                        ? 'Can be overridden for this challan'
                        : 'Controlled by organization settings'}
                    </small>
                  </span>
                  <Switch
                    disabled={!settings.transportAllowOverride}
                    checked={!!challan.transportRequired}
                    onCheckedChange={toggleTransport}
                  />
                </label>
                {shipments.map((shipment) => (
                  <Link
                    key={shipment.id}
                    to={`/transport/shipments/${shipment.id}`}
                    className="flex items-center justify-between rounded-xl border p-4 hover:border-teal-200"
                  >
                    <span>
                      <b className="block text-sm">{shipment.shipmentNumber}</b>
                      <small className="text-slate-500">
                        {shipment.transportMode ?? 'No mode'} · {shipment.transportCompanyName ?? 'Unassigned'}
                      </small>
                    </span>
                    <Badge>{shipment.status}</Badge>
                  </Link>
                ))}
                {!shipments.length && (
                  <p className="py-6 text-center text-sm text-slate-500">No shipment linked yet.</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
        <Card>
          <CardHeader>
            <h2 className="font-semibold">Shipment timeline</h2>
          </CardHeader>
          <CardContent>
            <ShipmentTimeline events={allEvents} />
          </CardContent>
        </Card>
      </div>
      <Dialog open={shipmentOpen} onOpenChange={setShipmentOpen}>
        <DialogContent>
          <DialogTitle>Create shipment</DialogTitle>
          <div className="mt-5 space-y-4">
            <div>
              <Label>Transport mode</Label>
              <Select value={transportMode} onValueChange={setTransportMode}>
                <SelectTrigger>{transportMode}</SelectTrigger>
                <SelectContent>
                  {['ROAD', 'RAIL', 'AIR', 'SEA', 'COURIER', 'CUSTOMER_PICKUP', 'INTERNAL_VEHICLE'].map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Transport type</Label>
              <Select value={transportType} onValueChange={setTransportType}>
                <SelectTrigger>{transportType}</SelectTrigger>
                <SelectContent>
                  {['SELF', 'THIRD_PARTY', 'CUSTOMER_ARRANGED'].map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={createShipment}>
              Create and open shipment
            </Button>
          </div>
        </DialogContent>
      </Dialog>
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
