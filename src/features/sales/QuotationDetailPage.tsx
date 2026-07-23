import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageChrome'
import { customerApi, salesApi } from '@/services/api'
import { getApiErrorMessage, notifyWorkflowApproval } from '@/lib/api-error'
import { currency, quantity as formatQty } from '@/lib/utils'
import { Badge, Button, Card, CardContent, CardHeader, Table } from '@/components/ui'

type SalesLine = {
  id?: string
  productId?: string
  description?: string
  quantity?: number | string
  rate?: number | string
  discountPercent?: number | string
  taxRate?: number | string
  lineTotal?: number | string
  hsnSacCode?: string
}

type QuotationDoc = {
  id: string
  quotationNumber: string
  quotationDate: string
  expiryDate?: string
  customerId: string
  status: string
  placeOfSupply?: string
  billingAddress?: string
  shippingAddress?: string
  notes?: string
  termsAndConditions?: string
  subtotal?: number
  discountTotal?: number
  taxTotal?: number
  grandTotal?: number
  convertedToOrderId?: string
  items?: SalesLine[]
}

function money(value: unknown) {
  const n = Number(value ?? 0)
  return currency(Number.isFinite(n) ? n : 0)
}

export function QuotationDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data, isLoading, refetch, error } = useQuery({
    queryKey: ['quotation', id],
    queryFn: () => salesApi.getQuotation(id) as Promise<QuotationDoc>,
    enabled: !!id,
  })

  const { data: customer } = useQuery({
    queryKey: ['customers', data?.customerId],
    queryFn: () => customerApi.get(String(data?.customerId)),
    enabled: !!data?.customerId,
  })

  const convert = async () => {
    try {
      const order = await salesApi.convertQuotationToOrder(id)
      await queryClient.invalidateQueries({ queryKey: ['quotation', id] })
      await queryClient.invalidateQueries({ queryKey: ['quotations'] })
      await queryClient.invalidateQueries({ queryKey: ['orders'] })
      toast.success('Quotation converted to sales order')
      if (order?.id) navigate(`/sales/orders/${String(order.id)}`)
    } catch (err) {
      if (notifyWorkflowApproval(err)) return
      toast.error(getApiErrorMessage(err))
    }
  }

  const cancel = async () => {
    try {
      await salesApi.cancelQuotation(id)
      await queryClient.invalidateQueries({ queryKey: ['quotation', id] })
      await queryClient.invalidateQueries({ queryKey: ['quotations'] })
      toast.success('Quotation cancelled')
    } catch (err) {
      toast.error(getApiErrorMessage(err))
    }
  }

  if (isLoading) {
    return <p className="py-20 text-center text-sm text-slate-500">Loading quotation…</p>
  }
  if (error || !data) {
    return <p className="py-20 text-center text-sm text-rose-600">Unable to load quotation.</p>
  }

  const status = String(data.status ?? 'DRAFT')
  const cancelled = status === 'CANCELLED'
  const converted = status === 'CONVERTED' || !!data.convertedToOrderId
  const items = data.items ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.quotationNumber}
        subtitle={`Quotation · ${data.quotationDate}`}
        actions={
          <>
            <Badge>{status}</Badge>
            <Button variant="outline" className="cursor-pointer" onClick={() => refetch()}>
              <RefreshCw className="size-4" />
              Refresh
            </Button>
            {data.convertedToOrderId ? (
              <Link to={`/sales/orders/${data.convertedToOrderId}`}>
                <Button variant="outline" className="cursor-pointer">
                  View sales order
                </Button>
              </Link>
            ) : (
              <Button className="cursor-pointer" onClick={convert} disabled={cancelled || converted}>
                Convert to order
              </Button>
            )}
            {!cancelled && !converted && (
              <Button variant="outline" className="cursor-pointer" onClick={cancel}>
                Cancel
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardContent className="grid gap-5 p-6 sm:grid-cols-2">
              <Detail
                label="Customer"
                value={customer?.companyName ?? customer?.customerName ?? String(data.customerId ?? '—')}
              />
              <Detail label="Quotation date" value={data.quotationDate} />
              <Detail label="Expiry" value={data.expiryDate ?? '—'} />
              <Detail label="Place of supply" value={data.placeOfSupply ?? '—'} />
              <div className="sm:col-span-2">
                <Detail label="Billing address" value={data.billingAddress ?? '—'} />
              </div>
              <div className="sm:col-span-2">
                <Detail label="Shipping address" value={data.shippingAddress ?? '—'} />
              </div>
              <div className="sm:col-span-2">
                <Detail label="Notes" value={data.notes ?? '—'} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="font-semibold">Line items</h2>
            </CardHeader>
            <CardContent>
              <Table>
                <thead>
                  <tr className="border-b">
                    <th className="p-3 text-xs text-slate-500">ITEM</th>
                    <th className="p-3 text-right text-xs text-slate-500">QTY</th>
                    <th className="p-3 text-right text-xs text-slate-500">RATE</th>
                    <th className="p-3 text-right text-xs text-slate-500">DISC %</th>
                    <th className="p-3 text-right text-xs text-slate-500">TAX %</th>
                    <th className="p-3 text-right text-xs text-slate-500">AMOUNT</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length ? (
                    items.map((item, idx) => (
                      <tr key={item.id ?? idx} className="border-b">
                        <td className="p-3">
                          <div className="font-medium text-slate-800">{item.description || '—'}</div>
                          {item.hsnSacCode ? <div className="text-xs text-slate-400">HSN {item.hsnSacCode}</div> : null}
                        </td>
                        <td className="p-3 text-right tabular-nums">{formatQty(item.quantity)}</td>
                        <td className="p-3 text-right tabular-nums">{money(item.rate)}</td>
                        <td className="p-3 text-right tabular-nums">{formatQty(item.discountPercent ?? 0)}</td>
                        <td className="p-3 text-right tabular-nums">{formatQty(item.taxRate ?? 0)}</td>
                        <td className="p-3 text-right tabular-nums font-medium">{money(item.lineTotal)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-sm text-slate-500">
                        No line items
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <h2 className="font-semibold">Totals</h2>
          </CardHeader>
          <CardContent className="space-y-3 p-6 text-sm">
            <TotalRow label="Subtotal" value={money(data.subtotal)} />
            <TotalRow label="Discount" value={`−${money(data.discountTotal)}`} />
            <TotalRow label="Tax" value={money(data.taxTotal)} />
            <div className="border-t border-slate-100 pt-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900">Grand total</span>
                <span className="font-[family-name:var(--font-display)] text-xl font-semibold text-slate-900">
                  {money(data.grandTotal)}
                </span>
              </div>
            </div>
            {data.termsAndConditions ? (
              <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
                <p className="mb-1 font-semibold uppercase tracking-wide text-slate-400">Terms</p>
                {data.termsAndConditions}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm font-medium text-slate-800">{value}</p>
    </div>
  )
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-slate-600">
      <span>{label}</span>
      <b className="tabular-nums text-slate-900">{value}</b>
    </div>
  )
}
