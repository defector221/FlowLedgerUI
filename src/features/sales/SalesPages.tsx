import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { customerApi, productApi, purchaseApi, paymentApi, salesApi } from '@/services/api'
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
  invoices: () => salesApi.listInvoices().then((rows) => rows as unknown as Record<string, unknown>[]),
  'purchase-orders': () => purchaseApi.listOrders(),
  grn: () => purchaseApi.listGrn(),
  'purchase-invoices': () => purchaseApi.listInvoices(),
  received: () => paymentApi.listReceived().then((rows) => rows as unknown as Record<string, unknown>[]),
  'suppliers-payments': () => paymentApi.listSupplier().then((rows) => rows as unknown as Record<string, unknown>[]),
}

export function DocumentListPage({
  title,
  endpoint,
  createPath,
  unavailable = false,
}: {
  title: string
  endpoint: string
  createPath?: string
  unavailable?: boolean
}) {
  const { data, isLoading } = useQuery({ queryKey: [endpoint], queryFn: loaders[endpoint], enabled: !unavailable })
  const rows = data ?? []
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">Create and track {title.toLowerCase()}.</p>
        </div>
        {createPath && (
          <Link
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-medium text-white hover:bg-teal-800"
            to={createPath}
          >
            <Plus className="size-4" />
            Create invoice
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
                </tr>
              </thead>
              <tbody>
                {rows.length ? (
                  rows.map((row) => (
                    <tr key={String(row.id)} className="border-b">
                      <td className="p-3">
                        {String(
                          row.invoiceNumber ??
                            row.orderNumber ??
                            row.quotationNumber ??
                            row.paymentNumber ??
                            row.challanNumber ??
                            '—',
                        )}
                      </td>
                      <td className="p-3">{String(row.customerId ?? row.supplierId ?? '—')}</td>
                      <td className="p-3">
                        {String(
                          row.invoiceDate ??
                            row.orderDate ??
                            row.quotationDate ??
                            row.paymentDate ??
                            row.challanDate ??
                            '—',
                        )}
                      </td>
                      <td className="p-3">{currency(Number(row.grandTotal ?? row.amount ?? 0))}</td>
                      <td className="p-3">
                        <Badge>{String(row.status ?? row.paymentType ?? 'DRAFT')}</Badge>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-sm text-slate-500">
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

const invoiceSchema = z.object({
  customerId: z.string().uuid('Select a customer'),
  invoiceDate: z.string().min(1),
  warehouseId: z.string().uuid().optional(),
  notes: z.string().optional(),
})

type Line = { id: number; productId: string; quantity: number; rate: number; taxRate: number }

export function CreateInvoicePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [lines, setLines] = useState<Line[]>([{ id: 1, productId: '', quantity: 1, rate: 0, taxRate: 18 }])
  const [shippingCharges, setShippingCharges] = useState(0)
  const form = useForm({
    resolver: zodResolver(invoiceSchema),
    defaultValues: { customerId: '', invoiceDate: new Date().toISOString().slice(0, 10), notes: '' },
  })
  const { data: products = [] } = useQuery({
    queryKey: ['products', 'invoice'],
    queryFn: () => productApi.list({ active: true, size: 100 }),
  })
  const { data: customers = [] } = useQuery({
    queryKey: ['customers', 'invoice'],
    queryFn: () => customerApi.list({ size: 100 }),
  })

  const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.rate, 0)
  const tax = lines.reduce((sum, line) => sum + (line.quantity * line.rate * line.taxRate) / 100, 0)
  const total = Math.round(subtotal + tax + shippingCharges)

  const update = (id: number, key: keyof Line, value: string | number) =>
    setLines((current) => current.map((line) => (line.id === id ? { ...line, [key]: value } : line)))
  const addLine = () =>
    setLines((current) => [...current, { id: Date.now(), productId: '', quantity: 1, rate: 0, taxRate: 18 }])

  const save = (confirm = false) =>
    form.handleSubmit(async (values) => {
      try {
        const validLines = lines.filter((line) => line.productId)
        if (!validLines.length) throw new Error('Add at least one line item')
        const invoice = await salesApi.createInvoice({
          customerId: values.customerId,
          invoiceDate: values.invoiceDate,
          warehouseId: values.warehouseId,
          notes: values.notes,
          shippingCharges,
          items: validLines.map(({ productId, quantity, rate, taxRate }) => ({ productId, quantity, rate, taxRate })),
        })
        if (confirm) await salesApi.confirmInvoice(invoice.id)
        await queryClient.invalidateQueries({ queryKey: ['invoices'] })
        toast.success(confirm ? 'Invoice confirmed' : 'Invoice saved as draft')
        navigate('/sales/invoices')
      } catch (error) {
        toast.error(getApiErrorMessage(error, 'Unable to save invoice'))
      }
    })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Create tax invoice</h1>
          <p className="mt-1 text-sm text-slate-500">Payload aligned with backend SalesDtos.Invoice.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Eye className="size-4" />
            Preview
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
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-slate-900">Line items</h2>
              <Button variant="outline" size="sm" onClick={addLine}>
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
                    <th className="p-2 text-right text-xs text-slate-500">AMOUNT</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => (
                    <tr key={line.id} className="border-b">
                      <td className="p-2">
                        <Select
                          value={line.productId}
                          onValueChange={(value) => {
                            const product = products.find((item) => item.id === value)
                            update(line.id, 'productId', value)
                            if (product) update(line.id, 'rate', Number(product.sellingPrice ?? 0))
                          }}
                        >
                          <SelectTrigger>
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
                          onChange={(event) => update(line.id, 'quantity', Number(event.target.value))}
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          className="w-24"
                          type="number"
                          value={line.rate}
                          onChange={(event) => update(line.id, 'rate', Number(event.target.value))}
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          className="w-16"
                          type="number"
                          value={line.taxRate}
                          onChange={(event) => update(line.id, 'taxRate', Number(event.target.value))}
                        />
                      </td>
                      <td className="p-2 text-right text-sm font-medium">{currency(line.quantity * line.rate)}</td>
                      <td className="p-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setLines((current) => current.filter((item) => item.id !== line.id))}
                        >
                          <Trash2 className="size-4 text-rose-500" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </CardContent>
          </Card>
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
