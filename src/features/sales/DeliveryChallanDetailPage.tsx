import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Building2, CalendarDays, Package, RefreshCw, ShoppingCart, UserRound } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageChrome'
import { DocumentSummaryCard } from '@/components/documents/DocumentSummaryCard'
import { customerApi, organizationApi, salesApi, transportApi, warehouseApi, aiApi } from '@/services/api'
import { getApiErrorMessage, notifyWorkflowApproval } from '@/lib/api-error'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Dialog,
  DialogContent,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Switch,
  Table,
} from '@/components/ui'
import { ShipmentTimeline } from '@/features/transport/ShipmentTimeline'
import { ApprovalHistoryPanel } from '@/features/ai/ApprovalHistoryPanel'
import type { DeliveryChallan, Shipment } from '@/types/api'

const PRE_DISPATCH_STATUSES = new Set(['DRAFT', 'SUBMITTED', 'APPROVED', 'ASSIGNED', 'LOADING', 'LOADED'])

const DISPATCHED_OR_LATER = new Set(['PARTIALLY_DISPATCHED', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED', 'CLOSED'])

function shipmentCreateAvailability(challan: DeliveryChallan | undefined, shipments: Shipment[]) {
  const openShipments = shipments.filter((shipment) => PRE_DISPATCH_STATUSES.has(String(shipment.status)))
  const reserved = new Map<string, number>()
  let sawLineData = false
  for (const shipment of openShipments) {
    for (const line of shipment.lines ?? []) {
      sawLineData = true
      if (!line.sourceLineId) continue
      reserved.set(line.sourceLineId, (reserved.get(line.sourceLineId) ?? 0) + Number(line.quantity ?? 0))
    }
  }
  // Open shipments without line payloads are treated as fully covering the challan.
  const transportLockedAfterDispatch = shipments.some((shipment) => DISPATCHED_OR_LATER.has(String(shipment.status)))
  if (openShipments.length > 0 && !sawLineData) {
    return { openShipments, canCreateShipment: false, transportLockedAfterDispatch }
  }
  const hasAvailableQty = (challan?.items ?? []).some((item) => {
    const remaining = Math.max(0, Number(item.quantity) - Number(item.quantityDispatched ?? 0))
    return remaining - (reserved.get(item.id) ?? 0) > 0
  })
  return { openShipments, canCreateShipment: hasAvailableQty, transportLockedAfterDispatch }
}

export function DeliveryChallanDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [shipmentOpen, setShipmentOpen] = useState(false)
  const [transportMode, setTransportMode] = useState('ROAD')
  const [transportType, setTransportType] = useState('THIRD_PARTY')
  const [freightCharges, setFreightCharges] = useState('0')
  const [expectedDispatch, setExpectedDispatch] = useState('')
  const [expectedDelivery, setExpectedDelivery] = useState('')
  const [ewayBillNumber, setEwayBillNumber] = useState('')
  const [transportCompanyId, setTransportCompanyId] = useState('')
  const [shipToAddress, setShipToAddress] = useState('')

  const setType = (value: string) => {
    setTransportType(value)
    if (value === 'CUSTOMER_ARRANGED' && transportMode !== 'CUSTOMER_PICKUP') {
      setTransportMode('CUSTOMER_PICKUP')
    }
  }
  const setMode = (value: string) => {
    setTransportMode(value)
    if (value === 'CUSTOMER_PICKUP' && transportType !== 'CUSTOMER_ARRANGED') {
      setTransportType('CUSTOMER_ARRANGED')
    }
  }
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
  const { data: challanTimeline = [] } = useQuery({
    queryKey: ['transport', 'challan', id, 'timeline'],
    queryFn: async () => {
      const events = await Promise.all(
        shipments.map(async (shipment) => {
          try {
            const rows = await transportApi.timeline(String(shipment.id))
            return rows.map((event) => ({ ...event, shipmentId: String(shipment.id) }))
          } catch {
            return []
          }
        }),
      )
      return events.flat()
    },
    enabled: shipments.length > 0,
    refetchInterval: 30_000,
  })
  const { data: customers = [] } = useQuery({
    queryKey: ['customers', 'challan-detail'],
    queryFn: () => customerApi.list({ size: 200 }),
  })
  const { data: warehouses = [] } = useQuery({ queryKey: ['warehouses'], queryFn: warehouseApi.list })
  const { data: companies = [] } = useQuery({
    queryKey: ['transport', 'companies'],
    queryFn: () => transportApi.companies.list(),
    enabled: shipmentOpen,
  })
  const { data: approvalHistory = [], refetch: refetchApprovals } = useQuery({
    queryKey: ['workflow-approvals', 'DELIVERY_CHALLAN', id],
    queryFn: () => aiApi.workflowApprovalsForEntity('DELIVERY_CHALLAN', id),
    enabled: !!id,
    refetchOnWindowFocus: true,
    refetchInterval: (query) => {
      const rows = query.state.data ?? []
      return rows.some((row) => row.status === 'PENDING') ? 15_000 : false
    },
  })
  const { data: linkedInvoiceFromApi = null } = useQuery({
    queryKey: ['challan-invoice', id],
    queryFn: () => salesApi.getChallanInvoice(id),
    enabled: !!id,
    retry: false,
  })
  const customer = customers.find((row) => row.id === challan?.customerId)
  const warehouse = warehouses.find((row) => row.id === challan?.warehouseId)

  const convert = async () => {
    try {
      const invoice = await salesApi.convertChallanToInvoice(id)
      await queryClient.invalidateQueries({ queryKey: ['challans'] })
      await queryClient.invalidateQueries({ queryKey: ['challan', id] })
      await queryClient.invalidateQueries({ queryKey: ['workflow-approvals', 'DELIVERY_CHALLAN', id] })
      await queryClient.invalidateQueries({ queryKey: ['challan-invoice', id] })
      toast.success('Challan converted to invoice')
      if (invoice.id) navigate(`/sales/invoices/${String(invoice.id)}`)
    } catch (error) {
      if (notifyWorkflowApproval(error)) {
        await queryClient.invalidateQueries({ queryKey: ['workflow-approvals', 'DELIVERY_CHALLAN', id] })
        await refetchApprovals()
        return
      }
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
      await salesApi.updateChallanTransportRequired(id, checked)
      await queryClient.invalidateQueries({ queryKey: ['challan', id] })
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }
  const { openShipments, canCreateShipment, transportLockedAfterDispatch } = shipmentCreateAvailability(
    challan,
    shipments,
  )

  const createShipment = async () => {
    if (!challan || !canCreateShipment) return
    try {
      const shipment = await transportApi.shipments.fromChallan(challan.id, {
        transportMode,
        transportType,
        freightCharges: Number(freightCharges) || 0,
        freightPaidBy: settings?.transportDefaultFreightPayer ?? 'SENDER',
        transportCompanyId: transportCompanyId || undefined,
        shipToAddress: shipToAddress.trim() || undefined,
        expectedDispatchDate: expectedDispatch ? new Date(expectedDispatch).toISOString() : undefined,
        expectedDeliveryDate: expectedDelivery ? new Date(expectedDelivery).toISOString() : undefined,
        ewayBillNumber: ewayBillNumber.trim() || undefined,
      })
      await queryClient.invalidateQueries({ queryKey: ['transport', 'challan', id] })
      setShipmentOpen(false)
      toast.success('Shipment created')
      navigate(`/transport/shipments/${shipment.id}`)
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }

  const openCreateShipment = () => {
    if (!canCreateShipment) {
      toast.error(
        openShipments.length
          ? 'An open shipment already covers this challan. Cancel it or dispatch first to create another.'
          : 'No remaining quantity left to ship on this challan.',
      )
      return
    }
    const address = customer?.shippingAddress || customer?.billingAddress || ''
    setShipToAddress(address)
    setShipmentOpen(true)
  }
  if (isLoading || !challan)
    return <p className="py-20 text-center text-sm text-slate-500">Loading delivery challan…</p>

  const cancelled = challan.status === 'CANCELLED'
  const linkedInvoiceId = challan.linkedInvoiceId ?? linkedInvoiceFromApi?.id ?? null
  const linkedInvoiceNumber = challan.linkedInvoiceNumber ?? linkedInvoiceFromApi?.invoiceNumber ?? null
  const latestApproval = approvalHistory[0]
  const latestPending = latestApproval?.status === 'PENDING'
  const latestRejected = latestApproval?.status === 'REJECTED'
  const latestApproved = latestApproval?.status === 'APPROVED'
  const displayStatus = latestPending
    ? 'IN APPROVAL'
    : latestRejected
      ? 'REJECTED'
      : linkedInvoiceId
        ? 'INVOICED'
        : challan.status
  const statusVariant = latestPending
    ? 'warning'
    : latestRejected || cancelled
      ? 'danger'
      : linkedInvoiceId
        ? 'success'
        : 'default'
  const convertLocked = cancelled || latestPending || !!linkedInvoiceId
  const allEvents = challanTimeline.length ? challanTimeline : shipments.flatMap((shipment) => shipment.events ?? [])
  return (
    <div className="space-y-6">
      <PageHeader
        title={challan.challanNumber}
        subtitle={`Delivery challan · ${challan.challanDate}`}
        actions={
          <>
            <Badge variant={statusVariant}>{displayStatus}</Badge>
            <Button
              variant="outline"
              onClick={() => {
                void refetch()
                void refetchApprovals()
              }}
            >
              <RefreshCw className="size-4" />
              Refresh
            </Button>
            {linkedInvoiceId ? (
              <Button onClick={() => navigate(`/sales/invoices/${linkedInvoiceId}`)}>
                View invoice{linkedInvoiceNumber ? ` · ${linkedInvoiceNumber}` : ''}
              </Button>
            ) : (
              <Button
                onClick={convert}
                disabled={convertLocked}
                title={
                  latestPending
                    ? 'Awaiting workflow approval'
                    : latestRejected
                      ? 'Retrying will resubmit convert to invoice for approval'
                      : undefined
                }
              >
                {latestRejected ? 'Retry convert to invoice' : 'Convert to invoice'}
              </Button>
            )}
            {challan.status === 'DRAFT' && !latestPending && (
              <Button variant="outline" onClick={cancel}>
                Cancel
              </Button>
            )}
          </>
        }
      />

      {latestPending ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-5 py-4">
          <p className="text-sm font-semibold text-amber-950">Convert to invoice · in approval</p>
          <p className="mt-1 text-sm text-amber-900/90">
            Convert is locked until{' '}
            {latestApproval?.currentStepRole
              ? latestApproval.currentStepRole.replaceAll('_', ' ').toLowerCase()
              : 'the approver'}{' '}
            completes this request
            {latestApproval?.currentStep && latestApproval?.totalSteps
              ? ` (step ${latestApproval.currentStep}/${latestApproval.totalSteps})`
              : ''}
            .
          </p>
          <Link to="/ai/workflows" className="mt-2 inline-block text-sm font-medium text-teal-700 hover:underline">
            Open workflows inbox
          </Link>
        </div>
      ) : null}

      {latestRejected ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/70 px-5 py-4">
          <p className="text-sm font-semibold text-rose-950">
            Convert to invoice rejected
            {latestApproval?.decidedByName ? ` by ${latestApproval.decidedByName}` : null}
          </p>
          <p className="mt-1 text-sm text-rose-900/90">
            {latestApproval?.remarks?.trim()
              ? latestApproval.remarks
              : 'Review the approval history comments, then retry convert to resubmit for approval.'}
          </p>
        </div>
      ) : null}

      {linkedInvoiceId ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-5 py-4">
          <p className="text-sm font-semibold text-emerald-950">Invoice created</p>
          <p className="mt-1 text-sm text-emerald-900/90">
            This challan is already invoiced
            {linkedInvoiceNumber ? ` as ${linkedInvoiceNumber}` : ''}. Convert is locked.
          </p>
          <Link
            to={`/sales/invoices/${linkedInvoiceId}`}
            className="mt-2 inline-block text-sm font-medium text-teal-700 hover:underline"
          >
            Open invoice
          </Link>
        </div>
      ) : latestApproved && !latestPending ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-5 py-4">
          <p className="text-sm font-semibold text-emerald-950">Approval complete</p>
          <p className="mt-1 text-sm text-emerald-900/90">
            Convert to invoice was approved. Click Convert to invoice to create the sales invoice.
          </p>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader>
              <div>
                <h2 className="font-semibold">Approval history</h2>
                <p className="text-xs text-slate-500">Workflow decisions for convert to invoice on this challan.</p>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <ApprovalHistoryPanel
                requests={approvalHistory}
                emptyLabel="No workflow approvals for convert to invoice yet."
                showDocumentLink={false}
              />
            </CardContent>
          </Card>
          <DocumentSummaryCard
            title="Delivery Challan Summary"
            documentNumber={challan.challanNumber}
            status={displayStatus}
            statusVariant={statusVariant}
            createdAt={challan.createdAt}
            notes={challan.notes}
            fields={[
              {
                key: 'customer',
                label: 'Customer',
                icon: UserRound,
                iconTone: 'violet',
                value: challan.customerName ?? customer?.companyName ?? customer?.customerName ?? '—',
                detail: customer?.gstin ? `GSTIN: ${customer.gstin}` : customer?.customerCode || undefined,
              },
              {
                key: 'warehouse',
                label: 'Warehouse',
                icon: Building2,
                iconTone: 'blue',
                value: challan.warehouseName ?? warehouse?.warehouseName ?? '—',
              },
              {
                key: 'challanDate',
                label: 'Challan date',
                icon: CalendarDays,
                iconTone: 'teal',
                value: challan.challanDate,
              },
              {
                key: 'salesOrder',
                label: 'Sales order',
                icon: ShoppingCart,
                iconTone: 'amber',
                value: challan.salesOrderId ? (
                  <Link
                    to={`/sales/orders/${challan.salesOrderId}`}
                    className="font-medium text-teal-700 hover:underline"
                  >
                    {challan.salesOrderNumber ?? challan.salesOrderId}
                  </Link>
                ) : (
                  '—'
                ),
              },
              ...(linkedInvoiceId
                ? [
                    {
                      key: 'invoice',
                      label: 'Linked invoice',
                      icon: Package,
                      iconTone: 'teal' as const,
                      span: 2 as const,
                      value: (
                        <Link
                          to={`/sales/invoices/${linkedInvoiceId}`}
                          className="font-medium text-teal-700 hover:underline"
                        >
                          {linkedInvoiceNumber ?? linkedInvoiceId}
                        </Link>
                      ),
                    },
                  ]
                : []),
            ]}
          />
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
                <Button size="sm" onClick={openCreateShipment} disabled={!canCreateShipment}>
                  Create shipment
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {!canCreateShipment && openShipments.length > 0 ? (
                  <p className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    An open shipment already covers this challan. Open it to continue, or cancel it before creating
                    another.
                  </p>
                ) : null}
                <label className="flex items-center justify-between rounded-xl border p-4 text-sm">
                  <span>
                    <b className="block">Transport required</b>
                    <small className="text-slate-500">
                      {transportLockedAfterDispatch
                        ? 'Locked after shipment dispatch'
                        : settings.transportAllowOverride
                          ? 'Can be overridden for this challan'
                          : 'Controlled by organization settings'}
                    </small>
                  </span>
                  <Switch
                    disabled={!settings.transportAllowOverride || transportLockedAfterDispatch}
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
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="font-semibold">Shipment timeline</h2>
            </CardHeader>
            <CardContent>
              <ShipmentTimeline events={allEvents} />
            </CardContent>
          </Card>
        </div>
      </div>
      <Dialog open={shipmentOpen} onOpenChange={setShipmentOpen}>
        <DialogContent>
          <DialogTitle>Create shipment</DialogTitle>
          <div className="mt-5 space-y-4">
            <div>
              <Label>Transport mode</Label>
              <Select value={transportMode} onValueChange={setMode}>
                <SelectTrigger>{humanizeEnum(transportMode)}</SelectTrigger>
                <SelectContent>
                  {['ROAD', 'RAIL', 'AIR', 'SEA', 'COURIER', 'CUSTOMER_PICKUP', 'INTERNAL_VEHICLE'].map((v) => (
                    <SelectItem key={v} value={v}>
                      {humanizeEnum(v)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Transport type</Label>
              <Select value={transportType} onValueChange={setType}>
                <SelectTrigger>{humanizeEnum(transportType)}</SelectTrigger>
                <SelectContent>
                  {['SELF', 'THIRD_PARTY', 'CUSTOMER_ARRANGED'].map((v) => (
                    <SelectItem key={v} value={v}>
                      {humanizeEnum(v)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {transportType === 'CUSTOMER_ARRANGED' || transportMode === 'CUSTOMER_PICKUP' ? (
              <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600">
                Customer handles transport. Fleet assignment (vehicle / driver / transporter) will be skipped; you can
                still track progress with timeline updates.
              </p>
            ) : (
              <div>
                <Label>Transport company</Label>
                <Select
                  value={transportCompanyId || '__none'}
                  onValueChange={(v) => setTransportCompanyId(v === '__none' ? '' : v)}
                >
                  <SelectTrigger>
                    {companies.find((c) => c.id === transportCompanyId)?.name ?? 'Optional'}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">None</SelectItem>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Ship-to address</Label>
              <Input
                value={shipToAddress}
                onChange={(e) => setShipToAddress(e.target.value)}
                placeholder="Delivery address"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Expected dispatch</Label>
                <Input
                  type="datetime-local"
                  value={expectedDispatch}
                  onChange={(e) => setExpectedDispatch(e.target.value)}
                />
              </div>
              <div>
                <Label>Expected delivery</Label>
                <Input
                  type="datetime-local"
                  value={expectedDelivery}
                  onChange={(e) => setExpectedDelivery(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Freight charges</Label>
                <Input value={freightCharges} onChange={(e) => setFreightCharges(e.target.value)} />
              </div>
              <div>
                <Label>E-way bill</Label>
                <Input
                  value={ewayBillNumber}
                  onChange={(e) => setEwayBillNumber(e.target.value)}
                  placeholder="Optional"
                />
              </div>
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

function humanizeEnum(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((p) => (p ? p[0].toUpperCase() + p.slice(1) : p))
    .join(' ')
}
