import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Download, Eye, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { auditApi, organizationApi, reportApi, salesApi, taxRateApi, templateApi, unitApi, warehouseApi } from '@/services/api'
import { applyApiFieldErrors, getApiErrorMessage } from '@/lib/api-error'
import { useAuth } from '@/features/auth/auth'
import {
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
  Switch,
  Table,
  Textarea,
} from '@/components/ui'

import { mergeDefined } from '@/lib/api-payload'
import type { InvoiceTemplateConfig, UpdateOrganizationRequest } from '@/types/api'

const orgSchema = z.object({
  name: z.string().min(1, 'Organization name is required'),
  legalName: z.string().optional(),
  gstin: z.string().optional(),
  pan: z.string().optional(),
  cin: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  website: z.string().optional(),
  billingAddress: z.string().optional(),
  shippingAddress: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  stateCode: z.string().optional(),
  country: z.string().min(1, 'Country is required'),
  currency: z.string().min(1, 'Currency is required'),
  financialYearStart: z.string().min(1, 'Financial year start is required'),
  invoicePrefix: z.string().min(1, 'Invoice prefix is required'),
  invoiceNumberFormat: z.string().min(1, 'Invoice number format is required'),
  bankName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankIfsc: z.string().optional(),
  bankBranch: z.string().optional(),
  upiId: z.string().optional(),
  paymentTerms: z.string().optional(),
})

export function OrganizationSettingsPage() {
  const { refreshOrganization } = useAuth()
  const { data: organization } = useQuery({ queryKey: ['organization', 'settings'], queryFn: organizationApi.current })
  const form = useForm<z.infer<typeof orgSchema>>({
    resolver: zodResolver(orgSchema),
    values: organization
      ? {
          name: organization.name,
          legalName: organization.legalName ?? undefined,
          gstin: organization.gstin ?? undefined,
          pan: organization.pan ?? undefined,
          cin: organization.cin ?? undefined,
          email: organization.email ?? undefined,
          phone: organization.phone ?? undefined,
          website: organization.website ?? undefined,
          billingAddress: organization.billingAddress ?? undefined,
          shippingAddress: organization.shippingAddress ?? undefined,
          city: organization.city ?? undefined,
          state: organization.state ?? undefined,
          stateCode: organization.stateCode ?? undefined,
          country: organization.country ?? 'India',
          currency: organization.currency ?? 'INR',
          financialYearStart: organization.financialYearStart ?? '04-01',
          invoicePrefix: organization.invoicePrefix ?? 'INV',
          invoiceNumberFormat: organization.invoiceNumberFormat ?? '{PREFIX}/{FY}/{SEQ:6}',
          bankName: organization.bankName ?? undefined,
          bankAccountNumber: organization.bankAccountNumber ?? undefined,
          bankIfsc: organization.bankIfsc ?? undefined,
          bankBranch: organization.bankBranch ?? undefined,
          upiId: organization.upiId ?? undefined,
          paymentTerms: organization.paymentTerms ?? undefined,
        }
      : undefined,
  })
  const submit = form.handleSubmit(async (values) => {
    try {
      const payload = mergeDefined(
        {
          country: 'India',
          currency: 'INR',
          financialYearStart: '04-01',
          invoicePrefix: 'INV',
          invoiceNumberFormat: '{PREFIX}/{FY}/{SEQ:6}',
        } satisfies UpdateOrganizationRequest,
        values,
      )
      await organizationApi.update(payload)
      await refreshOrganization()
      toast.success('Organization updated')
    } catch (error) {
      if (!applyApiFieldErrors(error, form.setError)) toast.error(getApiErrorMessage(error))
    }
  })
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Organization settings</h1>
        <p className="mt-1 text-sm text-slate-500">Manage business details, tax and preferences.</p>
      </div>
      <Card>
        <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
          <form className="contents" onSubmit={submit}>
            <Input placeholder="Organization name" {...form.register('name')} />
            <Input placeholder="Legal name" {...form.register('legalName')} />
            <Input placeholder="GSTIN" {...form.register('gstin')} />
            <Input placeholder="PAN" {...form.register('pan')} />
            <Input placeholder="CIN" {...form.register('cin')} />
            <Input placeholder="Business email" {...form.register('email')} />
            <Input placeholder="Phone number" {...form.register('phone')} />
            <Input placeholder="Website" {...form.register('website')} />
            <Input placeholder="Billing address" className="sm:col-span-2" {...form.register('billingAddress')} />
            <Input placeholder="Shipping address" className="sm:col-span-2" {...form.register('shippingAddress')} />
            <Input placeholder="City" {...form.register('city')} />
            <Input placeholder="State" {...form.register('state')} />
            <Input placeholder="State code" {...form.register('stateCode')} />
            <Input placeholder="Country" {...form.register('country')} />
            <Input placeholder="Currency" {...form.register('currency')} />
            <Input placeholder="Financial year start" {...form.register('financialYearStart')} />
            <Input placeholder="Invoice prefix" {...form.register('invoicePrefix')} />
            <Input
              placeholder="Invoice number format"
              className="sm:col-span-2"
              {...form.register('invoiceNumberFormat')}
            />
            <Input placeholder="Bank name" {...form.register('bankName')} />
            <Input placeholder="Account number" {...form.register('bankAccountNumber')} />
            <Input placeholder="IFSC" {...form.register('bankIfsc')} />
            <Input placeholder="Branch" {...form.register('bankBranch')} />
            <Input placeholder="UPI ID" {...form.register('upiId')} />
            <Input placeholder="Payment terms" className="sm:col-span-2" {...form.register('paymentTerms')} />
            <div className="col-span-full flex justify-end">
              <Button type="submit">Save changes</Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <OrgOperationalSettings />
    </div>
  )
}

function OrgOperationalSettings() {
  const queryClient = useQueryClient()
  const { data: warehouses = [] } = useQuery({ queryKey: ['warehouses'], queryFn: warehouseApi.list })
  const { data: settings } = useQuery({ queryKey: ['organization', 'ops-settings'], queryFn: organizationApi.settings })
  const [inventoryDeductionEvent, setInventoryDeductionEvent] = useState('INVOICE_CONFIRM')
  const [taxInclusiveDefault, setTaxInclusiveDefault] = useState(false)
  const [roundOffEnabled, setRoundOffEnabled] = useState(true)
  const [defaultWarehouseId, setDefaultWarehouseId] = useState('')

  useEffect(() => {
    if (!settings) return
    setInventoryDeductionEvent(settings.inventoryDeductionEvent ?? 'INVOICE_CONFIRM')
    setTaxInclusiveDefault(!!settings.taxInclusiveDefault)
    setRoundOffEnabled(settings.roundOffEnabled !== false)
    setDefaultWarehouseId(settings.defaultWarehouseId ?? '')
  }, [settings])

  const save = async () => {
    try {
      await organizationApi.updateSettings({
        inventoryDeductionEvent,
        taxInclusiveDefault,
        roundOffEnabled,
        defaultWarehouseId: defaultWarehouseId || undefined,
      })
      await queryClient.invalidateQueries({ queryKey: ['organization', 'ops-settings'] })
      toast.success('Operational settings saved')
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold text-slate-900">Operational preferences</h2>
      </CardHeader>
      <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Inventory deduction event</Label>
          <Select value={inventoryDeductionEvent} onValueChange={setInventoryDeductionEvent}>
            <SelectTrigger>{inventoryDeductionEvent}</SelectTrigger>
            <SelectContent>
              {['INVOICE_CONFIRM', 'DELIVERY_CHALLAN', 'SALES_ORDER'].map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Default warehouse</Label>
          <Select value={defaultWarehouseId} onValueChange={setDefaultWarehouseId}>
            <SelectTrigger>
              {warehouses.find((w) => w.id === defaultWarehouseId)?.warehouseName ?? 'Select warehouse'}
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
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={taxInclusiveDefault} onChange={(e) => setTaxInclusiveDefault(e.target.checked)} />
          Tax inclusive by default
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={roundOffEnabled} onChange={(e) => setRoundOffEnabled(e.target.checked)} />
          Enable round off
        </label>
        <div className="col-span-full flex justify-end">
          <Button type="button" onClick={save}>
            Save operational settings
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function ReportsPage() {
  const [report, setReport] = useState('sales')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const {
    data = [],
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['reports', report, from, to],
    queryFn: () => reportApi.run(report, { from, to }),
    enabled: false,
  })
  const run = async () => {
    try {
      await refetch()
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }
  const exportCsv = async () => {
    try {
      const response = await reportApi.export(report, { from, to })
      const url = URL.createObjectURL(response.data)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${report}.csv`
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Reports</h1>
        <p className="mt-1 text-sm text-slate-500">Analyze sales, purchases, taxes and inventory.</p>
      </div>
      <Card>
        <CardContent className="grid gap-4 p-5 md:grid-cols-4">
          <div>
            <Label>Report</Label>
            <Select value={report} onValueChange={setReport}>
              <SelectTrigger className="mt-1.5">{report}</SelectTrigger>
              <SelectContent>
                {['sales', 'purchase', 'stock-summary', 'outstanding-receivables', 'outstanding-payables', 'gstr1'].map(
                  (name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>From date</Label>
            <Input className="mt-1.5" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </div>
          <div>
            <Label>To date</Label>
            <Input className="mt-1.5" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={run} disabled={isFetching}>
              Run report
            </Button>
            <Button variant="outline" onClick={exportCsv}>
              <Download className="size-4" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          {data.length ? (
            <Table>
              <tbody>
                {data.map((row, index) => (
                  <tr key={index} className="border-b">
                    {Object.values(row).map((value, cell) => (
                      <td key={cell} className="p-3">
                        {String(value)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <p className="py-24 text-center text-sm text-slate-500">Choose a report and date range to view results.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export function TemplateDesignerPage() {
  const queryClient = useQueryClient()
  const { data: templates = [] } = useQuery({ queryKey: ['templates'], queryFn: () => templateApi.list() })
  const { data: presets = [] } = useQuery({ queryKey: ['template-presets'], queryFn: templateApi.presets })
  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices', 'template-preview'],
    queryFn: () => salesApi.listInvoices(),
  })

  const [templateName, setTemplateName] = useState('Tax Invoice')
  const [documentType, setDocumentType] = useState('SALES_INVOICE')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [previewInvoiceId, setPreviewInvoiceId] = useState('')
  const [config, setConfig] = useState<InvoiceTemplateConfig>(defaultTemplateConfig())

  const patchConfig = (next: InvoiceTemplateConfig) => setConfig(next)

  const applyPreset = (preset: { key: string; name: string; documentType?: string; config: InvoiceTemplateConfig }) => {
    setTemplateName(preset.name)
    setDocumentType(preset.documentType ?? 'SALES_INVOICE')
    setConfig(normalizeTemplateConfig(preset.config))
    setEditingId(null)
  }

  const loadTemplate = (template: (typeof templates)[number]) => {
    setEditingId(template.id)
    setTemplateName(template.templateName)
    setDocumentType(template.documentType ?? 'SALES_INVOICE')
    setConfig(normalizeTemplateConfig(template.configJson))
  }

  const save = async () => {
    try {
      const payload = {
        templateName: templateName.trim() || `Template ${templates.length + 1}`,
        documentType,
        configJson: config,
      }
      if (editingId) await templateApi.update(editingId, payload)
      else {
        const created = await templateApi.create(payload)
        setEditingId(created.id)
      }
      await queryClient.invalidateQueries({ queryKey: ['templates'] })
      toast.success(editingId ? 'Template updated' : 'Template saved')
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }

  const setDefault = async (id: string) => {
    try {
      await templateApi.setDefault(id)
      await queryClient.invalidateQueries({ queryKey: ['templates'] })
      toast.success('Default template updated')
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }

  const remove = async (id: string) => {
    try {
      await templateApi.delete(id)
      if (editingId === id) {
        setEditingId(null)
        setConfig(defaultTemplateConfig())
      }
      await queryClient.invalidateQueries({ queryKey: ['templates'] })
      toast.success('Template deleted')
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }

  const preview = async () => {
    try {
      const blob = await templateApi.preview({
        configJson: config,
        documentType,
        sampleInvoiceId: previewInvoiceId || undefined,
      })
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener,noreferrer')
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to preview PDF'))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Invoice template designer</h1>
          <p className="mt-1 text-sm text-slate-500">
            Toggle sections and save a structured config used by invoice PDF rendering.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setEditingId(null)
              setTemplateName('Tax Invoice')
              setDocumentType('SALES_INVOICE')
              setConfig(defaultTemplateConfig())
            }}
          >
            New
          </Button>
          <Button variant="outline" onClick={preview}>
            <Eye className="size-4" />
            Preview PDF
          </Button>
          <Button onClick={save}>
            <Save className="size-4" />
            {editingId ? 'Update template' : 'Save template'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-slate-900">Layout settings</h2>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Template name</Label>
                <Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Document type</Label>
                <Select value={documentType} onValueChange={setDocumentType}>
                  <SelectTrigger>{documentType}</SelectTrigger>
                  <SelectContent>
                    {['SALES_INVOICE', 'QUOTATION', 'PURCHASE_ORDER'].map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Header title</Label>
                <Input
                  value={config.header?.title ?? ''}
                  onChange={(e) =>
                    patchConfig({ ...config, header: { ...config.header, title: e.target.value } })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Accent color</Label>
                <Input
                  type="color"
                  className="h-10 p-1"
                  value={config.header?.accentColor ?? '#1F4E78'}
                  onChange={(e) =>
                    patchConfig({ ...config, header: { ...config.header, accentColor: e.target.value } })
                  }
                />
              </div>
            </div>

            <div className="space-y-3 rounded-lg border border-slate-200 p-4">
              <p className="text-sm font-medium text-slate-800">Sections</p>
              {(
                [
                  {
                    key: 'logo',
                    label: 'Show logo',
                    checked: config.logo?.visible !== false,
                    onChange: (checked: boolean) =>
                      patchConfig({ ...config, logo: { ...config.logo, visible: checked } }),
                  },
                  {
                    key: 'gstin',
                    label: 'Show GSTIN',
                    checked: config.header?.showGstin !== false,
                    onChange: (checked: boolean) =>
                      patchConfig({ ...config, header: { ...config.header, showGstin: checked } }),
                  },
                  {
                    key: 'hsn',
                    label: 'Show HSN/SAC column',
                    checked: config.items?.showHsn !== false,
                    onChange: (checked: boolean) =>
                      patchConfig({ ...config, items: { ...config.items, showHsn: checked } }),
                  },
                  {
                    key: 'bank',
                    label: 'Show bank details',
                    checked: config.footer?.showBankDetails !== false,
                    onChange: (checked: boolean) =>
                      patchConfig({
                        ...config,
                        footer: { ...config.footer, showBankDetails: checked },
                      }),
                  },
                  {
                    key: 'terms',
                    label: 'Show terms',
                    checked: config.footer?.showTerms !== false,
                    onChange: (checked: boolean) =>
                      patchConfig({ ...config, footer: { ...config.footer, showTerms: checked } }),
                  },
                ] as const
              ).map((row) => (
                <div key={row.key} className="flex items-center justify-between gap-3">
                  <Label htmlFor={`toggle-${row.key}`}>{row.label}</Label>
                  <Switch id={`toggle-${row.key}`} checked={row.checked} onCheckedChange={row.onChange} />
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              <Label>Footer note</Label>
              <Textarea
                value={config.footer?.note ?? ''}
                onChange={(e) => patchConfig({ ...config, footer: { ...config.footer, note: e.target.value } })}
              />
            </div>

            <div className="space-y-2">
              <Label>Presets</Label>
              <div className="flex flex-wrap gap-2">
                {presets.map((preset) => (
                  <Button key={preset.key} variant="outline" size="sm" onClick={() => applyPreset(preset)}>
                    {preset.name}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Preview with invoice (optional)</Label>
              <Select
                value={previewInvoiceId || '__sample__'}
                onValueChange={(value) => setPreviewInvoiceId(value === '__sample__' ? '' : value)}
              >
                <SelectTrigger>
                  {previewInvoiceId
                    ? (invoices.find((invoice) => invoice.id === previewInvoiceId)?.invoiceNumber ?? previewInvoiceId)
                    : 'Sample document'}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__sample__">Sample document</SelectItem>
                  {invoices.map((invoice) => (
                    <SelectItem key={invoice.id} value={invoice.id}>
                      {invoice.invoiceNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                Preview applies your current designer config. Pick an invoice to fill real data, or use the sample
                document.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-semibold text-slate-900">Saved templates</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            {templates.length ? (
              templates.map((template) => (
                <div key={template.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <button type="button" className="font-semibold text-slate-900 hover:underline" onClick={() => loadTemplate(template)}>
                        {template.templateName}
                      </button>
                      <p className="text-slate-500">
                        {template.documentType ?? 'SALES_INVOICE'}
                        {template.isDefault ? ' · Default' : ''}
                        {template.presetKey ? ` · ${template.presetKey}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => loadTemplate(template)}>
                        Edit
                      </Button>
                      {!template.isDefault && (
                        <Button variant="outline" size="sm" onClick={() => setDefault(template.id)}>
                          Set default
                        </Button>
                      )}
                      <Button variant="destructive" size="sm" onClick={() => remove(template.id)}>
                        <Trash2 className="size-3.5" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No templates yet. Choose a preset and save.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function defaultTemplateConfig(): InvoiceTemplateConfig {
  return {
    logo: { visible: true, position: 'left' },
    header: { title: 'TAX INVOICE', accentColor: '#1F4E78', showGstin: true },
    items: {
      columns: ['#', 'Description', 'HSN/SAC', 'Qty', 'Rate', 'Amount'],
      showHsn: true,
      showTax: true,
    },
    footer: {
      showBankDetails: true,
      showTerms: true,
      showSignature: true,
      note: 'This is a computer-generated document.',
    },
  }
}

function normalizeTemplateConfig(raw: InvoiceTemplateConfig | string | null | undefined): InvoiceTemplateConfig {
  const base = defaultTemplateConfig()
  if (!raw) return base
  try {
    const parsed = typeof raw === 'string' ? (JSON.parse(raw) as InvoiceTemplateConfig) : raw
    return {
      logo: { ...base.logo, ...parsed.logo },
      header: { ...base.header, ...parsed.header },
      items: { ...base.items, ...parsed.items },
      footer: { ...base.footer, ...parsed.footer },
    }
  } catch {
    return base
  }
}

export function TaxRatesPage() {
  const queryClient = useQueryClient()
  const { data = [] } = useQuery({ queryKey: ['tax-rates'], queryFn: taxRateApi.list })
  const [name, setName] = useState('')
  const [rate, setRate] = useState(18)
  const create = async () => {
    try {
      await taxRateApi.create({ name, rate })
      setName('')
      setRate(18)
      await queryClient.invalidateQueries({ queryKey: ['tax-rates'] })
      toast.success('Tax rate created')
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Tax rates</h1>
        <p className="mt-1 text-sm text-slate-500">Manage GST and other tax rates used on documents.</p>
      </div>
      <Card>
        <CardContent className="grid gap-3 p-5 sm:grid-cols-3">
          <Input placeholder="Name" value={name} onChange={(event) => setName(event.target.value)} />
          <Input
            type="number"
            placeholder="Rate %"
            value={rate}
            onChange={(event) => setRate(Number(event.target.value))}
          />
          <Button onClick={create}>Add tax rate</Button>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <Table>
            <thead>
              <tr className="border-b">
                <th className="p-3 text-xs text-slate-500">NAME</th>
                <th className="p-3 text-xs text-slate-500">RATE</th>
                <th className="p-3 text-xs text-slate-500">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.id} className="border-b">
                  <td className="p-3">{row.name}</td>
                  <td className="p-3">{row.rate}%</td>
                  <td className="p-3">{row.active ? 'Active' : 'Inactive'}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

export function UnitsPage() {
  const queryClient = useQueryClient()
  const { data = [] } = useQuery({ queryKey: ['units'], queryFn: unitApi.list })
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const create = async () => {
    try {
      await unitApi.create({ code, name })
      setCode('')
      setName('')
      await queryClient.invalidateQueries({ queryKey: ['units'] })
      toast.success('Unit created')
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Units</h1>
        <p className="mt-1 text-sm text-slate-500">Define measurement units for products.</p>
      </div>
      <Card>
        <CardContent className="grid gap-3 p-5 sm:grid-cols-3">
          <Input placeholder="Code" value={code} onChange={(event) => setCode(event.target.value)} />
          <Input placeholder="Name" value={name} onChange={(event) => setName(event.target.value)} />
          <Button onClick={create}>Add unit</Button>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <Table>
            <thead>
              <tr className="border-b">
                <th className="p-3 text-xs text-slate-500">CODE</th>
                <th className="p-3 text-xs text-slate-500">NAME</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.id} className="border-b">
                  <td className="p-3">{row.code}</td>
                  <td className="p-3">{row.name}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

export function AuditLogsPage() {
  const { data = [] } = useQuery({ queryKey: ['audit-logs'], queryFn: () => auditApi.list({ size: 50 }) })
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Audit log</h1>
        <p className="mt-1 text-sm text-slate-500">Track important activity across your organization.</p>
      </div>
      <Card>
        <CardContent className="p-4">
          {data.length ? (
            <Table>
              <thead>
                <tr className="border-b">
                  <th className="p-3 text-xs text-slate-500">ACTION</th>
                  <th className="p-3 text-xs text-slate-500">ENTITY</th>
                  <th className="p-3 text-xs text-slate-500">DATE</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.id} className="border-b">
                    <td className="p-3">{row.action}</td>
                    <td className="p-3">{row.entityType}</td>
                    <td className="p-3">{new Date(row.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <p className="py-20 text-center text-sm text-slate-500">No audit events to display.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
