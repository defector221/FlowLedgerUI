import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { supplierApi } from '@/services/api'
import { generateEntityCode } from '@/lib/entity-code'
import {
  Button,
  Input,
  Label,
  NumberInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Switch,
} from '@/components/ui'

export type SupplierPriceDraft = {
  key: string
  supplierId: string
  purchasePrice: number
  supplierSku: string
  preferred: boolean
  moq: number
  leadTimeDays: number
  skuTouched: boolean
}

function blankRow(preferred = false): SupplierPriceDraft {
  return {
    key: crypto.randomUUID(),
    supplierId: '',
    purchasePrice: 0,
    supplierSku: '',
    preferred,
    moq: 1,
    leadTimeDays: 0,
    skuTouched: false,
  }
}

export function CreateSupplierPricingEditor({
  productSku,
  productName,
  value,
  onChange,
}: {
  productSku?: string
  productName?: string
  value: SupplierPriceDraft[]
  onChange: (rows: SupplierPriceDraft[]) => void
}) {
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers', 'catalog-options'],
    queryFn: () => supplierApi.list({ archived: false, size: 200 }),
  })

  useEffect(() => {
    if (value.length) return
    onChange([blankRow(true)])
    // Seed once when parent mounts with empty list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const updateRow = (key: string, patch: Partial<SupplierPriceDraft>) => {
    onChange(value.map((row) => (row.key === key ? { ...row, ...patch } : row)))
  }

  const refreshSku = (row: SupplierPriceDraft, supplierId: string) => {
    if (row.skuTouched) return row.supplierSku
    const supplier = suppliers.find((s) => s.id === supplierId)
    const source = [productSku || productName || 'ITEM', supplier?.supplierCode || supplier?.companyName || 'SUP']
      .filter(Boolean)
      .join('-')
    return generateEntityCode(source, 'SSKU')
  }

  return (
    <div className="col-span-full space-y-3 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Supplier pricing</h3>
          <p className="text-xs text-slate-500">
            Purchasing source of truth. Reference purchase price above is only a fallback.
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={() => onChange([...value, blankRow()])}>
          <Plus className="size-4" />
          Add supplier
        </Button>
      </div>
      {value.map((row, index) => (
        <div key={row.key} className="grid gap-3 rounded-md border border-slate-200 bg-white p-3 sm:grid-cols-6">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Supplier</Label>
            <Select
              value={row.supplierId}
              onValueChange={(supplierId) =>
                updateRow(row.key, {
                  supplierId,
                  supplierSku: refreshSku(row, supplierId),
                  preferred: index === 0 ? true : row.preferred,
                })
              }
            >
              <SelectTrigger>
                {suppliers.find((s) => s.id === row.supplierId)?.companyName ?? 'Select supplier'}
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.companyName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Price</Label>
            <NumberInput
              value={row.purchasePrice}
              onValueChange={(purchasePrice) => updateRow(row.key, { purchasePrice })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Supplier SKU</Label>
            <Input
              value={row.supplierSku}
              onChange={(e) => updateRow(row.key, { supplierSku: e.target.value, skuTouched: true })}
            />
            <p className="text-[11px] text-slate-400">Auto-generated unique SKU — you can change it.</p>
          </div>
          <div className="space-y-1.5">
            <Label>MOQ</Label>
            <NumberInput value={row.moq} onValueChange={(moq) => updateRow(row.key, { moq })} />
          </div>
          <div className="space-y-1.5">
            <Label>Lead days</Label>
            <NumberInput
              value={row.leadTimeDays}
              onValueChange={(leadTimeDays) => updateRow(row.key, { leadTimeDays })}
            />
          </div>
          <div className="flex items-end justify-between gap-2 sm:col-span-6">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              Preferred
              <Switch
                checked={row.preferred}
                onCheckedChange={(preferred) => {
                  onChange(
                    value.map((item) =>
                      item.key === row.key ? { ...item, preferred } : preferred ? { ...item, preferred: false } : item,
                    ),
                  )
                }}
              />
            </label>
            {value.length > 1 ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => onChange(value.filter((item) => item.key !== row.key))}
              >
                <Trash2 className="size-4 text-rose-500" />
              </Button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  )
}

export function toSupplierPricePayload(rows: SupplierPriceDraft[]) {
  return rows
    .filter((row) => row.supplierId)
    .map((row) => ({
      supplierId: row.supplierId,
      purchasePrice: row.purchasePrice,
      supplierSku: row.supplierSku || undefined,
      preferred: row.preferred,
      moq: row.moq || undefined,
      leadTimeDays: row.leadTimeDays,
    }))
}
