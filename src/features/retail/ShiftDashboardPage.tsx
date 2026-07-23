import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { PageHeader, PageShell } from '@/components/layout/PageChrome'
import { getApiErrorMessage } from '@/lib/api-error'
import {
  Badge,
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
import { retailApi } from '@/services/api'
import { RetailModuleGate } from './RetailModuleGate'

export function ShiftDashboardPage() {
  const queryClient = useQueryClient()
  const [storeId, setStoreId] = useState('')
  const [counterId, setCounterId] = useState('')
  const [cashierId, setCashierId] = useState('')
  const [terminalId, setTerminalId] = useState('')
  const [openingFloat, setOpeningFloat] = useState('0')
  const [closingCash, setClosingCash] = useState('')
  const [closingId, setClosingId] = useState<string | null>(null)

  const stores = useQuery({ queryKey: ['retail', 'stores'], queryFn: () => retailApi.stores.list() })
  const counters = useQuery({
    queryKey: ['retail', 'counters', storeId],
    queryFn: () => retailApi.counters.list(storeId),
    enabled: !!storeId,
  })
  const terminals = useQuery({
    queryKey: ['retail', 'terminals', storeId],
    queryFn: () => retailApi.terminals.list(storeId),
    enabled: !!storeId,
  })
  const cashiers = useQuery({
    queryKey: ['retail', 'cashiers', storeId],
    queryFn: () => retailApi.cashiers.list(storeId),
    enabled: !!storeId,
  })
  const shifts = useQuery({
    queryKey: ['retail', 'shifts', storeId || 'all'],
    queryFn: () => retailApi.shifts.list(storeId || undefined),
  })

  const openShifts = useMemo(() => (shifts.data ?? []).filter((s) => s.status === 'OPEN'), [shifts.data])

  const openShift = async () => {
    if (!storeId || !counterId || !cashierId) return toast.error('Store, counter, and cashier are required')
    try {
      await retailApi.shifts.open({
        storeId,
        counterId,
        cashierId,
        terminalId: terminalId || null,
        openingFloat: Number(openingFloat) || 0,
      })
      await queryClient.invalidateQueries({ queryKey: ['retail', 'shifts'] })
      toast.success('Shift opened')
      setOpeningFloat('0')
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }

  const closeShift = async () => {
    if (!closingId) return
    if (closingCash === '' || Number.isNaN(Number(closingCash))) return toast.error('Enter closing cash')
    try {
      await retailApi.shifts.close(closingId, { closingCash: Number(closingCash) })
      await queryClient.invalidateQueries({ queryKey: ['retail', 'shifts'] })
      toast.success('Shift closed')
      setClosingId(null)
      setClosingCash('')
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }

  return (
    <RetailModuleGate title="Shifts">
      <PageShell>
        <PageHeader title="Shift dashboard" subtitle="Open and close cashier shifts for each store." />
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardContent className="space-y-4 p-5">
              <h2 className="text-sm font-semibold text-slate-900">Open shift</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Store</Label>
                  <Select
                    value={storeId}
                    onValueChange={(value) => {
                      setStoreId(value)
                      setCounterId('')
                      setCashierId('')
                      setTerminalId('')
                    }}
                  >
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
                  <Label>Counter</Label>
                  <Select value={counterId} onValueChange={setCounterId}>
                    <SelectTrigger>
                      {counters.data?.find((c) => c.id === counterId)?.name ?? 'Select counter'}
                    </SelectTrigger>
                    <SelectContent>
                      {(counters.data ?? []).map((counter) => (
                        <SelectItem key={counter.id} value={counter.id}>
                          {counter.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Cashier</Label>
                  <Select value={cashierId} onValueChange={setCashierId}>
                    <SelectTrigger>
                      {cashiers.data?.find((c) => c.id === cashierId)?.displayName ?? 'Select cashier'}
                    </SelectTrigger>
                    <SelectContent>
                      {(cashiers.data ?? []).map((cashier) => (
                        <SelectItem key={cashier.id} value={cashier.id}>
                          {cashier.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Terminal (optional)</Label>
                  <Select
                    value={terminalId || '__none__'}
                    onValueChange={(value) => setTerminalId(value === '__none__' ? '' : value)}
                  >
                    <SelectTrigger>
                      {terminals.data?.find((t) => t.id === terminalId)?.name ?? 'Optional'}
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {(terminals.data ?? []).map((terminal) => (
                        <SelectItem key={terminal.id} value={terminal.id}>
                          {terminal.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Opening float</Label>
                  <Input
                    type="number"
                    value={openingFloat}
                    onChange={(e) => setOpeningFloat(e.target.value)}
                    min={0}
                    step="0.01"
                  />
                </div>
              </div>
              <Button onClick={() => void openShift()}>Open shift</Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-5">
              <h2 className="text-sm font-semibold text-slate-900">Close shift</h2>
              {openShifts.length === 0 ? (
                <p className="text-sm text-slate-500">No open shifts.</p>
              ) : (
                <div className="space-y-3">
                  <Select value={closingId ?? ''} onValueChange={setClosingId}>
                    <SelectTrigger>
                      {openShifts.find((s) => s.id === closingId)?.id.slice(0, 8) ?? 'Select open shift'}
                    </SelectTrigger>
                    <SelectContent>
                      {openShifts.map((shift) => (
                        <SelectItem key={shift.id} value={shift.id}>
                          {shift.id.slice(0, 8)}… · float {shift.openingFloat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="space-y-1.5">
                    <Label>Closing cash</Label>
                    <Input
                      type="number"
                      value={closingCash}
                      onChange={(e) => setClosingCash(e.target.value)}
                      min={0}
                      step="0.01"
                    />
                  </div>
                  <Button variant="outline" onClick={() => void closeShift()} disabled={!closingId}>
                    Close shift
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <thead>
                <tr className="border-b">
                  <th className="p-3 text-xs text-slate-500">Opened</th>
                  <th className="p-3 text-xs text-slate-500">Status</th>
                  <th className="p-3 text-xs text-slate-500">Float</th>
                  <th className="p-3 text-xs text-slate-500">Closing</th>
                  <th className="p-3 text-xs text-slate-500">Variance</th>
                </tr>
              </thead>
              <tbody>
                {(shifts.data ?? []).map((shift) => (
                  <tr key={shift.id} className="border-b">
                    <td className="p-3 text-sm">{new Date(shift.openedAt).toLocaleString()}</td>
                    <td className="p-3">
                      <Badge>{shift.status}</Badge>
                    </td>
                    <td className="p-3">{shift.openingFloat}</td>
                    <td className="p-3">{shift.closingCash ?? '—'}</td>
                    <td className="p-3">{shift.variance ?? '—'}</td>
                  </tr>
                ))}
                {!shifts.data?.length && (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-sm text-slate-500">
                      No shifts yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </CardContent>
        </Card>
      </PageShell>
    </RetailModuleGate>
  )
}
