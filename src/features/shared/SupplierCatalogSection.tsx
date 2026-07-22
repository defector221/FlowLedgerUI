import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { productApi, supplierApi, supplierCatalogApi } from '@/services/api'
import type { SupplierCatalogItemResponse } from '@/types/api'
import { getApiErrorMessage } from '@/lib/api-error'
import { generateEntityCode } from '@/lib/entity-code'
import { currency } from '@/lib/utils'
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
  NumberInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Switch,
  Table,
} from '@/components/ui'

type FormState = {
  productId: string
  supplierId: string
  purchasePrice: number
  supplierSku: string
  preferred: boolean
  moq: number
  leadTimeDays: number
  active: boolean
}

const blankForm = (kind: 'products' | 'suppliers', ownerId: string): FormState => ({
  productId: kind === 'products' ? ownerId : '',
  supplierId: kind === 'suppliers' ? ownerId : '',
  purchasePrice: 0,
  supplierSku: '',
  preferred: false,
  moq: 1,
  leadTimeDays: 0,
  active: true,
})

export function SupplierCatalogSection({
  kind,
  ownerId,
  canWrite,
}: {
  kind: 'products' | 'suppliers'
  ownerId: string
  canWrite: boolean
}) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<SupplierCatalogItemResponse | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(() => blankForm(kind, ownerId))
  const [supplierSkuTouched, setSupplierSkuTouched] = useState(false)
  const queryKey = ['supplier-catalog', kind, ownerId]
  const { data: rows = [] } = useQuery({
    queryKey,
    queryFn: () =>
      kind === 'suppliers' ? supplierCatalogApi.listBySupplier(ownerId) : supplierCatalogApi.listByProduct(ownerId),
    enabled: !!ownerId,
  })
  const { data: products = [] } = useQuery({
    queryKey: ['products', 'catalog-options'],
    queryFn: () => productApi.list({ active: true, size: 200 }),
    enabled: kind === 'suppliers' || open,
  })
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers', 'catalog-options'],
    queryFn: () => supplierApi.list({ archived: false, size: 200 }),
    enabled: kind === 'products' || open,
  })
  const lastAutoKey = useRef('')

  useEffect(() => {
    if (!open) return
    if (editing) {
      setForm({
        productId: editing.productId,
        supplierId: editing.supplierId,
        purchasePrice: Number(editing.purchasePrice),
        supplierSku: editing.supplierSku ?? '',
        preferred: editing.preferred,
        moq: Number(editing.moq ?? 1),
        leadTimeDays: Number(editing.leadTimeDays ?? 0),
        active: editing.active,
      })
      setSupplierSkuTouched(true)
      lastAutoKey.current = ''
    } else {
      setForm(blankForm(kind, ownerId))
      setSupplierSkuTouched(false)
      lastAutoKey.current = ''
    }
  }, [editing, kind, open, ownerId])

  useEffect(() => {
    if (!open || editing || supplierSkuTouched) return
    if (!form.productId || !form.supplierId) return
    const product = products.find((p) => p.id === form.productId)
    const supplier = suppliers.find((s) => s.id === form.supplierId)
    const autoKey = `${form.productId}:${form.supplierId}`
    if (lastAutoKey.current === autoKey) return
    lastAutoKey.current = autoKey
    const source = [
      product?.sku || product?.name || 'ITEM',
      supplier?.supplierCode || supplier?.companyName || 'SUP',
    ].join('-')
    setForm((current) => ({ ...current, supplierSku: generateEntityCode(source, 'SSKU') }))
  }, [editing, form.productId, form.supplierId, open, products, supplierSkuTouched, suppliers])

  const save = async () => {
    if (!form.productId || !form.supplierId) {
      toast.error(`Select a ${kind === 'products' ? 'supplier' : 'product'}`)
      return
    }
    try {
      const payload = {
        productId: form.productId,
        supplierId: form.supplierId,
        purchasePrice: form.purchasePrice,
        supplierSku: form.supplierSku || undefined,
        preferred: form.preferred,
        moq: form.moq || undefined,
        leadTimeDays: form.leadTimeDays,
        active: form.active,
      }
      if (editing) await supplierCatalogApi.update(editing.supplierId, editing.id, payload)
      else if (kind === 'products') await supplierCatalogApi.createForProduct(ownerId, payload)
      else await supplierCatalogApi.create(ownerId, payload)
      await queryClient.invalidateQueries({ queryKey })
      setOpen(false)
      setEditing(null)
      toast.success(editing ? 'Catalog item updated' : 'Catalog item added')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to save catalog item'))
    }
  }

  const remove = async (row: SupplierCatalogItemResponse) => {
    if (!window.confirm(`Remove ${row.productName} from this supplier catalog?`)) return
    try {
      await supplierCatalogApi.remove(row.supplierId, row.id)
      await queryClient.invalidateQueries({ queryKey })
      toast.success('Catalog item removed')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to remove catalog item'))
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div>
            <h2 className="font-semibold text-slate-900">Supplier pricing / Catalog</h2>
            <p className="text-xs text-slate-500">
              Supplier-specific prices, SKUs and lead times used on purchase orders.
              {rows.length ? ` ${rows.length} supplier${rows.length === 1 ? '' : 's'} linked.` : ''}
            </p>
          </div>
          {canWrite && (
            <Button
              size="sm"
              onClick={() => {
                setEditing(null)
                setOpen(true)
              }}
            >
              <Plus className="size-4" />
              Add link
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <thead>
              <tr className="border-b">
                <th className="p-3 text-xs text-slate-500">{kind === 'products' ? 'SUPPLIER' : 'PRODUCT'}</th>
                <th className="p-3 text-xs text-slate-500">SUPPLIER SKU</th>
                <th className="p-3 text-xs text-slate-500">PRICE</th>
                <th className="p-3 text-xs text-slate-500">MOQ / LEAD</th>
                <th className="p-3 text-xs text-slate-500">STATUS</th>
                {canWrite && <th />}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b">
                  <td className="p-3">
                    <Link
                      className="font-medium text-teal-700 hover:underline"
                      to={kind === 'products' ? `/suppliers/${row.supplierId}` : `/products/${row.productId}`}
                    >
                      {kind === 'products' ? row.supplierName : row.productName}
                    </Link>
                    {kind === 'suppliers' && row.itemType === 'SERVICE' ? (
                      <Badge className="ml-2 bg-sky-50 text-sky-800">Service</Badge>
                    ) : null}
                  </td>
                  <td className="p-3">{row.supplierSku || '—'}</td>
                  <td className="p-3">{currency(row.purchasePrice)}</td>
                  <td className="p-3">
                    {row.moq ?? '—'} / {row.leadTimeDays ?? 0} days
                  </td>
                  <td className="p-3">
                    <Badge variant={row.active ? 'success' : 'neutral'}>
                      {row.preferred ? 'Preferred · ' : ''}
                      {row.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  {canWrite && (
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditing(row)
                            setOpen(true)
                          }}
                        >
                          Edit
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => remove(row)}>
                          <Trash2 className="size-4 text-rose-500" />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={canWrite ? 6 : 5} className="py-12 text-center text-sm text-slate-500">
                    No supplier catalog links yet. Add at least one supplier price so this item can be purchased on POs.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>{editing ? 'Edit catalog item' : 'Add catalog item'}</DialogTitle>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>{kind === 'products' ? 'Supplier' : 'Product'}</Label>
              <Select
                disabled={!!editing}
                value={kind === 'products' ? form.supplierId : form.productId}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    [kind === 'products' ? 'supplierId' : 'productId']: value,
                  }))
                }
              >
                <SelectTrigger>
                  {kind === 'products'
                    ? (suppliers.find((row) => row.id === form.supplierId)?.supplierName ?? 'Select supplier')
                    : (products.find((row) => row.id === form.productId)?.name ?? 'Select product')}
                </SelectTrigger>
                <SelectContent>
                  {(kind === 'products' ? suppliers : products).map((row) => (
                    <SelectItem key={row.id} value={row.id}>
                      {'supplierName' in row ? row.supplierName : row.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Purchase price</Label>
              <NumberInput
                value={form.purchasePrice}
                onValueChange={(purchasePrice) => setForm((v) => ({ ...v, purchasePrice }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Supplier SKU</Label>
              <Input
                value={form.supplierSku}
                onChange={(e) => {
                  setSupplierSkuTouched(true)
                  setForm((v) => ({ ...v, supplierSku: e.target.value }))
                }}
              />
              <p className="text-[11px] text-slate-400">Auto-generated unique SKU — you can change it.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Minimum order quantity</Label>
              <NumberInput value={form.moq} onValueChange={(moq) => setForm((v) => ({ ...v, moq }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Lead time (days)</Label>
              <NumberInput
                value={form.leadTimeDays}
                onValueChange={(leadTimeDays) => setForm((v) => ({ ...v, leadTimeDays }))}
              />
            </div>
            <label className="flex items-center justify-between gap-3 text-sm text-slate-700">
              Preferred supplier
              <Switch checked={form.preferred} onCheckedChange={(preferred) => setForm((v) => ({ ...v, preferred }))} />
            </label>
            <label className="flex items-center justify-between gap-3 text-sm text-slate-700">
              Active
              <Switch checked={form.active} onCheckedChange={(active) => setForm((v) => ({ ...v, active }))} />
            </label>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save}>Save catalog item</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
