import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Download, Eye, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { customerApi, productApi, purchaseApi, paymentApi, salesApi, supplierApi, taxRateApi } from '@/services/api'
import { getApiErrorMessage } from '@/lib/api-error'
import { currency } from '@/lib/utils'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Input,
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
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: [endpoint], queryFn: loaders[endpoint], enabled: !unavailable })
  const { data: customers = [] } = useQuery({
    queryKey: ['customers', 'party-labels'],
    queryFn: () => customerApi.list({ size: 200 }),
  })
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers', 'party-labels'],
    queryFn: () => supplierApi.list({ size: 200 }),
  })
  const rows = data ?? []
  const customerNameById = useMemo(
    () => Object.fromEntries(customers.map((c) => [c.id, c.customerName])),
    [customers],
  )
  const supplierNameById = useMemo(
    () => Object.fromEntries(suppliers.map((s) => [s.id, s.supplierName])),
    [suppliers],
  )
  const partyLabel = (row: Record<string, unknown>) => {
    const customerId = row.customerId ? String(row.customerId) : ''
    const supplierId = row.supplierId ? String(row.supplierId) : ''
    if (customerId) return customerNameById[customerId] ?? customerId
    if (supplierId) return supplierNameById[supplierId] ?? supplierId
    return '—'
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

  const cancelInvoice = async (id: string) => {
    try {
      await salesApi.cancelInvoice(id)
      await queryClient.invalidateQueries({ queryKey: ['invoices'] })
      toast.success('Invoice cancelled')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to cancel invoice'))
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">Create and track {title.toLowerCase()}.</p>
        </div>
        {createPath && (
          <Link
            className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-medium text-white hover:bg-teal-800 sm:w-auto"
            to={createPath}
          >
            <Plus className="size-4" />
            {createLabel}
          </Link>
        )}
      </div>
      <Card>
        <CardContent className="p-4">
          {unavailable ? (
            <p className="py-16 text-center text-sm text-slate-500">
              This list endpoint is not yet exposed by the backend API.
            </p>
          ) : isLoading ? (
            <p className="py-16 text-center text-sm text-slate-500">Loading…</p>
          ) : (
            <Table>
              <thead>
                <tr className="border-b">
                  <th className="p-3 text-xs text-slate-500">NUMBER</th>
                  <th className="p-3 text-xs text-slate-500">PARTY</th>
                  <th className="p-3 text-xs text-slate-500">DATE</th>
                  <th className="p-3 text-xs text-slate-500">TOTAL</th>
                  <th className="p-3 text-xs text-slate-500">STATUS</th>
                  {(endpoint === 'quotations' || endpoint === 'invoices') && (
                    <th className="p-3 text-xs text-slate-500">ACTIONS</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.length ? (
                  rows.map((row) => (
                    <tr key={String(row.id)} className="border-b">
                      <td className="p-3">{documentNumber(row)}</td>
                      <td className="p-3">{partyLabel(row)}</td>
                      <td className="p-3">{documentDate(row)}</td>
                      <td className="p-3">{currency(Number(row.grandTotal ?? row.amount ?? 0))}</td>
                      <td className="p-3">
                        <Badge>{String(row.status ?? row.paymentType ?? 'DRAFT')}</Badge>
                      </td>
                      {endpoint === 'quotations' && (
                        <td className="p-3">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={String(row.status) === 'CONVERTED' || String(row.status) === 'CANCELLED'}
                            onClick={() => convertQuotation(String(row.id))}
                          >
                            Convert to order
                          </Button>
                        </td>
                      )}
                      {endpoint === 'invoices' && (
                        <td className="p-3">
                          <div className="flex flex-wrap gap-2">
                            <Button variant="outline" size="sm" onClick={() => downloadPdf(String(row.id))}>
                              <Download className="size-3.5" />
                              PDF
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={String(row.status) === 'CANCELLED'}
                              onClick={() => cancelInvoice(String(row.id))}
                            >
                              Cancel
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={endpoint === 'quotations' || endpoint === 'invoices' ? 6 : 5}
                      className="py-16 text-center text-sm text-slate-500"
                    >
                      No {title.toLowerCase()} found.
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
type Line = {
  id: number
  productId: string
  quantity: number
  rate: number
  taxRate: number
  taxType: TaxType
}

function useLineItems(defaultRateKey: 'sellingPrice' | 'purchasePrice' = 'sellingPrice') {
  const [lines, setLines] = useState<Line[]>([
    { id: 1, productId: '', quantity: 1, rate: 0, taxRate: 18, taxType: 'GST' },
  ])
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
  const addLine = () =>
    setLines((current) => [
      ...current,
      { id: Date.now(), productId: '', quantity: 1, rate: 0, taxRate: 18, taxType: 'GST' },
    ])
  const removeLine = (id: number) => setLines((current) => current.filter((item) => item.id !== id))
  const selectProduct = (lineId: number, productId: string) => {
    const product = products.find((item) => item.id === productId)
    const tax = product?.taxRateId ? taxRates.find((item) => item.id === product.taxRateId) : undefined
    setLines((current) =>
      current.map((line) => {
        if (line.id !== lineId) return line
        return {
          ...line,
          productId,
          rate: product ? Number(product[defaultRateKey] ?? 0) : line.rate,
          taxRate: tax ? Number(tax.rate) : line.taxRate,
          taxType: (tax?.taxType ?? (product?.taxType as TaxType | undefined) ?? 'GST') as TaxType,
        }
      }),
    )
  }
  const validLines = () => lines.filter((line) => line.productId)
  const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.rate, 0)
  const tax = lines.reduce((sum, line) => sum + (line.quantity * line.rate * line.taxRate) / 100, 0)
  return { lines, products, update, addLine, removeLine, selectProduct, validLines, subtotal, tax }
}

function LineItemsEditor({
  lines,
  products,
  onSelectProduct,
  onUpdate,
  onRemove,
  onAdd,
}: {
  lines: Line[]
  products: { id: string; name: string }[]
  onSelectProduct: (lineId: number, productId: string) => void
  onUpdate: (id: number, key: keyof Line, value: string | number) => void
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
              <th className="p-2 text-xs text-slate-500">PRODUCT</th>
              <th className="p-2 text-xs text-slate-500">QTY</th>
              <th className="p-2 text-xs text-slate-500">RATE</th>
              <th className="p-2 text-xs text-slate-500">TAX %</th>
              <th className="p-2 text-xs text-slate-500">TYPE</th>
              <th className="p-2 text-right text-xs text-slate-500">AMOUNT</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.id} className="border-b">
                <td className="min-w-[10rem] p-2 sm:min-w-[14rem]">
                  <Select value={line.productId} onValueChange={(value) => onSelectProduct(line.id, value)}>
                    <SelectTrigger className="min-w-0">
                      {products.find((p) => p.id === line.productId)?.name ?? 'Select product'}
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-2">
                  <Input
                    className="w-16"
                    type="number"
                    min="1"
                    value={line.quantity}
                    onChange={(event) => onUpdate(line.id, 'quantity', Number(event.target.value))}
                  />
                </td>
                <td className="p-2">
                  <Input
                    className="w-24"
                    type="number"
                    value={line.rate}
                    onChange={(event) => onUpdate(line.id, 'rate', Number(event.target.value))}
                  />
                </td>
                <td className="p-2">
                  <Input
                    className="w-16"
                    type="number"
                    value={line.taxRate}
                    onChange={(event) => onUpdate(line.id, 'taxRate', Number(event.target.value))}
                  />
                </td>
                <td className="p-2">
                  <Select
                    value={line.taxType}
                    onValueChange={(value) => onUpdate(line.id, 'taxType', value)}
                  >
                    <SelectTrigger className="w-[5.5rem]">{line.taxType}</SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GST">GST</SelectItem>
                      <SelectItem value="IGST">IGST</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-2 text-right text-sm font-medium">{currency(line.quantity * line.rate)}</td>
                <td className="p-2">
                  <Button variant="ghost" size="icon" onClick={() => onRemove(line.id)}>
                    <Trash2 className="size-4 text-rose-500" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </CardContent>
    </Card>
  )
}

const invoiceSchema = z.object({
  customerId: z.string().uuid('Select a customer'),
  invoiceDate: z.string().min(1),
  warehouseId: z.string().uuid().optional(),
  notes: z.string().optional(),
})

export function CreateInvoicePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [savedInvoiceId, setSavedInvoiceId] = useState<string | null>(null)
  const [shippingCharges, setShippingCharges] = useState(0)
  const { lines, products, update, addLine, removeLine, selectProduct, validLines, subtotal, tax } = useLineItems()
  const form = useForm({
    resolver: zodResolver(invoiceSchema),
    defaultValues: { customerId: '', invoiceDate: new Date().toISOString().slice(0, 10), notes: '' },
  })
  const { data: customers = [] } = useQuery({
    queryKey: ['customers', 'invoice'],
    queryFn: () => customerApi.list({ size: 100 }),
  })

  const total = Math.round(subtotal + tax + shippingCharges)

  const save = (confirm = false) =>
    form.handleSubmit(async (values) => {
      try {
        const items = validLines()
        if (!items.length) throw new Error('Add at least one line item')
        const payload = {
          customerId: values.customerId,
          invoiceDate: values.invoiceDate,
          warehouseId: values.warehouseId,
          notes: values.notes,
          shippingCharges,
          items: items.map(({ productId, quantity, rate, taxRate, taxType }) => ({
            productId,
            quantity,
            rate,
            taxRate,
            taxType,
          })),
        }
        const invoice = savedInvoiceId
          ? await salesApi.updateInvoice(savedInvoiceId, payload)
          : await salesApi.createInvoice(payload)
        setSavedInvoiceId(invoice.id)
        if (confirm) await salesApi.confirmInvoice(invoice.id)
        await queryClient.invalidateQueries({ queryKey: ['invoices'] })
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Create tax invoice</h1>
          <p className="mt-1 text-sm text-slate-500">
            Payload aligned with backend SalesDtos.Invoice. PDF output uses the invoice template or your org default
            from Templates.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Eye className="size-4" />
            Preview
          </Button>
          <Button variant="outline" onClick={downloadPdf} disabled={!savedInvoiceId}>
            <Download className="size-4" />
            Download PDF
          </Button>
          <Button variant="outline" onClick={cancelInvoice}>
            Cancel invoice
          </Button>
          <Button variant="outline" onClick={() => save(false)()}>
            Save draft
          </Button>
          <Button onClick={() => save(true)()}>Confirm invoice</Button>
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Customer</Label>
                <Select value={form.watch('customerId')} onValueChange={(value) => form.setValue('customerId', value)}>
                  <SelectTrigger>
                    {customers.find((c) => c.id === form.watch('customerId'))?.customerName ?? 'Select customer'}
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.customerName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Invoice date</Label>
                <Input type="date" {...form.register('invoiceDate')} />
              </div>
            </CardContent>
          </Card>
          <LineItemsEditor
            lines={lines}
            products={products}
            onSelectProduct={selectProduct}
            onUpdate={update}
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
              <div className="flex items-center justify-between gap-3">
                <span>Shipping charges</span>
                <Input
                  className="w-28 text-right"
                  type="number"
                  value={shippingCharges}
                  onChange={(event) => setShippingCharges(Number(event.target.value))}
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
            <CardContent className="p-5">
              <Label>Notes</Label>
              <Textarea className="mt-2" {...form.register('notes')} />
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
  const { lines, products, update, addLine, removeLine, selectProduct, validLines, subtotal, tax } = useLineItems()
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
        items: items.map(({ productId, quantity, rate, taxRate, taxType }) => ({
          productId,
          quantity,
          rate,
          taxRate,
          taxType,
        })),
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
          <h1 className="text-2xl font-semibold text-slate-900">Create quotation</h1>
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
                  <SelectTrigger>
                    {customers.find((c) => c.id === form.watch('customerId'))?.customerName ?? 'Select customer'}
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.customerName}
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
            <div className="flex justify-between">
              <span>Tax</span>
              <b>{currency(tax)}</b>
            </div>
            <div className="flex justify-between border-t pt-3 text-base font-semibold">
              <span>Grand total</span>
              <span>{currency(Math.round(subtotal + tax))}</span>
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

const purchaseOrderSchema = z.object({
  supplierId: z.string().uuid('Select a supplier'),
  orderDate: z.string().min(1),
  notes: z.string().optional(),
})

export function CreatePurchaseOrderPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { lines, products, update, addLine, removeLine, selectProduct, validLines, subtotal, tax } =
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
        items: items.map(({ productId, quantity, rate, taxRate, taxType }) => ({
          productId,
          quantity,
          rate,
          taxRate,
          taxType,
        })),
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
          <h1 className="text-2xl font-semibold text-slate-900">Create purchase order</h1>
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
                  <SelectTrigger>
                    {suppliers.find((s) => s.id === form.watch('supplierId'))?.supplierName ?? 'Select supplier'}
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.supplierName}
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
            <div className="flex justify-between">
              <span>Tax</span>
              <b>{currency(tax)}</b>
            </div>
            <div className="flex justify-between border-t pt-3 text-base font-semibold">
              <span>Grand total</span>
              <span>{currency(Math.round(subtotal + tax))}</span>
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
  const form = useForm({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paymentType: initialType,
      partyType: initialType === 'RECEIPT' ? 'CUSTOMER' : 'SUPPLIER',
      partyId: '',
      amount: 0,
      paymentDate: new Date().toISOString().slice(0, 10),
      paymentMode: 'BANK_TRANSFER',
      referenceNumber: '',
      notes: '',
      invoiceId: '',
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
      toast.success('Payment recorded')
      navigate(values.paymentType === 'RECEIPT' ? '/payments/received' : '/payments/suppliers')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to record payment'))
    }
  })

  const partyOptions =
    partyType === 'CUSTOMER'
      ? customers.map((c) => ({ id: c.id, label: c.customerName }))
      : suppliers.map((s) => ({ id: s.id, label: s.supplierName }))

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
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
              <SelectTrigger>
                {partyOptions.find((p) => p.id === form.watch('partyId'))?.label ?? 'Select party'}
              </SelectTrigger>
              <SelectContent>
                {partyOptions.map((party) => (
                  <SelectItem key={party.id} value={party.id}>
                    {party.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Amount</Label>
            <Input type="number" step="0.01" {...form.register('amount')} />
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
