import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CreditCard, Search, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'
import { Button, Card, CardContent, Input, Label, Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui'
import { organizationApi, productApi, retailApi } from '@/services/api'
import type { PosSale, RetailPaymentMode } from '@/types/api'
import { useAuth } from '@/features/auth/auth'

const TENDERS: RetailPaymentMode[] = ['CASH', 'CARD', 'UPI']

export function PosPage() {
  const { canManageOrganization } = useAuth()
  const queryClient = useQueryClient()
  const searchRef = useRef<HTMLInputElement>(null)
  const [storeId, setStoreId] = useState(() => localStorage.getItem('retail.pos.storeId') ?? '')
  const [shiftId, setShiftId] = useState(() => localStorage.getItem('retail.pos.shiftId') ?? '')
  const [counterId, setCounterId] = useState(() => localStorage.getItem('retail.pos.counterId') ?? '')
  const [cashierId, setCashierId] = useState(() => localStorage.getItem('retail.pos.cashierId') ?? '')
  const [sale, setSale] = useState<PosSale | null>(null)
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [tender, setTender] = useState<RetailPaymentMode>('CASH')
  const [tenderAmount, setTenderAmount] = useState('')
  const [tenderRef, setTenderRef] = useState('')

  const settings = useQuery({
    queryKey: ['organization', 'ops-settings'],
    queryFn: organizationApi.settings,
  })
  const stores = useQuery({
    queryKey: ['retail', 'stores'],
    queryFn: () => retailApi.stores.list(),
    enabled: settings.data?.retailEnabled !== false,
  })
  const shifts = useQuery({
    queryKey: ['retail', 'shifts', storeId],
    queryFn: () => retailApi.shifts.list(storeId),
    enabled: !!storeId && settings.data?.retailEnabled !== false,
  })
  const counters = useQuery({
    queryKey: ['retail', 'counters', storeId],
    queryFn: () => retailApi.counters.list(storeId),
    enabled: !!storeId,
  })
  const cashiers = useQuery({
    queryKey: ['retail', 'cashiers', storeId],
    queryFn: () => retailApi.cashiers.list(storeId),
    enabled: !!storeId,
  })
  const productSearch = useQuery({
    queryKey: ['products', 'pos-search', query],
    queryFn: () => productApi.list({ search: query, active: true, size: 12 }),
    enabled: query.trim().length >= 2 && !/^\d{6,}$/.test(query.trim()),
  })

  const openShifts = useMemo(
    () => (shifts.data ?? []).filter((s) => s.status === 'OPEN'),
    [shifts.data],
  )

  useEffect(() => {
    localStorage.setItem('retail.pos.storeId', storeId)
    localStorage.setItem('retail.pos.shiftId', shiftId)
    localStorage.setItem('retail.pos.counterId', counterId)
    localStorage.setItem('retail.pos.cashierId', cashierId)
  }, [storeId, shiftId, counterId, cashierId])

  const ensureDraft = useCallback(async () => {
    if (sale && (sale.status === 'DRAFT' || sale.status === 'HELD')) return sale
    if (!storeId) throw new Error('Select a store first')
    const draft = await retailApi.pos.createDraft({
      storeId,
      shiftId: shiftId || null,
      counterId: counterId || null,
      cashierId: cashierId || null,
    })
    setSale(draft)
    return draft
  }, [sale, storeId, shiftId, counterId, cashierId])

  const addProduct = useCallback(
    async (opts: { productId: string; variantId?: string | null; name: string; barcode?: string | null; rate: number }) => {
      setBusy(true)
      try {
        const draft = await ensureDraft()
        const next = await retailApi.pos.addLine(draft.id, {
          productId: opts.productId,
          variantId: opts.variantId ?? null,
          description: opts.name,
          barcode: opts.barcode ?? undefined,
          quantity: 1,
          rate: opts.rate,
        })
        setSale(next)
        setQuery('')
        searchRef.current?.focus()
      } catch (error) {
        toast.error(getApiErrorMessage(error))
      } finally {
        setBusy(false)
      }
    },
    [ensureDraft],
  )

  const lookupAndAdd = useCallback(
    async (raw: string) => {
      const code = raw.trim()
      if (!code) return
      setBusy(true)
      try {
        const product = await retailApi.pos.lookupProduct(
          /^\d{4,}$/.test(code) ? { barcode: code } : { q: code },
        )
        await addProduct({
          productId: product.productId,
          variantId: product.variantId,
          name: product.name,
          barcode: product.barcode,
          rate: Number(product.sellingPrice ?? 0),
        })
      } catch (error) {
        toast.error(getApiErrorMessage(error, 'Product not found'))
      } finally {
        setBusy(false)
      }
    },
    [addProduct],
  )

  const removeLine = async (lineId: string) => {
    if (!sale) return
    setBusy(true)
    try {
      const next = await retailApi.pos.removeLine(sale.id, lineId)
      setSale(next)
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const voidSale = async () => {
    if (!sale) return
    if (!window.confirm('Void this sale?')) return
    setBusy(true)
    try {
      await retailApi.pos.void(sale.id)
      setSale(null)
      toast.success('Sale voided')
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const holdSale = async () => {
    if (!sale) return
    setBusy(true)
    try {
      const next = await retailApi.pos.hold(sale.id, `Hold ${new Date().toLocaleTimeString()}`)
      setSale(next)
      toast.success('Sale held')
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const openPay = useCallback(() => {
    if (!sale?.lines?.length) return toast.error('Add items first')
    setTenderAmount(String(sale.grandTotal ?? 0))
    setTender('CASH')
    setTenderRef('')
    setPayOpen(true)
  }, [sale])

  const checkout = async () => {
    if (!sale) return
    const amount = Number(tenderAmount)
    if (!amount || amount <= 0) return toast.error('Enter tender amount')
    setBusy(true)
    try {
      const completed = await retailApi.pos.checkout(sale.id, {
        payments: [{ paymentMode: tender, amount, reference: tenderRef || undefined }],
      })
      setSale(null)
      setPayOpen(false)
      toast.success(`Sale completed${completed.billNumber ? ` · ${completed.billNumber}` : ''}`)
      await queryClient.invalidateQueries({ queryKey: ['retail'] })
      searchRef.current?.focus()
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'F2') {
        event.preventDefault()
        searchRef.current?.focus()
        searchRef.current?.select()
      }
      if (event.key === 'F12') {
        event.preventDefault()
        openPay()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openPay])

  if (settings.isLoading) {
    return (
      <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950 text-slate-300">Loading POS…</div>
    )
  }

  if (settings.data?.retailEnabled === false) {
    return (
      <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-4 bg-slate-950 px-6 text-center text-white">
        <p className="text-xl font-semibold">Retail module is disabled</p>
        <p className="max-w-md text-sm text-slate-400">Enable Retail in organization settings to use the POS.</p>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/">Back</Link>
          </Button>
          {canManageOrganization() ? (
            <Button asChild>
              <Link to="/settings/organization">Settings</Link>
            </Button>
          ) : null}
        </div>
      </div>
    )
  }

  const lines = sale?.lines ?? []
  const total = Number(sale?.grandTotal ?? 0)

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-slate-950 text-slate-100">
      <header className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-slate-900/90 px-3 py-2 sm:px-4">
        <Button variant="ghost" size="sm" className="text-slate-300 hover:bg-white/10 hover:text-white" asChild>
          <Link to="/retail/stores">
            <ArrowLeft className="size-4" />
            Exit
          </Link>
        </Button>
        <div className="font-display text-lg font-semibold tracking-tight text-white">
          POS
          <span className="ml-2 text-xs font-normal text-teal-300">F2 search · F12 pay</span>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Select
            value={storeId}
            onValueChange={(value) => {
              setStoreId(value)
              setShiftId('')
              setCounterId('')
              setCashierId('')
              setSale(null)
            }}
          >
            <SelectTrigger className="h-9 w-[10rem] border-white/15 bg-white/5 text-white sm:w-[12rem]">
              {stores.data?.find((s) => s.id === storeId)?.name ?? 'Store'}
            </SelectTrigger>
            <SelectContent>
              {(stores.data ?? []).map((store) => (
                <SelectItem key={store.id} value={store.id}>
                  {store.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={shiftId || '__none__'} onValueChange={(value) => setShiftId(value === '__none__' ? '' : value)}>
            <SelectTrigger className="h-9 w-[9rem] border-white/15 bg-white/5 text-white sm:w-[11rem]">
              {shiftId ? `Shift ${shiftId.slice(0, 6)}` : 'Shift'}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">No shift</SelectItem>
              {openShifts.map((shift) => (
                <SelectItem key={shift.id} value={shift.id}>
                  Open · {new Date(shift.openedAt).toLocaleTimeString()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={counterId || '__none__'}
            onValueChange={(value) => setCounterId(value === '__none__' ? '' : value)}
          >
            <SelectTrigger className="hidden h-9 w-[9rem] border-white/15 bg-white/5 text-white sm:flex">
              {counters.data?.find((c) => c.id === counterId)?.name ?? 'Counter'}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">No counter</SelectItem>
              {(counters.data ?? []).map((counter) => (
                <SelectItem key={counter.id} value={counter.id}>
                  {counter.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={cashierId || '__none__'}
            onValueChange={(value) => setCashierId(value === '__none__' ? '' : value)}
          >
            <SelectTrigger className="hidden h-9 w-[9rem] border-white/15 bg-white/5 text-white md:flex">
              {cashiers.data?.find((c) => c.id === cashierId)?.displayName ?? 'Cashier'}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">No cashier</SelectItem>
              {(cashiers.data ?? []).map((cashier) => (
                <SelectItem key={cashier.id} value={cashier.id}>
                  {cashier.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="flex min-h-0 flex-col border-b border-white/10 lg:border-b-0 lg:border-r">
          <form
            className="flex gap-2 border-b border-white/10 p-3 sm:p-4"
            onSubmit={(event) => {
              event.preventDefault()
              void lookupAndAdd(query)
            }}
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
              <Input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Scan barcode or search product (F2)"
                className="h-12 border-white/15 bg-white/5 pl-10 text-base text-white placeholder:text-slate-500"
                autoFocus
                disabled={busy || !storeId}
              />
            </div>
            <Button type="submit" className="h-12 px-5" disabled={busy || !storeId || !query.trim()}>
              Add
            </Button>
          </form>

          {productSearch.data?.length ? (
            <div className="max-h-40 overflow-auto border-b border-white/10 bg-slate-900/60 p-2 sm:max-h-48">
              {productSearch.data.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-white/5"
                  onClick={() =>
                    void addProduct({
                      productId: product.id,
                      name: product.name,
                      rate: Number(product.sellingPrice ?? 0),
                    })
                  }
                >
                  <span>{product.name}</span>
                  <span className="font-mono text-teal-300">{Number(product.sellingPrice ?? 0).toFixed(2)}</span>
                </button>
              ))}
            </div>
          ) : null}

          <div className="min-h-0 flex-1 overflow-auto p-3 sm:p-4">
            {!lines.length ? (
              <div className="grid h-full place-items-center text-center text-slate-500">
                <div>
                  <p className="text-lg font-medium text-slate-300">Cart is empty</p>
                  <p className="mt-1 text-sm">Scan a barcode or search to add items.</p>
                </div>
              </div>
            ) : (
              <ul className="space-y-2">
                {lines.map((line) => (
                  <li
                    key={line.id}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-white">{line.description ?? 'Item'}</p>
                      <p className="text-xs text-slate-400">
                        {line.quantity} × {Number(line.rate).toFixed(2)}
                        {line.barcode ? ` · ${line.barcode}` : ''}
                      </p>
                    </div>
                    <p className="font-mono text-sm text-teal-300">{Number(line.lineTotal).toFixed(2)}</p>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="shrink-0 text-slate-400 hover:bg-rose-500/20 hover:text-rose-300"
                      onClick={() => void removeLine(line.id)}
                      disabled={busy}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <aside className="flex flex-col gap-3 bg-slate-900/50 p-3 sm:p-4">
          <Card className="border-white/10 bg-slate-900 text-white shadow-none">
            <CardContent className="space-y-3 p-4">
              <div className="flex justify-between text-sm text-slate-400">
                <span>Subtotal</span>
                <span className="font-mono text-slate-200">{Number(sale?.subtotal ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-400">
                <span>Tax</span>
                <span className="font-mono text-slate-200">{Number(sale?.taxTotal ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-400">
                <span>Discount</span>
                <span className="font-mono text-slate-200">{Number(sale?.discountTotal ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex items-end justify-between border-t border-white/10 pt-3">
                <span className="text-sm font-medium text-slate-300">Total</span>
                <span className="font-display text-3xl font-semibold text-teal-300">{total.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          <div className="mt-auto grid gap-2 sm:grid-cols-2">
            <Button variant="outline" className="border-white/20 bg-transparent text-white" onClick={() => void holdSale()} disabled={!sale || busy}>
              Hold
            </Button>
            <Button variant="outline" className="border-rose-500/40 bg-transparent text-rose-300" onClick={() => void voidSale()} disabled={!sale || busy}>
              Void
            </Button>
            <Button className="h-12 sm:col-span-2" onClick={openPay} disabled={!lines.length || busy}>
              <CreditCard className="size-4" />
              Pay (F12)
            </Button>
          </div>
        </aside>
      </div>

      {payOpen ? (
        <div className="absolute inset-0 z-10 flex items-end justify-center bg-black/60 p-3 sm:items-center">
          <Card className="w-full max-w-md border-slate-200 bg-white shadow-2xl">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Checkout</h2>
                <Button size="icon" variant="ghost" onClick={() => setPayOpen(false)}>
                  <X className="size-4" />
                </Button>
              </div>
              <p className="text-sm text-slate-500">
                Amount due <span className="font-semibold text-slate-900">{total.toFixed(2)}</span>
              </p>
              <div className="grid grid-cols-3 gap-2">
                {TENDERS.map((mode) => (
                  <Button
                    key={mode}
                    type="button"
                    variant={tender === mode ? 'default' : 'outline'}
                    onClick={() => setTender(mode)}
                  >
                    {mode}
                  </Button>
                ))}
              </div>
              <div className="space-y-1.5">
                <Label>Amount</Label>
                <Input type="number" value={tenderAmount} onChange={(e) => setTenderAmount(e.target.value)} step="0.01" />
              </div>
              {tender !== 'CASH' ? (
                <div className="space-y-1.5">
                  <Label>Reference</Label>
                  <Input value={tenderRef} onChange={(e) => setTenderRef(e.target.value)} placeholder="Txn / UPI ref" />
                </div>
              ) : null}
              <Button className="h-11 w-full" onClick={() => void checkout()} disabled={busy}>
                Complete sale
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  )
}
