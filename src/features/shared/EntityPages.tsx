import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Search } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/features/auth/auth'
import { categoryApi, customerApi, organizationApi, productApi, supplierApi, taxRateApi, unitApi, warehouseApi } from '@/services/api'
import { applyApiFieldErrors, getApiErrorMessage } from '@/lib/api-error'
import { stripEmpty } from '@/lib/api-payload'
import { generateEntityCode, slugifyName } from '@/lib/entity-code'
import { currency } from '@/lib/utils'
import { resolveDefaultWarehouseId } from '@/lib/warehouse'
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  NumberInput,
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
  /** Shown on edit form. Defaults to create && !createOnly. */
  edit?: boolean
  /** Create-only (codes, opening stock, etc.) — not sent on update. */
  createOnly?: boolean
  optionsKey?: 'units' | 'categories' | 'taxRates' | 'itemTypes' | 'warehouses'
  /** Prefer this response field on detail/list when present (e.g. parentName). */
  displayField?: string
  defaultValue?: string | number | boolean
  /** When set, this code field is auto-filled from the named field (+ salt). */
  autoCodeFrom?: string
  autoCodePrefix?: string
  readOnlyOnCreate?: boolean
  /** Hide this field unless itemType matches (products/services). */
  showWhenItemType?: 'PRODUCT' | 'SERVICE'
}

type EntityConfig = {
  title: string
  singular: string
  writePermission: string
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

function formFields(config: EntityConfig, isEdit: boolean) {
  return config.fields.filter((field) => {
    if (isEdit) {
      if (field.createOnly) return false
      if (field.edit !== undefined) return field.edit
      return !!field.create
    }
    return !!field.create
  })
}

const customerSchema = z.object({
  customerCode: z.string().optional(),
  companyName: z.string().min(1, 'Company name is required'),
  customerName: z.string().min(1, 'Contact name is required'),
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
  companyName: z.string().min(1, 'Company name is required'),
  supplierName: z.string().min(1, 'Contact name is required'),
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

const productSchema = z
  .object({
    sku: z.string().optional(),
    name: z.string().min(1, 'Product name is required'),
    unitId: z.string().uuid().optional().or(z.literal('')),
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
    warehouseId: z.string().uuid().optional().or(z.literal('')),
    minimumStockLevel: z.coerce.number().optional(),
    reorderLevel: z.coerce.number().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.itemType !== 'SERVICE' && !data.unitId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Unit is required', path: ['unitId'] })
    }
  })

const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  description: z.string().optional(),
  parentId: z.string().uuid().optional().or(z.literal('')),
})

const warehouseSchema = z.object({
  warehouseCode: z.string().optional(),
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
  const itemType = String(values.itemType || 'PRODUCT')
  const isService = itemType === 'SERVICE'
  if (isService) {
    return {
      sku: cleaned.sku,
      name: cleaned.name,
      itemType,
      description: cleaned.description,
      taxRateId: cleaned.taxRateId,
      sellingPrice: values.sellingPrice ?? 0,
      purchasePrice: 0,
      mrp: 0,
      openingStock: 0,
      minimumStockLevel: 0,
      reorderLevel: 0,
    }
  }
  return {
    ...cleaned,
    itemType,
    purchasePrice: values.purchasePrice ?? 0,
    sellingPrice: values.sellingPrice ?? 0,
    mrp: values.mrp ?? 0,
    openingStock: values.openingStock ?? 0,
    minimumStockLevel: values.minimumStockLevel ?? 0,
    reorderLevel: values.reorderLevel ?? 0,
    ...(values.categoryId ? { categoryId: values.categoryId } : {}),
    ...(values.taxRateId ? { taxRateId: values.taxRateId } : {}),
    ...(values.warehouseId ? { warehouseId: values.warehouseId } : {}),
  }
}

const configs: Record<EntityKind, EntityConfig> = {
  customers: {
    title: 'Customers',
    singular: 'Customer',
    writePermission: 'customers:write',
    titleField: 'companyName',
    searchable: true,
    list: (params) => customerApi.list(params).then((rows) => rows as unknown as Record<string, unknown>[]),
    get: (id) => customerApi.get(id).then((row) => row as unknown as Record<string, unknown>),
    create: (payload) => customerApi.create(payload as never),
    update: (id, payload) => customerApi.update(id, payload as never),
    schema: customerSchema,
    buildPayload: withCountryDefaults,
    fields: [
      { name: 'customerCode', label: 'Customer code (auto)', list: true, create: true, detail: true, createOnly: true, autoCodeFrom: 'companyName', autoCodePrefix: 'CUST', readOnlyOnCreate: true },
      { name: 'companyName', label: 'Company name', required: true, list: true, create: true, detail: true },
      { name: 'customerName', label: 'Contact name', required: true, list: true, create: true, detail: true },
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
      {
        name: 'creditLimit',
        label: 'Credit limit',
        type: 'number',
        list: true,
        create: true,
        detail: true,
        defaultValue: 0,
      },
      { name: 'openingBalance', label: 'Opening balance', type: 'number', create: true, detail: true, defaultValue: 0 },
      { name: 'paymentTerms', label: 'Payment terms', create: true, detail: true },
      { name: 'notes', label: 'Notes', create: true, detail: true },
    ],
  },
  suppliers: {
    title: 'Suppliers',
    singular: 'Supplier',
    writePermission: 'suppliers:write',
    titleField: 'companyName',
    searchable: true,
    list: (params) => supplierApi.list(params).then((rows) => rows as unknown as Record<string, unknown>[]),
    get: (id) => supplierApi.get(id).then((row) => row as unknown as Record<string, unknown>),
    create: (payload) => supplierApi.create(payload as never),
    update: (id, payload) => supplierApi.update(id, payload as never),
    schema: supplierSchema,
    buildPayload: withCountryDefaults,
    fields: [
      { name: 'supplierCode', label: 'Supplier code', required: true, list: true, create: true, detail: true, createOnly: true },
      { name: 'companyName', label: 'Company name', required: true, list: true, create: true, detail: true },
      { name: 'supplierName', label: 'Contact name', required: true, list: true, create: true, detail: true },
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
      {
        name: 'openingBalance',
        label: 'Opening balance',
        type: 'number',
        list: true,
        create: true,
        detail: true,
        defaultValue: 0,
      },
      { name: 'paymentTerms', label: 'Payment terms', create: true, detail: true },
      { name: 'bankName', label: 'Bank name', create: true, detail: true },
      { name: 'bankAccountNumber', label: 'Account number', create: true, detail: true },
      { name: 'bankIfsc', label: 'IFSC', create: true, detail: true },
      { name: 'notes', label: 'Notes', create: true, detail: true },
    ],
  },
  products: {
    title: 'Products & services',
    singular: 'Product',
    writePermission: 'products:write',
    titleField: 'name',
    searchable: true,
    list: (params) => productApi.list(params).then((rows) => rows as unknown as Record<string, unknown>[]),
    get: (id) => productApi.get(id).then((row) => row as unknown as Record<string, unknown>),
    create: (payload) => productApi.create(payload as never),
    update: (id, payload) => productApi.update(id, payload as never),
    schema: productSchema,
    buildPayload: withProductDefaults,
    fields: [
      { name: 'sku', label: 'SKU (auto)', list: true, create: true, detail: true, createOnly: true, autoCodeFrom: 'name', autoCodePrefix: 'SKU', readOnlyOnCreate: true },
      { name: 'name', label: 'Name', required: true, list: true, create: true, detail: true },
      {
        name: 'itemType',
        label: 'Item type',
        type: 'select',
        optionsKey: 'itemTypes',
        required: true,
        list: true,
        create: true,
        detail: true,
        createOnly: true,
        defaultValue: 'PRODUCT',
      },
      { name: 'barcode', label: 'Barcode', list: true, create: true, detail: true, showWhenItemType: 'PRODUCT' },
      { name: 'categoryId', label: 'Category', type: 'select', optionsKey: 'categories', create: true, detail: true, displayField: 'categoryName', showWhenItemType: 'PRODUCT' },
      {
        name: 'unitId',
        label: 'Unit',
        type: 'select',
        optionsKey: 'units',
        required: true,
        create: true,
        detail: true,
        displayField: 'unitName',
        showWhenItemType: 'PRODUCT',
      },
      { name: 'taxRateId', label: 'Tax rate', type: 'select', optionsKey: 'taxRates', create: true, detail: true, displayField: 'taxRateName' },
      { name: 'brand', label: 'Brand', create: true, detail: true, showWhenItemType: 'PRODUCT' },
      { name: 'hsnSacCode', label: 'HSN/SAC', create: true, detail: true, showWhenItemType: 'PRODUCT' },
      { name: 'description', label: 'Description', create: true, detail: true },
      {
        name: 'sellingPrice',
        label: 'Rate / price',
        type: 'number',
        list: true,
        create: true,
        detail: true,
        defaultValue: 0,
      },
      {
        name: 'purchasePrice',
        label: 'Purchase / cost price',
        type: 'number',
        create: true,
        detail: true,
        defaultValue: 0,
        showWhenItemType: 'PRODUCT',
      },
      { name: 'mrp', label: 'MRP', type: 'number', create: true, detail: true, defaultValue: 0, showWhenItemType: 'PRODUCT' },
      {
        name: 'openingStock',
        label: 'Opening stock',
        type: 'number',
        create: true,
        detail: true,
        createOnly: true,
        defaultValue: 0,
        showWhenItemType: 'PRODUCT',
      },
      {
        name: 'warehouseId',
        label: 'Opening stock warehouse',
        type: 'select',
        optionsKey: 'warehouses',
        create: true,
        createOnly: true,
        showWhenItemType: 'PRODUCT',
      },
      {
        name: 'minimumStockLevel',
        label: 'Minimum stock',
        type: 'number',
        create: true,
        detail: true,
        defaultValue: 0,
        showWhenItemType: 'PRODUCT',
      },
      {
        name: 'reorderLevel',
        label: 'Reorder level',
        type: 'number',
        create: true,
        detail: true,
        defaultValue: 0,
        showWhenItemType: 'PRODUCT',
      },
    ],
  },
  categories: {
    title: 'Product categories',
    singular: 'Category',
    writePermission: 'categories:write',
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
      {
        name: 'parentId',
        label: 'Parent category',
        type: 'select',
        optionsKey: 'categories',
        create: true,
        detail: true,
        displayField: 'parentName',
      },
      { name: 'active', label: 'Active', type: 'boolean', list: true, detail: true, edit: true },
    ],
  },
  warehouses: {
    title: 'Warehouses',
    singular: 'Warehouse',
    writePermission: 'warehouses:write',
    titleField: 'warehouseName',
    searchable: true,
    list: () => warehouseApi.list().then((rows) => rows as unknown as Record<string, unknown>[]),
    get: (id) => warehouseApi.get(id).then((row) => row as unknown as Record<string, unknown>),
    create: (payload) => warehouseApi.create(payload as never),
    update: (id, payload) => warehouseApi.update(id, payload as never),
    schema: warehouseSchema,
    fields: [
      { name: 'warehouseCode', label: 'Warehouse code (auto)', list: true, create: true, detail: true, createOnly: true, autoCodeFrom: 'warehouseName', autoCodePrefix: 'WH', readOnlyOnCreate: true },
      { name: 'warehouseName', label: 'Warehouse name', required: true, list: true, create: true, detail: true },
      { name: 'address', label: 'Address', list: true, create: true, detail: true },
      { name: 'contactPerson', label: 'Contact person', create: true, detail: true },
      { name: 'phone', label: 'Phone', create: true, detail: true },
      { name: 'defaultWarehouse', label: 'Default warehouse', type: 'boolean', list: true, create: true, detail: true },
    ],
  },
}

function formatValue(field: FieldConfig, value: unknown) {
  if (field.optionsKey === 'itemTypes') {
    if (value === 'SERVICE') return <Badge className="bg-sky-50 text-sky-800">Service</Badge>
    if (value === 'PRODUCT') return <Badge>Product</Badge>
  }
  if (typeof value === 'boolean')
    return <Badge className={value ? 'bg-emerald-100 text-emerald-700' : ''}>{value ? 'Yes' : 'No'}</Badge>
  if (field.type === 'number' && typeof value === 'number') return currency(value)
  return String(value ?? '—')
}

function resolveDisplayValue(
  field: FieldConfig,
  item: Record<string, unknown> | undefined,
  optionLabel?: string,
) {
  if (!item) return '—'
  if (field.displayField) {
    const labeled = item[field.displayField]
    if (labeled !== undefined && labeled !== null && String(labeled).trim()) return String(labeled)
  }
  if (optionLabel) return optionLabel
  const raw = item[field.name]
  if (raw === undefined || raw === null || raw === '') return '—'
  return formatValue(field, raw)
}

export function EntityListPage({ kind }: { kind: EntityKind }) {
  const config = configs[kind]
  const { can } = useAuth()
  const canWrite = can(config.writePermission)
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
      listFields.some((field) =>
        String(row[field.name] ?? '')
          .toLowerCase()
          .includes(needle),
      ),
    )
  }, [data, deferredSearch, listFields, serverSearchable])
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">{config.title}</h1>
          <p className="mt-1 text-sm text-slate-500">Manage your {config.title.toLowerCase()}.</p>
        </div>
        {canWrite ? (
          <Link
            className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-medium text-white hover:bg-teal-800 sm:w-auto"
            to={`/${kind}/new`}
          >
            <Plus className="size-4" />
            Add {config.singular}
          </Link>
        ) : null}
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
                        <div className="flex justify-end gap-3">
                          <Link className="text-sm font-medium text-teal-700 hover:underline" to={`/${kind}/${row.id}`}>
                            View
                          </Link>
                          {canWrite && config.update ? (
                            <Link
                              className="text-sm font-medium text-slate-700 hover:underline"
                              to={`/${kind}/${row.id}/edit`}
                            >
                              Edit
                            </Link>
                          ) : null}
                        </div>
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
  const { id = '' } = useParams()
  const isEdit = Boolean(id)
  const { can } = useAuth()
  const canWrite = can(config.writePermission)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const fields = formFields(config, isEdit)
  const defaultValues = Object.fromEntries(
    fields.filter((f) => f.defaultValue !== undefined).map((f) => [f.name, f.defaultValue]),
  )
  const form = useForm<Record<string, unknown>>({
    resolver: zodResolver(config.schema as z.ZodType<Record<string, unknown>>),
    defaultValues,
  })
  const needsUnits = fields.some((f) => f.optionsKey === 'units')
  const needsCategories = fields.some((f) => f.optionsKey === 'categories')
  const needsTaxRates = fields.some((f) => f.optionsKey === 'taxRates')
  const needsWarehouses = fields.some((f) => f.optionsKey === 'warehouses')
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
  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: warehouseApi.list,
    enabled: needsWarehouses,
  })
  const { data: orgSettings } = useQuery({
    queryKey: ['organization', 'settings'],
    queryFn: organizationApi.settings,
    enabled: needsWarehouses && !isEdit,
  })
  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: [kind, id],
    queryFn: () => config.get(id),
    enabled: isEdit && !!id,
  })

  useEffect(() => {
    if (isEdit || !needsWarehouses || !warehouses.length) return
    if (form.getValues('warehouseId')) return
    const defaultId = resolveDefaultWarehouseId(warehouses, orgSettings?.defaultWarehouseId)
    if (defaultId) form.setValue('warehouseId', defaultId as never, { shouldValidate: false })
  }, [form, isEdit, needsWarehouses, orgSettings?.defaultWarehouseId, warehouses])

  useEffect(() => {
    if (!isEdit || !existing) return
    const values: Record<string, unknown> = { ...defaultValues }
    for (const field of config.fields) {
      if (!(field.create || field.edit)) continue
      const value = existing[field.name]
      values[field.name] = value ?? field.defaultValue ?? (field.type === 'boolean' ? false : '')
    }
    form.reset(values)
  }, [config.fields, existing, form, isEdit, defaultValues])

  useEffect(() => {
    if (!canWrite) navigate(`/${kind}`, { replace: true })
  }, [canWrite, kind, navigate])

  // Auto-generate code fields from name (+ salt). Salt stays stable until the name slug changes.
  const lastSlugs = useRef<Record<string, string>>({})
  useEffect(() => {
    if (isEdit) return
    const autoFields = fields.filter((field) => field.autoCodeFrom)
    if (!autoFields.length) return
    const subscription = form.watch((values, info) => {
      for (const field of autoFields) {
        if (!field.autoCodeFrom) continue
        if (info.name && info.name !== field.autoCodeFrom) continue
        const source = String(values[field.autoCodeFrom] ?? '').trim()
        if (!source) {
          lastSlugs.current[field.name] = ''
          form.setValue(field.name, '' as never, { shouldValidate: false })
          continue
        }
        const slug = slugifyName(source)
        if (lastSlugs.current[field.name] === slug && String(values[field.name] ?? '')) continue
        lastSlugs.current[field.name] = slug
        form.setValue(field.name, generateEntityCode(source, field.autoCodePrefix) as never, {
          shouldValidate: false,
        })
      }
    })
    return () => subscription.unsubscribe()
  }, [fields, form, isEdit])

  const selectOptions = (key?: FieldConfig['optionsKey']) => {
    if (key === 'units') return units.map((u) => ({ id: u.id, label: u.name }))
    if (key === 'categories') return categories.map((c) => ({ id: c.id, label: c.name }))
    if (key === 'taxRates') {
      return taxRates.map((t) => {
        const share =
          t.taxType === 'GST' || t.splitStrategy === 'PLACE_OF_SUPPLY' || t.splitStrategy === 'CUSTOM_PERCENT'
            ? ` ${Number(t.cgstSharePercent ?? 50)}/${Number(t.sgstSharePercent ?? 50)}`
            : ''
        return {
          id: t.id,
          label: `${t.name} · ${t.taxType ?? 'GST'}${share} (${t.rate}%)`,
        }
      })
    }
    if (key === 'warehouses') {
      return warehouses.map((w) => ({
        id: w.id,
        label: w.defaultWarehouse ? `${w.warehouseName} (default)` : w.warehouseName,
      }))
    }
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
      if (isEdit) {
        for (const field of config.fields) {
          if (field.createOnly) delete payload[field.name]
        }
        if (!config.update) throw new Error('Update is not supported')
        await config.update(id, payload)
        await queryClient.invalidateQueries({ queryKey: [kind] })
        await queryClient.invalidateQueries({ queryKey: [kind, id] })
        toast.success(`${config.singular} updated`)
        navigate(`/${kind}/${id}`)
      } else {
        await config.create(payload)
        await queryClient.invalidateQueries({ queryKey: [kind] })
        toast.success(`${config.singular} created`)
        navigate(`/${kind}`)
      }
    } catch (error) {
      if (!applyApiFieldErrors(error, form.setError)) toast.error(getApiErrorMessage(error))
    }
  })

  if (isEdit && loadingExisting) {
    return (
      <div className="max-w-3xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          {isEdit ? `Edit ${config.singular}` : `New ${config.singular}`}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {isEdit ? `Update this ${config.singular.toLowerCase()}.` : 'Add details aligned with backend validation.'}
        </p>
      </div>
      <Card>
        <CardContent className="p-6">
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
            {fields.map((field) => {
              const itemType = String(form.watch('itemType' as never) ?? 'PRODUCT')
              if (field.showWhenItemType && field.showWhenItemType !== itemType) return null
              const options = selectOptions(field.optionsKey)
              const current = String(form.watch(field.name as never) ?? '')
              const selectedLabel = options.find((o) => o.id === current)?.label
              const readOnly = !isEdit && !!field.readOnlyOnCreate
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
                  ) : field.type === 'number' ? (
                    <NumberInput
                      readOnly={readOnly}
                      className={readOnly ? 'bg-slate-50 text-slate-600' : undefined}
                      value={Number(form.watch(field.name as never) ?? 0)}
                      onValueChange={(value) => form.setValue(field.name as never, value as never, { shouldDirty: true })}
                    />
                  ) : (
                    <>
                      <Input
                        type={field.type === 'email' ? 'email' : 'text'}
                        readOnly={readOnly}
                        className={readOnly ? 'bg-slate-50 text-slate-600' : undefined}
                        {...form.register(field.name as never)}
                      />
                      {!isEdit && field.autoCodeFrom ? (
                        <p className="text-[11px] font-normal text-slate-400">
                          Generated from {field.autoCodeFrom.replace(/([A-Z])/g, ' $1').toLowerCase()} + salt
                        </p>
                      ) : null}
                    </>
                  )}
                  {field.name === 'itemType' ? (
                    <p className="text-[11px] font-normal text-slate-400">
                      Services need only name, rate, and tax. On invoices quantity starts at 1 (change it to bill by
                      hours/days). Services are never tracked in warehouse stock.
                    </p>
                  ) : null}
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
              <Button type="submit">{isEdit ? `Update ${config.singular}` : `Save ${config.singular}`}</Button>
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
  const { can } = useAuth()
  const canWrite = can(config.writePermission)
  const { data: item } = useQuery({ queryKey: [kind, id], queryFn: () => config.get(id), enabled: !!id })
  const detailFields = config.fields.filter((field) => {
    if (!field.detail) return false
    if (field.showWhenItemType && item && field.showWhenItemType !== String(item.itemType ?? 'PRODUCT')) {
      return false
    }
    return true
  })
  const needsUnits = detailFields.some((f) => f.optionsKey === 'units')
  const needsCategories = detailFields.some((f) => f.optionsKey === 'categories')
  const needsTaxRates = detailFields.some((f) => f.optionsKey === 'taxRates')
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

  const selectLabel = (field: FieldConfig) => {
    const raw = item?.[field.name]
    if (raw === undefined || raw === null || raw === '') return undefined
    const value = String(raw)
    if (field.optionsKey === 'units') return units.find((u) => u.id === value)?.name
    if (field.optionsKey === 'categories') return categories.find((c) => c.id === value)?.name
    if (field.optionsKey === 'taxRates') {
      const tax = taxRates.find((t) => t.id === value)
      return tax ? `${tax.name} · ${tax.taxType ?? 'GST'} (${tax.rate}%)` : undefined
    }
    if (field.optionsKey === 'itemTypes') {
      if (value === 'PRODUCT') return 'Product'
      if (value === 'SERVICE') return 'Service'
    }
    return undefined
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
            {String(item?.[config.titleField] ?? config.singular)}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{config.singular} record</p>
        </div>
        {canWrite && config.update ? (
          <Link
            className="inline-flex h-9 w-full items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:w-auto"
            to={`/${kind}/${id}/edit`}
          >
            Edit
          </Link>
        ) : null}
      </div>
      <Card>
        <CardContent className="grid gap-5 p-6 sm:grid-cols-2">
          {detailFields.map((field) => (
            <div key={field.name}>
              <p className="text-xs uppercase tracking-wide text-slate-500">{field.label}</p>
              <p className="mt-1 text-sm font-medium text-slate-800">
                {resolveDisplayValue(field, item, selectLabel(field))}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
