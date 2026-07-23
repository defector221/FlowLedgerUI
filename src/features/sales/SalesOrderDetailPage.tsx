import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageChrome'
import { customerApi, organizationApi, salesApi, warehouseApi, aiApi } from '@/services/api'
import { getApiErrorMessage, notifyWorkflowApproval } from '@/lib/api-error'
import { currency, quantity as formatQty } from '@/lib/utils'
import { Badge, Button, Card, CardContent, CardHeader, Table } from '@/components/ui'
import { ApprovalHistoryPanel } from '@/features/ai/ApprovalHistoryPanel'

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

type SalesOrderDoc = {
  id: string
  orderNumber: string
  orderDate: string
  expectedDeliveryDate?: string
  customerId: string
  quotationId?: string
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
  items?: SalesLine[]
}

function money(value: unknown) {
  const n = Number(value ?? 0)
  return currency(Number.isFinite(n) ? n : 0)
}

export function SalesOrderDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data, isLoading, refetch, error } = useQuery({
    queryKey: ['sales-order', id],
    queryFn: () => salesApi.getOrder(id) as Promise<SalesOrderDoc>,
    enabled: !!id,
  })

  const { data: customer } = useQuery({
    queryKey: ['customers', data?.customerId],
    queryFn: () => customerApi.get(String(data?.customerId)),
    enabled: !!data?.customerId,
  })

  const { data: warehouses = [] } = useQuery({ queryKey: ['warehouses'], queryFn: warehouseApi.list })
  const { data: settings } = useQuery({
    queryKey: ['organization', 'settings'],
    queryFn: organizationApi.settings,
  })

  const { data: challans = [] } = useQuery({
    queryKey: ['challans', 'for-order', id],
    queryFn: () => salesApi.listChallans(),
    enabled: !!id,
  })

  const { data: approvalHistory = [] } = useQuery({
    queryKey: ['workflow-approvals', 'SALES_ORDER', id],
    queryFn: async () => {
      try {
        return await aiApi.workflowApprovalsForEntity('SALES_ORDER', id)
      } catch {
        return []
      }
    },
    enabled: !!id,
    refetchOnWindowFocus: true,
  })

  const linkedChallan = (challans as Array<{ id?: string; salesOrderId?: string; challanNumber?: string }>).find(
    (c) => String(c.salesOrderId) === id,
  )

  const resolveWarehouseId = () => {
    const fromSettings = settings?.defaultWarehouseId
    if (fromSettings && warehouses.some((w) => w.id === fromSettings)) return String(fromSettings)
    return warehouses[0]?.id ? String(warehouses[0].id) : ''
  }

  const toChallan = async () => {
    const warehouseId = resolveWarehouseId()
    if (!warehouseId) {
      toast.error('Add a warehouse before creating a delivery challan')
      return
    }
    try {
      const challan = await salesApi.convertOrderToChallan(id, { warehouseId })
      await queryClient.invalidateQueries({ queryKey: ['sales-order', id] })
      await queryClient.invalidateQueries({ queryKey: ['orders'] })
      await queryClient.invalidateQueries({ queryKey: ['challans'] })
      toast.success('Sales order converted to delivery challan')
      if (challan?.id) navigate(`/sales/challans/${String(challan.id)}`)
    } catch (err) {
      if (notifyWorkflowApproval(err)) {
        void queryClient.invalidateQueries({ queryKey: ['workflow-approvals', 'SALES_ORDER', id] })
        void queryClient.invalidateQueries({ queryKey: ['ai-workflow-approvals'] })
        return
      }
      toast.error(getApiErrorMessage(err))
    }
  }

  const toInvoice = async () => {
    const warehouseId = resolveWarehouseId()
    try {
      const invoice = await salesApi.convertOrderToInvoice(id, warehouseId ? { warehouseId } : {})
      await queryClient.invalidateQueries({ queryKey: ['sales-order', id] })
      await queryClient.invalidateQueries({ queryKey: ['orders'] })
      await queryClient.invalidateQueries({ queryKey: ['invoices'] })
      toast.success('Sales order converted to invoice')
      if (invoice?.id) navigate(`/sales/invoices/${String(invoice.id)}`)
    } catch (err) {
      if (notifyWorkflowApproval(err)) {
        void queryClient.invalidateQueries({ queryKey: ['workflow-approvals', 'SALES_ORDER', id] })
        void queryClient.invalidateQueries({ queryKey: ['ai-workflow-approvals'] })
        return
      }
      toast.error(getApiErrorMessage(err))
    }
  }

  const cancel = async () => {
    try {
      await salesApi.cancelOrder(id)
      await queryClient.invalidateQueries({ queryKey: ['sales-order', id] })
      await queryClient.invalidateQueries({ queryKey: ['orders'] })
      toast.success('Sales order cancelled')
    } catch (err) {
      toast.error(getApiErrorMessage(err))
    }
  }

  if (isLoading) {
    return <p className="py-20 text-center text-sm text-slate-500">Loading sales order…</p>
  }
  if (error || !data) {
    return <p className="py-20 text-center text-sm text-rose-600">Unable to load sales order.</p>
  }

  const status = String(data.status ?? 'DRAFT')
  const cancelled = status === 'CANCELLED'
  const items = data.items ?? []
  const latestApproval = approvalHistory[0]
  const latestRejected = latestApproval?.status === 'REJECTED'
  const latestPending = latestApproval?.status === 'PENDING'
  const displayStatus = latestPending ? 'IN APPROVAL' : latestRejected ? 'REJECTED' : status
  const statusVariant = latestPending ? 'warning' : latestRejected || cancelled ? 'danger' : 'default'
  const convertLocked = cancelled || latestPending

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.orderNumber}
        subtitle={`Sales order · ${data.orderDate}`}
        actions={
          <>
            <Badge variant={statusVariant}>{displayStatus}</Badge>
            <Button variant="outline" className="cursor-pointer" onClick={() => refetch()}>
              <RefreshCw className="size-4" />
              Refresh
            </Button>
            {linkedChallan?.id ? (
              <Link to={`/sales/challans/${linkedChallan.id}`}>
                <Button variant="outline" className="cursor-pointer">
                  View challan
                </Button>
              </Link>
            ) : (
              <Button
                className="cursor-pointer"
                onClick={toChallan}
                disabled={convertLocked}
                title={
                  latestPending
                    ? 'Awaiting workflow approval'
                    : latestRejected
                      ? 'Retrying will resubmit this order for approval'
                      : undefined
                }
              >
                {latestRejected ? 'Retry to challan' : 'To challan'}
              </Button>
            )}
            <Button
              variant="outline"
              className="cursor-pointer"
              onClick={toInvoice}
              disabled={convertLocked}
              title={
                latestPending
                  ? 'Awaiting workflow approval'
                  : latestRejected
                    ? 'Retrying will resubmit this order for approval'
                    : undefined
              }
            >
              {latestRejected ? 'Retry to invoice' : 'To invoice'}
            </Button>
            {!cancelled && !latestPending && status !== 'FULFILLED' && (
              <Button variant="outline" className="cursor-pointer" onClick={cancel}>
                Cancel
              </Button>
            )}
          </>
        }
      />

      {latestPending ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-5 py-4">
          <p className="text-sm font-semibold text-amber-950">In approval</p>
          <p className="mt-1 text-sm text-amber-900/90">
            Convert actions are locked until{' '}
            {latestApproval?.currentStepRole
              ? latestApproval.currentStepRole.replaceAll('_', ' ').toLowerCase()
              : 'the approver'}{' '}
            completes this request
            {latestApproval?.currentStep && latestApproval?.totalSteps
              ? ` (step ${latestApproval.currentStep}/${latestApproval.totalSteps})`
              : ''}
            .
          </p>
          <Link to="/ai/workflows" className="mt-2 inline-block text-sm font-medium text-teal-700 hover:underline">
            Open workflows inbox
          </Link>
        </div>
      ) : null}

      {latestRejected ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/70 px-5 py-4">
          <p className="text-sm font-semibold text-rose-950">
            Sales order rejected
            {latestApproval?.decidedByName ? ` by ${latestApproval.decidedByName}` : null}
          </p>
          <p className="mt-1 text-sm text-rose-900/90">
            {latestApproval?.remarks?.trim()
              ? latestApproval.remarks
              : 'Review the approval history comments, fix the order if needed, then retry convert to resubmit for approval.'}
          </p>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardContent className="grid gap-5 p-6 sm:grid-cols-2">
              <Detail
                label="Customer"
                value={customer?.companyName ?? customer?.customerName ?? String(data.customerId ?? '—')}
              />
              <Detail label="Order date" value={data.orderDate} />
              <Detail label="Expected delivery" value={data.expectedDeliveryDate ?? '—'} />
              <Detail label="Place of supply" value={data.placeOfSupply ?? '—'} />
              {data.quotationId ? (
                <div className="sm:col-span-2">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Source quotation</p>
                  <Link
                    to={`/sales/quotations/${data.quotationId}`}
                    className="mt-1 inline-block text-sm font-medium text-teal-700 hover:underline"
                  >
                    Open quotation
                  </Link>
                </div>
              ) : null}
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

        <div className="space-y-6">
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

          <Card>
            <CardHeader>
              <div>
                <h2 className="font-semibold">Approval history</h2>
                <p className="text-xs text-slate-500">Workflow decisions and comments for this order.</p>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <ApprovalHistoryPanel
                requests={approvalHistory}
                emptyLabel="No workflow approvals for this sales order yet."
                showDocumentLink={false}
              />
            </CardContent>
          </Card>
        </div>
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
