import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle2, CreditCard, Pause, Search, Trash2, UserPlus, X } from 'lucide-react'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'
import { Button, Card, CardContent, Input, Label } from '@/components/ui'
import { cn } from '@/lib/utils'
import { organizationApi, productApi, retailApi, customerApi } from '@/services/api'
import type { PosSale, RetailPaymentMode } from '@/types/api'
import { useAuth } from '@/features/auth/auth'
import { useCapabilities } from '@/platform'
import { PosReceiptActions } from './PosReceipt'

const TENDERS: RetailPaymentMode[] = ['CASH', 'CARD', 'UPI']
const DISCOUNT_PRESETS = [5, 10, 15, 20]

const selectClass =
  'h-9 max-w-[12rem] cursor-pointer rounded-lg border border-white/15 bg-slate-900 px-2 text-sm text-white outline-none focus:border-teal-500/50'

export function PosPage() {
  const { canManageOrganization, organization } = useAuth()
  const queryClient = useQueryClient()
  const searchRef = useRef<HTMLInputElement>(null)
  const [storeId, setStoreId] = useState(() => localStorage.getItem('retail.pos.storeId') ?? '')
  const [shiftId, setShiftId] = useState(() => localStorage.getItem('retail.pos.shiftId') ?? '')
  const [counterId, setCounterId] = useState(() => localStorage.getItem('retail.pos.counterId') ?? '')
  const [cashierId, setCashierId] = useState(() => localStorage.getItem('retail.pos.cashierId') ?? '')
  const [lastError, setLastError] = useState<string | null>(null)
  const [sale, setSale] = useState<PosSale | null>(null)
  const [lastCompleted, setLastCompleted] = useState<PosSale | null>(null)
  const [lastCompletedCustomer, setLastCompletedCustomer] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [heldOpen, setHeldOpen] = useState(false)
  const [customerOpen, setCustomerOpen] = useState(false)
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null)
  const [lineDiscount, setLineDiscount] = useState('')
  const [billDiscPct, setBillDiscPct] = useState('')
  const [billDiscAmt, setBillDiscAmt] = useState('')
  const [couponCode, setCouponCode] = useState('')
  const [customerQuery, setCustomerQuery] = useState('')
  const [loyaltyRedeem, setLoyaltyRedeem] = useState('')
  const [newCustomerOpen, setNewCustomerOpen] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')
  const [newCustomerEmail, setNewCustomerEmail] = useState('')
  const [tender, setTender] = useState<RetailPaymentMode>('CASH')
  const [tenderAmount, setTenderAmount] = useState('')
  const [tenderRef, setTenderRef] = useState('')

  const capabilities = useCapabilities()
  const settings = useQuery({
    queryKey: ['organization', 'ops-settings'],
    queryFn: organizationApi.settings,
  })

  const retailOn =
    capabilities.data?.modules?.RETAIL === true ||
    settings.data?.retailEnabled === true ||
    // Optimistic: allow POS to load stores while flags resolve (avoid empty shell)
    (capabilities.isLoading && settings.isLoading)

  const stores = useQuery({
    queryKey: ['retail', 'stores'],
    queryFn: () => retailApi.stores.list(),
    enabled: retailOn || settings.data?.retailEnabled !== false,
    retry: 2,
  })
  const shifts = useQuery({
    queryKey: ['retail', 'shifts', storeId],
    queryFn: () => retailApi.shifts.list(storeId),
    enabled: !!storeId,
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
  const catalog = useQuery({
    queryKey: ['products', 'pos-catalog'],
    queryFn: () => productApi.list({ active: true, size: 48 }),
    staleTime: 60_000,
  })
  const heldSales = useQuery({
    queryKey: ['retail', 'pos', 'held', storeId],
    queryFn: () => retailApi.pos.listSales('HELD'),
    enabled: !!storeId,
    refetchInterval: heldOpen ? 8_000 : false,
  })
  const customers = useQuery({
    queryKey: ['customers', 'pos', customerQuery],
    queryFn: () => customerApi.list({ search: customerQuery.trim() || undefined, size: 8 }),
    enabled: customerQuery.trim().length >= 2 || /^\d{3,}$/.test(customerQuery.trim().replace(/\D/g, '')),
  })
  const loyalty = useQuery({
    queryKey: ['retail', 'loyalty', sale?.customerId],
    queryFn: () => retailApi.loyalty.getOrCreateAccount({ customerId: sale!.customerId! }),
    enabled: !!sale?.customerId,
  })
  const selectedCustomer = useQuery({
    queryKey: ['customers', 'pos-selected', sale?.customerId],
    queryFn: () => customerApi.get(sale!.customerId!),
    enabled: !!sale?.customerId,
  })

  const openShifts = useMemo(() => (shifts.data ?? []).filter((s) => s.status === 'OPEN'), [shifts.data])

  const storeList = stores.data ?? []
  const selectedStore = storeList.find((s) => s.id === storeId)

  // Bootstrap session context from API (ignore stale localStorage ids).
  useEffect(() => {
    if (!storeList.length) return
    if (!storeId || !storeList.some((s) => s.id === storeId)) {
      setStoreId(storeList[0].id)
      setShiftId('')
      setCounterId('')
      setCashierId('')
    }
  }, [storeList, storeId])

  useEffect(() => {
    if (!storeId) return
    if (openShifts.length) {
      if (!shiftId || !openShifts.some((s) => s.id === shiftId)) setShiftId(openShifts[0].id)
    } else if (shiftId) {
      setShiftId('')
    }
    const counterList = counters.data ?? []
    if (counterList.length) {
      if (!counterId || !counterList.some((c) => c.id === counterId)) setCounterId(counterList[0].id)
    }
    const cashierList = cashiers.data ?? []
    if (cashierList.length) {
      if (!cashierId || !cashierList.some((c) => c.id === cashierId)) setCashierId(cashierList[0].id)
    }
  }, [storeId, openShifts, shiftId, counters.data, counterId, cashiers.data, cashierId])

  useEffect(() => {
    localStorage.setItem('retail.pos.storeId', storeId)
    localStorage.setItem('retail.pos.shiftId', shiftId)
    localStorage.setItem('retail.pos.counterId', counterId)
    localStorage.setItem('retail.pos.cashierId', cashierId)
  }, [storeId, shiftId, counterId, cashierId])

  const ensureDraft = useCallback(async () => {
    if (sale && sale.status === 'DRAFT') return sale
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
    async (opts: {
      productId: string
      variantId?: string | null
      name: string
      barcode?: string | null
      rate: number
    }) => {
      if (!storeId) {
        const msg = 'Waiting for store… pick a store in the header'
        setLastError(msg)
        toast.error(msg)
        return
      }
      setBusy(true)
      setLastError(null)
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
        const msg = getApiErrorMessage(error)
        setLastError(msg)
        toast.error(msg)
      } finally {
        setBusy(false)
      }
    },
    [ensureDraft, storeId],
  )

  const lookupAndAdd = useCallback(
    async (raw: string) => {
      const code = raw.trim()
      if (!code) return
      if (!storeId) {
        const msg = 'Waiting for store… pick a store in the header'
        setLastError(msg)
        toast.error(msg)
        return
      }

      const pool = [...(productSearch.data ?? []), ...(catalog.data ?? [])]
      const typedHit =
        pool.find((p) => p.name.toLowerCase() === code.toLowerCase() || p.sku?.toLowerCase() === code.toLowerCase()) ??
        pool.find(
          (p) =>
            p.barcode === code ||
            p.name.toLowerCase().includes(code.toLowerCase()) ||
            (p.sku?.toLowerCase().includes(code.toLowerCase()) ?? false),
        )
      if (typedHit) {
        await addProduct({
          productId: typedHit.id,
          name: typedHit.name,
          barcode: typedHit.barcode,
          rate: Number(typedHit.sellingPrice ?? 0),
        })
        return
      }

      setBusy(true)
      setLastError(null)
      try {
        const product = await retailApi.pos.lookupProduct(/^\d{4,}$/.test(code) ? { barcode: code } : { q: code })
        const draft = await ensureDraft()
        const next = await retailApi.pos.addLine(draft.id, {
          productId: product.productId,
          variantId: product.variantId,
          description: product.name,
          barcode: product.barcode ?? undefined,
          quantity: 1,
          rate: Number(product.sellingPrice ?? 0),
        })
        setSale(next)
        setQuery('')
        searchRef.current?.focus()
      } catch (error) {
        // Fallback: local catalog filter if lookup endpoint is stale
        const fallback = (catalog.data ?? []).find(
          (p) =>
            p.barcode === code ||
            p.name.toLowerCase().includes(code.toLowerCase()) ||
            p.sku.toLowerCase().includes(code.toLowerCase()),
        )
        if (fallback) {
          setBusy(false)
          await addProduct({
            productId: fallback.id,
            name: fallback.name,
            barcode: fallback.barcode,
            rate: Number(fallback.sellingPrice ?? 0),
          })
          return
        }
        const msg = getApiErrorMessage(error, 'Product not found')
        setLastError(msg)
        toast.error(msg)
      } finally {
        setBusy(false)
      }
    },
    [addProduct, catalog.data, ensureDraft, productSearch.data, storeId],
  )

  const removeLine = async (lineId: string) => {
    if (!sale) return
    setBusy(true)
    try {
      const next = await retailApi.pos.removeLine(sale.id, lineId)
      setSale(next)
      if (selectedLineId === lineId) setSelectedLineId(null)
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const selectLine = (lineId: string) => {
    const line = sale?.lines?.find((l) => l.id === lineId)
    setSelectedLineId(lineId)
    setLineDiscount(String(Number(line?.discountPercent ?? 0)))
  }

  const applyLineDiscount = async (percent?: number) => {
    if (!sale || !selectedLineId) return toast.error('Select a cart line first')
    const value = percent ?? Number(lineDiscount)
    if (Number.isNaN(value) || value < 0 || value > 100) return toast.error('Line discount must be 0–100%')
    setBusy(true)
    try {
      const next = await retailApi.pos.updateLine(sale.id, selectedLineId, { discountPercent: value })
      setSale(next)
      setLineDiscount(String(value))
      toast.success(`Line discount ${value}% applied`)
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const bumpQty = async (lineId: string, delta: number) => {
    if (!sale) return
    const line = sale.lines.find((l) => l.id === lineId)
    if (!line) return
    const nextQty = Number(line.quantity) + delta
    if (nextQty <= 0) {
      await removeLine(lineId)
      return
    }
    setBusy(true)
    try {
      const next = await retailApi.pos.updateLine(sale.id, lineId, { quantity: nextQty })
      setSale(next)
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const applyBillAdjustments = async (patch: {
    customerId?: string | null
    clearCustomer?: boolean
    billDiscountPercent?: number
    billDiscountAmount?: number
    loyaltyPointsRedeemed?: number
    couponCode?: string | null
  }) => {
    if (!sale) {
      toast.error('Add items first')
      return
    }
    setBusy(true)
    try {
      const next = await retailApi.pos.applyAdjustments(sale.id, patch)
      setSale(next)
      if (patch.billDiscountPercent != null) setBillDiscPct(String(patch.billDiscountPercent))
      if (patch.billDiscountAmount != null) setBillDiscAmt(String(patch.billDiscountAmount))
      if (patch.loyaltyPointsRedeemed != null) setLoyaltyRedeem(String(patch.loyaltyPointsRedeemed))
      if (patch.couponCode !== undefined) setCouponCode(patch.couponCode ?? '')
      await queryClient.invalidateQueries({ queryKey: ['retail', 'loyalty'] })
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const openNewCustomer = () => {
    const q = customerQuery.trim()
    const digits = q.replace(/\D/g, '')
    const looksPhone = digits.length >= 8 && digits.length >= q.replace(/\s+/g, '').length * 0.7
    setNewCustomerPhone(looksPhone ? digits : '')
    setNewCustomerName(looksPhone ? '' : q)
    setNewCustomerEmail('')
    setNewCustomerOpen(true)
  }

  const createCustomer = async () => {
    const name = newCustomerName.trim()
    const phone = newCustomerPhone.trim().replace(/\s+/g, '')
    if (!name) return toast.error('Customer name is required')
    if (!storeId) return toast.error('Select a store first')
    setBusy(true)
    try {
      const draft = await ensureDraft()
      const created = await customerApi.create({
        customerName: name,
        phone: phone || undefined,
        email: newCustomerEmail.trim() || undefined,
      })
      const next = await retailApi.pos.applyAdjustments(draft.id, { customerId: created.id })
      setSale(next)
      setCustomerQuery(created.customerName)
      setNewCustomerOpen(false)
      await queryClient.invalidateQueries({ queryKey: ['customers'] })
      await queryClient.invalidateQueries({ queryKey: ['retail', 'loyalty'] })
      toast.success(`Customer ${created.customerName} added`)
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

  useEffect(() => {
    if (!sale) {
      setBillDiscPct('')
      setBillDiscAmt('')
      setLoyaltyRedeem('')
      setCouponCode('')
      setSelectedLineId(null)
      return
    }
    setBillDiscPct(String(Number(sale.billDiscountPercent ?? 0)))
    setBillDiscAmt(String(Number(sale.billDiscountAmount ?? 0)))
    setLoyaltyRedeem(String(Number(sale.loyaltyPointsRedeemed ?? 0)))
    setCouponCode(sale.couponCode ?? '')
  }, [sale?.id, sale?.billDiscountPercent, sale?.billDiscountAmount, sale?.loyaltyPointsRedeemed, sale?.couponCode])

  const holdSale = async () => {
    if (!sale?.lines?.length) return toast.error('Add items before holding')
    setBusy(true)
    try {
      await retailApi.pos.hold(sale.id, `Hold ${new Date().toLocaleTimeString()}`)
      setSale(null)
      await queryClient.invalidateQueries({ queryKey: ['retail', 'pos', 'held'] })
      toast.success('Sale held — start a new cart or resume later')
      searchRef.current?.focus()
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const resumeHeldSale = async (heldId: string) => {
    setBusy(true)
    try {
      // Park the current cart first so it isn't lost when switching.
      if (sale?.status === 'DRAFT' && sale.lines?.length && sale.id !== heldId) {
        await retailApi.pos.hold(sale.id, `Hold ${new Date().toLocaleTimeString()}`)
      }
      const resumed = await retailApi.pos.resume(heldId)
      setSale(resumed)
      setHeldOpen(false)
      await queryClient.invalidateQueries({ queryKey: ['retail', 'pos', 'held'] })
      toast.success(resumed.heldLabel ? `Resumed · ${resumed.heldLabel}` : 'Held sale resumed')
      searchRef.current?.focus()
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
      const customerLabel = selectedCustomer.data?.customerName ?? null
      const completed = await retailApi.pos.checkout(sale.id, {
        customerId: sale.customerId,
        payments: [{ paymentMode: tender, amount, reference: tenderRef || undefined }],
      })
      setSale(null)
      setPayOpen(false)
      setLastCompleted(completed)
      setLastCompletedCustomer(customerLabel)
      setCustomerQuery('')
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

  const heldForStore = useMemo(
    () => (heldSales.data ?? []).filter((s) => s.storeId === storeId && s.id !== sale?.id),
    [heldSales.data, sale?.id, storeId],
  )

  if (settings.isLoading && capabilities.isLoading) {
    return <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950 text-slate-300">Loading POS…</div>
  }

  if (
    !capabilities.isLoading &&
    capabilities.data?.modules?.RETAIL !== true &&
    settings.data?.retailEnabled === false
  ) {
    return (
      <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-4 bg-slate-950 px-6 text-center text-white">
        <p className="text-xl font-semibold">Retail module is disabled</p>
        <p className="max-w-md text-sm text-slate-400">Enable Retail in Platform Settings to use the POS.</p>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/">Back</Link>
          </Button>
          {canManageOrganization() ? (
            <Button asChild>
              <Link to="/settings/platform">Platform Settings</Link>
            </Button>
          ) : null}
        </div>
      </div>
    )
  }

  const lines = sale?.lines ?? []
  const total = Number(sale?.grandTotal ?? 0)
  const ready = !!selectedStore

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
          <select
            aria-label="Store"
            className={selectClass}
            value={storeId}
            disabled={stores.isLoading || !storeList.length}
            onChange={(event) => {
              setStoreId(event.target.value)
              setShiftId('')
              setCounterId('')
              setCashierId('')
              setSale(null)
            }}
          >
            {!storeList.length ? <option value="">No stores</option> : null}
            {storeList.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Shift"
            className={selectClass}
            value={shiftId}
            disabled={!storeId}
            onChange={(event) => setShiftId(event.target.value)}
          >
            <option value="">No shift</option>
            {openShifts.map((shift) => (
              <option key={shift.id} value={shift.id}>
                Open · {new Date(shift.openedAt).toLocaleTimeString()}
              </option>
            ))}
          </select>
          <select
            aria-label="Counter"
            className={cn(selectClass, 'hidden sm:inline-block')}
            value={counterId}
            disabled={!storeId}
            onChange={(event) => setCounterId(event.target.value)}
          >
            <option value="">No counter</option>
            {(counters.data ?? []).map((counter) => (
              <option key={counter.id} value={counter.id}>
                {counter.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Cashier"
            className={cn(selectClass, 'hidden md:inline-block')}
            value={cashierId}
            disabled={!storeId}
            onChange={(event) => setCashierId(event.target.value)}
          >
            <option value="">No cashier</option>
            {(cashiers.data ?? []).map((cashier) => (
              <option key={cashier.id} value={cashier.id}>
                {cashier.displayName}
              </option>
            ))}
          </select>
        </div>
      </header>

      {stores.isError ? (
        <div className="border-b border-rose-500/40 bg-rose-950/50 px-4 py-2 text-sm text-rose-200">
          Could not load stores: {getApiErrorMessage(stores.error)}.{' '}
          <button type="button" className="underline" onClick={() => void stores.refetch()}>
            Retry
          </button>
        </div>
      ) : null}
      {!stores.isLoading && !storeList.length ? (
        <div className="border-b border-amber-500/40 bg-amber-950/40 px-4 py-2 text-sm text-amber-100">
          No retail stores found. Create one under Retail → Stores, then reopen POS.
        </div>
      ) : null}
      {ready ? (
        <div className="border-b border-teal-500/20 bg-teal-950/30 px-4 py-1.5 text-xs text-teal-200/90">
          Ready · {selectedStore?.name}
          {shiftId ? ' · shift open' : ' · no shift'}
          {' · try barcode '}
          <span className="font-mono">8901001000001</span>
          {' or search “Laptop”'}
        </div>
      ) : null}

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
                placeholder={ready ? 'Scan barcode or search product (F2)' : 'Waiting for store…'}
                className="h-12 border-white/15 bg-white/5 pl-10 text-base text-white placeholder:text-slate-500"
                autoFocus
                disabled={busy || !ready}
              />
            </div>
            <Button type="submit" className="h-12 px-5" disabled={busy || !ready || !query.trim()}>
              Add
            </Button>
          </form>

          {lastError ? (
            <div className="border-b border-rose-500/40 bg-rose-950/50 px-4 py-2 text-sm text-rose-100">
              {lastError}
            </div>
          ) : null}

          {productSearch.isFetching ? (
            <p className="border-b border-white/10 px-4 py-2 text-xs text-slate-400">Searching…</p>
          ) : null}
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
                      barcode: product.barcode,
                      rate: Number(product.sellingPrice ?? 0),
                    })
                  }
                >
                  <span className="min-w-0 truncate">
                    {product.name}
                    {product.sku ? <span className="ml-2 text-xs text-slate-500">{product.sku}</span> : null}
                  </span>
                  <span className="font-mono text-teal-300">{Number(product.sellingPrice ?? 0).toFixed(2)}</span>
                </button>
              ))}
            </div>
          ) : query.trim().length >= 2 && !/^\d{6,}$/.test(query.trim()) && !productSearch.isFetching ? (
            <p className="border-b border-white/10 px-4 py-2 text-xs text-slate-500">
              No products match “{query.trim()}”
            </p>
          ) : null}

          <div className="min-h-0 flex-1 overflow-auto p-3 sm:p-4">
            {!lines.length ? (
              <div className="space-y-4">
                <div className="text-center text-slate-500">
                  <p className="text-lg font-medium text-slate-300">Cart is empty</p>
                  <p className="mt-1 text-sm">
                    {ready
                      ? 'Tap a product below, or scan / search above.'
                      : stores.isLoading
                        ? 'Loading store…'
                        : 'Select a store in the header to begin.'}
                  </p>
                </div>
                {ready && (catalog.data?.length || catalog.isLoading) ? (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {catalog.isLoading
                      ? Array.from({ length: 4 }).map((_, i) => (
                          <div key={i} className="h-16 animate-pulse rounded-xl bg-white/5" />
                        ))
                      : (catalog.data ?? []).map((product) => (
                          <button
                            key={product.id}
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              void addProduct({
                                productId: product.id,
                                name: product.name,
                                barcode: product.barcode,
                                rate: Number(product.sellingPrice ?? 0),
                              })
                            }
                            className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-left transition hover:border-teal-500/40 hover:bg-teal-500/10 disabled:opacity-50"
                          >
                            <p className="truncate font-medium text-white">{product.name}</p>
                            <p className="mt-1 flex justify-between text-xs text-slate-400">
                              <span className="font-mono">{product.barcode || product.sku}</span>
                              <span className="font-mono text-teal-300">
                                {Number(product.sellingPrice ?? 0).toFixed(2)}
                              </span>
                            </p>
                          </button>
                        ))}
                  </div>
                ) : null}
                {ready && catalog.isError ? (
                  <p className="text-center text-sm text-rose-300">
                    Could not load products: {getApiErrorMessage(catalog.error)}
                  </p>
                ) : null}
              </div>
            ) : (
              <>
                <ul className="space-y-2">
                  {lines.map((line) => (
                    <li
                      key={line.id}
                      className={cn(
                        'flex items-center gap-3 rounded-xl border px-3 py-3 transition',
                        selectedLineId === line.id
                          ? 'border-teal-500/50 bg-teal-500/10'
                          : 'border-white/10 bg-white/5 hover:border-white/20',
                      )}
                    >
                      <button type="button" className="min-w-0 flex-1 text-left" onClick={() => selectLine(line.id)}>
                        <p className="truncate font-medium text-white">{line.description ?? 'Item'}</p>
                        <p className="text-xs text-slate-400">
                          {line.quantity} × {Number(line.rate).toFixed(2)}
                          {line.barcode ? ` · ${line.barcode}` : ''}
                          {Number(line.discountPercent) > 0 ? ` · −${Number(line.discountPercent)}%` : ''}
                        </p>
                      </button>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 text-slate-300 hover:bg-white/10"
                          disabled={busy}
                          onClick={() => void bumpQty(line.id, -1)}
                        >
                          −
                        </Button>
                        <span className="w-6 text-center font-mono text-sm">{Number(line.quantity)}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 text-slate-300 hover:bg-white/10"
                          disabled={busy}
                          onClick={() => void bumpQty(line.id, 1)}
                        >
                          +
                        </Button>
                      </div>
                      <p className="w-20 text-right font-mono text-sm text-teal-300">
                        {Number(line.lineTotal).toFixed(2)}
                      </p>
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
                {selectedLineId ? (
                  <div className="mt-3 rounded-xl border border-teal-500/30 bg-teal-950/30 p-3">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-teal-200/80">Line discount</p>
                    <div className="flex flex-wrap gap-2">
                      {DISCOUNT_PRESETS.map((pct) => (
                        <Button
                          key={pct}
                          size="sm"
                          variant="outline"
                          className="border-white/15 bg-transparent text-white hover:bg-white/10"
                          disabled={busy}
                          onClick={() => void applyLineDiscount(pct)}
                        >
                          {pct}%
                        </Button>
                      ))}
                      <Input
                        value={lineDiscount}
                        onChange={(e) => setLineDiscount(e.target.value)}
                        className="h-8 w-20 border-white/15 bg-white/5 text-white"
                        inputMode="decimal"
                        placeholder="%"
                      />
                      <Button size="sm" disabled={busy} onClick={() => void applyLineDiscount()}>
                        Apply
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-slate-400"
                        disabled={busy}
                        onClick={() => void applyLineDiscount(0)}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-center text-xs text-slate-500">Tap a line to set product discount</p>
                )}
              </>
            )}
          </div>
        </section>

        <aside className="flex min-h-0 flex-col gap-3 overflow-auto bg-slate-900/50 p-3 sm:p-4">
          <Card className="border-white/10 bg-slate-900 text-white shadow-none">
            <CardContent className="space-y-3 p-4">
              <div className="space-y-2">
                <Label className="text-xs text-slate-400">Customer / loyalty</Label>
                <Input
                  value={customerQuery}
                  onChange={(e) => setCustomerQuery(e.target.value)}
                  placeholder="Name or mobile number…"
                  className="h-9 border-white/15 bg-white/5 text-white"
                  disabled={busy || !sale}
                  inputMode="search"
                />
                {customers.data?.length ? (
                  <div className="max-h-28 space-y-1 overflow-auto rounded-lg border border-white/10 bg-slate-950/60 p-1">
                    {customers.data.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="flex w-full flex-col rounded-md px-2 py-1.5 text-left text-sm hover:bg-white/5"
                        disabled={busy}
                        onClick={() => {
                          setCustomerQuery(c.customerName)
                          void applyBillAdjustments({ customerId: c.id })
                        }}
                      >
                        <span className="flex w-full gap-2">
                          <span className="min-w-0 truncate">{c.customerName}</span>
                          <span className="ml-auto shrink-0 font-mono text-xs text-slate-500">{c.customerCode}</span>
                        </span>
                        {c.phone ? <span className="font-mono text-xs text-teal-300/90">{c.phone}</span> : null}
                      </button>
                    ))}
                  </div>
                ) : customerQuery.trim().length >= 2 && !customers.isFetching ? (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500">No customer matched name or mobile.</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full border-teal-500/40 bg-transparent text-teal-200 hover:bg-teal-500/15"
                      disabled={busy || !ready}
                      onClick={openNewCustomer}
                    >
                      Add new customer
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-auto px-0 text-xs text-teal-300/90 hover:bg-transparent hover:text-teal-200"
                    disabled={busy || !ready}
                    onClick={openNewCustomer}
                  >
                    + Onboard customer
                  </Button>
                )}
                {sale?.customerId && loyalty.data ? (
                  <p className="text-xs text-teal-200/90">
                    Points balance: <span className="font-mono">{Number(loyalty.data.pointsBalance).toFixed(0)}</span>
                    {' · '}1 pt = ₹1
                  </p>
                ) : null}
                <div className="flex gap-2">
                  <Input
                    value={loyaltyRedeem}
                    onChange={(e) => setLoyaltyRedeem(e.target.value)}
                    placeholder="Redeem pts"
                    className="h-9 border-white/15 bg-white/5 text-white"
                    inputMode="decimal"
                    disabled={busy || !sale?.customerId}
                  />
                  <Button
                    size="sm"
                    className="shrink-0"
                    disabled={busy || !sale?.customerId}
                    onClick={() => void applyBillAdjustments({ loyaltyPointsRedeemed: Number(loyaltyRedeem) || 0 })}
                  >
                    Redeem
                  </Button>
                </div>
              </div>

              <div className="space-y-2 border-t border-white/10 pt-3">
                <Label className="text-xs text-slate-400">Bill discount</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={billDiscPct}
                    onChange={(e) => setBillDiscPct(e.target.value)}
                    placeholder="% off"
                    className="h-9 border-white/15 bg-white/5 text-white"
                    inputMode="decimal"
                    disabled={busy || !sale}
                  />
                  <Input
                    value={billDiscAmt}
                    onChange={(e) => setBillDiscAmt(e.target.value)}
                    placeholder="₹ off"
                    className="h-9 border-white/15 bg-white/5 text-white"
                    inputMode="decimal"
                    disabled={busy || !sale}
                  />
                </div>
                <div className="flex gap-2">
                  <Input
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="Coupon (e.g. YRV10)"
                    className="h-9 border-white/15 bg-white/5 text-white"
                    disabled={busy || !sale}
                  />
                  <Button
                    size="sm"
                    className="shrink-0"
                    disabled={busy || !sale}
                    onClick={() =>
                      void applyBillAdjustments({
                        billDiscountPercent: Number(billDiscPct) || 0,
                        billDiscountAmount: Number(billDiscAmt) || 0,
                        couponCode: couponCode.trim() || null,
                      })
                    }
                  >
                    Apply
                  </Button>
                </div>
              </div>

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
                <span className="font-display text-3xl font-semibold tracking-tight text-teal-300">
                  {total.toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>

          <div className="mt-auto flex flex-col gap-2">
            <Button
              variant="outline"
              className="h-11 justify-start gap-2 border-white/15 bg-transparent text-left text-white hover:bg-white/10"
              disabled={busy || !ready}
              onClick={() => {
                setCustomerQuery('')
                setCustomerOpen(true)
              }}
            >
              <UserPlus className="size-4 shrink-0 text-teal-300" />
              <span className="min-w-0 flex-1 truncate">
                {selectedCustomer.data
                  ? `${selectedCustomer.data.customerName}${selectedCustomer.data.phone ? ` · ${selectedCustomer.data.phone}` : ''}`
                  : 'Customer / mobile'}
              </span>
            </Button>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                className="border-white/15 bg-transparent text-white hover:bg-white/10"
                disabled={busy || !lines.length}
                onClick={() => void holdSale()}
              >
                Hold
              </Button>
              <Button
                variant="outline"
                className="relative border-white/15 bg-transparent text-white hover:bg-white/10"
                disabled={busy || !ready}
                onClick={() => setHeldOpen(true)}
              >
                <Pause className="size-3.5" />
                Held
                {heldForStore.length ? (
                  <span className="absolute -right-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full bg-teal-500 px-1 text-[10px] font-semibold text-slate-950">
                    {heldForStore.length}
                  </span>
                ) : null}
              </Button>
              <Button
                variant="outline"
                className="border-rose-500/40 bg-transparent text-rose-300 hover:bg-rose-500/15"
                disabled={busy || !sale}
                onClick={() => void voidSale()}
              >
                Void
              </Button>
            </div>
            <Button className="h-14 text-base" disabled={busy || !lines.length} onClick={openPay}>
              <CreditCard className="size-5" />
              Pay (F12)
            </Button>
          </div>
        </aside>
      </div>

      {customerOpen ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/70 p-4 sm:items-center">
          <Card className="w-full max-w-md border-white/10 bg-slate-900 text-white shadow-2xl">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Find customer</h2>
                  <p className="text-xs text-slate-400">Search by name or mobile number</p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-slate-400 hover:bg-white/10 hover:text-white"
                  onClick={() => setCustomerOpen(false)}
                >
                  <X className="size-4" />
                </Button>
              </div>
              <Input
                value={customerQuery}
                onChange={(e) => setCustomerQuery(e.target.value)}
                placeholder="Name or mobile…"
                className="h-11 border-white/15 bg-white/5 text-white"
                inputMode="search"
                autoFocus
              />
              {customers.isFetching ? (
                <p className="text-sm text-slate-400">Searching…</p>
              ) : customers.data?.length ? (
                <ul className="max-h-56 space-y-1 overflow-auto">
                  {customers.data.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        disabled={busy}
                        className="flex w-full flex-col rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-left hover:border-teal-500/40 hover:bg-teal-500/10 disabled:opacity-50"
                        onClick={() => {
                          setCustomerQuery(c.customerName)
                          void applyBillAdjustments({ customerId: c.id }).then(() => setCustomerOpen(false))
                        }}
                      >
                        <span className="font-medium text-white">{c.customerName}</span>
                        <span className="text-xs text-slate-400">
                          {c.customerCode}
                          {c.phone ? ` · ${c.phone}` : ''}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : customerQuery.trim().length >= 2 ? (
                <p className="text-sm text-slate-400">No match for “{customerQuery.trim()}”.</p>
              ) : (
                <p className="text-sm text-slate-500">Type at least 2 characters, or a mobile number.</p>
              )}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="border-white/15 bg-transparent text-white hover:bg-white/10"
                  disabled={busy || !sale?.customerId}
                  onClick={() => {
                    void applyBillAdjustments({ clearCustomer: true }).then(() => {
                      setCustomerQuery('')
                      setCustomerOpen(false)
                    })
                  }}
                >
                  Clear
                </Button>
                <Button
                  className="bg-teal-600 text-white hover:bg-teal-500"
                  disabled={busy || !ready}
                  onClick={() => {
                    setCustomerOpen(false)
                    openNewCustomer()
                  }}
                >
                  <UserPlus className="size-4" />
                  Onboard new
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {heldOpen ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/70 p-4 sm:items-center">
          <Card className="w-full max-w-lg border-white/10 bg-slate-900 text-white shadow-2xl">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Held sales</h2>
                  <p className="text-xs text-slate-400">Resume a parked cart for this store</p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-slate-400 hover:bg-white/10 hover:text-white"
                  onClick={() => setHeldOpen(false)}
                >
                  <X className="size-4" />
                </Button>
              </div>
              {heldSales.isLoading ? (
                <p className="py-6 text-center text-sm text-slate-400">Loading held sales…</p>
              ) : heldForStore.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400">No held sales for this store.</p>
              ) : (
                <ul className="max-h-80 space-y-2 overflow-auto">
                  {heldForStore.map((held) => (
                    <li key={held.id}>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void resumeHeldSale(held.id)}
                        className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-left transition hover:border-teal-500/40 hover:bg-teal-500/10 disabled:opacity-50"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-white">
                            {held.heldLabel || `Hold ${held.id.slice(0, 8)}`}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-400">
                            {held.lines?.length ?? 0} item{(held.lines?.length ?? 0) === 1 ? '' : 's'}
                            {sale?.status === 'DRAFT' && sale.lines?.length ? ' · current cart will be held' : ''}
                          </p>
                        </div>
                        <span className="shrink-0 font-mono text-teal-300">
                          {Number(held.grandTotal ?? 0).toFixed(2)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {payOpen ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/70 p-4 sm:items-center">
          <Card className="w-full max-w-md border-white/10 bg-slate-900 text-white shadow-2xl">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Take payment</h2>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-slate-400 hover:bg-white/10 hover:text-white"
                  onClick={() => setPayOpen(false)}
                >
                  <X className="size-4" />
                </Button>
              </div>
              <p className="font-mono text-2xl text-teal-300">{total.toFixed(2)}</p>
              <div className="space-y-2">
                <Label className="text-slate-300">Customer (name or mobile)</Label>
                <Input
                  value={customerQuery}
                  onChange={(e) => setCustomerQuery(e.target.value)}
                  placeholder="Search by name or mobile…"
                  className="border-white/15 bg-white/5 text-white"
                  inputMode="search"
                />
                {customers.data?.length ? (
                  <div className="max-h-28 space-y-1 overflow-auto rounded-lg border border-white/10 bg-slate-950/60 p-1">
                    {customers.data.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="flex w-full flex-col rounded-md px-2 py-1.5 text-left text-sm hover:bg-white/5"
                        disabled={busy}
                        onClick={() => {
                          setCustomerQuery(c.customerName)
                          void applyBillAdjustments({ customerId: c.id })
                        }}
                      >
                        <span className="truncate">{c.customerName}</span>
                        {c.phone ? <span className="font-mono text-xs text-teal-300/90">{c.phone}</span> : null}
                      </button>
                    ))}
                  </div>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-full border-teal-500/40 bg-transparent text-teal-200 hover:bg-teal-500/15"
                    disabled={busy || !ready}
                    onClick={openNewCustomer}
                  >
                    Add new customer
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Tender</Label>
                <div className="flex gap-2">
                  {TENDERS.map((mode) => (
                    <Button
                      key={mode}
                      type="button"
                      size="sm"
                      variant={tender === mode ? 'default' : 'outline'}
                      className={tender === mode ? '' : 'border-white/15 bg-transparent text-white'}
                      onClick={() => setTender(mode)}
                    >
                      {mode}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Amount</Label>
                <Input
                  value={tenderAmount}
                  onChange={(e) => setTenderAmount(e.target.value)}
                  className="border-white/15 bg-white/5 text-white"
                  inputMode="decimal"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Reference</Label>
                <Input
                  value={tenderRef}
                  onChange={(e) => setTenderRef(e.target.value)}
                  className="border-white/15 bg-white/5 text-white"
                  placeholder="Optional"
                />
              </div>
              <Button className="w-full" disabled={busy} onClick={() => void checkout()}>
                Complete sale
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {newCustomerOpen ? (
        <div className="fixed inset-0 z-[95] flex items-end justify-center bg-black/70 p-4 sm:items-center">
          <Card className="w-full max-w-md border-white/10 bg-slate-900 text-white shadow-2xl">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Onboard customer</h2>
                  <p className="text-xs text-slate-400">Quick add for POS — code is generated automatically</p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-slate-400 hover:bg-white/10 hover:text-white"
                  onClick={() => setNewCustomerOpen(false)}
                >
                  <X className="size-4" />
                </Button>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Name</Label>
                <Input
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  className="border-white/15 bg-white/5 text-white"
                  placeholder="Customer name"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Mobile</Label>
                <Input
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  className="border-white/15 bg-white/5 text-white"
                  placeholder="10-digit mobile"
                  inputMode="tel"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Email (optional)</Label>
                <Input
                  value={newCustomerEmail}
                  onChange={(e) => setNewCustomerEmail(e.target.value)}
                  className="border-white/15 bg-white/5 text-white"
                  placeholder="email@example.com"
                  inputMode="email"
                />
              </div>
              <Button
                className="w-full"
                disabled={busy || !newCustomerName.trim()}
                onClick={() => void createCustomer()}
              >
                Save & attach to bill
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {lastCompleted ? (
        <div className="fixed inset-0 z-[96] flex items-end justify-center bg-slate-950/80 p-4 backdrop-blur-sm sm:items-center">
          <Card className="w-full max-w-md overflow-hidden border-white/10 bg-slate-900 text-white shadow-2xl">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-start gap-3">
                <div className="grid size-10 place-items-center rounded-full bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30">
                  <CheckCircle2 className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold tracking-tight">Payment successful</h2>
                  <p className="mt-0.5 text-sm text-slate-400">
                    {lastCompleted.billNumber
                      ? `Bill ${lastCompleted.billNumber} is ready to print`
                      : 'Receipt is ready to print'}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-slate-400 hover:bg-white/10 hover:text-white"
                  onClick={() => {
                    setLastCompleted(null)
                    setLastCompletedCustomer(null)
                  }}
                >
                  <X className="size-4" />
                </Button>
              </div>
              <PosReceiptActions
                sale={lastCompleted}
                store={selectedStore}
                customerName={lastCompletedCustomer}
                gstin={organization?.gstin}
                legalName={organization?.legalName || organization?.name}
                onClose={() => {
                  setLastCompleted(null)
                  setLastCompletedCustomer(null)
                }}
              />
              <Button
                variant="outline"
                className="w-full border-white/15 bg-transparent text-white hover:bg-white/5"
                asChild
              >
                <Link to="/retail/pos-sales">View all POS sales</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  )
}
