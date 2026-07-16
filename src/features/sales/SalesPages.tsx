import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Download, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  customerApi,
  organizationApi,
  productApi,
  purchaseApi,
  paymentApi,
  salesApi,
  supplierApi,
  taxRateApi,
  templateApi,
  warehouseApi,
} from '@/services/api'
import { getApiErrorMessage } from '@/lib/api-error'
import { resolveDefaultWarehouseId } from '@/lib/warehouse'
import { currency, customerLabel, supplierLabel } from '@/lib/utils'
import { PartySelectLabel } from '@/components/party/PartySelectLabel'
import { PageHeader, EmptyState } from '@/components/layout/PageChrome'
import { useAuth } from '@/features/auth/auth'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Input,
  NumberInput,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Table,
  Textarea,
} from '@/components/ui'

const loaders: Record<string, () => Promise<Record<string, unknown>[]>> = {
  quotations: () => salesApi.listQuotations(),
  orders: () => salesApi.listOrders(),
  challans: () => salesApi.listChallans(),
  returns: () => salesApi.listReturns(),
  invoices: () => salesApi.listInvoices().then((rows) => rows as unknown as Record<string, unknown>[]),
  'purchase-orders': () => purchaseApi.listOrders(),
  grn: () => purchaseApi.listGrn(),
  'purchase-invoices': () => purchaseApi.listInvoices(),
  received: () => paymentApi.listReceived().then((rows) => rows as unknown as Record<string, unknown>[]),
  'suppliers-payments': () => paymentApi.listSupplier().then((rows) => rows as unknown as Record<string, unknown>[]),
}

function documentNumber(row: Record<string, unknown>) {
  return String(
    row.invoiceNumber ??
      row.poNumber ??
      row.grnNumber ??
      row.quotationNumber ??
      row.orderNumber ??
      row.paymentNumber ??
      row.challanNumber ??
      row.returnNumber ??
      '—',
  )
}

function documentDate(row: Record<string, unknown>) {
  return String(
    row.invoiceDate ??
      row.orderDate ??
      row.quotationDate ??
      row.paymentDate ??
      row.challanDate ??
      row.receiptDate ??
      row.returnDate ??
      '—',
  )
}

const writePermissionByEndpoint: Record<string, string> = {
  quotations: 'sales:write',
  invoices: 'sales:write',
  orders: 'sales:write',
  challans: 'sales:write',
  'purchase-orders': 'purchases:write',
  grn: 'purchases:write',
  'purchase-invoices': 'purchases:write',
  received: 'payments:write',
  'suppliers-payments': 'payments:write',
}

const actionEndpoints = new Set([
  'quotations',
  'invoices',
  'orders',
  'challans',
  'purchase-orders',
  'grn',
  'purchase-invoices',
])

export function DocumentListPage({
  title,
  endpoint,
  createPath,
  createLabel = 'Create',
  unavailable = false,
}: {
  title: string
  endpoint: string
  createPath?: string
  createLabel?: string
  unavailable?: boolean
}) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const focusId = searchParams.get('focus')
  const queryClient = useQueryClient()
  const { can } = useAuth()
  const canWrite = can(writePermissionByEndpoint[endpoint] ?? 'never')
  const showCreate = Boolean(createPath && canWrite)
  const { data, isLoading } = useQuery({ queryKey: [endpoint], queryFn: loaders[endpoint], enabled: !unavailable })
  const { data: customers = [] } = useQuery({
    queryKey: ['customers', 'party-labels'],
    queryFn: () => customerApi.list({ size: 200 }),
  })
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers', 'party-labels'],
    queryFn: () => supplierApi.list({ size: 200 }),
  })
  const { data: challansForOrders = [] } = useQuery({
    queryKey: ['challans'],
    queryFn: salesApi.listChallans,
    enabled: endpoint === 'orders' && canWrite,
  })
  const needsWarehouse = canWrite && ['orders', 'challans', 'purchase-orders', 'grn'].includes(endpoint)
  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: warehouseApi.list,
    enabled: needsWarehouse,
  })
  const { data: orgSettings } = useQuery({
    queryKey: ['organization', 'settings'],
    queryFn: organizationApi.settings,
    enabled: needsWarehouse,
  })
  const rows = data ?? []
  const showActions =
    endpoint === 'invoices' ||
    endpoint === 'purchase-invoices' ||
    (canWrite && actionEndpoints.has(endpoint))
  const defaultWarehouseId = resolveDefaultWarehouseId(warehouses, orgSettings?.defaultWarehouseId)
  const challanByOrderId = useMemo(() => {
    const map: Record<string, Record<string, unknown>> = {}
    for (const challan of challansForOrders) {
      const orderId = challan.salesOrderId ? String(challan.salesOrderId) : ''
      if (!orderId || map[orderId]) continue
      map[orderId] = challan
    }
    return map
  }, [challansForOrders])

  useEffect(() => {
    if (endpoint !== 'challans' || !focusId) return
    const row = document.getElementById(`doc-row-${focusId}`)
    row?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [endpoint, focusId, rows])
  const customerNameById = useMemo(
    () => Object.fromEntries(customers.map((c) => [c.id, customerLabel(c)])),
    [customers],
  )
  const supplierNameById = useMemo(
    () => Object.fromEntries(suppliers.map((s) => [s.id, supplierLabel(s)])),
    [suppliers],
  )
  const partyLabel = (row: Record<string, unknown>) => {
    const customerId = row.customerId ? String(row.customerId) : ''
    const supplierId = row.supplierId ? String(row.supplierId) : ''
    if (customerId) return customerNameById[customerId] ?? customerId
    if (supplierId) return supplierNameById[supplierId] ?? supplierId
    return '—'
  }

  const requireWarehouse = () => {
    if (!defaultWarehouseId) {
      toast.error('Add a warehouse before converting stock documents')
      return null
    }
    return defaultWarehouseId
  }

  const convertQuotation = async (id: string) => {
    try {
      await salesApi.convertQuotationToOrder(id)
      await queryClient.invalidateQueries({ queryKey: ['quotations'] })
      await queryClient.invalidateQueries({ queryKey: ['orders'] })
      toast.success('Quotation converted to sales order')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to convert quotation'))
    }
  }

  const convertOrderToChallan = async (id: string) => {
    const existing = challanByOrderId[id]
    if (existing?.id) {
      toast.message('Delivery challan already exists for this order')
      navigate(`/sales/challans?focus=${String(existing.id)}`)
      return
    }
    const warehouseId = requireWarehouse()
    if (!warehouseId) return
    try {
      const challan = await salesApi.convertOrderToChallan(id, { warehouseId })
      await queryClient.invalidateQueries({ queryKey: ['orders'] })
      await queryClient.invalidateQueries({ queryKey: ['challans'] })
      toast.success('Sales order converted to delivery challan')
      if (challan?.id) navigate(`/sales/challans?focus=${String(challan.id)}`)
      else navigate('/sales/challans')
    } catch (error) {
      const message = getApiErrorMessage(error, 'Unable to convert order to challan')
      if (/already exists/i.test(message)) {
        try {
          const challans = await salesApi.listChallans()
          const found = challans.find((row) => String(row.salesOrderId) === id)
          if (found?.id) {
            toast.message('Delivery challan already exists for this order')
            navigate(`/sales/challans?focus=${String(found.id)}`)
            return
          }
        } catch {
          // fall through
        }
      }
      toast.error(message)
    }
  }

  const convertOrderToInvoice = async (id: string) => {
    const warehouseId = requireWarehouse()
    if (!warehouseId) return
    try {
      const invoice = await salesApi.convertOrderToInvoice(id, { warehouseId })
      await queryClient.invalidateQueries({ queryKey: ['orders'] })
      await queryClient.invalidateQueries({ queryKey: ['invoices'] })
      toast.success('Sales order converted to invoice')
      if (invoice?.id) navigate(`/sales/invoices/${String(invoice.id)}`)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to convert order to invoice'))
    }
  }

  const convertChallanToInvoice = async (id: string) => {
    try {
      const invoice = await salesApi.convertChallanToInvoice(id)
      await queryClient.invalidateQueries({ queryKey: ['challans'] })
      await queryClient.invalidateQueries({ queryKey: ['invoices'] })
      toast.success('Challan converted to invoice')
      if (invoice?.id) navigate(`/sales/invoices/${String(invoice.id)}`)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to convert challan to invoice'))
    }
  }

  const confirmPurchaseOrder = async (id: string) => {
    try {
      await purchaseApi.confirmOrder(id)
      await queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      toast.success('Purchase order confirmed')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to confirm purchase order'))
    }
  }

  const createGrnFromOrder = async (id: string) => {
    const warehouseId = requireWarehouse()
    if (!warehouseId) return
    try {
      await purchaseApi.createGrnFromOrder(id, {
        warehouseId,
        receiptDate: new Date().toISOString().slice(0, 10),
      })
      await queryClient.invalidateQueries({ queryKey: ['grn'] })
      await queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      toast.success('Goods receipt created from purchase order')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to create goods receipt'))
    }
  }

  const createPurchaseInvoiceFromOrder = async (id: string) => {
    try {
      const invoice = await purchaseApi.createInvoiceFromOrder(id, {
        invoiceDate: new Date().toISOString().slice(0, 10),
      })
      await queryClient.invalidateQueries({ queryKey: ['purchase-invoices'] })
      await queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      toast.success('Purchase invoice created from order')
      if (invoice?.id) navigate(`/purchases/invoices/${String(invoice.id)}`)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to create purchase invoice'))
    }
  }

  const confirmGrn = async (id: string) => {
    try {
      await purchaseApi.confirmGrn(id)
      await queryClient.invalidateQueries({ queryKey: ['grn'] })
      await queryClient.invalidateQueries({ queryKey: ['inventory'] })
      toast.success('Goods receipt confirmed')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to confirm goods receipt'))
    }
  }

  const createPurchaseInvoiceFromGrn = async (id: string) => {
    try {
      const invoice = await purchaseApi.createInvoiceFromGrn(id, {
        invoiceDate: new Date().toISOString().slice(0, 10),
      })
      await queryClient.invalidateQueries({ queryKey: ['purchase-invoices'] })
      await queryClient.invalidateQueries({ queryKey: ['grn'] })
      toast.success('Purchase invoice created from GRN')
      if (invoice?.id) navigate(`/purchases/invoices/${String(invoice.id)}`)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to create purchase invoice from GRN'))
    }
  }

  const cancelInvoice = async (id: string) => {
    try {
      await salesApi.cancelInvoice(id)
      await queryClient.invalidateQueries({ queryKey: ['invoices'] })
      toast.success('Invoice cancelled')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to cancel invoice'))
    }
  }

  const confirmInvoice = async (id: string) => {
    try {
      await salesApi.confirmInvoice(id)
      await queryClient.invalidateQueries({ queryKey: ['invoices'] })
      await queryClient.invalidateQueries({ queryKey: ['inventory'] })
      toast.success('Invoice confirmed')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to confirm invoice'))
    }
  }

  const confirmPurchaseInvoice = async (id: string) => {
    try {
      await purchaseApi.confirmInvoice(id)
      await queryClient.invalidateQueries({ queryKey: ['purchase-invoices'] })
      toast.success('Purchase invoice confirmed')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to confirm purchase invoice'))
    }
  }

  const downloadPdf = async (id: string) => {
    try {
      const blob = await salesApi.downloadInvoicePdf(id)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `invoice-${id}.pdf`
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to download PDF'))
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        subtitle={`Create and track ${title.toLowerCase()}.`}
        actions={
          showCreate && createPath ? (
            <Button asChild>
              <Link to={createPath}>
                <Plus className="size-4" />
                {createLabel}
              </Link>
            </Button>
          ) : null
        }
      />
      <Card>
        <CardContent className="p-4">
          {unavailable ? (
            <EmptyState
              title="Not available yet"
              description="This list endpoint is not yet exposed by the backend API."
            />
          ) : isLoading ? (
            <EmptyState title="Loading…" />
          ) : (
            <Table>
              <thead>
                <tr className="border-b">
                  <th className="p-3 text-xs text-slate-500">NUMBER</th>
                  <th className="p-3 text-xs text-slate-500">PARTY</th>
                  <th className="p-3 text-xs text-slate-500">DATE</th>
                  <th className="p-3 text-xs text-slate-500">TOTAL</th>
                  <th className="p-3 text-xs text-slate-500">STATUS</th>
                  {showActions && <th className="p-3 text-xs text-slate-500">ACTIONS</th>}
                </tr>
              </thead>
              <tbody>
                {rows.length ? (
                  rows.map((row) => {
                    const status = String(row.status ?? row.paymentType ?? 'DRAFT')
                    const cancelled = status === 'CANCELLED'
                    return (
                      <tr
                        key={String(row.id)}
                        id={`doc-row-${String(row.id)}`}
                        className={`border-b ${focusId === String(row.id) ? 'bg-teal-50' : ''}`}
                      >
                        <td className="p-3">
                          {endpoint === 'invoices' ? (
                            <Link
                              className="font-medium text-teal-700 hover:underline"
                              to={`/sales/invoices/${row.id}`}
                            >
                              {documentNumber(row)}
                            </Link>
                          ) : endpoint === 'purchase-invoices' ? (
                            <Link
                              className="font-medium text-teal-700 hover:underline"
                              to={`/purchases/invoices/${row.id}`}
                            >
                              {documentNumber(row)}
                            </Link>
                          ) : (
                            documentNumber(row)
                          )}
                        </td>
                        <td className="p-3">{partyLabel(row)}</td>
                        <td className="p-3">{documentDate(row)}</td>
                        <td className="p-3">{currency(Number(row.grandTotal ?? row.amount ?? 0))}</td>
                        <td className="p-3">
                          <Badge>{status}</Badge>
                        </td>
                        {endpoint === 'quotations' && canWrite && (
                          <td className="p-3">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={status === 'CONVERTED' || cancelled}
                              onClick={() => convertQuotation(String(row.id))}
                            >
                              Convert to order
                            </Button>
                          </td>
                        )}
                        {endpoint === 'orders' && canWrite && (
                          <td className="p-3">
                            <div className="flex flex-wrap gap-2">
                              {challanByOrderId[String(row.id)]?.id ? (
                                <Link
                                  className="inline-flex h-8 items-center rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                  to={`/sales/challans?focus=${String(challanByOrderId[String(row.id)].id)}`}
                                >
                                  View challan
                                </Link>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={cancelled}
                                  onClick={() => convertOrderToChallan(String(row.id))}
                                >
                                  To challan
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={cancelled}
                                onClick={() => convertOrderToInvoice(String(row.id))}
                              >
                                To invoice
                              </Button>
                            </div>
                          </td>
                        )}
                        {endpoint === 'challans' && canWrite && (
                          <td className="p-3">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={cancelled}
                              onClick={() => convertChallanToInvoice(String(row.id))}
                            >
                              To invoice
                            </Button>
                          </td>
                        )}
                        {endpoint === 'purchase-orders' && canWrite && (
                          <td className="p-3">
                            <div className="flex flex-wrap gap-2">
                              {status === 'DRAFT' && (
                                <Button variant="outline" size="sm" onClick={() => confirmPurchaseOrder(String(row.id))}>
                                  Confirm
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={cancelled}
                                onClick={() => createGrnFromOrder(String(row.id))}
                              >
                                Create GRN
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={cancelled}
                                onClick={() => createPurchaseInvoiceFromOrder(String(row.id))}
                              >
                                Create invoice
                              </Button>
                            </div>
                          </td>
                        )}
                        {endpoint === 'grn' && canWrite && (
                          <td className="p-3">
                            <div className="flex flex-wrap gap-2">
                              {status !== 'CONFIRMED' && !cancelled && (
                                <Button variant="outline" size="sm" onClick={() => confirmGrn(String(row.id))}>
                                  Confirm
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={cancelled}
                                onClick={() => createPurchaseInvoiceFromGrn(String(row.id))}
                              >
                                Create invoice
                              </Button>
                            </div>
                          </td>
                        )}
                        {endpoint === 'purchase-invoices' && (
                          <td className="p-3">
                            <div className="flex flex-wrap gap-2">
                              <Link
                                className="inline-flex h-8 items-center rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                to={`/purchases/invoices/${row.id}`}
                              >
                                View
                              </Link>
                              {canWrite && status === 'DRAFT' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => confirmPurchaseInvoice(String(row.id))}
                                >
                                  Confirm
                                </Button>
                              )}
                            </div>
                          </td>
                        )}
                        {endpoint === 'invoices' && (
                          <td className="p-3">
                            <div className="flex flex-wrap gap-2">
                              {canWrite && status === 'DRAFT' && (
                                <>
                                  <Link
                                    className="inline-flex h-8 items-center rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                    to={`/sales/invoices/${row.id}/edit`}
                                  >
                                    Edit
                                  </Link>
                                  <Button variant="outline" size="sm" onClick={() => confirmInvoice(String(row.id))}>
                                    Confirm
                                  </Button>
                                </>
                              )}
                              <Button variant="outline" size="sm" onClick={() => downloadPdf(String(row.id))}>
                                <Download className="size-3.5" />
                                PDF
                              </Button>
                              {canWrite && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={cancelled}
                                  onClick={() => cancelInvoice(String(row.id))}
                                >
                                  Cancel
                                </Button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={showActions ? 6 : 5} className="py-16 text-center text-sm text-slate-500">
                      {showCreate && createPath ? (
                        <span>
                          No {title.toLowerCase()} found.{' '}
                          <Link className="font-medium text-teal-700 hover:underline" to={createPath}>
                            Create one
                          </Link>
                        </span>
                      ) : (
                        `No ${title.toLowerCase()} found.`
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

type TaxType = 'GST' | 'IGST' | 'OTHER'
type SplitStrategy = 'PLACE_OF_SUPPLY' | 'NO_SPLIT_IGST' | 'NO_SPLIT_OTHER' | 'CUSTOM_PERCENT'
type Line = {
  id: number
  productId: string
  quantity: number
  rate: number
  discountPercent: number
  taxRate: number
  taxType: TaxType
  splitStrategy: SplitStrategy
  cgstSharePercent: number
  sgstSharePercent: number
}

const defaultLine = (): Omit<Line, 'id'> => ({
  productId: '',
  quantity: 1,
  rate: 0,
  discountPercent: 0,
  taxRate: 18,
  taxType: 'GST',
  splitStrategy: 'PLACE_OF_SUPPLY',
  cgstSharePercent: 50,
  sgstSharePercent: 50,
})

function lineGross(line: Pick<Line, 'quantity' | 'rate'>) {
  return line.quantity * line.rate
}

function lineDiscount(line: Pick<Line, 'quantity' | 'rate' | 'discountPercent'>) {
  return (lineGross(line) * (line.discountPercent || 0)) / 100
}

function lineTaxable(line: Pick<Line, 'quantity' | 'rate' | 'discountPercent'>) {
  return lineGross(line) - lineDiscount(line)
}

function lineTaxAmount(line: Pick<Line, 'quantity' | 'rate' | 'discountPercent' | 'taxRate'>) {
  return (lineTaxable(line) * (line.taxRate || 0)) / 100
}

function lineAmount(line: Pick<Line, 'quantity' | 'rate' | 'discountPercent' | 'taxRate'>) {
  return lineTaxable(line) + lineTaxAmount(line)
}

function useLineItems(defaultRateKey: 'sellingPrice' | 'purchasePrice' = 'sellingPrice') {
  const [lines, setLines] = useState<Line[]>([{ id: 1, ...defaultLine() }])
  const { data: products = [] } = useQuery({
    queryKey: ['products', 'document-lines'],
    queryFn: () => productApi.list({ active: true, size: 100 }),
  })
  const { data: taxRates = [] } = useQuery({
    queryKey: ['tax-rates'],
    queryFn: taxRateApi.list,
  })
  const update = (id: number, key: keyof Line, value: string | number) =>
    setLines((current) => current.map((line) => (line.id === id ? { ...line, [key]: value } : line)))
  const patch = (id: number, values: Partial<Line>) =>
    setLines((current) => current.map((line) => (line.id === id ? { ...line, ...values } : line)))
  const addLine = () => setLines((current) => [...current, { id: Date.now(), ...defaultLine() }])
  const removeLine = (id: number) => setLines((current) => current.filter((item) => item.id !== id))
  const selectProduct = (lineId: number, productId: string) => {
    const product = products.find((item) => item.id === productId)
    const tax = product?.taxRateId ? taxRates.find((item) => item.id === product.taxRateId) : undefined
    setLines((current) =>
      current.map((line) => {
        if (line.id !== lineId) return line
        const taxType = (tax?.taxType ?? (product?.taxType as TaxType | undefined) ?? 'GST') as TaxType
        const splitStrategy = (tax?.splitStrategy ??
          (taxType === 'IGST'
            ? 'NO_SPLIT_IGST'
            : taxType === 'OTHER'
              ? 'NO_SPLIT_OTHER'
              : 'PLACE_OF_SUPPLY')) as SplitStrategy
        const isService = product?.itemType === 'SERVICE'
        return {
          ...line,
          productId,
          quantity: isService ? 1 : line.quantity,
          rate: product ? Number(product[defaultRateKey] ?? 0) : line.rate,
          taxRate: tax ? Number(tax.rate) : line.taxRate,
          taxType,
          splitStrategy,
          cgstSharePercent: Number(tax?.cgstSharePercent ?? (splitStrategy.startsWith('NO_SPLIT') ? 0 : 50)),
          sgstSharePercent: Number(tax?.sgstSharePercent ?? (splitStrategy.startsWith('NO_SPLIT') ? 0 : 50)),
        }
      }),
    )
  }
  const validLines = () => lines.filter((line) => line.productId)
  const subtotal = lines.reduce((sum, line) => sum + lineGross(line), 0)
  const discountTotal = lines.reduce((sum, line) => sum + lineDiscount(line), 0)
  const tax = lines.reduce((sum, line) => sum + lineTaxAmount(line), 0)
  const replaceLines = (next: Omit<Line, 'id'>[]) => {
    setLines(
      next.length
        ? next.map((line, index) => ({ id: Date.now() + index, ...defaultLine(), ...line }))
        : [{ id: 1, ...defaultLine() }],
    )
  }
  return {
    lines,
    products,
    update,
    patch,
    addLine,
    removeLine,
    selectProduct,
    replaceLines,
    validLines,
    subtotal,
    discountTotal,
    tax,
  }
}

function LineItemsEditor({
  lines,
  products,
  onSelectProduct,
  onUpdate,
  onPatch,
  onRemove,
  onAdd,
}: {
  lines: Line[]
  products: { id: string; name: string; itemType?: string; unitName?: string | null }[]
  onSelectProduct: (lineId: number, productId: string) => void
  onUpdate: (id: number, key: keyof Line, value: string | number) => void
  onPatch: (id: number, values: Partial<Line>) => void
  onRemove: (id: number) => void
  onAdd: () => void
}) {
  return (
    <Card>
      <CardHeader>
        <h2 className="font-semibold text-slate-900">Line items</h2>
        <Button variant="outline" size="sm" onClick={onAdd}>
          <Plus className="size-4" />
          Add item
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <thead>
            <tr className="border-b">
              <th className="p-2 text-xs text-slate-500">ITEM</th>
              <th className="p-2 text-xs text-slate-500">QTY</th>
              <th className="p-2 text-xs text-slate-500">RATE</th>
              <th className="p-2 text-xs text-slate-500">DISC %</th>
              <th className="p-2 text-xs text-slate-500">TAX %</th>
              <th className="p-2 text-xs text-slate-500">TYPE</th>
              <th className="p-2 text-right text-xs text-slate-500">AMOUNT</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => {
              const selected = products.find((p) => p.id === line.productId)
              const isService = selected?.itemType === 'SERVICE'
              return (
              <tr key={line.id} className="border-b">
                <td className="min-w-[10rem] p-2 sm:min-w-[14rem]">
                  <Select value={line.productId} onValueChange={(value) => onSelectProduct(line.id, value)}>
                    <SelectTrigger className="h-auto min-h-10 min-w-0 py-2">
                      {selected ? (
                        <span className="flex min-w-0 flex-col items-start text-left">
                          <span className="truncate font-medium">{selected.name}</span>
                          <span className="text-[11px] font-normal text-slate-500">
                            {isService ? 'Service' : 'Product'}
                            {selected.unitName ? ` · ${selected.unitName}` : ''}
                          </span>
                        </span>
                      ) : (
                        'Select item'
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id} textValue={product.name}>
                          <span className="flex flex-col items-start">
                            <span>{product.name}</span>
                            <span className="text-[11px] text-slate-500">
                              {product.itemType === 'SERVICE' ? 'Service' : 'Product'}
                              {product.unitName ? ` · ${product.unitName}` : ''}
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-2">
                  <NumberInput
                    className="w-20"
                    allowDecimal
                    value={line.quantity}
                    onValueChange={(value) => onUpdate(line.id, 'quantity', Math.max(0.001, value))}
                  />
                </td>
                <td className="p-2">
                  <NumberInput
                    className="w-24"
                    value={line.rate}
                    onValueChange={(value) => onUpdate(line.id, 'rate', value)}
                  />
                </td>
                <td className="p-2">
                  <NumberInput
                    className="w-16"
                    value={line.discountPercent}
                    onValueChange={(value) =>
                      onUpdate(line.id, 'discountPercent', Math.min(100, Math.max(0, value)))
                    }
                  />
                </td>
                <td className="p-2">
                  <NumberInput
                    className="w-16"
                    value={line.taxRate}
                    onValueChange={(value) => onUpdate(line.id, 'taxRate', value)}
                  />
                </td>
                <td className="p-2">
                  <Select
                    value={line.taxType}
                    onValueChange={(value) => {
                      const taxType = value as TaxType
                      if (taxType === 'IGST') {
                        onPatch(line.id, {
                          taxType,
                          splitStrategy: 'NO_SPLIT_IGST',
                          cgstSharePercent: 0,
                          sgstSharePercent: 0,
                        })
                      } else if (taxType === 'OTHER') {
                        onPatch(line.id, {
                          taxType,
                          splitStrategy: 'NO_SPLIT_OTHER',
                          cgstSharePercent: 0,
                          sgstSharePercent: 0,
                        })
                      } else {
                        onPatch(line.id, {
                          taxType,
                          splitStrategy: 'PLACE_OF_SUPPLY',
                          cgstSharePercent: 50,
                          sgstSharePercent: 50,
                        })
                      }
                    }}
                  >
                    <SelectTrigger className="w-[5.5rem]">{line.taxType}</SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GST">GST</SelectItem>
                      <SelectItem value="IGST">IGST</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-2 text-right text-sm font-medium">
                  <div>{currency(lineAmount(line))}</div>
                  {line.discountPercent > 0 && (
                    <div className="text-xs font-normal text-slate-500">
                      −{currency(lineDiscount(line))} disc
                    </div>
                  )}
                </td>
                <td className="p-2">
                  <Button variant="ghost" size="icon" onClick={() => onRemove(line.id)}>
                    <Trash2 className="size-4 text-rose-500" />
                  </Button>
                </td>
              </tr>
              )
            })}
          </tbody>
        </Table>
      </CardContent>
    </Card>
  )
}

const invoiceSchema = z.object({
  customerId: z.string().uuid('Select a customer'),
  invoiceDate: z.string().min(1),
  dueDate: z.string().optional(),
  templateId: z.string().optional(),
  notes: z.string().optional(),
  termsAndConditions: z.string().optional(),
})

function paymentTermsDays(paymentTerms?: string | null) {
  if (!paymentTerms?.trim()) return 30
  const match = paymentTerms.match(/(\d{1,3})/)
  if (!match) return 30
  const days = Number(match[1])
  return Number.isFinite(days) && days >= 0 && days <= 365 ? days : 30
}

function defaultDueDate(invoiceDate: string, paymentTerms?: string | null) {
  const base = new Date(`${invoiceDate}T00:00:00`)
  if (Number.isNaN(base.getTime())) return ''
  base.setDate(base.getDate() + paymentTermsDays(paymentTerms))
  return base.toISOString().slice(0, 10)
}

export function CreateInvoicePage() {
  const { id: editId } = useParams()
  const isEdit = Boolean(editId)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [savedInvoiceId, setSavedInvoiceId] = useState<string | null>(editId ?? null)
  const [shippingCharges, setShippingCharges] = useState(0)
  const [invoiceStatus, setInvoiceStatus] = useState('DRAFT')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [dueDateTouched, setDueDateTouched] = useState(false)
  const { lines, products, update, patch, addLine, removeLine, selectProduct, replaceLines, validLines, subtotal, discountTotal, tax } =
    useLineItems()
  const form = useForm({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      customerId: '',
      invoiceDate: new Date().toISOString().slice(0, 10),
      dueDate: defaultDueDate(new Date().toISOString().slice(0, 10)),
      templateId: '',
      notes: '',
      termsAndConditions: '',
    },
  })
  const { data: customers = [] } = useQuery({
    queryKey: ['customers', 'invoice'],
    queryFn: () => customerApi.list({ size: 100 }),
  })
  const { data: invoiceTemplates = [] } = useQuery({
    queryKey: ['templates', 'SALES_INVOICE'],
    queryFn: () => templateApi.list({ documentType: 'SALES_INVOICE' }),
  })
  const { data: existingInvoice, isLoading: loadingInvoice } = useQuery({
    queryKey: ['sales-invoice', editId],
    queryFn: () => salesApi.getInvoice(editId!),
    enabled: isEdit && !!editId,
  })
  const customerId = form.watch('customerId')
  const invoiceDate = form.watch('invoiceDate')
  const selectedCustomer = customers.find((c) => c.id === customerId)
  const defaultTemplateId = invoiceTemplates.find((t) => t.isDefault)?.id ?? invoiceTemplates[0]?.id ?? ''

  useEffect(() => {
    if (!existingInvoice) return
    setSavedInvoiceId(existingInvoice.id)
    setInvoiceStatus(existingInvoice.status)
    setInvoiceNumber(existingInvoice.invoiceNumber ?? '')
    setDueDateTouched(Boolean(existingInvoice.dueDate))
    const invoiceDateValue = existingInvoice.invoiceDate?.slice(0, 10) || new Date().toISOString().slice(0, 10)
    form.reset({
      customerId: existingInvoice.customerId,
      invoiceDate: invoiceDateValue,
      dueDate: existingInvoice.dueDate?.slice(0, 10) || defaultDueDate(invoiceDateValue),
      templateId: existingInvoice.templateId ?? defaultTemplateId,
      notes: existingInvoice.notes ?? '',
      termsAndConditions: existingInvoice.termsAndConditions ?? '',
    })
    setShippingCharges(Number(existingInvoice.shippingCharges ?? 0))
    const items = existingInvoice.items ?? []
    replaceLines(
      items.map((item) => {
        const taxType = (item.taxType ?? 'GST') as TaxType
        const splitStrategy = (item.splitStrategy ??
          (taxType === 'IGST' ? 'NO_SPLIT_IGST' : taxType === 'OTHER' ? 'NO_SPLIT_OTHER' : 'PLACE_OF_SUPPLY')) as SplitStrategy
        return {
          productId: item.productId,
          quantity: Number(item.quantity ?? 1),
          rate: Number(item.rate ?? 0),
          discountPercent: Number(item.discountPercent ?? 0),
          taxRate: Number(item.taxRate ?? 18),
          taxType,
          splitStrategy,
          cgstSharePercent: Number(
            item.cgstSharePercent ?? (splitStrategy.startsWith('NO_SPLIT') ? 0 : 50),
          ),
          sgstSharePercent: Number(
            item.sgstSharePercent ?? (splitStrategy.startsWith('NO_SPLIT') ? 0 : 50),
          ),
        }
      }),
    )
    // replaceLines is stable enough for initial hydrate; avoid depending on it each render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingInvoice, form, defaultTemplateId])

  useEffect(() => {
    if (isEdit || form.getValues('templateId') || !defaultTemplateId) return
    form.setValue('templateId', defaultTemplateId)
  }, [defaultTemplateId, form, isEdit])

  useEffect(() => {
    if (dueDateTouched || !invoiceDate) return
    form.setValue('dueDate', defaultDueDate(invoiceDate, selectedCustomer?.paymentTerms))
  }, [customerId, invoiceDate, selectedCustomer?.paymentTerms, dueDateTouched, form])

  const isDraft = invoiceStatus === 'DRAFT'
  const total = Math.round(subtotal - discountTotal + tax + shippingCharges)

  const applyTemplateDefaults = (templateId: string) => {
    form.setValue('templateId', templateId)
    const selected = invoiceTemplates.find((t) => t.id === templateId)
    if (!selected) return
    try {
      const config =
        typeof selected.configJson === 'string'
          ? (JSON.parse(selected.configJson) as { footer?: { defaultTerms?: string; note?: string } })
          : selected.configJson
      const terms = config?.footer?.defaultTerms || config?.footer?.note || ''
      if (terms && !form.getValues('termsAndConditions')?.trim()) {
        form.setValue('termsAndConditions', terms)
      }
    } catch {
      // ignore malformed template config
    }
  }

  const save = (confirm = false) =>
    form.handleSubmit(async (values) => {
      try {
        if (!isDraft) throw new Error('Only draft invoices can be edited')
        const items = validLines()
        if (!items.length) throw new Error('Add at least one line item')
        const payload = {
          customerId: values.customerId,
          invoiceDate: values.invoiceDate,
          dueDate: values.dueDate || undefined,
          templateId: values.templateId || undefined,
          notes: values.notes,
          termsAndConditions: values.termsAndConditions || undefined,
          shippingCharges,
          items: items.map(
            ({
              productId,
              quantity,
              rate,
              discountPercent,
              taxRate,
              taxType,
              splitStrategy,
              cgstSharePercent,
              sgstSharePercent,
            }) => ({
              productId,
              quantity,
              rate,
              discountPercent,
              taxRate,
              taxType,
              splitStrategy,
              cgstSharePercent,
              sgstSharePercent,
            }),
          ),
        }
        const invoice = savedInvoiceId
          ? await salesApi.updateInvoice(savedInvoiceId, payload)
          : await salesApi.createInvoice(payload)
        setSavedInvoiceId(invoice.id)
        setInvoiceNumber(invoice.invoiceNumber ?? '')
        setInvoiceStatus(invoice.status)
        if (confirm) {
          const confirmed = await salesApi.confirmInvoice(invoice.id)
          setInvoiceStatus(confirmed.status)
          await queryClient.invalidateQueries({ queryKey: ['inventory'] })
        }
        await queryClient.invalidateQueries({ queryKey: ['invoices'] })
        await queryClient.invalidateQueries({ queryKey: ['sales-invoice', invoice.id] })
        toast.success(confirm ? 'Invoice confirmed' : 'Invoice saved as draft')
        if (confirm) navigate('/sales/invoices')
      } catch (error) {
        toast.error(getApiErrorMessage(error, 'Unable to save invoice'))
      }
    })

  const cancelInvoice = async () => {
    if (!savedInvoiceId) {
      navigate('/sales/invoices')
      return
    }
    try {
      await salesApi.cancelInvoice(savedInvoiceId)
      await queryClient.invalidateQueries({ queryKey: ['invoices'] })
      toast.success('Invoice cancelled')
      navigate('/sales/invoices')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to cancel invoice'))
    }
  }

  const downloadPdf = async () => {
    if (!savedInvoiceId) {
      toast.error('Save the invoice before downloading PDF')
      return
    }
    try {
      const blob = await salesApi.downloadInvoicePdf(savedInvoiceId)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `invoice-${savedInvoiceId}.pdf`
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to download PDF'))
    }
  }

  if (isEdit && loadingInvoice) {
    return <p className="py-16 text-center text-sm text-slate-500">Loading invoice…</p>
  }

  if (isEdit && existingInvoice && existingInvoice.status !== 'DRAFT') {
    return (
      <Card>
        <CardContent className="space-y-4 py-10 text-center">
          <p className="text-sm text-slate-600">
            Invoice {existingInvoice.invoiceNumber} is {existingInvoice.status} and can no longer be edited.
          </p>
          <div className="flex justify-center gap-2">
            <Button variant="outline" onClick={() => navigate(`/sales/invoices/${existingInvoice.id}`)}>
              View invoice
            </Button>
            <Button onClick={() => navigate('/sales/invoices')}>Back to list</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h1 className="page-title">
            {isEdit ? `Edit sales invoice` : 'Create sales invoice'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {invoiceNumber
              ? `${invoiceNumber} · ${invoiceStatus}`
              : 'Stocked products use the organization default warehouse on confirm; services are not stocked.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate('/sales/invoices')}>
            Back
          </Button>
          <Button variant="outline" onClick={downloadPdf} disabled={!savedInvoiceId}>
            <Download className="size-4" />
            Download PDF
          </Button>
          <Button variant="outline" onClick={cancelInvoice} disabled={!isDraft && !!savedInvoiceId}>
            Cancel invoice
          </Button>
          <Button variant="outline" onClick={() => save(false)()} disabled={!isDraft}>
            Save draft
          </Button>
          <Button onClick={() => save(true)()} disabled={!isDraft}>
            Confirm invoice
          </Button>
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Customer</Label>
                <Select value={form.watch('customerId')} onValueChange={(value) => form.setValue('customerId', value)}>
                  <SelectTrigger className="h-auto min-h-10 py-2">
                    {(() => {
                      const selected = customers.find((c) => c.id === form.watch('customerId'))
                      return selected ? <PartySelectLabel party={selected} /> : 'Select customer'
                    })()}
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id} textValue={customerLabel(customer)}>
                        <PartySelectLabel party={customer} />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Invoice date</Label>
                <Input type="date" {...form.register('invoiceDate')} />
              </div>
              <div className="space-y-1.5">
                <Label>Due date</Label>
                <Input
                  type="date"
                  {...form.register('dueDate', {
                    onChange: () => setDueDateTouched(true),
                  })}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Invoice template</Label>
                <Select
                  value={form.watch('templateId') || '__none__'}
                  onValueChange={(value) => applyTemplateDefaults(value === '__none__' ? '' : value)}
                >
                  <SelectTrigger>
                    {invoiceTemplates.find((t) => t.id === form.watch('templateId'))?.templateName ??
                      'Organization default'}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Organization default</SelectItem>
                    {invoiceTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.templateName}
                        {template.isDefault ? ' (default)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">
                  PDF uses this fixed layout. Manage designs under Templates.
                </p>
              </div>
              <p className="text-xs font-normal text-slate-500 sm:col-span-2">
                Due date defaults to customer payment terms (or 30 days). Stocked products deduct from the organization
                default warehouse when confirmed; services never touch inventory.
              </p>
            </CardContent>
          </Card>
          <LineItemsEditor
            lines={lines}
            products={products}
            onSelectProduct={selectProduct}
            onUpdate={update}
            onPatch={patch}
            onRemove={removeLine}
            onAdd={addLine}
          />
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-slate-900">Totals</h2>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <b>{currency(subtotal)}</b>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Discount</span>
                <b>−{currency(discountTotal)}</b>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Shipping charges</span>
                <NumberInput
                  className="w-28 text-right"
                  value={shippingCharges}
                  onValueChange={setShippingCharges}
                />
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <b>{currency(tax)}</b>
              </div>
              <div className="flex justify-between border-t pt-3 text-base font-semibold text-slate-900">
                <span>Grand total</span>
                <span>{currency(total)}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-4 p-5">
              <div>
                <Label>Notes</Label>
                <Textarea className="mt-2" {...form.register('notes')} />
              </div>
              <div>
                <Label>Terms &amp; conditions</Label>
                <Textarea className="mt-2" rows={4} {...form.register('termsAndConditions')} />
                <p className="mt-1 text-xs text-slate-500">
                  Shown on the PDF. Leave blank to use the template defaults.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

const quotationSchema = z.object({
  customerId: z.string().uuid('Select a customer'),
  quotationDate: z.string().min(1),
  notes: z.string().optional(),
})

export function CreateQuotationPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { lines, products, update, patch, addLine, removeLine, selectProduct, validLines, subtotal, discountTotal, tax } = useLineItems()
  const form = useForm({
    resolver: zodResolver(quotationSchema),
    defaultValues: { customerId: '', quotationDate: new Date().toISOString().slice(0, 10), notes: '' },
  })
  const { data: customers = [] } = useQuery({
    queryKey: ['customers', 'quotation'],
    queryFn: () => customerApi.list({ size: 100 }),
  })

  const save = form.handleSubmit(async (values) => {
    try {
      const items = validLines()
      if (!items.length) throw new Error('Add at least one line item')
      await salesApi.createQuotation({
        customerId: values.customerId,
        quotationDate: values.quotationDate,
        notes: values.notes,
        items: items.map(
          ({
            productId,
            quantity,
            rate,
            discountPercent,
            taxRate,
            taxType,
            splitStrategy,
            cgstSharePercent,
            sgstSharePercent,
          }) => ({
            productId,
            quantity,
            rate,
            discountPercent,
            taxRate,
            taxType,
            splitStrategy,
            cgstSharePercent,
            sgstSharePercent,
          }),
        ),
      })
      await queryClient.invalidateQueries({ queryKey: ['quotations'] })
      toast.success('Quotation created')
      navigate('/sales/quotations')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to create quotation'))
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h1 className="page-title">Create quotation</h1>
          <p className="mt-1 text-sm text-slate-500">Prepare a quote for a customer with line items.</p>
        </div>
        <Button onClick={save}>Save quotation</Button>
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Customer</Label>
                <Select value={form.watch('customerId')} onValueChange={(value) => form.setValue('customerId', value)}>
                  <SelectTrigger className="h-auto min-h-10 py-2">
                    {(() => {
                      const selected = customers.find((c) => c.id === form.watch('customerId'))
                      return selected ? <PartySelectLabel party={selected} /> : 'Select customer'
                    })()}
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id} textValue={customerLabel(customer)}>
                        <PartySelectLabel party={customer} />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Quotation date</Label>
                <Input type="date" {...form.register('quotationDate')} />
              </div>
            </CardContent>
          </Card>
          <LineItemsEditor
            lines={lines}
            products={products}
            onSelectProduct={selectProduct}
            onUpdate={update}
            onPatch={patch}
            onRemove={removeLine}
            onAdd={addLine}
          />
        </div>
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-slate-900">Totals</h2>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <b>{currency(subtotal)}</b>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Discount</span>
              <b>−{currency(discountTotal)}</b>
            </div>
            <div className="flex justify-between">
              <span>Tax</span>
              <b>{currency(tax)}</b>
            </div>
            <div className="flex justify-between border-t pt-3 text-base font-semibold">
              <span>Grand total</span>
              <span>{currency(Math.round(subtotal - discountTotal + tax))}</span>
            </div>
            <div className="pt-2">
              <Label>Notes</Label>
              <Textarea className="mt-2" {...form.register('notes')} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

const salesOrderSchema = z.object({
  customerId: z.string().uuid('Select a customer'),
  orderDate: z.string().min(1),
  notes: z.string().optional(),
})

export function CreateSalesOrderPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { lines, products, update, patch, addLine, removeLine, selectProduct, validLines, subtotal, discountTotal, tax } =
    useLineItems()
  const form = useForm({
    resolver: zodResolver(salesOrderSchema),
    defaultValues: { customerId: '', orderDate: new Date().toISOString().slice(0, 10), notes: '' },
  })
  const { data: customers = [] } = useQuery({
    queryKey: ['customers', 'sales-order'],
    queryFn: () => customerApi.list({ size: 100 }),
  })

  const save = form.handleSubmit(async (values) => {
    try {
      const items = validLines()
      if (!items.length) throw new Error('Add at least one line item')
      await salesApi.createOrder({
        customerId: values.customerId,
        orderDate: values.orderDate,
        notes: values.notes,
        items: items.map(
          ({
            productId,
            quantity,
            rate,
            discountPercent,
            taxRate,
            taxType,
            splitStrategy,
            cgstSharePercent,
            sgstSharePercent,
          }) => ({
            productId,
            quantity,
            rate,
            discountPercent,
            taxRate,
            taxType,
            splitStrategy,
            cgstSharePercent,
            sgstSharePercent,
          }),
        ),
      })
      await queryClient.invalidateQueries({ queryKey: ['orders'] })
      toast.success('Sales order created')
      navigate('/sales/orders')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to create sales order'))
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h1 className="page-title">Create sales order</h1>
          <p className="mt-1 text-sm text-slate-500">Create an order directly, or convert from a quotation.</p>
        </div>
        <Button onClick={save}>Save sales order</Button>
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Customer</Label>
                <Select value={form.watch('customerId')} onValueChange={(value) => form.setValue('customerId', value)}>
                  <SelectTrigger className="h-auto min-h-10 py-2">
                    {(() => {
                      const selected = customers.find((c) => c.id === form.watch('customerId'))
                      return selected ? <PartySelectLabel party={selected} /> : 'Select customer'
                    })()}
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id} textValue={customerLabel(customer)}>
                        <PartySelectLabel party={customer} />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Order date</Label>
                <Input type="date" {...form.register('orderDate')} />
              </div>
            </CardContent>
          </Card>
          <LineItemsEditor
            lines={lines}
            products={products}
            onSelectProduct={selectProduct}
            onUpdate={update}
            onPatch={patch}
            onRemove={removeLine}
            onAdd={addLine}
          />
        </div>
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-slate-900">Totals</h2>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <b>{currency(subtotal)}</b>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Discount</span>
              <b>−{currency(discountTotal)}</b>
            </div>
            <div className="flex justify-between">
              <span>Tax</span>
              <b>{currency(tax)}</b>
            </div>
            <div className="flex justify-between border-t pt-3 text-base font-semibold">
              <span>Grand total</span>
              <span>{currency(Math.round(subtotal - discountTotal + tax))}</span>
            </div>
            <div className="pt-2">
              <Label>Notes</Label>
              <Textarea className="mt-2" {...form.register('notes')} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

const convertChallanSchema = z.object({
  salesOrderId: z.string().uuid('Select a sales order'),
  warehouseId: z.string().uuid('Select a warehouse'),
})

export function CreateChallanPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const form = useForm({
    resolver: zodResolver(convertChallanSchema),
    defaultValues: { salesOrderId: '', warehouseId: '' },
  })
  const { data: orders = [] } = useQuery({ queryKey: ['orders'], queryFn: salesApi.listOrders })
  const { data: challans = [] } = useQuery({ queryKey: ['challans'], queryFn: salesApi.listChallans })
  const { data: warehouses = [] } = useQuery({ queryKey: ['warehouses'], queryFn: warehouseApi.list })
  const { data: orgSettings } = useQuery({
    queryKey: ['organization', 'settings'],
    queryFn: organizationApi.settings,
  })
  const { data: customers = [] } = useQuery({
    queryKey: ['customers', 'party-labels'],
    queryFn: () => customerApi.list({ size: 200 }),
  })

  useEffect(() => {
    const defaultId = resolveDefaultWarehouseId(warehouses, orgSettings?.defaultWarehouseId)
    if (defaultId && !form.getValues('warehouseId')) form.setValue('warehouseId', defaultId)
  }, [form, orgSettings?.defaultWarehouseId, warehouses])

  const challanByOrderId = useMemo(() => {
    const map: Record<string, Record<string, unknown>> = {}
    for (const challan of challans) {
      const orderId = challan.salesOrderId ? String(challan.salesOrderId) : ''
      if (!orderId || map[orderId]) continue
      map[orderId] = challan
    }
    return map
  }, [challans])

  const openOrders = orders.filter((row) => String(row.status) !== 'CANCELLED')
  const customerNameById = useMemo(
    () => Object.fromEntries(customers.map((c) => [c.id, customerLabel(c)])),
    [customers],
  )

  const goToExistingChallan = (orderId: string) => {
    const existing = challanByOrderId[orderId]
    if (!existing?.id) return false
    toast.message('Delivery challan already exists for this order')
    navigate(`/sales/challans?focus=${String(existing.id)}`)
    return true
  }

  const save = form.handleSubmit(async (values) => {
    if (goToExistingChallan(values.salesOrderId)) return
    try {
      const challan = await salesApi.convertOrderToChallan(values.salesOrderId, {
        warehouseId: values.warehouseId,
      })
      await queryClient.invalidateQueries({ queryKey: ['challans'] })
      await queryClient.invalidateQueries({ queryKey: ['orders'] })
      toast.success('Delivery challan created')
      navigate(challan?.id ? `/sales/challans?focus=${String(challan.id)}` : '/sales/challans')
    } catch (error) {
      const message = getApiErrorMessage(error, 'Unable to create delivery challan')
      if (/already exists/i.test(message) && goToExistingChallan(values.salesOrderId)) return
      if (/already exists/i.test(message)) {
        try {
          const latest = await salesApi.listChallans()
          const found = latest.find((row) => String(row.salesOrderId) === values.salesOrderId)
          if (found?.id) {
            toast.message('Delivery challan already exists for this order')
            navigate(`/sales/challans?focus=${String(found.id)}`)
            return
          }
        } catch {
          // fall through
        }
      }
      toast.error(message)
    }
  })

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="page-title">Create delivery challan</h1>
        <p className="mt-1 text-sm text-slate-500">Convert a sales order into a delivery challan.</p>
      </div>
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="space-y-1.5">
            <Label>Sales order</Label>
            <Select
              value={form.watch('salesOrderId')}
              onValueChange={(value) => {
                if (goToExistingChallan(value)) return
                form.setValue('salesOrderId', value)
              }}
            >
              <SelectTrigger>
                {(() => {
                  const selected = openOrders.find((o) => String(o.id) === form.watch('salesOrderId'))
                  if (!selected) return 'Select sales order'
                  const party = selected.customerId ? customerNameById[String(selected.customerId)] : '—'
                  return `${String(selected.orderNumber ?? selected.id)} · ${party}`
                })()}
              </SelectTrigger>
              <SelectContent>
                {openOrders.map((order) => {
                  const existing = challanByOrderId[String(order.id)]
                  return (
                    <SelectItem key={String(order.id)} value={String(order.id)}>
                      {String(order.orderNumber ?? order.id)} ·{' '}
                      {order.customerId ? (customerNameById[String(order.customerId)] ?? String(order.customerId)) : '—'}
                      {existing ? ` · challan ${String(existing.challanNumber ?? '')}` : ''}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Warehouse</Label>
            <Select value={form.watch('warehouseId')} onValueChange={(value) => form.setValue('warehouseId', value)}>
              <SelectTrigger>
                {warehouses.find((w) => w.id === form.watch('warehouseId'))?.warehouseName ?? 'Select warehouse'}
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
          <Button onClick={save}>Create challan</Button>
        </CardContent>
      </Card>
    </div>
  )
}

const createGrnSchema = z.object({
  purchaseOrderId: z.string().uuid('Select a purchase order'),
  warehouseId: z.string().uuid('Select a warehouse'),
  receiptDate: z.string().min(1),
  confirmAfterCreate: z.boolean().optional(),
})

export function CreateGrnPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const form = useForm({
    resolver: zodResolver(createGrnSchema),
    defaultValues: {
      purchaseOrderId: '',
      warehouseId: '',
      receiptDate: new Date().toISOString().slice(0, 10),
      confirmAfterCreate: true,
    },
  })
  const { data: orders = [] } = useQuery({ queryKey: ['purchase-orders'], queryFn: purchaseApi.listOrders })
  const { data: warehouses = [] } = useQuery({ queryKey: ['warehouses'], queryFn: warehouseApi.list })
  const { data: orgSettings } = useQuery({
    queryKey: ['organization', 'settings'],
    queryFn: organizationApi.settings,
  })
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers', 'party-labels'],
    queryFn: () => supplierApi.list({ size: 200 }),
  })

  useEffect(() => {
    const defaultId = resolveDefaultWarehouseId(warehouses, orgSettings?.defaultWarehouseId)
    if (defaultId && !form.getValues('warehouseId')) form.setValue('warehouseId', defaultId)
  }, [form, orgSettings?.defaultWarehouseId, warehouses])

  const openOrders = orders.filter((row) => String(row.status) !== 'CANCELLED')
  const supplierNameById = useMemo(
    () => Object.fromEntries(suppliers.map((s) => [s.id, supplierLabel(s)])),
    [suppliers],
  )

  const save = form.handleSubmit(async (values) => {
    try {
      const grn = await purchaseApi.createGrnFromOrder(values.purchaseOrderId, {
        warehouseId: values.warehouseId,
        receiptDate: values.receiptDate,
      })
      if (values.confirmAfterCreate && grn?.id) {
        await purchaseApi.confirmGrn(String(grn.id))
      }
      await queryClient.invalidateQueries({ queryKey: ['grn'] })
      await queryClient.invalidateQueries({ queryKey: ['inventory'] })
      toast.success(values.confirmAfterCreate ? 'GRN created and confirmed' : 'GRN created')
      navigate('/purchases/grn')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to create goods receipt'))
    }
  })

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="page-title">Create goods receipt</h1>
        <p className="mt-1 text-sm text-slate-500">Receive stock against a purchase order.</p>
      </div>
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="space-y-1.5">
            <Label>Purchase order</Label>
            <Select
              value={form.watch('purchaseOrderId')}
              onValueChange={(value) => form.setValue('purchaseOrderId', value)}
            >
              <SelectTrigger>
                {(() => {
                  const selected = openOrders.find((o) => String(o.id) === form.watch('purchaseOrderId'))
                  if (!selected) return 'Select purchase order'
                  const party = selected.supplierId ? supplierNameById[String(selected.supplierId)] : '—'
                  return `${String(selected.poNumber ?? selected.id)} · ${party}`
                })()}
              </SelectTrigger>
              <SelectContent>
                {openOrders.map((order) => (
                  <SelectItem key={String(order.id)} value={String(order.id)}>
                    {String(order.poNumber ?? order.id)} ·{' '}
                    {order.supplierId ? (supplierNameById[String(order.supplierId)] ?? String(order.supplierId)) : '—'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Warehouse</Label>
            <Select value={form.watch('warehouseId')} onValueChange={(value) => form.setValue('warehouseId', value)}>
              <SelectTrigger>
                {warehouses.find((w) => w.id === form.watch('warehouseId'))?.warehouseName ?? 'Select warehouse'}
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
            <Label>Receipt date</Label>
            <Input type="date" {...form.register('receiptDate')} />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={!!form.watch('confirmAfterCreate')}
              onChange={(e) => form.setValue('confirmAfterCreate', e.target.checked)}
            />
            Confirm GRN immediately (posts inventory)
          </label>
          <Button onClick={save}>Create GRN</Button>
        </CardContent>
      </Card>
    </div>
  )
}

const createPurchaseInvoiceSchema = z.object({
  sourceType: z.enum(['po', 'grn']),
  sourceId: z.string().uuid('Select a source document'),
  invoiceDate: z.string().min(1),
  supplierInvoiceNumber: z.string().optional(),
})

export function CreatePurchaseInvoicePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const form = useForm({
    resolver: zodResolver(createPurchaseInvoiceSchema),
    defaultValues: {
      sourceType: 'po' as const,
      sourceId: '',
      invoiceDate: new Date().toISOString().slice(0, 10),
      supplierInvoiceNumber: '',
    },
  })
  const sourceType = form.watch('sourceType')
  const { data: orders = [] } = useQuery({ queryKey: ['purchase-orders'], queryFn: purchaseApi.listOrders })
  const { data: grns = [] } = useQuery({ queryKey: ['grn'], queryFn: purchaseApi.listGrn })
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers', 'party-labels'],
    queryFn: () => supplierApi.list({ size: 200 }),
  })
  const supplierNameById = useMemo(
    () => Object.fromEntries(suppliers.map((s) => [s.id, supplierLabel(s)])),
    [suppliers],
  )
  const sources = (sourceType === 'po' ? orders : grns).filter((row) => String(row.status) !== 'CANCELLED')

  const save = form.handleSubmit(async (values) => {
    try {
      const body = {
        invoiceDate: values.invoiceDate,
        supplierInvoiceNumber: values.supplierInvoiceNumber || undefined,
      }
      const invoice =
        values.sourceType === 'po'
          ? await purchaseApi.createInvoiceFromOrder(values.sourceId, body)
          : await purchaseApi.createInvoiceFromGrn(values.sourceId, body)
      await queryClient.invalidateQueries({ queryKey: ['purchase-invoices'] })
      toast.success('Purchase invoice created')
      navigate(invoice?.id ? `/purchases/invoices/${String(invoice.id)}` : '/purchases/invoices')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to create purchase invoice'))
    }
  })

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="page-title">Create purchase invoice</h1>
        <p className="mt-1 text-sm text-slate-500">Bill from a purchase order or goods receipt.</p>
      </div>
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="space-y-1.5">
            <Label>Source</Label>
            <Select
              value={form.watch('sourceType')}
              onValueChange={(value) => {
                form.setValue('sourceType', value as 'po' | 'grn')
                form.setValue('sourceId', '')
              }}
            >
              <SelectTrigger>{sourceType === 'po' ? 'Purchase order' : 'Goods receipt'}</SelectTrigger>
              <SelectContent>
                <SelectItem value="po">Purchase order</SelectItem>
                <SelectItem value="grn">Goods receipt</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{sourceType === 'po' ? 'Purchase order' : 'Goods receipt'}</Label>
            <Select value={form.watch('sourceId')} onValueChange={(value) => form.setValue('sourceId', value)}>
              <SelectTrigger>
                {(() => {
                  const selected = sources.find((s) => String(s.id) === form.watch('sourceId'))
                  if (!selected) return 'Select document'
                  const number = String(selected.poNumber ?? selected.grnNumber ?? selected.id)
                  const party = selected.supplierId ? supplierNameById[String(selected.supplierId)] : '—'
                  return `${number} · ${party}`
                })()}
              </SelectTrigger>
              <SelectContent>
                {sources.map((row) => (
                  <SelectItem key={String(row.id)} value={String(row.id)}>
                    {String(row.poNumber ?? row.grnNumber ?? row.id)} ·{' '}
                    {row.supplierId ? (supplierNameById[String(row.supplierId)] ?? String(row.supplierId)) : '—'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Invoice date</Label>
            <Input type="date" {...form.register('invoiceDate')} />
          </div>
          <div className="space-y-1.5">
            <Label>Supplier invoice number</Label>
            <Input placeholder="Optional" {...form.register('supplierInvoiceNumber')} />
          </div>
          <Button onClick={save}>Create purchase invoice</Button>
        </CardContent>
      </Card>
    </div>
  )
}

const purchaseOrderSchema = z.object({
  supplierId: z.string().uuid('Select a supplier'),
  orderDate: z.string().min(1),
  notes: z.string().optional(),
})

export function CreatePurchaseOrderPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { lines, products, update, patch, addLine, removeLine, selectProduct, validLines, subtotal, discountTotal, tax } =
    useLineItems('purchasePrice')
  const form = useForm({
    resolver: zodResolver(purchaseOrderSchema),
    defaultValues: { supplierId: '', orderDate: new Date().toISOString().slice(0, 10), notes: '' },
  })
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers', 'po'],
    queryFn: () => supplierApi.list({ size: 100 }),
  })

  const save = form.handleSubmit(async (values) => {
    try {
      const items = validLines()
      if (!items.length) throw new Error('Add at least one line item')
      await purchaseApi.createOrder({
        supplierId: values.supplierId,
        orderDate: values.orderDate,
        notes: values.notes,
        items: items.map(
          ({
            productId,
            quantity,
            rate,
            discountPercent,
            taxRate,
            taxType,
            splitStrategy,
            cgstSharePercent,
            sgstSharePercent,
          }) => ({
            productId,
            quantity,
            rate,
            discountPercent,
            taxRate,
            taxType,
            splitStrategy,
            cgstSharePercent,
            sgstSharePercent,
          }),
        ),
      })
      await queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      toast.success('Purchase order created')
      navigate('/purchases/orders')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to create purchase order'))
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h1 className="page-title">Create purchase order</h1>
          <p className="mt-1 text-sm text-slate-500">Order stock from a supplier with line items.</p>
        </div>
        <Button onClick={save}>Save purchase order</Button>
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Supplier</Label>
                <Select value={form.watch('supplierId')} onValueChange={(value) => form.setValue('supplierId', value)}>
                  <SelectTrigger className="h-auto min-h-10 py-2">
                    {(() => {
                      const selected = suppliers.find((s) => s.id === form.watch('supplierId'))
                      return selected ? <PartySelectLabel party={selected} /> : 'Select supplier'
                    })()}
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id} textValue={supplierLabel(supplier)}>
                        <PartySelectLabel party={supplier} />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Order date</Label>
                <Input type="date" {...form.register('orderDate')} />
              </div>
            </CardContent>
          </Card>
          <LineItemsEditor
            lines={lines}
            products={products}
            onSelectProduct={selectProduct}
            onUpdate={update}
            onPatch={patch}
            onRemove={removeLine}
            onAdd={addLine}
          />
        </div>
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-slate-900">Totals</h2>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <b>{currency(subtotal)}</b>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Discount</span>
              <b>−{currency(discountTotal)}</b>
            </div>
            <div className="flex justify-between">
              <span>Tax</span>
              <b>{currency(tax)}</b>
            </div>
            <div className="flex justify-between border-t pt-3 text-base font-semibold">
              <span>Grand total</span>
              <span>{currency(Math.round(subtotal - discountTotal + tax))}</span>
            </div>
            <div className="pt-2">
              <Label>Notes</Label>
              <Textarea className="mt-2" {...form.register('notes')} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

const paymentSchema = z.object({
  paymentType: z.enum(['RECEIPT', 'PAYMENT']),
  partyType: z.enum(['CUSTOMER', 'SUPPLIER']),
  partyId: z.string().uuid('Select a party'),
  amount: z.coerce.number().positive('Amount is required'),
  paymentDate: z.string().min(1),
  paymentMode: z.string().min(1, 'Payment mode is required'),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
  invoiceId: z.string().optional(),
})

export function PaymentCreatePage({ defaultType = 'RECEIPT' }: { defaultType?: 'RECEIPT' | 'PAYMENT' }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const initialType = (searchParams.get('type') as 'RECEIPT' | 'PAYMENT' | null) ?? defaultType
  const prefillCustomerId = searchParams.get('customerId') ?? ''
  const prefillInvoiceId = searchParams.get('invoiceId') ?? ''
  const prefillAmount = Number(searchParams.get('amount') ?? 0)
  const form = useForm({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paymentType: initialType,
      partyType: initialType === 'RECEIPT' ? 'CUSTOMER' : 'SUPPLIER',
      partyId: prefillCustomerId,
      amount: Number.isFinite(prefillAmount) && prefillAmount > 0 ? prefillAmount : 0,
      paymentDate: new Date().toISOString().slice(0, 10),
      paymentMode: 'BANK_TRANSFER',
      referenceNumber: '',
      notes: '',
      invoiceId: prefillInvoiceId,
    },
  })
  const paymentType = form.watch('paymentType')
  const partyType = form.watch('partyType')
  const { data: customers = [] } = useQuery({
    queryKey: ['customers', 'payment'],
    queryFn: () => customerApi.list({ size: 100 }),
    enabled: partyType === 'CUSTOMER',
  })
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers', 'payment'],
    queryFn: () => supplierApi.list({ size: 100 }),
    enabled: partyType === 'SUPPLIER',
  })
  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices', 'payment-alloc'],
    queryFn: () => salesApi.listInvoices(),
    enabled: paymentType === 'RECEIPT',
  })

  const save = form.handleSubmit(async (values) => {
    try {
      const allocations =
        values.invoiceId && values.amount
          ? [
              {
                documentType: 'SALES_INVOICE',
                documentId: values.invoiceId,
                amount: values.amount,
              },
            ]
          : undefined
      await paymentApi.create({
        paymentDate: values.paymentDate,
        paymentType: values.paymentType,
        partyType: values.partyType,
        customerId: values.partyType === 'CUSTOMER' ? values.partyId : undefined,
        supplierId: values.partyType === 'SUPPLIER' ? values.partyId : undefined,
        amount: values.amount,
        paymentMode: values.paymentMode,
        transactionReference: values.referenceNumber || undefined,
        notes: values.notes || undefined,
        allocations,
      })
      await queryClient.invalidateQueries({ queryKey: ['received'] })
      await queryClient.invalidateQueries({ queryKey: ['suppliers-payments'] })
      if (values.invoiceId) {
        await queryClient.invalidateQueries({ queryKey: ['sales-invoice', values.invoiceId] })
        await queryClient.invalidateQueries({ queryKey: ['invoices'] })
      }
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Payment recorded')
      navigate(values.paymentType === 'RECEIPT' ? '/payments/received' : '/payments/suppliers')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to record payment'))
    }
  })

  const partyOptions =
    partyType === 'CUSTOMER'
      ? customers.map((c) => ({ id: c.id, label: customerLabel(c), party: c }))
      : suppliers.map((s) => ({ id: s.id, label: supplierLabel(s), party: s }))

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex justify-between gap-3">
        <div>
          <h1 className="page-title">
            {paymentType === 'RECEIPT' ? 'Record payment received' : 'Record supplier payment'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">Capture payment details and optional invoice allocation.</p>
        </div>
        <Button onClick={save}>Save payment</Button>
      </div>
      <Card>
        <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Payment type</Label>
            <Select
              value={form.watch('paymentType')}
              onValueChange={(value) => {
                form.setValue('paymentType', value as 'RECEIPT' | 'PAYMENT')
                form.setValue('partyType', value === 'RECEIPT' ? 'CUSTOMER' : 'SUPPLIER')
                form.setValue('partyId', '')
              }}
            >
              <SelectTrigger>{form.watch('paymentType')}</SelectTrigger>
              <SelectContent>
                <SelectItem value="RECEIPT">RECEIPT</SelectItem>
                <SelectItem value="PAYMENT">PAYMENT</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Party type</Label>
            <Select
              value={form.watch('partyType')}
              onValueChange={(value) => {
                form.setValue('partyType', value as 'CUSTOMER' | 'SUPPLIER')
                form.setValue('partyId', '')
              }}
            >
              <SelectTrigger>{form.watch('partyType')}</SelectTrigger>
              <SelectContent>
                <SelectItem value="CUSTOMER">CUSTOMER</SelectItem>
                <SelectItem value="SUPPLIER">SUPPLIER</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>{partyType === 'CUSTOMER' ? 'Customer' : 'Supplier'}</Label>
            <Select value={form.watch('partyId')} onValueChange={(value) => form.setValue('partyId', value)}>
              <SelectTrigger className="h-auto min-h-10 py-2">
                {(() => {
                  const selected = partyOptions.find((p) => p.id === form.watch('partyId'))
                  return selected ? <PartySelectLabel party={selected.party} /> : 'Select party'
                })()}
              </SelectTrigger>
              <SelectContent>
                {partyOptions.map((party) => (
                  <SelectItem key={party.id} value={party.id} textValue={party.label}>
                    <PartySelectLabel party={party.party} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Amount</Label>
            <NumberInput
              value={Number(form.watch('amount') ?? 0)}
              onValueChange={(value) => form.setValue('amount', value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Payment date</Label>
            <Input type="date" {...form.register('paymentDate')} />
          </div>
          <div className="space-y-1.5">
            <Label>Payment mode</Label>
            <Select value={form.watch('paymentMode')} onValueChange={(value) => form.setValue('paymentMode', value)}>
              <SelectTrigger>{form.watch('paymentMode')}</SelectTrigger>
              <SelectContent>
                {['CASH', 'BANK_TRANSFER', 'UPI', 'CHEQUE', 'CARD'].map((mode) => (
                  <SelectItem key={mode} value={mode}>
                    {mode}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Reference number</Label>
            <Input {...form.register('referenceNumber')} />
          </div>
          {paymentType === 'RECEIPT' && (
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Allocate to invoice (optional)</Label>
              <Select
                value={form.watch('invoiceId') || undefined}
                onValueChange={(value) => form.setValue('invoiceId', value)}
              >
                <SelectTrigger>
                  {invoices.find((i) => i.id === form.watch('invoiceId'))?.invoiceNumber ?? 'No allocation'}
                </SelectTrigger>
                <SelectContent>
                  {invoices.map((invoice) => (
                    <SelectItem key={invoice.id} value={invoice.id}>
                      {invoice.invoiceNumber} · {currency(invoice.grandTotal)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Notes</Label>
            <Textarea {...form.register('notes')} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
