import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  NumberInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Skeleton,
  Table,
} from '@/components/ui'
import { customerApi, paymentApi, purchaseApi, salesApi, supplierApi } from '@/services/api'
import { getApiErrorMessage } from '@/lib/api-error'
import { PageHeader } from '@/components/layout/PageChrome'
import { currency, customerLabel, supplierLabel } from '@/lib/utils'
import type { PaymentResponse } from '@/types/api'

export function PaymentDetailPage({ kind }: { kind: 'received' | 'suppliers' }) {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const listPath = kind === 'received' ? '/payments/received' : '/payments/suppliers'
  const { data, isLoading, error } = useQuery({
    queryKey: ['payment', id],
    queryFn: () => paymentApi.get(id),
    enabled: !!id,
  })

  const { data: customer } = useQuery({
    queryKey: ['customers', data?.customerId],
    queryFn: () => customerApi.get(String(data?.customerId)),
    enabled: !!data?.customerId,
  })
  const { data: supplier } = useQuery({
    queryKey: ['suppliers', data?.supplierId],
    queryFn: () => supplierApi.get(String(data?.supplierId)),
    enabled: !!data?.supplierId,
  })

  const isReceipt = data?.paymentType === 'RECEIPT'
  const { data: salesInvoices = [] } = useQuery({
    queryKey: ['invoices', 'payment-detail-alloc', data?.customerId],
    queryFn: () => salesApi.listInvoices({ customerId: data?.customerId ?? undefined }),
    enabled: !!data && isReceipt && Number(data.unallocatedAmount ?? 0) > 0,
  })
  const { data: purchaseInvoices = [] } = useQuery({
    queryKey: ['purchase-invoices', 'payment-detail-alloc', data?.supplierId],
    queryFn: () => purchaseApi.listInvoices(),
    enabled: !!data && !isReceipt && Number(data.unallocatedAmount ?? 0) > 0,
  })

  const [documentId, setDocumentId] = useState('')
  const [allocAmount, setAllocAmount] = useState(0)
  const [busy, setBusy] = useState(false)

  const invoiceOptions = useMemo(() => {
    if (!data) return []
    if (isReceipt) {
      return salesInvoices
        .filter((inv) => Number(inv.outstandingAmount ?? 0) > 0)
        .map((inv) => ({
          id: inv.id,
          label: `${inv.invoiceNumber} · due ${currency(Number(inv.outstandingAmount ?? 0))}`,
          outstanding: Number(inv.outstandingAmount ?? 0),
        }))
    }
    return purchaseInvoices
      .filter((inv) => {
        if (data.supplierId && String(inv.supplierId) !== String(data.supplierId)) return false
        return Number((inv as { outstandingAmount?: number }).outstandingAmount ?? (inv as { outstanding?: number }).outstanding ?? 0) > 0
      })
      .map((inv) => {
        const due = Number(
          (inv as { outstandingAmount?: number }).outstandingAmount ??
            (inv as { outstanding?: number }).outstanding ??
            0,
        )
        return {
          id: String(inv.id),
          label: `${String(inv.invoiceNumber ?? inv.id)} · due ${currency(due)}`,
          outstanding: due,
        }
      })
  }, [data, isReceipt, salesInvoices, purchaseInvoices])

  const refresh = async (payment?: PaymentResponse) => {
    await queryClient.invalidateQueries({ queryKey: ['payment', id] })
    await queryClient.invalidateQueries({ queryKey: ['received'] })
    await queryClient.invalidateQueries({ queryKey: ['suppliers-payments'] })
    await queryClient.invalidateQueries({ queryKey: ['invoices'] })
    await queryClient.invalidateQueries({ queryKey: ['purchase-invoices'] })
    await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    if (payment) {
      setDocumentId('')
      setAllocAmount(Number(payment.unallocatedAmount ?? 0))
    }
  }

  const allocate = async () => {
    if (!data || !documentId || allocAmount <= 0) {
      toast.error('Select an invoice and amount')
      return
    }
    setBusy(true)
    try {
      const updated = await paymentApi.allocate(id, [
        {
          documentType: isReceipt ? 'SALES_INVOICE' : 'PURCHASE_INVOICE',
          documentId,
          amount: allocAmount,
        },
      ])
      toast.success('Allocation saved')
      await refresh(updated)
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Unable to allocate'))
    } finally {
      setBusy(false)
    }
  }

  const cancel = async () => {
    if (!window.confirm('Cancel this payment and reverse allocations?')) return
    setBusy(true)
    try {
      await paymentApi.cancel(id)
      toast.success('Payment cancelled')
      await refresh()
      navigate(listPath)
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Unable to cancel payment'))
    } finally {
      setBusy(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="space-y-3">
        <PageHeader title="Payment" subtitle="Unable to load payment." />
        <Button variant="outline" asChild>
          <Link to={listPath}>Back to list</Link>
        </Button>
      </div>
    )
  }

  const partyName = customer
    ? customerLabel(customer)
    : supplier
      ? supplierLabel(supplier)
      : data.customerId || data.supplierId || '—'
  const unallocated = Number(data.unallocatedAmount ?? 0)
  const cancelled = data.status === 'CANCELLED'

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.paymentNumber || 'Payment'}
        subtitle={`${data.paymentType} · ${data.paymentDate}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to={listPath}>Back</Link>
            </Button>
            {!cancelled && (
              <Button variant="outline" disabled={busy} onClick={cancel}>
                Cancel payment
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-800">Details</h2>
              <Badge variant={cancelled ? 'danger' : 'neutral'}>{data.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <div className="text-xs text-slate-500">Party</div>
              <div className="font-medium">{partyName}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Mode</div>
              <div className="font-medium">{data.paymentMode}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Amount</div>
              <div className="font-medium">{currency(Number(data.amount ?? 0))}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Allocated</div>
              <div className="font-medium">{currency(Number(data.allocatedAmount ?? 0))}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Unallocated</div>
              <div className="font-medium">{currency(unallocated)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Reference</div>
              <div className="font-medium">{data.transactionReference || '—'}</div>
            </div>
            {data.notes ? (
              <div className="sm:col-span-2">
                <div className="text-xs text-slate-500">Notes</div>
                <div className="font-medium whitespace-pre-wrap">{data.notes}</div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {!cancelled && unallocated > 0 ? (
          <Card>
            <CardHeader className="pb-2">
              <h2 className="text-sm font-semibold text-slate-800">Allocate remainder</h2>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select
                value={documentId || undefined}
                onValueChange={(value) => {
                  setDocumentId(value)
                  const inv = invoiceOptions.find((o) => o.id === value)
                  const max = Math.min(unallocated, inv?.outstanding ?? unallocated)
                  setAllocAmount(max)
                }}
              >
                <SelectTrigger>
                  {invoiceOptions.find((o) => o.id === documentId)?.label ?? 'Select invoice'}
                </SelectTrigger>
                <SelectContent>
                  {invoiceOptions.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="space-y-1">
                <div className="text-xs text-slate-500">Amount</div>
                <NumberInput value={allocAmount} onValueChange={setAllocAmount} />
              </div>
              <Button disabled={busy || !documentId || allocAmount <= 0} onClick={allocate} className="w-full">
                Allocate
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-6 text-sm text-slate-500">
              {cancelled ? 'Payment cancelled — no further allocation.' : 'Fully allocated.'}
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <h2 className="text-sm font-semibold text-slate-800">Allocations</h2>
        </CardHeader>
        <CardContent>
          {(data.allocations?.length ?? 0) === 0 ? (
            <p className="text-sm text-slate-500">No allocations yet.</p>
          ) : (
            <Table>
              <thead>
                <tr className="border-b">
                  <th className="p-3 text-xs text-slate-500">Document</th>
                  <th className="p-3 text-xs text-slate-500">Type</th>
                  <th className="p-3 text-xs text-slate-500 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.allocations?.map((line) => (
                  <tr key={line.id} className="border-b">
                    <td className="p-3 font-mono text-xs">{line.documentId}</td>
                    <td className="p-3 text-sm">{line.documentType}</td>
                    <td className="p-3 text-right text-sm">{currency(Number(line.allocatedAmount ?? 0))}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
