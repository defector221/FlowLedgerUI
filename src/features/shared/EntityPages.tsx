import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Search } from 'lucide-react'
import { toast } from 'sonner'
import { categoryApi, customerApi, productApi, supplierApi, taxRateApi, unitApi, warehouseApi } from '@/services/api'
import { applyApiFieldErrors, getApiErrorMessage } from '@/lib/api-error'
import { stripEmpty } from '@/lib/api-payload'
import { currency } from '@/lib/utils'
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Skeleton,
  Switch,
  Table,
} from '@/components/ui'

type EntityKind = 'customers' | 'suppliers' | 'products' | 'categories' | 'warehouses'

type FieldConfig = {
  name: string
  label: string
  type?: 'text' | 'number' | 'email' | 'boolean' | 'select'
  required?: boolean
  list?: boolean
  detail?: boolean
  create?: boolean
  optionsKey?: 'units' | 'categories' | 'taxRates' | 'itemTypes'
  defaultValue?: string | number | boolean
}

type EntityConfig = {
  title: string
  singular: string
  list: (params?: Record<string, unknown>) => Promise<Record<string, unknown>[]>
  get: (id: string) => Promise<Record<string, unknown>>
  create: (payload: Record<string, unknown>) => Promise<unknown>
  update?: (id: string, payload: Record<string, unknown>) => Promise<unknown>
  titleField: string
  fields: FieldConfig[]
  schema: z.ZodTypeAny
  searchable?: boolean
  buildPayload?: (values: Record<string, unknown>) => Record<string, unknown>
}

const customerSchema = z.object({
  customerCode: z.string().min(1, 'Customer code is required'),
  customerName: z.string().min(1, 'Customer name is required'),
  companyName: z.string().optional(),
  gstin: z.string().optional(),
  pan: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  billingAddress: z.string().optional(),
  shippingAddress: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  stateCode: z.string().optional(),
  country: z.string().min(1, 'Country is required'),
  creditLimit: z.coerce.number().optional(),
  paymentTerms: z.string().optional(),
  openingBalance: z.coerce.number().optional(),
  notes: z.string().optional(),
})

const supplierSchema = z.object({
  supplierCode: z.string().min(1, 'Supplier code is required'),
  supplierName: z.string().min(1, 'Supplier name is required'),
  companyName: z.string().optional(),
  gstin: z.string().optional(),
  pan: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  billingAddress: z.string().optional(),
  shippingAddress: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  stateCode: z.string().optional(),
  country: z.string().min(1, 'Country is required'),
  paymentTerms: z.string().optional(),
  openingBalance: z.coerce.number().optional(),
  bankName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankIfsc: z.string().optional(),
  notes: z.string().optional(),
})

const productSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  name: z.string().min(1, 'Product name is required'),
  unitId: z.string().uuid('Unit is required'),
  itemType: z.string().min(1),
  barcode: z.string().optional(),
  description: z.string().optional(),
  categoryId: z.string().uuid().optional().or(z.literal('')),
  brand: z.string().optional(),
  hsnSacCode: z.string().optional(),
  taxRateId: z.string().uuid().optional().or(z.literal('')),
  sellingPrice: z.coerce.number().optional(),
  purchasePrice: z.coerce.number().optional(),
  mrp: z.coerce.number().optional(),
  openingStock: z.coerce.number().optional(),
  minimumStockLevel: z.coerce.number().optional(),
  reorderLevel: z.coerce.number().optional(),
})

const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  description: z.string().optional(),
  parentId: z.string().uuid().optional().or(z.literal('')),
})

const warehouseSchema = z.object({
  warehouseCode: z.string().min(1, 'Warehouse code is required'),
  warehouseName: z.string().min(1, 'Warehouse name is required'),
  address: z.string().optional(),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  defaultWarehouse: z.boolean().optional(),
})

const withCountryDefaults = (values: Record<string, unknown>) => {
  const cleaned = stripEmpty(values)
  return {
    ...cleaned,
    country: String(values.country || 'India'),
    creditLimit: values.creditLimit ?? 0,
    openingBalance: values.openingBalance ?? 0,
  }
}

const withProductDefaults = (values: Record<string, unknown>) => {
  const cleaned = stripEmpty(values)
  return {
    ...cleaned,
    itemType: String(values.itemType || 'PRODUCT'),
    purchasePrice: values.purchasePrice ?? 0,
    sellingPrice: values.sellingPrice ?? 0,
    mrp: values.mrp ?? 0,
    openingStock: values.openingStock ?? 0,
    minimumStockLevel: values.minimumStockLevel ?? 0,
    reorderLevel: values.reorderLevel ?? 0,
    ...(values.categoryId ? { categoryId: values.categoryId } : {}),
    ...(values.taxRateId ? { taxRateId: values.taxRateId } : {}),
  }
}

const configs: Record<EntityKind, EntityConfig> = {
  customers: {
    title: 'Customers',
    singular: 'Customer',
    titleField: 'customerName',
    searchable: true,
    list: (params) => customerApi.list(params).then((rows) => rows as unknown as Record<string, unknown>[]),
    get: (id) => customerApi.get(id).then((row) => row as unknown as Record<string, unknown>),
    create: (payload) => customerApi.create(payload as never),
    update: (id, payload) => customerApi.update(id, payload as never),
    schema: customerSchema,
    buildPayload: withCountryDefaults,
    fields: [
      { name: 'customerCode', label: 'Customer code', required: true, list: true, create: true, detail: true },
      { name: 'customerName', label: 'Customer name', required: true, list: true, create: true, detail: true },
      { name: 'companyName', label: 'Company name', create: true, detail: true },
      { name: 'phone', label: 'Phone', list: true, create: true, detail: true },
      { name: 'email', label: 'Email', type: 'email', list: true, create: true, detail: true },
      { name: 'gstin', label: 'GSTIN', list: true, create: true, detail: true },
      { name: 'pan', label: 'PAN', create: true, detail: true },
      { name: 'billingAddress', label: 'Billing address', create: true, detail: true },
      { name: 'shippingAddress', label: 'Shipping address', create: true, detail: true },
      { name: 'city', label: 'City', create: true, detail: true },
      { name: 'state', label: 'State', create: true, detail: true },
      { name: 'stateCode', label: 'State code', create: true, detail: true },
      { name: 'country', label: 'Country', required: true, create: true, detail: true, defaultValue: 'India' },
      { name: 'creditLimit', label: 'Credit limit', type: 'number', list: true, create: true, detail: true, defaultValue: 0 },
      { name: 'openingBalance', label: 'Opening balance', type: 'number', create: true, detail: true, defaultValue: 0 },
      { name: 'paymentTerms', label: 'Payment terms', create: true, detail: true },
      { name: 'notes', label: 'Notes', create: true, detail: true },
    ],
  },
  suppliers: {
    title: 'Suppliers',
    singular: 'Supplier',
    titleField: 'supplierName',
    searchable: true,
    list: (params) => supplierApi.list(params).then((rows) => rows as unknown as Record<string, unknown>[]),
    get: (id) => supplierApi.get(id).then((row) => row as unknown as Record<string, unknown>),
    create: (payload) => supplierApi.create(payload as never),
    update: (id, payload) => supplierApi.update(id, payload as never),
    schema: supplierSchema,
    buildPayload: withCountryDefaults,
    fields: [
      { name: 'supplierCode', label: 'Supplier code', required: true, list: true, create: true, detail: true },
      { name: 'supplierName', label: 'Supplier name', required: true, list: true, create: true, detail: true },
      { name: 'companyName', label: 'Company name', create: true, detail: true },
      { name: 'phone', label: 'Phone', list: true, create: true, detail: true },
      { name: 'email', label: 'Email', type: 'email', list: true, create: true, detail: true },
      { name: 'gstin', label: 'GSTIN', list: true, create: true, detail: true },
      { name: 'pan', label: 'PAN', create: true, detail: true },
      { name: 'billingAddress', label: 'Billing address', create: true, detail: true },
      { name: 'shippingAddress', label: 'Shipping address', create: true, detail: true },
      { name: 'city', label: 'City', create: true, detail: true },
      { name: 'state', label: 'State', create: true, detail: true },
      { name: 'stateCode', label: 'State code', create: true, detail: true },
      { name: 'country', label: 'Country', required: true, create: true, detail: true, defaultValue: 'India' },
      { name: 'openingBalance', label: 'Opening balance', type: 'number', list: true, create: true, detail: true, defaultValue: 0 },
      { name: 'paymentTerms', label: 'Payment terms', create: true, detail: true },
      { name: 'bankName', label: 'Bank name', create: true, detail: true },
      { name: 'bankAccountNumber', label: 'Account number', create: true, detail: true },
      { name: 'bankIfsc', label: 'IFSC', create: true, detail: true },
      { name: 'notes', label: 'Notes', create: true, detail: true },
    ],
  },
  products: {
    title: 'Products',
    singular: 'Product',
    titleField: 'name',
    searchable: true,
    list: (params) => productApi.list(params).then((rows) => rows as unknown as Record<string, unknown>[]),
    get: (id) => productApi.get(id).then((row) => row as unknown as Record<string, unknown>),
    create: (payload) => productApi.create(payload as never),
    update: (id, payload) => productApi.update(id, payload as never),
    schema: productSchema,
    buildPayload: withProductDefaults,
    fields: [
      { name: 'sku', label: 'SKU', required: true, list: true, create: true, detail: true },
      { name: 'name', label: 'Name', required: true, list: true, create: true, detail: true },
      { name: 'itemType', label: 'Item type', type: 'select', optionsKey: 'itemTypes', required: true, create: true, detail: true, defaultValue: 'PRODUCT' },
      { name: 'barcode', label: 'Barcode', list: true, create: true, detail: true },
      { name: 'categoryId', label: 'Category', type: 'select', optionsKey: 'categories', create: true, detail: true },
      { name: 'unitId', label: 'Unit', type: 'select', optionsKey: 'units', required: true, create: true, detail: true },
      { name: 'taxRateId', label: 'Tax rate', type: 'select', optionsKey: 'taxRates', create: true, detail: true },
      { name: 'brand', label: 'Brand', create: true, detail: true },
      { name: 'hsnSacCode', label: 'HSN/SAC', create: true, detail: true },
      { name: 'description', label: 'Description', create: true, detail: true },
      { name: 'sellingPrice', label: 'Selling price', type: 'number', list: true, create: true, detail: true, defaultValue: 0 },
      { name: 'purchasePrice', label: 'Purchase price', type: 'number', create: true, detail: true, defaultValue: 0 },
      { name: 'mrp', label: 'MRP', type: 'number', create: true, detail: true, defaultValue: 0 },
      { name: 'openingStock', label: 'Opening stock', type: 'number', create: true, detail: true, defaultValue: 0 },
      { name: 'minimumStockLevel', label: 'Minimum stock', type: 'number', create: true, detail: true, defaultValue: 0 },
      { name: 'reorderLevel', label: 'Reorder level', type: 'number', create: true, detail: true, defaultValue: 0 },
    ],
  },
  categories: {
    title: 'Product categories',
    singular: 'Category',
    titleField: 'name',
    searchable: true,
    list: () => categoryApi.list().then((rows) => rows as unknown as Record<string, unknown>[]),
    get: (id) => categoryApi.get(id).then((row) => row as unknown as Record<string, unknown>),
    create: (payload) => categoryApi.create(payload as never),
    update: (id, payload) => categoryApi.update(id, payload as never),
    schema: categorySchema,
    fields: [
      { name: 'name', label: 'Name', required: true, list: true, create: true, detail: true },
      { name: 'description', label: 'Description', list: true, create: true, detail: true },
      { name: 'parentId', label: 'Parent category', type: 'select', optionsKey: 'categories', create: true, detail: true },
      { name: 'active', label: 'Active', type: 'boolean', list: true, detail: true },
    ],
  },
  warehouses: {
    title: 'Warehouses',
    singular: 'Warehouse',
    titleField: 'warehouseName',
    searchable: true,
    list: () => warehouseApi.list().then((rows) => rows as unknown as Record<string, unknown>[]),
    get: (id) => warehouseApi.get(id).then((row) => row as unknown as Record<string, unknown>),
    create: (payload) => warehouseApi.create(payload as never),
    update: (id, payload) => warehouseApi.update(id, payload as never),
    schema: warehouseSchema,
    fields: [
      { name: 'warehouseCode', label: 'Warehouse code', required: true, list: true, create: true, detail: true },
      { name: 'warehouseName', label: 'Warehouse name', required: true, list: true, create: true, detail: true },
      { name: 'address', label: 'Address', list: true, create: true, detail: true },
      { name: 'contactPerson', label: 'Contact person', create: true, detail: true },
      { name: 'phone', label: 'Phone', create: true, detail: true },
      { name: 'defaultWarehouse', label: 'Default warehouse', type: 'boolean', list: true, create: true, detail: true },
    ],
  },
}

function formatValue(field: FieldConfig, value: unknown) {
  if (typeof value === 'boolean')
    return <Badge className={value ? 'bg-emerald-100 text-emerald-700' : ''}>{value ? 'Yes' : 'No'}</Badge>
  if (field.type === 'number' && typeof value === 'number') return currency(value)
  return String(value ?? '—')
}

export function EntityListPage({ kind }: { kind: EntityKind }) {
  const config = configs[kind]
  const listFields = config.fields.filter((field) => field.list)
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('q') ?? '')
  const deferredSearch = useDeferredValue(search.trim())
  const serverSearchable = kind === 'customers' || kind === 'suppliers' || kind === 'products'

  useEffect(() => {
    const next = searchParams.get('q') ?? ''
    setSearch((current) => (current === next ? current : next))
  }, [searchParams])

  useEffect(() => {
    const current = searchParams.get('q') ?? ''
    if (deferredSearch === current) return
    const next = new URLSearchParams(searchParams)
    if (deferredSearch) next.set('q', deferredSearch)
    else next.delete('q')
    setSearchParams(next, { replace: true })
  }, [deferredSearch, searchParams, setSearchParams])

  const { data, isLoading } = useQuery({
    queryKey: [kind, deferredSearch],
    queryFn: () =>
      config.list({
        size: 50,
        ...(serverSearchable && deferredSearch ? { search: deferredSearch } : {}),
      }),
  })
  const rows = useMemo(() => {
    const all = data ?? []
    if (serverSearchable || !deferredSearch) return all
    const needle = deferredSearch.toLowerCase()
    return all.filter((row) =>
      listFields.some((field) => String(row[field.name] ?? '').toLowerCase().includes(needle)),
    )
  }, [data, deferredSearch, listFields, serverSearchable])
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{config.title}</h1>
          <p className="mt-1 text-sm text-slate-500">Manage your {config.title.toLowerCase()}.</p>
        </div>
        <Link
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-medium text-white hover:bg-teal-800"
          to={`/${kind}/new`}
        >
          <Plus className="size-4" />
          Add {config.singular}
        </Link>
      </div>
      <Card>
        <CardContent className="p-4">
          {config.searchable !== false && (
            <div className="mb-4 flex gap-3">
              <div className="relative max-w-md flex-1">
                <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
                <Input
                  className="pl-9"
                  placeholder={`Search ${config.title.toLowerCase()}…`}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </div>
          )}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((id) => (
                <Skeleton key={id} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <thead>
                <tr className="border-b border-slate-200">
                  {listFields.map((field) => (
                    <th
                      key={field.name}
                      className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500"
                    >
                      {field.label}
                    </th>
                  ))}
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.length ? (
                  rows.map((row) => (
                    <tr key={String(row.id)} className="border-b border-slate-100 hover:bg-slate-50">
                      {listFields.map((field) => (
                        <td key={field.name} className="px-3 py-3 text-slate-700">
                          {formatValue(field, row[field.name])}
                        </td>
                      ))}
                      <td className="px-3 py-3 text-right">
                        <Link className="text-sm font-medium text-teal-700 hover:underline" to={`/${kind}/${row.id}`}>
                          View
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={listFields.length + 1} className="py-16 text-center text-sm text-slate-500">
                      {deferredSearch
                        ? `No ${config.title.toLowerCase()} match “${deferredSearch}”.`
                        : `No ${config.title.toLowerCase()} found.`}
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

export function EntityFormPage({ kind }: { kind: EntityKind }) {
  const config = configs[kind]
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const createFields = config.fields.filter((field) => field.create)
  const defaultValues = Object.fromEntries(
    createFields.filter((f) => f.defaultValue !== undefined).map((f) => [f.name, f.defaultValue]),
  )
  const form = useForm<Record<string, unknown>>({
    resolver: zodResolver(config.schema as z.ZodObject<z.ZodRawShape>),
    defaultValues,
  })
  const needsUnits = createFields.some((f) => f.optionsKey === 'units')
  const needsCategories = createFields.some((f) => f.optionsKey === 'categories')
  const needsTaxRates = createFields.some((f) => f.optionsKey === 'taxRates')
  const { data: units = [] } = useQuery({ queryKey: ['units'], queryFn: unitApi.list, enabled: needsUnits })
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: categoryApi.list,
    enabled: needsCategories,
  })
  const { data: taxRates = [] } = useQuery({
    queryKey: ['tax-rates'],
    queryFn: taxRateApi.list,
    enabled: needsTaxRates,
  })

  const selectOptions = (key?: FieldConfig['optionsKey']) => {
    if (key === 'units') return units.map((u) => ({ id: u.id, label: u.name }))
    if (key === 'categories') return categories.map((c) => ({ id: c.id, label: c.name }))
    if (key === 'taxRates') return taxRates.map((t) => ({ id: t.id, label: `${t.name} (${t.rate}%)` }))
    if (key === 'itemTypes')
      return [
        { id: 'PRODUCT', label: 'Product' },
        { id: 'SERVICE', label: 'Service' },
      ]
    return []
  }

  const submit = form.handleSubmit(async (values) => {
    try {
      const payload = config.buildPayload ? config.buildPayload(values) : stripEmpty(values)
      await config.create(payload)
      await queryClient.invalidateQueries({ queryKey: [kind] })
      toast.success(`${config.singular} created`)
      navigate(`/${kind}`)
    } catch (error) {
      if (!applyApiFieldErrors(error, form.setError)) toast.error(getApiErrorMessage(error))
    }
  })

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">New {config.singular}</h1>
        <p className="mt-1 text-sm text-slate-500">Add details aligned with backend validation.</p>
      </div>
      <Card>
        <CardContent className="p-6">
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
            {createFields.map((field) => {
              const options = selectOptions(field.optionsKey)
              const current = String(form.watch(field.name as never) ?? '')
              const selectedLabel = options.find((o) => o.id === current)?.label
              return (
                <label key={field.name} className="space-y-1.5 text-sm font-medium text-slate-700">
                  {field.label}
                  {field.type === 'boolean' ? (
                    <Switch
                      checked={!!form.watch(field.name as never)}
                      onCheckedChange={(value) => form.setValue(field.name as never, value as never)}
                    />
                  ) : field.type === 'select' ? (
                    <Select
                      value={current}
                      onValueChange={(value) => form.setValue(field.name as never, value as never)}
                    >
                      <SelectTrigger>{selectedLabel ?? `Select ${field.label.toLowerCase()}`}</SelectTrigger>
                      <SelectContent>
                        {options.map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type={field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : 'text'}
                      {...form.register(field.name as never)}
                    />
                  )}
                  {form.formState.errors[field.name as keyof typeof form.formState.errors] && (
                    <p className="text-xs text-rose-600">
                      {String(form.formState.errors[field.name as keyof typeof form.formState.errors]?.message)}
                    </p>
                  )}
                </label>
              )
            })}
            <div className="col-span-full flex justify-end gap-3 border-t border-slate-100 pt-5">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button type="submit">Save {config.singular}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export function EntityDetailPage({ kind }: { kind: EntityKind }) {
  const { id = '' } = useParams()
  const config = configs[kind]
  const detailFields = config.fields.filter((field) => field.detail)
  const { data: item } = useQuery({ queryKey: [kind, id], queryFn: () => config.get(id), enabled: !!id })
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          {String(item?.[config.titleField] ?? config.singular)}
        </h1>
        <p className="mt-1 text-sm text-slate-500">{config.singular} record</p>
      </div>
      <Card>
        <CardContent className="grid gap-5 p-6 sm:grid-cols-2">
          {detailFields.map((field) => (
            <div key={field.name}>
              <p className="text-xs uppercase tracking-wide text-slate-500">{field.label}</p>
              <p className="mt-1 text-sm font-medium text-slate-800">{formatValue(field, item?.[field.name])}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
