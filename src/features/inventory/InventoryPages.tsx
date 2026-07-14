import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { inventoryApi, organizationApi, productApi, warehouseApi } from '@/services/api'
import { getApiErrorMessage } from '@/lib/api-error'
import { resolveDefaultWarehouseId } from '@/lib/warehouse'
import {
  Badge,
  Button,
  Card,
  CardContent,
  NumberInput,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Table,
} from '@/components/ui'

export function InventoryPage() {
  const { data: lowStock = [] } = useQuery({
    queryKey: ['inventory', 'low-stock'],
    queryFn: inventoryApi.lowStockAlerts,
  })
  const { data: reorder = [] } = useQuery({ queryKey: ['inventory', 'reorder'], queryFn: inventoryApi.reorderAlerts })
  const { data: stockRows = [], isLoading: loadingStock } = useQuery({
    queryKey: ['inventory', 'overview'],
    queryFn: inventoryApi.overview,
  })

  const draftReservedTotal = stockRows.reduce((sum, row) => sum + Number(row.draftReserved ?? 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-slate-900">Inventory overview</h1>
          <p className="mt-1 text-sm text-slate-500">
            On-hand stock from warehouse movements. Draft invoices reserve quantity but do not reduce available stock
            until confirmed.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            className="inline-flex h-9 items-center rounded-lg border px-3 text-sm hover:bg-slate-50"
            to="/inventory/adjustments"
          >
            Adjustments
          </Link>
          <Link
            className="inline-flex h-9 items-center rounded-lg border px-3 text-sm hover:bg-slate-50"
            to="/inventory/transfers"
          >
            Transfers
          </Link>
          <Link
            className="inline-flex h-9 items-center rounded-lg border px-3 text-sm hover:bg-slate-50"
            to="/inventory/opening-stock"
          >
            Opening stock
          </Link>
          <Link
            className="inline-flex h-9 items-center rounded-lg bg-teal-700 px-3 text-sm text-white hover:bg-teal-800"
            to="/inventory/ledger"
          >
            Stock ledger
          </Link>
        </div>
      </div>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Low stock alerts</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{lowStock.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Reorder alerts</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{reorder.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Tracked products</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{stockRows.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Reserved on drafts</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{draftReservedTotal}</p>
          </CardContent>
        </Card>
      </section>
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table className="min-w-[40rem] table-fixed">
            <thead>
              <tr className="border-b bg-slate-50/80">
                <th className="w-[40%] p-3 text-left text-xs font-semibold tracking-wide text-slate-500">PRODUCT</th>
                <th className="w-[15%] p-3 text-right text-xs font-semibold tracking-wide text-slate-500">AVAILABLE</th>
                <th className="w-[15%] p-3 text-right text-xs font-semibold tracking-wide text-slate-500">
                  DRAFT RESERVED
                </th>
                <th className="w-[15%] p-3 text-right text-xs font-semibold tracking-wide text-slate-500">
                  MIN / REORDER
                </th>
                <th className="w-[15%] p-3 text-right text-xs font-semibold tracking-wide text-slate-500">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {loadingStock ? (
                <tr>
                  <td className="p-4 text-sm text-slate-500" colSpan={5}>
                    Loading stock positions…
                  </td>
                </tr>
              ) : stockRows.length === 0 ? (
                <tr>
                  <td className="p-4 text-sm text-slate-500" colSpan={5}>
                    No product stock yet. Add opening stock (or receive a GRN) to begin tracking inventory.
                  </td>
                </tr>
              ) : (
                stockRows.map((row) => {
                  const available = Number(row.available ?? 0)
                  const reserved = Number(row.draftReserved ?? 0)
                  const min = Number(row.minimumStockLevel ?? 0)
                  const reorderLevel = Number(row.reorderLevel ?? 0)
                  const low = min > 0 && available <= min
                  return (
                    <tr key={row.productId} className="border-b last:border-0">
                      <td className="p-3 align-middle">
                        <div className="font-medium text-slate-900">{row.productName}</div>
                        <div className="text-xs text-slate-500">{row.sku}</div>
                      </td>
                      <td className="p-3 text-right align-middle font-semibold tabular-nums text-slate-900">
                        {available}
                      </td>
                      <td className="p-3 text-right align-middle tabular-nums text-slate-600">{reserved}</td>
                      <td className="p-3 text-right align-middle tabular-nums text-slate-600">
                        {min} / {reorderLevel}
                      </td>
                      <td className="p-3 text-right align-middle">
                        {low ? <Badge className="bg-amber-50 text-amber-800">Low stock</Badge> : <Badge>OK</Badge>}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </Table>
        </CardContent>
      </Card>
      {draftReservedTotal > 0 && (
        <p className="text-sm text-slate-500">
          Draft reserved is quantity on draft sales invoices. Confirm those invoices to deduct available stock, or add
          opening stock / GRN if available should not be zero.
        </p>
      )}
    </div>
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
  const [productId, setProductId] = useState('')
  const [warehouseId, setWarehouseId] = useState('')
  const [fromWarehouseId, setFromWarehouseId] = useState('')
  const [toWarehouseId, setToWarehouseId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const { data: products = [] } = useQuery({
    queryKey: ['products', 'inventory'],
    queryFn: () => productApi.list({ active: true, size: 100 }),
  })
  const { data: warehouses = [] } = useQuery({ queryKey: ['warehouses'], queryFn: warehouseApi.list })
  const { data: orgSettings } = useQuery({
    queryKey: ['organization', 'settings'],
    queryFn: organizationApi.settings,
  })
  const { data: ledger = [] } = useQuery({
    queryKey: ['inventory', 'ledger', productId, warehouseId],
    queryFn: () => inventoryApi.ledger(productId, warehouseId ? { warehouseId } : undefined),
    enabled: mode === 'ledger' && !!productId,
  })

  useEffect(() => {
    const defaultId = resolveDefaultWarehouseId(warehouses, orgSettings?.defaultWarehouseId)
    if (!defaultId) return
    if (!warehouseId) setWarehouseId(defaultId)
    if (!fromWarehouseId) setFromWarehouseId(defaultId)
  }, [fromWarehouseId, orgSettings?.defaultWarehouseId, warehouseId, warehouses])

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

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      {mode !== 'ledger' ? (
        <Card>
          <CardContent className="space-y-4 p-5">
            <div className="space-y-1.5">
              <Label>Product</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger>
                  {products.find((p) => p.id === productId)?.name ?? 'Select product'}
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                        {warehouse.defaultWarehouse
                          ? `${warehouse.warehouseName} (default)`
                          : warehouse.warehouseName}
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
            <Button onClick={submit}>Submit</Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Product</Label>
                <Select value={productId} onValueChange={setProductId}>
                  <SelectTrigger>
                    {products.find((p) => p.id === productId)?.name ?? 'Select product'}
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Warehouse</Label>
                <Select value={warehouseId || undefined} onValueChange={setWarehouseId}>
                  <SelectTrigger>
                    {warehouses.find((w) => w.id === warehouseId)?.warehouseName ?? 'All warehouses'}
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
            </div>
            <Table>
              <thead>
                <tr className="border-b">
                  <th className="p-2 text-left text-xs text-slate-500">DATE</th>
                  <th className="p-2 text-left text-xs text-slate-500">TYPE</th>
                  <th className="p-2 text-right text-xs text-slate-500">IN</th>
                  <th className="p-2 text-right text-xs text-slate-500">OUT</th>
                  <th className="p-2 text-right text-xs text-slate-500">BALANCE</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((row, index) => (
                  <tr key={`${String(row.date)}-${String(row.type)}-${index}`} className="border-b">
                    <td className="p-2 text-left text-sm">{String(row.date ?? '—')}</td>
                    <td className="p-2 text-left text-sm">{String(row.type ?? '—')}</td>
                    <td className="p-2 text-right text-sm tabular-nums">{String(row.inward ?? 0)}</td>
                    <td className="p-2 text-right text-sm tabular-nums">{String(row.outward ?? 0)}</td>
                    <td className="p-2 text-right text-sm font-medium tabular-nums">
                      {String(row.runningBalance ?? 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
