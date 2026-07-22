import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  BookOpen,
  Boxes,
  ExternalLink,
  Package,
  Search,
} from 'lucide-react'
import { toast } from 'sonner'
import { inventoryApi, organizationApi, productApi, warehouseApi } from '@/services/api'
import { getApiErrorMessage } from '@/lib/api-error'
import { resolveDefaultWarehouseId } from '@/lib/warehouse'
import { cn } from '@/lib/utils'
import {
  EmptyState,
  ListPageShell,
  ListTablePanel,
  MetricCard,
  PageHeader,
  SectionTitle,
} from '@/components/layout/PageChrome'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Input,
  NumberInput,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Skeleton,
  Table,
} from '@/components/ui'

function qty(value: unknown) {
  const n = Number(value ?? 0)
  return Number.isFinite(n) ? n : 0
}

function formatQty(value: unknown) {
  const n = qty(value)
  return n.toLocaleString('en-IN', { maximumFractionDigits: 3 })
}

function humanizeType(type: string | undefined) {
  if (!type) return '—'
  return type
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function movementTone(type: string | undefined): 'in' | 'out' | 'neutral' {
  const t = (type ?? '').toUpperCase()
  if (['SALE', 'TRANSFER_OUT', 'ADJUSTMENT_OUT', 'ISSUE'].includes(t) || t.endsWith('_OUT')) return 'out'
  if (
    ['OPENING_STOCK', 'PURCHASE', 'GRN', 'TRANSFER_IN', 'ADJUSTMENT_IN', 'SALES_RETURN', 'RETURN'].includes(t) ||
    t.endsWith('_IN')
  ) {
    return 'in'
  }
  if (t.includes('OUT') || t === 'ADJUSTMENT') return t.includes('IN') ? 'in' : 'out'
  if (t.includes('IN') || t.includes('RECEIPT') || t.includes('OPENING')) return 'in'
  return 'neutral'
}

export function InventoryPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'LOW' | 'OK'>('ALL')

  const { data: lowStock = [] } = useQuery({
    queryKey: ['inventory', 'low-stock'],
    queryFn: inventoryApi.lowStockAlerts,
  })
  const { data: reorder = [] } = useQuery({ queryKey: ['inventory', 'reorder'], queryFn: inventoryApi.reorderAlerts })
  const { data: stockRows = [], isLoading: loadingStock } = useQuery({
    queryKey: ['inventory', 'overview'],
    queryFn: inventoryApi.overview,
  })

  const draftReservedTotal = stockRows.reduce((sum, row) => sum + qty(row.draftReserved), 0)
  const lowCount = stockRows.filter((row) => {
    const available = qty(row.available)
    const min = qty(row.minimumStockLevel)
    return min > 0 && available <= min
  }).length

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return stockRows.filter((row) => {
      const available = qty(row.available)
      const min = qty(row.minimumStockLevel)
      const low = min > 0 && available <= min
      if (statusFilter === 'LOW' && !low) return false
      if (statusFilter === 'OK' && low) return false
      if (!q) return true
      return (
        row.productName?.toLowerCase().includes(q) ||
        row.sku?.toLowerCase().includes(q) ||
        row.productId?.toLowerCase().includes(q)
      )
    })
  }, [search, statusFilter, stockRows])

  return (
    <ListPageShell
      header={
        <PageHeader
          title="Inventory"
          subtitle="Live warehouse positions. Open a product for master data, or jump to its stock ledger for every movement."
          actions={
            <>
              <Button variant="outline" size="sm" className="cursor-pointer" asChild>
                <Link to="/inventory/adjustments">Adjustments</Link>
              </Button>
              <Button variant="outline" size="sm" className="cursor-pointer" asChild>
                <Link to="/inventory/transfers">Transfers</Link>
              </Button>
              <Button variant="outline" size="sm" className="cursor-pointer" asChild>
                <Link to="/inventory/opening-stock">Opening stock</Link>
              </Button>
              <Button size="sm" className="cursor-pointer" asChild>
                <Link to="/inventory/ledger">Stock ledger</Link>
              </Button>
            </>
          }
        />
      }
    >
      <section className="grid shrink-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Tracked products" value={stockRows.length} icon={Boxes} />
        <MetricCard label="Low stock" value={lowCount} icon={AlertTriangle} hint="At or below minimum" />
        <MetricCard label="Reorder signals" value={reorder.length} icon={Package} />
        <MetricCard
          label="Draft reserved"
          value={formatQty(draftReservedTotal)}
          icon={BookOpen}
          hint="On draft invoices"
        />
      </section>

      {(lowStock.length > 0 || reorder.length > 0) && (
        <div className="grid shrink-0 gap-4 lg:grid-cols-2">
          {lowStock.length > 0 ? (
            <Card className="border-amber-200/80 bg-gradient-to-br from-amber-50/80 to-white shadow-[var(--shadow-soft)]">
              <CardHeader className="border-b border-amber-100/80 p-4 pb-3">
                <SectionTitle title="Low stock" detail="Below minimum level — restock or adjust thresholds" />
              </CardHeader>
              <CardContent className="divide-y divide-amber-100/80 p-0">
                {lowStock.slice(0, 5).map((a) => (
                  <div key={a.productId} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <Link
                        to={`/products/${a.productId}`}
                        className="font-medium text-slate-900 hover:text-teal-800 hover:underline"
                      >
                        {a.productName}
                      </Link>
                      <p className="text-xs text-slate-500">
                        Available {formatQty(a.available)} · threshold {formatQty(a.threshold)}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" className="cursor-pointer shrink-0" asChild>
                      <Link to={`/inventory/ledger?productId=${a.productId}`}>Ledger</Link>
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
          {reorder.length > 0 ? (
            <Card className="border-slate-200/90 shadow-[var(--shadow-soft)]">
              <CardHeader className="border-b border-slate-100 p-4 pb-3">
                <SectionTitle title="Reorder points" detail="At or below reorder level" />
              </CardHeader>
              <CardContent className="divide-y divide-slate-100 p-0">
                {reorder.slice(0, 5).map((a) => (
                  <div key={a.productId} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <Link
                        to={`/products/${a.productId}`}
                        className="font-medium text-slate-900 hover:text-teal-800 hover:underline"
                      >
                        {a.productName}
                      </Link>
                      <p className="text-xs text-slate-500">
                        Available {formatQty(a.available)} · reorder at {formatQty(a.threshold)}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" className="cursor-pointer shrink-0" asChild>
                      <Link to={`/products/${a.productId}`}>Open</Link>
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}

      <ListTablePanel
        toolbar={
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SectionTitle title="Stock positions" detail={`${filtered.length} of ${stockRows.length} products`} />
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                <Input
                  className="h-9 pl-8"
                  placeholder="Search name or SKU"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                {(['ALL', 'LOW', 'OK'] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={cn(
                      'cursor-pointer rounded-md px-2.5 py-1.5 text-xs font-semibold transition',
                      statusFilter === value
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800',
                    )}
                    onClick={() => setStatusFilter(value)}
                  >
                    {value === 'ALL' ? 'All' : value === 'LOW' ? 'Low' : 'OK'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        }
      >
        <Table fill stickyHeader className="min-w-[48rem]">
          <thead>
            <tr className="border-b bg-slate-50/90">
              <th className="p-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Product
              </th>
              <th className="p-3 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Available
              </th>
              <th className="p-3 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Draft reserved
              </th>
              <th className="p-3 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Min / reorder
              </th>
              <th className="p-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Status</th>
              <th className="p-3 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {loadingStock ? (
              <tr>
                <td className="space-y-2 p-4" colSpan={6}>
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8">
                  <EmptyState
                    title={stockRows.length === 0 ? 'No stock tracked yet' : 'No matching products'}
                    description={
                      stockRows.length === 0
                        ? 'Add opening stock or receive a GRN to begin tracking inventory.'
                        : 'Try another search or status filter.'
                    }
                    action={
                      stockRows.length === 0 ? (
                        <Button size="sm" className="cursor-pointer" asChild>
                          <Link to="/inventory/opening-stock">Add opening stock</Link>
                        </Button>
                      ) : undefined
                    }
                  />
                </td>
              </tr>
            ) : (
              filtered.map((row) => {
                const available = qty(row.available)
                const reserved = qty(row.draftReserved)
                const min = qty(row.minimumStockLevel)
                const reorderLevel = qty(row.reorderLevel)
                const low = min > 0 && available <= min
                return (
                  <tr key={row.productId} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                    <td className="p-3 align-middle">
                      <Link to={`/products/${row.productId}`} className="group inline-flex min-w-0 max-w-full flex-col">
                        <span className="truncate font-semibold text-slate-900 group-hover:text-teal-800 group-hover:underline">
                          {row.productName}
                        </span>
                        <span className="truncate text-xs text-slate-500">{row.sku || row.productId.slice(0, 8)}</span>
                      </Link>
                    </td>
                    <td className="p-3 text-right align-middle font-semibold tabular-nums text-slate-900">
                      {formatQty(available)}
                    </td>
                    <td className="p-3 text-right align-middle tabular-nums text-slate-600">{formatQty(reserved)}</td>
                    <td className="p-3 text-right align-middle tabular-nums text-slate-600">
                      {formatQty(min)} / {formatQty(reorderLevel)}
                    </td>
                    <td className="p-3 align-middle">
                      {low ? <Badge variant="warning">Low stock</Badge> : <Badge variant="success">In stock</Badge>}
                    </td>
                    <td className="p-3 text-right align-middle">
                      <div className="inline-flex gap-1.5">
                        <Button size="sm" variant="outline" className="cursor-pointer" asChild>
                          <Link to={`/inventory/ledger?productId=${row.productId}`}>
                            <BookOpen className="size-3.5" />
                            Ledger
                          </Link>
                        </Button>
                        <Button size="sm" variant="ghost" className="cursor-pointer" asChild>
                          <Link to={`/products/${row.productId}`} title="Open product">
                            <ExternalLink className="size-3.5" />
                          </Link>
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </Table>
      </ListTablePanel>
    </ListPageShell>
  )
}

export function SimpleInventoryPage({
  title,
  description,
  mode,
}: {
  title: string
  description: string
  mode?: 'adjustment' | 'transfer' | 'opening' | 'ledger'
}) {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [productId, setProductId] = useState(searchParams.get('productId') ?? '')
  const [warehouseId, setWarehouseId] = useState(searchParams.get('warehouseId') ?? '')
  const [fromWarehouseId, setFromWarehouseId] = useState('')
  const [toWarehouseId, setToWarehouseId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [productQuery, setProductQuery] = useState('')

  const { data: products = [] } = useQuery({
    queryKey: ['products', 'inventory'],
    queryFn: () => productApi.list({ active: true, size: 100 }),
  })
  const stockProducts = useMemo(
    () =>
      products.filter((product) => {
        const type = (product.itemType ?? 'PRODUCT').toUpperCase()
        return type === 'PRODUCT' || type === ''
      }),
    [products],
  )
  const ledgerProducts = mode === 'ledger' ? stockProducts : products
  const selectableProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase()
    if (!q) return ledgerProducts
    return ledgerProducts.filter(
      (p) => p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q) || p.id.toLowerCase().includes(q),
    )
  }, [ledgerProducts, productQuery])

  const { data: warehouses = [] } = useQuery({ queryKey: ['warehouses'], queryFn: warehouseApi.list })
  const { data: orgSettings } = useQuery({
    queryKey: ['organization', 'settings'],
    queryFn: organizationApi.settings,
  })
  const { data: ledger = [], isLoading: ledgerLoading } = useQuery({
    queryKey: ['inventory', 'ledger', productId, warehouseId],
    queryFn: () => inventoryApi.ledger(productId, warehouseId ? { warehouseId } : undefined),
    enabled: mode === 'ledger' && !!productId,
  })
  const { data: stockSnap } = useQuery({
    queryKey: ['inventory', 'stock', productId, warehouseId],
    queryFn: () => inventoryApi.stock(productId, warehouseId || undefined),
    enabled: mode === 'ledger' && !!productId,
  })

  const selectedProduct = ledgerProducts.find((p) => p.id === productId)

  useEffect(() => {
    const defaultId = resolveDefaultWarehouseId(warehouses, orgSettings?.defaultWarehouseId)
    if (!defaultId) return
    if (!warehouseId && mode !== 'ledger') setWarehouseId(defaultId)
    if (!fromWarehouseId) setFromWarehouseId(defaultId)
  }, [fromWarehouseId, mode, orgSettings?.defaultWarehouseId, warehouseId, warehouses])

  useEffect(() => {
    if (mode !== 'ledger') return
    const fromUrl = searchParams.get('productId')
    if (fromUrl && fromUrl !== productId) setProductId(fromUrl)
    const wh = searchParams.get('warehouseId')
    if (wh && wh !== warehouseId) setWarehouseId(wh)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync URL → state once / when URL changes
  }, [mode, searchParams])

  useEffect(() => {
    if (mode !== 'ledger' || !productId) return
    if (!ledgerProducts.some((product) => product.id === productId)) {
      setProductId('')
    }
  }, [ledgerProducts, mode, productId])

  const selectProduct = (id: string) => {
    setProductId(id)
    if (mode === 'ledger') {
      const next = new URLSearchParams(searchParams)
      if (id) next.set('productId', id)
      else next.delete('productId')
      setSearchParams(next, { replace: true })
    }
  }

  const selectWarehouse = (id: string) => {
    setWarehouseId(id)
    if (mode === 'ledger') {
      const next = new URLSearchParams(searchParams)
      if (id) next.set('warehouseId', id)
      else next.delete('warehouseId')
      if (productId) next.set('productId', productId)
      setSearchParams(next, { replace: true })
    }
  }

  const submit = async () => {
    try {
      if (mode === 'adjustment') {
        await inventoryApi.adjust({ productId, warehouseId, quantity })
      } else if (mode === 'opening') {
        await inventoryApi.openingStock({ productId, warehouseId, quantity })
      } else if (mode === 'transfer') {
        await inventoryApi.transfer({
          productId,
          fromWarehouseId,
          toWarehouseId,
          quantity,
        })
      }
      await queryClient.invalidateQueries({ queryKey: ['inventory'] })
      toast.success('Inventory updated')
      setQuantity(1)
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }

  if (mode === 'ledger') {
    return (
      <div className="flex h-[calc(100dvh-8.75rem)] min-h-[32rem] flex-col gap-4 overflow-hidden sm:h-[calc(100dvh-9.75rem)] lg:h-[calc(100dvh-11rem)]">
        <div className="shrink-0">
          <PageHeader
            title={title}
            subtitle={description}
            actions={
              selectedProduct ? (
                <Button variant="outline" size="sm" className="cursor-pointer gap-1.5" asChild>
                  <Link to={`/products/${selectedProduct.id}`}>
                    <ExternalLink className="size-3.5" />
                    Open product
                  </Link>
                </Button>
              ) : null
            }
          />
        </div>

        <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[18.5rem_minmax(0,1fr)]">
          <Card className="flex min-h-0 flex-col overflow-hidden border-slate-200/90 bg-white shadow-[var(--shadow-soft)]">
            <CardHeader className="shrink-0 space-y-1 border-b border-slate-100 bg-white p-4 pb-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Products</p>
              <h2 className="font-[family-name:var(--font-display)] text-base font-semibold text-slate-900">
                Choose stock item
              </h2>
            </CardHeader>
            <div className="shrink-0 border-b border-slate-100 bg-white px-4 py-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                <Input
                  className="h-9 pl-8"
                  placeholder="Filter products"
                  value={productQuery}
                  onChange={(e) => setProductQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="scrollbar-panel min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain bg-slate-50/40 px-2 pb-3 pt-2">
              {selectableProducts.length === 0 ? (
                <p className="px-2 py-6 text-center text-sm text-slate-500">No stocked products match.</p>
              ) : (
                selectableProducts.map((product) => {
                  const active = product.id === productId
                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => selectProduct(product.id)}
                      className={cn(
                        'flex w-full cursor-pointer flex-col rounded-xl px-3 py-2.5 text-left transition',
                        active ? 'bg-teal-50 ring-1 ring-teal-200' : 'bg-white/80 hover:bg-white',
                      )}
                    >
                      <span
                        className={cn('truncate text-sm font-semibold', active ? 'text-teal-950' : 'text-slate-900')}
                      >
                        {product.name}
                      </span>
                      <span className="truncate text-xs text-slate-500">{product.sku || 'No SKU'}</span>
                    </button>
                  )
                })
              )}
            </div>
          </Card>

          <div className="flex min-h-0 flex-col gap-3 overflow-hidden">
            <Card className="shrink-0 border-slate-200/90 bg-white shadow-[var(--shadow-soft)]">
              <CardContent className="grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:items-end sm:p-5">
                <div className="min-w-0 space-y-1">
                  {selectedProduct ? (
                    <>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Ledger for</p>
                      <Link
                        to={`/products/${selectedProduct.id}`}
                        className="inline-flex max-w-full items-center gap-2 truncate font-[family-name:var(--font-display)] text-lg font-semibold text-slate-900 hover:text-teal-800 hover:underline"
                      >
                        <span className="truncate">{selectedProduct.name}</span>
                        <ExternalLink className="size-4 shrink-0 text-slate-400" />
                      </Link>
                      <p className="text-sm text-slate-500">
                        SKU {selectedProduct.sku || '—'} · Available{' '}
                        <span className="font-semibold tabular-nums text-slate-800">
                          {formatQty(stockSnap?.available ?? stockSnap?.onHand ?? 0)}
                        </span>
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Ledger</p>
                      <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-slate-900">
                        Select a product
                      </h2>
                      <p className="text-sm text-slate-500">
                        Movements appear here. Services are excluded from the stock ledger.
                      </p>
                    </>
                  )}
                </div>
                <div className="w-full space-y-1.5 sm:w-56">
                  <Label>Warehouse</Label>
                  <Select
                    value={warehouseId || '__all__'}
                    onValueChange={(v) => selectWarehouse(v === '__all__' ? '' : v)}
                  >
                    <SelectTrigger>
                      {warehouseId
                        ? (warehouses.find((w) => w.id === warehouseId)?.warehouseName ?? 'Warehouse')
                        : 'All warehouses'}
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All warehouses</SelectItem>
                      {warehouses.map((warehouse) => (
                        <SelectItem key={warehouse.id} value={warehouse.id}>
                          {warehouse.warehouseName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card className="flex min-h-0 flex-1 flex-col overflow-hidden border-slate-200/90 bg-white shadow-[var(--shadow-soft)]">
              <div className="scrollbar-panel min-h-0 flex-1 overflow-auto overscroll-contain">
                <table className="w-full min-w-[40rem] border-collapse text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-slate-200 bg-slate-50 shadow-[0_1px_0_rgb(15_23_42/0.06)]">
                      <th className="bg-slate-50 p-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Date
                      </th>
                      <th className="bg-slate-50 p-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Type
                      </th>
                      <th className="bg-slate-50 p-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Reference
                      </th>
                      <th className="bg-slate-50 p-3 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        In
                      </th>
                      <th className="bg-slate-50 p-3 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Out
                      </th>
                      <th className="bg-slate-50 p-3 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Balance
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {!productId ? (
                      <tr>
                        <td colSpan={6} className="p-10">
                          <EmptyState
                            title="No product selected"
                            description="Pick a stocked product from the list to view its movement history."
                          />
                        </td>
                      </tr>
                    ) : ledgerLoading ? (
                      <tr>
                        <td colSpan={6} className="space-y-2 p-4">
                          <Skeleton className="h-10 w-full" />
                          <Skeleton className="h-10 w-full" />
                        </td>
                      </tr>
                    ) : ledger.length ? (
                      ledger.map((row, index) => {
                        const tone = movementTone(row.type)
                        return (
                          <tr
                            key={`${row.date}-${row.type}-${row.reference}-${index}`}
                            className="border-b border-slate-100 last:border-0"
                          >
                            <td className="p-3 text-sm tabular-nums text-slate-700">
                              {row.date
                                ? new Date(row.date).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })
                                : '—'}
                            </td>
                            <td className="p-3">
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold',
                                  tone === 'in' && 'bg-emerald-50 text-emerald-800',
                                  tone === 'out' && 'bg-rose-50 text-rose-800',
                                  tone === 'neutral' && 'bg-slate-100 text-slate-700',
                                )}
                              >
                                {tone === 'in' ? (
                                  <ArrowDownLeft className="size-3" />
                                ) : tone === 'out' ? (
                                  <ArrowUpRight className="size-3" />
                                ) : (
                                  <ArrowLeftRight className="size-3" />
                                )}
                                {humanizeType(row.type)}
                              </span>
                            </td>
                            <td className="p-3 text-sm text-slate-600">{row.reference || '—'}</td>
                            <td className="p-3 text-right text-sm tabular-nums text-emerald-700">
                              {qty(row.inward) > 0 ? formatQty(row.inward) : '—'}
                            </td>
                            <td className="p-3 text-right text-sm tabular-nums text-rose-700">
                              {qty(row.outward) > 0 ? formatQty(row.outward) : '—'}
                            </td>
                            <td className="p-3 text-right text-sm font-semibold tabular-nums text-slate-900">
                              {formatQty(row.runningBalance)}
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-10">
                          <EmptyState
                            title="No movements yet"
                            description={
                              warehouseId
                                ? 'No stock movements for this product in the selected warehouse.'
                                : 'No stock movements recorded for this product.'
                            }
                          />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title={title}
        subtitle={description}
        actions={
          productId ? (
            <Button variant="outline" size="sm" className="cursor-pointer gap-1.5" asChild>
              <Link to={`/products/${productId}`}>
                <ExternalLink className="size-3.5" />
                Open product
              </Link>
            </Button>
          ) : null
        }
      />
      <Card className="border-slate-200/90 shadow-[var(--shadow-soft)]">
        <CardContent className="space-y-4 p-5">
          <div className="space-y-1.5">
            <Label>Product</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger>{products.find((p) => p.id === productId)?.name ?? 'Select product'}</SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {productId ? (
              <Link to={`/products/${productId}`} className="text-xs font-medium text-teal-700 hover:underline">
                View product details
              </Link>
            ) : null}
          </div>
          {mode === 'transfer' ? (
            <>
              <div className="space-y-1.5">
                <Label>From warehouse</Label>
                <Select value={fromWarehouseId} onValueChange={setFromWarehouseId}>
                  <SelectTrigger>
                    {warehouses.find((w) => w.id === fromWarehouseId)?.warehouseName ?? 'Select warehouse'}
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((warehouse) => (
                      <SelectItem key={warehouse.id} value={warehouse.id}>
                        {warehouse.warehouseName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>To warehouse</Label>
                <Select value={toWarehouseId} onValueChange={setToWarehouseId}>
                  <SelectTrigger>
                    {warehouses.find((w) => w.id === toWarehouseId)?.warehouseName ?? 'Select warehouse'}
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((warehouse) => (
                      <SelectItem key={warehouse.id} value={warehouse.id}>
                        {warehouse.warehouseName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <div className="space-y-1.5">
              <Label>Warehouse</Label>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger>
                  {warehouses.find((w) => w.id === warehouseId)?.warehouseName ?? 'Select warehouse'}
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.defaultWarehouse ? `${warehouse.warehouseName} (default)` : warehouse.warehouseName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Quantity</Label>
            <NumberInput value={quantity} onValueChange={setQuantity} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button className="cursor-pointer" onClick={submit} disabled={!productId}>
              Submit
            </Button>
            {productId ? (
              <Button variant="outline" className="cursor-pointer" asChild>
                <Link to={`/inventory/ledger?productId=${productId}`}>View ledger</Link>
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
