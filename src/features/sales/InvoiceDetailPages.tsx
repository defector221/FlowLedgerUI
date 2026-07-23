import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMemo, useState } from 'react'
import {
  Building2,
  CalendarDays,
  CreditCard,
  Download,
  MapPin,
  Package,
  Truck,
  UserRound,
  Wallet,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Checkbox,
  Dialog,
  DialogContent,
  DialogTitle,
  Skeleton,
  Table,
} from '@/components/ui'
import { customerApi, paymentApi, purchaseApi, salesApi, supplierApi, aiApi } from '@/services/api'
import { getApiErrorMessage, notifyWorkflowApproval } from '@/lib/api-error'
import { PageHeader } from '@/components/layout/PageChrome'
import { DocumentSummaryCard } from '@/components/documents/DocumentSummaryCard'
import { formatPlaceOfSupply } from '@/lib/gst-states'
import { currency, quantity as formatQty } from '@/lib/utils'
import { PartySelectLabel } from '@/components/party/PartySelectLabel'
import { ApprovalHistoryPanel } from '@/features/ai/ApprovalHistoryPanel'
import type { AiWorkflowApproval } from '@/services/api'

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
  const { data: invoiceApprovals = [] } = useQuery({
    queryKey: ['workflow-approvals', 'SALES_INVOICE', id],
    queryFn: () => aiApi.workflowApprovalsForEntity('SALES_INVOICE', id),
    enabled: !!id,
    refetchOnWindowFocus: true,
  })
  const challanId = data?.deliveryChallanId ? String(data.deliveryChallanId) : ''
  const { data: challanApprovals = [] } = useQuery({
    queryKey: ['workflow-approvals', 'DELIVERY_CHALLAN', challanId],
    queryFn: () => aiApi.workflowApprovalsForEntity('DELIVERY_CHALLAN', challanId),
    enabled: !!challanId,
    refetchOnWindowFocus: true,
  })
  const approvalHistory = useMemo(() => {
    const merged: AiWorkflowApproval[] = [...invoiceApprovals, ...challanApprovals]
    return merged.sort((a, b) => String(b.requestedAt).localeCompare(String(a.requestedAt)))
  }, [invoiceApprovals, challanApprovals])

  const [reminderOpen, setReminderOpen] = useState(false)
  const [reminderChannels, setReminderChannels] = useState<string[]>(['EMAIL'])

  const confirmInvoice = async () => {
    try {
      await salesApi.confirmInvoice(id)
      await queryClient.invalidateQueries({ queryKey: ['sales-invoice', id] })
      await queryClient.invalidateQueries({ queryKey: ['invoices'] })
      await queryClient.invalidateQueries({ queryKey: ['inventory'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Invoice confirmed')
    } catch (err) {
      if (notifyWorkflowApproval(err)) return
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
    if (!reminderChannels.length) {
      toast.error('Select at least one channel')
      return
    }
    if (reminderChannels.includes('EMAIL') && !customer?.email?.trim()) {
      toast.error('Customer has no email address')
      return
    }
    if (reminderChannels.includes('WHATSAPP') && !customer?.phone?.trim()) {
      toast.error('Customer has no phone number')
      return
    }
    try {
      await paymentApi.sendReminder(id, reminderChannels)
      await queryClient.invalidateQueries({ queryKey: ['notifications'] })
      setReminderOpen(false)
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
  const hasPayments = Number(data.amountPaid ?? 0) > 0
  const isPaidLike = data.status === 'PAID' || data.status === 'PARTIALLY_PAID' || hasPayments
  const outstanding = Number(data.outstandingAmount ?? 0)
  const canCollect = !isDraft && !isCancelled && outstanding > 0
  const canCancel = !isCancelled && !isPaidLike
  const items = data.items ?? []
  const hasStockedLines = items.some((item) => (item.itemType ?? 'PRODUCT') !== 'SERVICE')
  const taxTotal = Number(data.cgstTotal ?? 0) + Number(data.sgstTotal ?? 0) + Number(data.igstTotal ?? 0)

  return (
    <div className="space-y-4">
      <PageHeader
        breadcrumbs="Sales invoice"
        title={data.invoiceNumber || 'Draft invoice'}
        actions={
          <>
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
                <Button variant="outline" onClick={() => setReminderOpen(true)}>
                  Send reminder
                </Button>
              </>
            )}
            <Button variant="outline" onClick={downloadPdf}>
              <Download className="size-4" />
              PDF
            </Button>
            {canCancel && (
              <Button variant="outline" onClick={cancelInvoice}>
                Cancel
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link to="/sales/invoices">Back to list</Link>
            </Button>
          </>
        }
      />

      <DocumentSummaryCard
        title="Invoice Summary"
        documentNumber={data.invoiceNumber || 'Draft invoice'}
        status={data.status}
        statusVariant={
          isCancelled ? 'danger' : data.status === 'PAID' ? 'success' : isDraft ? 'warning' : 'default'
        }
        createdAt={data.createdAt}
        notes={data.notes}
        fields={[
          {
            key: 'customer',
            label: 'Customer',
            icon: UserRound,
            iconTone: 'violet',
            value: customer ? (
              <Link className="font-medium text-teal-700 hover:underline" to={`/customers/${customer.id}`}>
                <PartySelectLabel party={customer} />
              </Link>
            ) : (
              data.customerId
            ),
            detail: customer?.gstin ? `GSTIN: ${customer.gstin}` : customer?.customerCode || undefined,
          },
          {
            key: 'invoiceDate',
            label: 'Invoice date',
            icon: CalendarDays,
            iconTone: 'blue',
            value: data.invoiceDate,
          },
          {
            key: 'dueDate',
            label: 'Due date',
            icon: CalendarDays,
            iconTone: 'amber',
            value: data.dueDate ?? '—',
          },
          {
            key: 'payment',
            label: 'Payment',
            icon: CreditCard,
            iconTone: 'teal',
            value: data.paymentStatus,
            detail: `Paid ${formatMoney(data.amountPaid)} · Due ${formatMoney(outstanding)}`,
          },
          {
            key: 'warehouse',
            label: 'Warehouse',
            icon: Building2,
            iconTone: 'blue',
            value: data.warehouseName
              ? data.warehouseName
              : hasStockedLines
                ? '—'
                : 'Not applicable (services only)',
          },
          {
            key: 'placeOfSupply',
            label: 'Place of supply',
            icon: MapPin,
            iconTone: 'teal',
            value: formatPlaceOfSupply(data.placeOfSupply).title,
            detail: formatPlaceOfSupply(data.placeOfSupply).detail,
          },
          {
            key: 'billing',
            label: 'Billing address',
            icon: Building2,
            iconTone: 'blue',
            value: data.billingAddress?.trim() || '—',
          },
          {
            key: 'shipping',
            label: 'Shipping address',
            icon: Truck,
            iconTone: 'amber',
            value: data.shippingAddress?.trim() || '—',
          },
          {
            key: 'totals',
            label: 'Amounts',
            icon: Wallet,
            iconTone: 'slate',
            span: 2,
            value: `Grand total ${formatMoney(data.grandTotal)}`,
            detail: `Outstanding ${formatMoney(outstanding)}`,
          },
          ...(data.deliveryChallanId
            ? [
                {
                  key: 'challan',
                  label: 'Delivery challan',
                  icon: Package,
                  iconTone: 'teal' as const,
                  span: 2 as const,
                  value: (
                    <Link
                      className="font-medium text-teal-700 hover:underline"
                      to={`/sales/challans/${data.deliveryChallanId}`}
                    >
                      Open challan
                    </Link>
                  ),
                },
              ]
            : []),
        ]}
      />

      <Card>
        <CardHeader>
          <div>
            <p className="text-sm font-semibold text-slate-800">Approval history</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Workflow decisions for this invoice
              {data.deliveryChallanId ? ' and its source delivery challan conversion' : ''}.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <ApprovalHistoryPanel
            requests={approvalHistory}
            emptyLabel="No workflow approvals recorded for this invoice yet."
            showDocumentLink
          />
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

      <Dialog open={reminderOpen} onOpenChange={setReminderOpen}>
        <DialogContent>
          <DialogTitle className="text-lg font-semibold">Send payment reminder</DialogTitle>
          <p className="mt-1 text-sm text-slate-500">
            Choose how to remind the customer about invoice {data.invoiceNumber}.
          </p>
          <div className="mt-4 space-y-3">
            <label className="flex items-start gap-3 rounded-xl border border-slate-200 px-3 py-2.5">
              <Checkbox
                checked={reminderChannels.includes('EMAIL')}
                onCheckedChange={(checked) => {
                  setReminderChannels((prev) =>
                    checked ? Array.from(new Set([...prev, 'EMAIL'])) : prev.filter((c) => c !== 'EMAIL'),
                  )
                }}
              />
              <span>
                <span className="block text-sm font-medium text-slate-900">Email</span>
                <span className="text-xs text-slate-500">{customer?.email?.trim() || 'No email on customer'}</span>
              </span>
            </label>
            <label className="flex items-start gap-3 rounded-xl border border-slate-200 px-3 py-2.5">
              <Checkbox
                checked={reminderChannels.includes('WHATSAPP')}
                onCheckedChange={(checked) => {
                  setReminderChannels((prev) =>
                    checked ? Array.from(new Set([...prev, 'WHATSAPP'])) : prev.filter((c) => c !== 'WHATSAPP'),
                  )
                }}
              />
              <span>
                <span className="block text-sm font-medium text-slate-900">WhatsApp</span>
                <span className="text-xs text-slate-500">
                  {customer?.phone?.trim() || 'No phone on customer'} · mock provider until WhatsApp is enabled
                </span>
              </span>
            </label>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setReminderOpen(false)}>
              Cancel
            </Button>
            <Button onClick={sendReminder}>Send reminder</Button>
          </div>
        </DialogContent>
      </Dialog>
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
      <PageHeader
        breadcrumbs="Purchase invoice"
        title={String(data.invoiceNumber ?? 'Purchase invoice')}
        actions={
          <>
            <Badge>{String(data.status ?? 'DRAFT')}</Badge>
            <Button variant="outline" asChild>
              <Link to="/purchases/invoices">Back to list</Link>
            </Button>
          </>
        }
      />
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
