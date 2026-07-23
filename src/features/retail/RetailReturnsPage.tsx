import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { PageHeader, PageShell } from '@/components/layout/PageChrome'
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
} from '@/components/ui'
import { productApi, retailApi } from '@/services/api'
import type { RetailRefundMode, RetailReturnReason } from '@/types/api'
import { RetailModuleGate } from './RetailModuleGate'

const REASONS: RetailReturnReason[] = [
  'DAMAGED',
  'DEFECTIVE',
  'WRONG_ITEM',
  'SIZE_ISSUE',
  'NOT_SATISFIED',
  'EXCHANGE',
  'OTHER',
]
const REFUND_MODES: RetailRefundMode[] = ['REFUND', 'STORE_CREDIT', 'EXCHANGE', 'GIFT_CARD']

export function RetailReturnsPage() {
  const queryClient = useQueryClient()
  const stores = useQuery({ queryKey: ['retail', 'stores'], queryFn: () => retailApi.stores.list() })
  const products = useQuery({
    queryKey: ['products', 'retail-returns'],
    queryFn: () => productApi.list({ active: true, size: 100 }),
  })
  const returns = useQuery({ queryKey: ['retail', 'returns'], queryFn: () => retailApi.returns.list() })

  const [storeId, setStoreId] = useState('')
  const [reason, setReason] = useState<RetailReturnReason>('NOT_SATISFIED')
  const [refundMode, setRefundMode] = useState<RetailRefundMode>('REFUND')
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [rate, setRate] = useState('')
  const [notes, setNotes] = useState('')

  const submit = async () => {
    if (!storeId) return toast.error('Store is required')
    if (!productId) return toast.error('Product is required')
    const qty = Number(quantity)
    const unitRate = Number(rate)
    if (!qty || qty <= 0) return toast.error('Enter a valid quantity')
    if (Number.isNaN(unitRate) || unitRate < 0) return toast.error('Enter a valid rate')
    try {
      await retailApi.returns.create({
        storeId,
        reason,
        refundMode,
        notes: notes || undefined,
        lines: [{ productId, quantity: qty, rate: unitRate }],
      })
      await queryClient.invalidateQueries({ queryKey: ['retail', 'returns'] })
      toast.success('Return created')
      setNotes('')
      setQuantity('1')
      setRate('')
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }

  return (
    <RetailModuleGate title="Returns">
      <PageShell>
        <PageHeader title="Returns" subtitle="Create POS returns and refunds." />
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="space-y-1.5">
                <Label>Store</Label>
                <Select value={storeId} onValueChange={setStoreId}>
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
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Reason</Label>
                  <Select value={reason} onValueChange={(v) => setReason(v as RetailReturnReason)}>
                    <SelectTrigger>{reason}</SelectTrigger>
                    <SelectContent>
                      {REASONS.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item.replaceAll('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Refund mode</Label>
                  <Select value={refundMode} onValueChange={(v) => setRefundMode(v as RetailRefundMode)}>
                    <SelectTrigger>{refundMode}</SelectTrigger>
                    <SelectContent>
                      {REFUND_MODES.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item.replaceAll('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Product</Label>
                <Select
                  value={productId}
                  onValueChange={(value) => {
                    setProductId(value)
                    const product = products.data?.find((p) => p.id === value)
                    if (product) setRate(String(product.sellingPrice ?? 0))
                  }}
                >
                  <SelectTrigger>
                    {products.data?.find((p) => p.id === productId)?.name ?? 'Select product'}
                  </SelectTrigger>
                  <SelectContent>
                    {(products.data ?? []).map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Quantity</Label>
                  <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} min={0.01} />
                </div>
                <div className="space-y-1.5">
                  <Label>Rate</Label>
                  <Input type="number" value={rate} onChange={(e) => setRate(e.target.value)} min={0} step="0.01" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <Button onClick={() => void submit()}>Create return</Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 p-5">
              <h2 className="text-sm font-semibold text-slate-900">Recent returns</h2>
              {(returns.data ?? []).slice(0, 12).map((row) => (
                <div key={row.id} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">{row.reason.replaceAll('_', ' ')}</span>
                    <span className="font-mono">{Number(row.totalAmount).toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {row.status} · {row.lines?.length ?? 0} line(s)
                  </p>
                </div>
              ))}
              {!returns.data?.length && <p className="text-sm text-slate-500">No returns yet.</p>}
            </CardContent>
          </Card>
        </div>
      </PageShell>
    </RetailModuleGate>
  )
}
