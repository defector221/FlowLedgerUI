import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Printer } from 'lucide-react'
import { PageHeader, PageShell } from '@/components/layout/PageChrome'
import { getApiErrorMessage } from '@/lib/api-error'
import { Button, Card, CardContent } from '@/components/ui'
import { cn } from '@/lib/utils'
import { retailApi, salesApi } from '@/services/api'
import type { PosSale, PosSaleStatus, RetailStore } from '@/types/api'
import { toast } from 'sonner'
import { useAuth } from '@/features/auth/auth'
import { RetailModuleGate } from './RetailModuleGate'
import { PosReceiptActions } from './PosReceipt'

const STATUS_FILTERS: Array<PosSaleStatus | 'ALL'> = ['ALL', 'COMPLETED', 'HELD', 'DRAFT', 'VOID']

export function PosSalesPage() {
  const { organization } = useAuth()
  const [status, setStatus] = useState<PosSaleStatus | 'ALL'>('COMPLETED')
  const [storeId, setStoreId] = useState('')
  const [receiptSale, setReceiptSale] = useState<PosSale | null>(null)

  const stores = useQuery({ queryKey: ['retail', 'stores'], queryFn: () => retailApi.stores.list() })
  const sales = useQuery({
    queryKey: ['retail', 'pos', 'sales', status],
    queryFn: () => retailApi.pos.listSales(status === 'ALL' ? undefined : status),
  })

  const storeById = useMemo(() => {
    const map = new Map<string, RetailStore>()
    for (const store of stores.data ?? []) map.set(store.id, store)
    return map
  }, [stores.data])

  const rows = useMemo(() => {
    const list = sales.data ?? []
    return storeId ? list.filter((s) => s.storeId === storeId) : list
  }, [sales.data, storeId])

  const printInvoicePdf = async (sale: PosSale) => {
    if (!sale.salesInvoiceId) return toast.error('No invoice linked')
    try {
      const blob = await salesApi.downloadInvoicePdf(sale.salesInvoiceId)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `pos-bill-${sale.billNumber || sale.id.slice(0, 8)}.pdf`
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }

  const receiptStore = receiptSale ? storeById.get(receiptSale.storeId) : undefined

  return (
    <RetailModuleGate title="POS Sales">
      <PageShell>
        <PageHeader
          title="POS Sales"
          subtitle="Completed counter sales, held carts, and voids. Print a bill anytime."
          actions={
            <Button asChild>
              <Link to="/retail/pos">Open POS</Link>
            </Button>
          }
        />

        <div className="mb-4 flex flex-wrap gap-2">
          {STATUS_FILTERS.map((value) => (
            <Button
              key={value}
              size="sm"
              variant={status === value ? 'default' : 'outline'}
              onClick={() => setStatus(value)}
            >
              {value}
            </Button>
          ))}
          <select
            className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm"
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            aria-label="Filter store"
          >
            <option value="">All stores</option>
            {(stores.data ?? []).map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </div>

        <Card>
          <CardContent className="p-0">
            {sales.isLoading ? (
              <p className="p-6 text-sm text-slate-500">Loading POS sales…</p>
            ) : sales.isError ? (
              <p className="p-6 text-sm text-rose-600">{getApiErrorMessage(sales.error)}</p>
            ) : !rows.length ? (
              <p className="p-6 text-sm text-slate-500">No POS sales for this filter.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Bill</th>
                      <th className="px-4 py-3 font-medium">Store</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Items</th>
                      <th className="px-4 py-3 font-medium">Total</th>
                      <th className="px-4 py-3 font-medium">When</th>
                      <th className="px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((sale) => (
                      <tr key={sale.id} className="border-b border-slate-100 last:border-0">
                        <td className="px-4 py-3 font-mono text-xs">{sale.billNumber || sale.id.slice(0, 8)}</td>
                        <td className="px-4 py-3">{storeById.get(sale.storeId)?.name ?? '—'}</td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-xs font-medium',
                              sale.status === 'COMPLETED' && 'bg-emerald-50 text-emerald-700',
                              sale.status === 'HELD' && 'bg-amber-50 text-amber-700',
                              sale.status === 'VOID' && 'bg-rose-50 text-rose-700',
                              sale.status === 'DRAFT' && 'bg-slate-100 text-slate-600',
                            )}
                          >
                            {sale.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">{sale.lines?.length ?? 0}</td>
                        <td className="px-4 py-3 font-mono">{Number(sale.grandTotal ?? 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-slate-500">
                          {sale.completedAt ? new Date(sale.completedAt).toLocaleString() : sale.heldLabel || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="outline" onClick={() => setReceiptSale(sale)}>
                              <Printer className="size-3.5" />
                              Bill
                            </Button>
                            {sale.salesInvoiceId ? (
                              <Button size="sm" variant="ghost" onClick={() => void printInvoicePdf(sale)}>
                                PDF
                              </Button>
                            ) : null}
                            {sale.salesInvoiceId ? (
                              <Button size="sm" variant="ghost" asChild>
                                <Link to={`/sales/invoices/${sale.salesInvoiceId}`}>Invoice</Link>
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {receiptSale ? (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
            <Card className="w-full max-w-md shadow-2xl">
              <CardContent className="space-y-3 p-5">
                <h2 className="text-lg font-semibold">POS bill</h2>
                <PosReceiptActions
                  sale={receiptSale}
                  store={receiptStore}
                  gstin={organization?.gstin}
                  legalName={organization?.legalName || organization?.name}
                  onClose={() => setReceiptSale(null)}
                />
              </CardContent>
            </Card>
          </div>
        ) : null}
      </PageShell>
    </RetailModuleGate>
  )
}
