import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { Badge, Button, Card, CardContent, CardHeader, Skeleton, Table } from '@/components/ui'
import { customerApi, paymentApi, purchaseApi, salesApi, supplierApi } from '@/services/api'
import { getApiErrorMessage } from '@/lib/api-error'
import { currency, quantity as formatQty } from '@/lib/utils'
import { PartySelectLabel } from '@/components/party/PartySelectLabel'

function formatMoney(value: unknown) {
  const amount = typeof value === 'number' ? value : Number(value ?? 0)
  return currency(Number.isFinite(amount) ? amount : 0)
}

export function SalesInvoiceDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data, isLoading, error } = useQuery({
    queryKey: ['sales-invoice', id],
    queryFn: () => salesApi.getInvoice(id),
    enabled: !!id,
  })
  const { data: customer } = useQuery({
    queryKey: ['customers', data?.customerId],
    queryFn: () => customerApi.get(String(data?.customerId)),
    enabled: !!data?.customerId,
  })

  const confirmInvoice = async () => {
    try {
      await salesApi.confirmInvoice(id)
      await queryClient.invalidateQueries({ queryKey: ['sales-invoice', id] })
      await queryClient.invalidateQueries({ queryKey: ['invoices'] })
      await queryClient.invalidateQueries({ queryKey: ['inventory'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Invoice confirmed')
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Unable to confirm invoice'))
    }
  }

  const cancelInvoice = async () => {
    try {
      await salesApi.cancelInvoice(id)
      await queryClient.invalidateQueries({ queryKey: ['sales-invoice', id] })
      await queryClient.invalidateQueries({ queryKey: ['invoices'] })
      await queryClient.invalidateQueries({ queryKey: ['inventory'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Invoice cancelled')
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Unable to cancel invoice'))
    }
  }

  const downloadPdf = async () => {
    try {
      const blob = await salesApi.downloadInvoicePdf(id)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `invoice-${data?.invoiceNumber || id}.pdf`
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Unable to download PDF'))
    }
  }

  const sendReminder = async () => {
    if (!customer?.email?.trim()) {
      toast.error('Customer has no email address; reminder cannot be sent')
      return
    }
    try {
      await paymentApi.sendReminder(id)
      toast.success('Payment reminder sent')
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Unable to send reminder'))
    }
  }

  if (isLoading) return <Skeleton className="h-48 w-full" />
  if (error || !data) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-rose-600">Invoice not found.</CardContent>
      </Card>
    )
  }

  const isDraft = data.status === 'DRAFT'
  const isCancelled = data.status === 'CANCELLED'
  const outstanding = Number(data.outstandingAmount ?? 0)
  const canCollect = !isDraft && !isCancelled && outstanding > 0
  const items = data.items ?? []
  const hasStockedLines = items.some((item) => (item.itemType ?? 'PRODUCT') !== 'SERVICE')
  const taxTotal =
    Number(data.cgstTotal ?? 0) + Number(data.sgstTotal ?? 0) + Number(data.igstTotal ?? 0)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sales invoice</p>
          <h1 className="font-display text-2xl font-semibold text-slate-900">
            {data.invoiceNumber || 'Draft invoice'}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{data.status}</Badge>
          {isDraft && (
            <>
              <Button variant="outline" onClick={() => navigate(`/sales/invoices/${id}/edit`)}>
                Edit
              </Button>
              <Button onClick={confirmInvoice}>Confirm invoice</Button>
            </>
          )}
          {canCollect && (
            <>
              <Button
                onClick={() =>
                  navigate(
                    `/payments/received/new?customerId=${data.customerId}&invoiceId=${id}&amount=${outstanding}`,
                  )
                }
              >
                Record payment
              </Button>
              <Button variant="outline" onClick={sendReminder}>
                Send reminder
              </Button>
            </>
          )}
          <Button variant="outline" onClick={downloadPdf}>
            <Download className="size-4" />
            PDF
          </Button>
          {!isCancelled && (
            <Button variant="outline" onClick={cancelInvoice}>
              Cancel
            </Button>
          )}
          <Link
            to="/sales/invoices"
            className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-teal-50/60"
          >
            Back to list
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <p className="text-sm font-semibold text-slate-800">Summary</p>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
          <p>Date: {data.invoiceDate}</p>
          <p>Payment: {data.paymentStatus}</p>
          <p>Due: {data.dueDate ?? '—'}</p>
          <p>
            Customer:{' '}
            {customer ? (
              <Link className="font-medium text-teal-700 hover:underline" to={`/customers/${customer.id}`}>
                <PartySelectLabel party={customer} />
              </Link>
            ) : (
              data.customerId
            )}
          </p>
          <p>
            Warehouse:{' '}
            {data.warehouseName
              ? data.warehouseName
              : hasStockedLines
                ? '—'
                : 'Not applicable (services only)'}
          </p>
          <p>Due date: {data.dueDate || '—'}</p>
          <p className="font-semibold text-slate-900">Outstanding: {formatMoney(outstanding)}</p>
          <p>Grand total: {formatMoney(data.grandTotal)}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <p className="text-sm font-semibold text-slate-800">Line items</p>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table className="min-w-[48rem]">
            <thead>
              <tr className="border-b bg-slate-50/80">
                <th className="p-3 text-left text-xs font-semibold text-slate-500">ITEM</th>
                <th className="p-3 text-left text-xs font-semibold text-slate-500">TYPE</th>
                <th className="p-3 text-right text-xs font-semibold text-slate-500">QTY</th>
                <th className="p-3 text-right text-xs font-semibold text-slate-500">RATE</th>
                <th className="p-3 text-right text-xs font-semibold text-slate-500">DISC %</th>
                <th className="p-3 text-right text-xs font-semibold text-slate-500">TAX %</th>
                <th className="p-3 text-left text-xs font-semibold text-slate-500">WAREHOUSE</th>
                <th className="p-3 text-right text-xs font-semibold text-slate-500">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {items.length ? (
                items.map((item, index) => {
                  const isService = (item.itemType ?? 'PRODUCT') === 'SERVICE'
                  return (
                    <tr key={item.id ?? `${item.productId}-${index}`} className="border-b last:border-0">
                      <td className="p-3">
                        <div className="font-medium text-slate-900">{item.productName || item.productId}</div>
                        {item.unitName ? <div className="text-xs text-slate-500">{item.unitName}</div> : null}
                      </td>
                      <td className="p-3 text-slate-600">{isService ? 'Service' : 'Product'}</td>
                      <td className="p-3 text-right tabular-nums">{formatQty(item.quantity)}</td>
                      <td className="p-3 text-right tabular-nums">{formatMoney(item.rate)}</td>
                      <td className="p-3 text-right tabular-nums">{formatQty(item.discountPercent ?? 0)}</td>
                      <td className="p-3 text-right tabular-nums">{formatQty(item.taxRate ?? 0)}</td>
                      <td className="p-3 text-slate-600">
                        {isService ? '—' : item.warehouseName || data.warehouseName || '—'}
                      </td>
                      <td className="p-3 text-right font-medium tabular-nums text-slate-900">
                        {formatMoney(item.lineTotal ?? item.quantity * item.rate)}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={8} className="p-4 text-sm text-slate-500">
                    No line items.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <p className="text-sm font-semibold text-slate-800">Totals</p>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-600 sm:max-w-sm sm:ml-auto">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <b>{currency(Number(data.subtotal ?? 0))}</b>
          </div>
          <div className="flex justify-between">
            <span>Discount</span>
            <b>−{currency(Number(data.discountTotal ?? 0))}</b>
          </div>
          <div className="flex justify-between">
            <span>Tax</span>
            <b>{currency(taxTotal)}</b>
          </div>
          <div className="flex justify-between">
            <span>Shipping</span>
            <b>{currency(Number(data.shippingCharges ?? 0))}</b>
          </div>
          <div className="flex justify-between border-t pt-2 text-base font-semibold text-slate-900">
            <span>Grand total</span>
            <span>{currency(Number(data.grandTotal ?? 0))}</span>
          </div>
        </CardContent>
      </Card>

      {data.notes ? (
        <Card>
          <CardHeader>
            <p className="text-sm font-semibold text-slate-800">Notes</p>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">{data.notes}</CardContent>
        </Card>
      ) : null}
    </div>
  )
}

export function PurchaseInvoiceDetailPage() {
  const { id = '' } = useParams()
  const { data, isLoading, error } = useQuery({
    queryKey: ['purchase-invoice', id],
    queryFn: () => purchaseApi.getInvoice(id),
    enabled: !!id,
  })
  const supplierId = data?.supplierId ? String(data.supplierId) : ''
  const { data: supplier } = useQuery({
    queryKey: ['suppliers', supplierId],
    queryFn: () => supplierApi.get(supplierId),
    enabled: !!supplierId,
  })

  if (isLoading) return <Skeleton className="h-48 w-full" />
  if (error || !data) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-rose-600">Purchase invoice not found.</CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Purchase invoice</p>
          <h1 className="font-display text-2xl font-semibold text-slate-900">
            {String(data.invoiceNumber ?? 'Purchase invoice')}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge>{String(data.status ?? 'DRAFT')}</Badge>
          <Link
            to="/purchases/invoices"
            className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-teal-50/60"
          >
            Back to list
          </Link>
        </div>
      </div>
      <Card>
        <CardHeader>
          <p className="text-sm font-semibold text-slate-800">Summary</p>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
          <p>Date: {String(data.invoiceDate ?? '—')}</p>
          <p>Supplier invoice: {String(data.supplierInvoiceNumber ?? '—')}</p>
          <p>
            Supplier:{' '}
            {supplier ? (
              <Link className="font-medium text-teal-700 hover:underline" to={`/suppliers/${supplier.id}`}>
                <PartySelectLabel party={supplier} />
              </Link>
            ) : (
              String(data.supplierId ?? '—')
            )}
          </p>
          <p>Supplier GSTIN: {String(data.supplierGstin ?? '—')}</p>
          <p>Grand total: {formatMoney(data.grandTotal)}</p>
        </CardContent>
      </Card>
    </div>
  )
}
