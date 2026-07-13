import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { inventoryApi, productApi, warehouseApi } from '@/services/api'
import { getApiErrorMessage } from '@/lib/api-error'
import {
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

export function InventoryPage() {
  const { data: lowStock = [] } = useQuery({
    queryKey: ['inventory', 'low-stock'],
    queryFn: inventoryApi.lowStockAlerts,
  })
  const { data: reorder = [] } = useQuery({ queryKey: ['inventory', 'reorder'], queryFn: inventoryApi.reorderAlerts })
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Inventory overview</h1>
        <p className="mt-1 text-sm text-slate-500">Monitor stock health across warehouses.</p>
      </div>
      <section className="grid gap-4 sm:grid-cols-3">
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
            <p className="mt-2 text-2xl font-semibold text-slate-900">{lowStock.length + reorder.length}</p>
          </CardContent>
        </Card>
      </section>
      <Card>
        <CardContent className="p-4">
          <Table>
            <thead>
              <tr className="border-b">
                <th className="p-3 text-xs text-slate-500">PRODUCT</th>
                <th className="p-3 text-xs text-slate-500">AVAILABLE</th>
                <th className="p-3 text-xs text-slate-500">THRESHOLD</th>
              </tr>
            </thead>
            <tbody>
              {lowStock.map((alert) => (
                <tr key={alert.productId} className="border-b">
                  <td className="p-3">{alert.productName}</td>
                  <td className="p-3">{alert.available}</td>
                  <td className="p-3">{alert.threshold}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>
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
  mode?: 'adjustment' | 'transfer'
}) {
  const [productId, setProductId] = useState('')
  const [warehouseId, setWarehouseId] = useState('')
  const [fromWarehouseId, setFromWarehouseId] = useState('')
  const [toWarehouseId, setToWarehouseId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: () => productApi.list({ size: 100 }) })
  const { data: warehouses = [] } = useQuery({ queryKey: ['warehouses'], queryFn: warehouseApi.list })

  const submit = async () => {
    try {
      if (mode === 'transfer') {
        await inventoryApi.transfer({ productId, fromWarehouseId, toWarehouseId, quantity })
        toast.success('Stock transferred')
      } else if (mode === 'adjustment') {
        await inventoryApi.adjust({ productId, warehouseId, quantity })
        toast.success('Stock adjusted')
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      {mode ? (
        <Card>
          <CardContent className="grid gap-4 p-6">
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
            </div>
            {mode === 'adjustment' && (
              <div className="space-y-1.5">
                <Label>Warehouse</Label>
                <Select value={warehouseId} onValueChange={setWarehouseId}>
                  <SelectTrigger>
                    {warehouses.find((w) => w.id === warehouseId)?.warehouseName ?? 'Select warehouse'}
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
            )}
            {mode === 'transfer' && (
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
            )}
            <div className="space-y-1.5">
              <Label>Quantity</Label>
              <Input type="number" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} />
            </div>
            <Button onClick={submit}>Submit</Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-20 text-center text-sm text-slate-500">
            Select a product and warehouse from inventory screens to inspect ledger entries.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
