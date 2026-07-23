import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageChrome'
import { getApiErrorMessage } from '@/lib/api-error'
import { transportApi } from '@/services/api'
import type { ShipmentLeg } from '@/types/api'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Table,
  Textarea,
} from '@/components/ui'
import { ShipmentTimeline } from './ShipmentTimeline'

const ACTIVE_TIMELINE = new Set([
  'SUBMITTED',
  'APPROVED',
  'ASSIGNED',
  'LOADING',
  'LOADED',
  'PARTIALLY_DISPATCHED',
  'DISPATCHED',
  'IN_TRANSIT',
])

export function TransportShipmentDetailPage() {
  const { id = '' } = useParams()
  const queryClient = useQueryClient()
  const [vehicleId, setVehicleId] = useState('')
  const [driverId, setDriverId] = useState('')
  const [timelineNote, setTimelineNote] = useState('')
  const [legOrigin, setLegOrigin] = useState('')
  const [legDestination, setLegDestination] = useState('')
  const [legMode, setLegMode] = useState('ROAD')
  const [legBusy, setLegBusy] = useState(false)
  const [editingLegId, setEditingLegId] = useState<string | null>(null)
  const [editLeg, setEditLeg] = useState({
    originLocation: '',
    destinationLocation: '',
    transportMode: 'ROAD',
    lrNumber: '',
    vehicleNumberSnapshot: '',
    driverNameSnapshot: '',
    remarks: '',
  })
  const [headerBusy, setHeaderBusy] = useState(false)
  const [header, setHeader] = useState({
    transportMode: 'ROAD',
    transportType: 'THIRD_PARTY',
    transportCompanyId: '',
    shipToAddress: '',
    expectedDispatchDate: '',
    expectedDeliveryDate: '',
    freightCharges: '0',
    ewayBillNumber: '',
    remarks: '',
  })

  const { data: shipment, isLoading } = useQuery({
    queryKey: ['transport', 'shipment', id],
    queryFn: () => transportApi.shipments.get(id),
    enabled: !!id,
  })

  useEffect(() => {
    if (!shipment) return
    setHeader({
      transportMode: String(shipment.transportMode ?? 'ROAD'),
      transportType: String(shipment.transportType ?? 'THIRD_PARTY'),
      transportCompanyId: String(shipment.transportCompanyId ?? ''),
      shipToAddress: String(shipment.shipToAddress ?? ''),
      expectedDispatchDate: toLocalInput(shipment.expectedDispatchDate),
      expectedDeliveryDate: toLocalInput(shipment.expectedDeliveryDate),
      freightCharges: String(shipment.freightCharges ?? 0),
      ewayBillNumber: String(shipment.ewayBillNumber ?? ''),
      remarks: String(shipment.remarks ?? ''),
    })
  }, [shipment])
  const poll = ACTIVE_TIMELINE.has(String(shipment?.status ?? ''))
  const { data: timeline = [] } = useQuery({
    queryKey: ['transport', 'shipment', id, 'timeline'],
    queryFn: () => transportApi.timeline(id),
    enabled: !!id,
    refetchInterval: poll ? 20_000 : false,
    refetchOnWindowFocus: true,
  })
  const { data: vehicles = [] } = useQuery({
    queryKey: ['transport', 'vehicles'],
    queryFn: () => transportApi.vehicles.list(),
  })
  const { data: drivers = [] } = useQuery({
    queryKey: ['transport', 'drivers'],
    queryFn: () => transportApi.drivers.list(),
  })
  const { data: companies = [] } = useQuery({
    queryKey: ['transport', 'companies'],
    queryFn: () => transportApi.companies.list(),
  })

  const customerArranged = useMemo(() => {
    const type = String(header.transportType || shipment?.transportType || '')
    const mode = String(header.transportMode || shipment?.transportMode || '')
    return type === 'CUSTOMER_ARRANGED' || mode === 'CUSTOMER_PICKUP'
  }, [header.transportMode, header.transportType, shipment])

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['transport', 'shipment', id] })
    await queryClient.invalidateQueries({ queryKey: ['transport', 'shipment', id, 'timeline'] })
    await queryClient.invalidateQueries({ queryKey: ['transport', 'shipments'] })
  }

  const saveHeader = async () => {
    setHeaderBusy(true)
    try {
      await transportApi.shipments.updateHeader(id, {
        transportMode: header.transportMode || undefined,
        transportType: header.transportType || undefined,
        transportCompanyId: header.transportCompanyId || null,
        shipToAddress: header.shipToAddress || null,
        expectedDispatchDate: header.expectedDispatchDate
          ? new Date(header.expectedDispatchDate).toISOString()
          : null,
        expectedDeliveryDate: header.expectedDeliveryDate
          ? new Date(header.expectedDeliveryDate).toISOString()
          : null,
        freightCharges: Number(header.freightCharges) || 0,
        ewayBillNumber: header.ewayBillNumber || null,
        remarks: header.remarks || null,
      })
      await refresh()
      toast.success('Shipment details saved')
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    } finally {
      setHeaderBusy(false)
    }
  }

  const act = async (
    action:
      | 'submit'
      | 'approve'
      | 'assign'
      | 'startLoading'
      | 'loaded'
      | 'dispatch'
      | 'checkpoint'
      | 'deliver'
      | 'close'
      | 'cancel',
  ) => {
    try {
      if (action === 'assign') {
        if (!vehicleId || !driverId) return toast.error('Select both vehicle and driver')
        await transportApi.shipments.assign(id, {
          legs: [
            {
              sequenceNo: 1,
              vehicleId,
              driverId,
              transportCompanyId: shipment?.transportCompanyId || undefined,
            },
          ],
        })
      } else if (action === 'startLoading') await transportApi.shipments.startLoading(id)
      else if (action === 'loaded') await transportApi.shipments.loaded(id)
      else if (action === 'checkpoint') await transportApi.shipments.checkpoint(id, { remarks: timelineNote || undefined })
      else if (action === 'approve') await transportApi.shipments.approve(id)
      else if (action === 'cancel') await transportApi.shipments.cancel(id)
      else await transportApi.shipments[action](id)
      setTimelineNote('')
      await refresh()
      toast.success(`Shipment ${action} completed`)
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }

  const addTimelineNote = async () => {
    if (!timelineNote.trim()) return toast.error('Enter a timeline update')
    try {
      await transportApi.shipments.addEvent(id, { eventType: 'NOTE', remarks: timelineNote.trim() })
      setTimelineNote('')
      await refresh()
      toast.success('Timeline updated')
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }

  const addLeg = async () => {
    if (!legOrigin.trim() || !legDestination.trim()) return toast.error('Origin and destination are required')
    setLegBusy(true)
    try {
      await transportApi.legs.add(id, {
        transportMode: legMode,
        originLocation: legOrigin.trim(),
        destinationLocation: legDestination.trim(),
      })
      setLegOrigin('')
      setLegDestination('')
      await refresh()
      toast.success('Leg added')
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    } finally {
      setLegBusy(false)
    }
  }

  const startEditLeg = (leg: ShipmentLeg) => {
    if (!leg?.id) return
    setEditingLegId(String(leg.id))
    setEditLeg({
      originLocation: String(leg.originLocation ?? ''),
      destinationLocation: String(leg.destinationLocation ?? ''),
      transportMode: String(leg.transportMode ?? shipment?.transportMode ?? 'ROAD'),
      lrNumber: String(leg.lrNumber ?? ''),
      vehicleNumberSnapshot: String(leg.vehicleNumberSnapshot ?? ''),
      driverNameSnapshot: String(leg.driverNameSnapshot ?? ''),
      remarks: String(leg.remarks ?? ''),
    })
  }

  const saveLeg = async () => {
    if (!editingLegId) return
    if (!editLeg.originLocation.trim() || !editLeg.destinationLocation.trim()) {
      return toast.error('Origin and destination are required')
    }
    setLegBusy(true)
    try {
      await transportApi.legs.update(editingLegId, {
        transportMode: editLeg.transportMode,
        originLocation: editLeg.originLocation.trim(),
        destinationLocation: editLeg.destinationLocation.trim(),
        lrNumber: editLeg.lrNumber.trim() || null,
        vehicleNumberSnapshot: editLeg.vehicleNumberSnapshot.trim() || null,
        driverNameSnapshot: editLeg.driverNameSnapshot.trim() || null,
        remarks: editLeg.remarks.trim() || null,
      })
      setEditingLegId(null)
      await refresh()
      toast.success('Leg updated')
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    } finally {
      setLegBusy(false)
    }
  }

  const legAction = async (legId: string, action: 'dispatch' | 'arrive' | 'complete') => {
    try {
      await transportApi.legs[action](legId)
      await refresh()
      toast.success(`Leg ${action} completed`)
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }

  if (isLoading || !shipment) return <p className="py-20 text-center text-sm text-slate-500">Loading shipment…</p>

  const status = String(shipment.status)
  const nextActions: string[] = []
  if (status === 'DRAFT') nextActions.push('submit')
  if (status === 'SUBMITTED') nextActions.push('approve')
  if (!customerArranged) {
    if (status === 'ASSIGNED') nextActions.push('startLoading')
    if (status === 'LOADING') nextActions.push('loaded')
    if (status === 'LOADED') nextActions.push('dispatch')
  } else if (status === 'APPROVED' || status === 'ASSIGNED' || status === 'LOADED') {
    nextActions.push('dispatch')
  }
  if (status === 'DISPATCHED' || status === 'PARTIALLY_DISPATCHED') nextActions.push('checkpoint', 'deliver')
  if (status === 'IN_TRANSIT') nextActions.push('checkpoint', 'deliver')
  if (status === 'DELIVERED') nextActions.push('close')

  return (
    <div className="space-y-6">
      <PageHeader
        title={shipment.shipmentNumber}
        subtitle={`${shipment.sourceDocumentType ?? 'Manual shipment'} · ${shipment.shipToPartyName ?? shipment.shipToAddress ?? 'No destination'}`}
        actions={
          <>
            <Badge variant="warning">{shipment.status}</Badge>
            {customerArranged ? <Badge variant="neutral">Customer arranged</Badge> : null}
            {nextActions.map((action) => (
              <Button
                key={action}
                onClick={() =>
                  act(
                    action as
                      | 'submit'
                      | 'approve'
                      | 'dispatch'
                      | 'checkpoint'
                      | 'deliver'
                      | 'close'
                      | 'startLoading'
                      | 'loaded',
                  )
                }
              >
                {labelAction(action)}
              </Button>
            ))}
            {!['CLOSED', 'CANCELLED'].includes(status) && (
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
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold">Shipment details</h2>
                {['DRAFT', 'APPROVED'].includes(status) ? (
                  <Button size="sm" disabled={headerBusy} onClick={saveHeader}>
                    Save details
                  </Button>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {['DRAFT', 'APPROVED'].includes(status) ? (
                <>
                  <div>
                    <Label>Mode</Label>
                    <Select
                      value={header.transportMode}
                      onValueChange={(v) => setHeader((h) => ({ ...h, transportMode: v }))}
                    >
                      <SelectTrigger>{humanize(header.transportMode)}</SelectTrigger>
                      <SelectContent>
                        {['ROAD', 'RAIL', 'AIR', 'SEA', 'COURIER', 'CUSTOMER_PICKUP', 'INTERNAL_VEHICLE'].map((m) => (
                          <SelectItem key={m} value={m}>
                            {humanize(m)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Type</Label>
                    <Select
                      value={header.transportType}
                      onValueChange={(v) => setHeader((h) => ({ ...h, transportType: v }))}
                    >
                      <SelectTrigger>{humanize(header.transportType)}</SelectTrigger>
                      <SelectContent>
                        {['SELF', 'THIRD_PARTY', 'CUSTOMER_ARRANGED'].map((m) => (
                          <SelectItem key={m} value={m}>
                            {humanize(m)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {!customerArranged ? (
                    <div>
                      <Label>Transport company</Label>
                      <Select
                        value={header.transportCompanyId || '__none'}
                        onValueChange={(v) =>
                          setHeader((h) => ({ ...h, transportCompanyId: v === '__none' ? '' : v }))
                        }
                      >
                        <SelectTrigger>
                          {companies.find((c) => c.id === header.transportCompanyId)?.name ?? 'Optional'}
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
                  ) : (
                    <Detail label="Transport company" value="Customer arranged" />
                  )}
                  <Detail
                    label="From warehouse"
                    value={shipment.fromWarehouseName ?? '—'}
                  />
                  <div className="sm:col-span-2">
                    <Label>Ship-to / destination</Label>
                    <Input
                      value={header.shipToAddress}
                      onChange={(e) => setHeader((h) => ({ ...h, shipToAddress: e.target.value }))}
                      placeholder="Customer delivery address"
                    />
                    {shipment.shipToPartyName ? (
                      <p className="mt-1 text-xs text-slate-500">Customer · {shipment.shipToPartyName}</p>
                    ) : null}
                  </div>
                  <div>
                    <Label>Expected dispatch</Label>
                    <Input
                      type="datetime-local"
                      value={header.expectedDispatchDate}
                      onChange={(e) => setHeader((h) => ({ ...h, expectedDispatchDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Expected delivery</Label>
                    <Input
                      type="datetime-local"
                      value={header.expectedDeliveryDate}
                      onChange={(e) => setHeader((h) => ({ ...h, expectedDeliveryDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Freight charges</Label>
                    <Input
                      value={header.freightCharges}
                      onChange={(e) => setHeader((h) => ({ ...h, freightCharges: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>E-way bill</Label>
                    <Input
                      value={header.ewayBillNumber}
                      onChange={(e) => setHeader((h) => ({ ...h, ewayBillNumber: e.target.value }))}
                    />
                  </div>
                </>
              ) : (
                <>
                  <Detail
                    label="Mode / type"
                    value={`${humanize(shipment.transportMode)} / ${humanize(shipment.transportType)}`}
                  />
                  <Detail
                    label="Transport company"
                    value={
                      customerArranged
                        ? 'Customer arranged'
                        : (shipment.transportCompanyName ?? '—')
                    }
                  />
                  <Detail label="From warehouse" value={shipment.fromWarehouseName ?? '—'} />
                  <Detail label="Customer" value={shipment.shipToPartyName ?? '—'} />
                  <Detail label="Ship-to address" value={shipment.shipToAddress ?? '—'} />
                  <Detail label="Expected dispatch" value={formatDate(shipment.expectedDispatchDate)} />
                  <Detail label="Expected delivery" value={formatDate(shipment.expectedDeliveryDate)} />
                  <Detail
                    label="Freight / grand total"
                    value={`${shipment.freightCharges ?? 0} · ${shipment.grandTotal ?? shipment.freightCharges ?? 0}`}
                  />
                  <Detail label="E-way bill" value={shipment.ewayBillNumber ?? '—'} />
                </>
              )}
            </CardContent>
          </Card>

          {customerArranged && status === 'APPROVED' ? (
            <Card>
              <CardContent className="p-5 text-sm text-slate-600">
                Customer-arranged transport — fleet assignment is skipped. Dispatch when goods leave your yard, then
                update the timeline as the customer progresses.
              </CardContent>
            </Card>
          ) : null}

          {!customerArranged && status === 'APPROVED' ? (
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
          ) : null}

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
              <div>
                <h2 className="font-semibold">Legs</h2>
                <p className="text-xs text-slate-500">Factory → warehouse → hub → customer segments.</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {(shipment.legs ?? []).map((leg) => {
                const editable = !!leg.id && !['COMPLETED', 'CANCELLED'].includes(String(leg.status ?? ''))
                const isEditing = editingLegId === String(leg.id)
                return (
                  <div key={leg.id ?? leg.sequenceNo} className="rounded-xl border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">
                        Leg {leg.sequenceNo}
                        {leg.status ? ` · ${humanize(leg.status)}` : ''}
                      </p>
                      {editable ? (
                        <div className="flex flex-wrap gap-2">
                          {!isEditing ? (
                            <Button size="sm" variant="outline" onClick={() => startEditLeg(leg)}>
                              Edit
                            </Button>
                          ) : null}
                          {['PLANNED', 'READY'].includes(String(leg.status ?? 'PLANNED')) ? (
                            <Button size="sm" variant="outline" onClick={() => legAction(String(leg.id), 'dispatch')}>
                              Dispatch
                            </Button>
                          ) : null}
                          {['DISPATCHED', 'IN_TRANSIT'].includes(String(leg.status ?? '')) ? (
                            <Button size="sm" variant="outline" onClick={() => legAction(String(leg.id), 'arrive')}>
                              Arrive
                            </Button>
                          ) : null}
                          {['ARRIVED', 'IN_TRANSIT', 'DISPATCHED'].includes(String(leg.status ?? '')) ? (
                            <Button size="sm" onClick={() => legAction(String(leg.id), 'complete')}>
                              Complete
                            </Button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    {isEditing ? (
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div>
                          <Label>Origin</Label>
                          <Input
                            value={editLeg.originLocation}
                            onChange={(e) => setEditLeg((s) => ({ ...s, originLocation: e.target.value }))}
                            placeholder="Factory / Warehouse"
                          />
                        </div>
                        <div>
                          <Label>Destination</Label>
                          <Input
                            value={editLeg.destinationLocation}
                            onChange={(e) => setEditLeg((s) => ({ ...s, destinationLocation: e.target.value }))}
                            placeholder="Warehouse / Hub / Customer"
                          />
                        </div>
                        <div>
                          <Label>Mode</Label>
                          <Select
                            value={editLeg.transportMode}
                            onValueChange={(v) => setEditLeg((s) => ({ ...s, transportMode: v }))}
                          >
                            <SelectTrigger>{humanize(editLeg.transportMode)}</SelectTrigger>
                            <SelectContent>
                              {['ROAD', 'RAIL', 'AIR', 'SEA', 'COURIER', 'CUSTOMER_PICKUP', 'INTERNAL_VEHICLE'].map(
                                (m) => (
                                  <SelectItem key={m} value={m}>
                                    {humanize(m)}
                                  </SelectItem>
                                ),
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>LR number</Label>
                          <Input
                            value={editLeg.lrNumber}
                            onChange={(e) => setEditLeg((s) => ({ ...s, lrNumber: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label>Vehicle number</Label>
                          <Input
                            value={editLeg.vehicleNumberSnapshot}
                            onChange={(e) => setEditLeg((s) => ({ ...s, vehicleNumberSnapshot: e.target.value }))}
                            placeholder="Optional"
                          />
                        </div>
                        <div>
                          <Label>Driver name</Label>
                          <Input
                            value={editLeg.driverNameSnapshot}
                            onChange={(e) => setEditLeg((s) => ({ ...s, driverNameSnapshot: e.target.value }))}
                            placeholder="Optional"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <Label>Remarks</Label>
                          <Input
                            value={editLeg.remarks}
                            onChange={(e) => setEditLeg((s) => ({ ...s, remarks: e.target.value }))}
                          />
                        </div>
                        <div className="flex gap-2 sm:col-span-2">
                          <Button disabled={legBusy} onClick={saveLeg}>
                            Save leg
                          </Button>
                          <Button variant="outline" disabled={legBusy} onClick={() => setEditingLegId(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="mt-1 text-sm text-slate-600">
                          {(leg.originLocation?.trim() || 'Origin?') +
                            ' → ' +
                            (leg.destinationLocation?.trim() || 'Destination?')}
                        </p>
                        <p className="text-sm text-slate-500">
                          {humanize(leg.transportMode)} · {leg.vehicleNumberSnapshot ?? 'No vehicle'} ·{' '}
                          {leg.driverNameSnapshot ?? 'No driver'} · LR {leg.lrNumber ?? '—'}
                        </p>
                        {editable && (!leg.originLocation?.trim() || !leg.destinationLocation?.trim()) ? (
                          <p className="mt-2 text-xs text-amber-800">
                            Origin/destination missing — use Edit to fill them before dispatch.
                          </p>
                        ) : null}
                      </>
                    )}
                  </div>
                )
              })}
              {!shipment.legs?.length ? <p className="py-4 text-center text-sm text-slate-500">No legs yet.</p> : null}

              {!['CLOSED', 'CANCELLED', 'DELIVERED'].includes(status) ? (
                <div className="grid gap-3 rounded-xl border border-dashed border-slate-200 p-4 sm:grid-cols-2">
                  <div>
                    <Label>Origin</Label>
                    <Input value={legOrigin} onChange={(e) => setLegOrigin(e.target.value)} placeholder="Factory" />
                  </div>
                  <div>
                    <Label>Destination</Label>
                    <Input
                      value={legDestination}
                      onChange={(e) => setLegDestination(e.target.value)}
                      placeholder="Warehouse / Hub / Customer"
                    />
                  </div>
                  <div>
                    <Label>Mode</Label>
                    <Select value={legMode} onValueChange={setLegMode}>
                      <SelectTrigger>{humanize(legMode)}</SelectTrigger>
                      <SelectContent>
                        {['ROAD', 'RAIL', 'AIR', 'SEA', 'COURIER', 'CUSTOMER_PICKUP', 'INTERNAL_VEHICLE'].map((m) => (
                          <SelectItem key={m} value={m}>
                            {humanize(m)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button className="w-full" disabled={legBusy} onClick={addLeg}>
                      Add leg
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="font-semibold">Timeline</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <ShipmentTimeline events={timeline} />
              {!['CLOSED', 'CANCELLED'].includes(status) ? (
                <div className="space-y-2 border-t border-slate-100 pt-4">
                  <Label>Manual update</Label>
                  <Textarea
                    rows={3}
                    value={timelineNote}
                    onChange={(e) => setTimelineNote(e.target.value)}
                    placeholder="Add a note when provider events are delayed…"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={addTimelineNote}>
                      Add note
                    </Button>
                    {['DISPATCHED', 'PARTIALLY_DISPATCHED', 'IN_TRANSIT'].includes(status) ? (
                      <Button onClick={() => act('checkpoint')}>Record checkpoint</Button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
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
function toLocalInput(value?: string | null) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function humanize(value?: string | null) {
  if (!value) return '—'
  return value
    .toLowerCase()
    .split('_')
    .map((p) => (p ? p[0].toUpperCase() + p.slice(1) : p))
    .join(' ')
}
function labelAction(action: string) {
  if (action === 'startLoading') return 'Start loading'
  return action[0].toUpperCase() + action.slice(1)
}
