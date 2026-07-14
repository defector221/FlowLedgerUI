import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { Badge, Card, CardContent, CardHeader, Skeleton } from '@/components/ui'
import { customerApi, purchaseApi, salesApi, supplierApi } from '@/services/api'

function formatMoney(value: unknown) {
  const amount = typeof value === 'number' ? value : Number(value ?? 0)
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(Number.isFinite(amount) ? amount : 0)
}

export function SalesInvoiceDetailPage() {
  const { id = '' } = useParams()
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

  if (isLoading) return <Skeleton className="h-48 w-full" />
  if (error || !data) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-rose-600">Invoice not found.</CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sales invoice</p>
          <h1 className="font-display text-2xl font-semibold text-slate-900">
            {data.invoiceNumber || 'Draft invoice'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge>{data.status}</Badge>
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
          <p>
            Customer:{' '}
            {customer ? (
              <Link className="font-medium text-teal-700 hover:underline" to={`/customers/${customer.id}`}>
                {customer.customerName}
              </Link>
            ) : (
              data.customerId
            )}
          </p>
          <p>Grand total: {formatMoney(data.grandTotal)}</p>
        </CardContent>
      </Card>
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
                {supplier.supplierName}
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
