import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Download, Eye, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  auditApi,
  organizationApi,
  reportApi,
  salesApi,
  taxRateApi,
  templateApi,
  unitApi,
  warehouseApi,
} from '@/services/api'
import { applyApiFieldErrors, getApiErrorMessage } from '@/lib/api-error'
import { useAuth } from '@/features/auth/auth'
import { EmailDesignEditor, type EmailDesignEditorHandle } from '@/components/email/EmailDesignEditor'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Dialog,
  DialogContent,
  DialogTitle,
  Input,
  NumberInput,
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
import { documentPresets, getDocumentPreset } from '@/lib/unlayer-presets'
import type { CreateInvoiceTemplateRequest, InvoiceTemplateConfig, UpdateOrganizationRequest } from '@/types/api'

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
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Select
                value={form.watch('currency') || 'INR'}
                onValueChange={(value) => form.setValue('currency', value, { shouldDirty: true })}
              >
                <SelectTrigger>{form.watch('currency') || 'INR'}</SelectTrigger>
                <SelectContent>
                  {['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'AUD', 'CAD'].map((code) => (
                    <SelectItem key={code} value={code}>
                      {code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">Used on invoices and PDFs (shown as {form.watch('currency') || 'INR'} …).</p>
            </div>
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
          <input
            type="checkbox"
            checked={taxInclusiveDefault}
            onChange={(e) => setTaxInclusiveDefault(e.target.checked)}
          />
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

const FIXED_DESIGNS = [
  {
    key: 'classic-sage',
    name: 'Classic Sage',
    accent: '#9CAF88',
    defaultTerms: 'Payment due within 15 days of invoice date.',
  },
  {
    key: 'botanical',
    name: 'Botanical Minimal',
    accent: '#6B7280',
    defaultTerms: 'Thank you for your business.',
  },
  {
    key: 'mint-gradient',
    name: 'Mint Gradient',
    accent: '#14B8A6',
    defaultTerms: 'Goods once sold will not be taken back.',
  },
  {
    key: 'coral-accent',
    name: 'Coral Accent',
    accent: '#E07A5F',
    defaultTerms: 'Payment due within 15 days of invoice date.',
  },
  {
    key: 'elegant-classic',
    name: 'Elegant Classic',
    accent: '#111827',
    defaultTerms: 'This is a computer-generated tax invoice.',
  },
  {
    key: 'ivonne-hosting',
    name: 'Ivonne Hosting',
    accent: '#0F766E',
    defaultTerms:
      'Here we can write additional notes for the client to get a better understanding of this invoice.',
  },
] as const

const FIXED_LAYOUT_KEYS = new Set(FIXED_DESIGNS.map((d) => d.key))

function configForFixedDesign(
  key: string,
  termsOverride?: string,
): InvoiceTemplateConfig {
  const design = FIXED_DESIGNS.find((d) => d.key === key) ?? FIXED_DESIGNS[0]
  const terms = termsOverride?.trim() || design.defaultTerms
  return {
    layoutKey: design.key,
    logo: { visible: true, position: 'left' },
    header: { title: 'INVOICE', accentColor: design.accent, showGstin: true },
    items: {
      columns: ['#', 'Description', 'HSN/SAC', 'Qty', 'Rate', 'Disc %', 'Tax %', 'Amount'],
      showHsn: true,
      showTax: true,
    },
    footer: {
      showBankDetails: true,
      showTerms: true,
      showSignature: true,
      defaultTerms: terms,
      note: terms,
    },
  }
}

export function TemplateDesignerPage() {
  const queryClient = useQueryClient()
  const editorRef = useRef<EmailDesignEditorHandle>(null)
  const { data: templates = [] } = useQuery({ queryKey: ['templates'], queryFn: () => templateApi.list() })
  const { data: presets = [] } = useQuery({ queryKey: ['template-presets'], queryFn: templateApi.presets })
  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices', 'template-preview'],
    queryFn: () => salesApi.listInvoices(),
  })

  const [templateName, setTemplateName] = useState(FIXED_DESIGNS[0].name)
  const [documentType, setDocumentType] = useState('SALES_INVOICE')
  const [editorMode, setEditorMode] = useState<'SECTION' | 'UNLAYER'>('SECTION')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [previewInvoiceId, setPreviewInvoiceId] = useState('')
  const [config, setConfig] = useState<InvoiceTemplateConfig>(() => configForFixedDesign('classic-sage'))

  const otherPresets = presets.filter((preset) => !FIXED_LAYOUT_KEYS.has(preset.key as (typeof FIXED_DESIGNS)[number]['key']))
  const selectedLayout =
    config.layoutKey && FIXED_LAYOUT_KEYS.has(config.layoutKey as (typeof FIXED_DESIGNS)[number]['key'])
      ? config.layoutKey
      : ''

  const patchConfig = (next: InvoiceTemplateConfig) => setConfig(next)

  const applyPreset = (preset: { key: string; name: string; documentType?: string; config: InvoiceTemplateConfig }) => {
    setTemplateName(preset.name)
    setDocumentType(preset.documentType ?? 'SALES_INVOICE')
    setEditorMode('SECTION')
    if (FIXED_LAYOUT_KEYS.has(preset.key as (typeof FIXED_DESIGNS)[number]['key'])) {
      const terms =
        preset.config?.footer?.defaultTerms ||
        preset.config?.footer?.note ||
        undefined
      setConfig(configForFixedDesign(preset.key, terms))
    } else {
      setConfig(normalizeTemplateConfig(preset.config))
    }
    setEditingId(null)
  }

  const loadTemplate = (template: (typeof templates)[number]) => {
    setEditingId(template.id)
    setTemplateName(template.templateName)
    setDocumentType(template.documentType ?? 'SALES_INVOICE')
    setEditorMode(template.editorMode === 'UNLAYER' ? 'UNLAYER' : 'SECTION')
    const presetKey = template.presetKey ?? ''
    if (FIXED_LAYOUT_KEYS.has(presetKey as (typeof FIXED_DESIGNS)[number]['key'])) {
      const parsed = normalizeTemplateConfig(template.configJson)
      const terms = parsed.footer?.defaultTerms || parsed.footer?.note
      setConfig(configForFixedDesign(presetKey, terms))
    } else {
      setConfig(normalizeTemplateConfig(template.configJson))
    }
    if (template.editorMode === 'UNLAYER' && template.designJson && typeof template.designJson === 'object') {
      setTimeout(() => editorRef.current?.loadDesign(template.designJson as Record<string, unknown>), 0)
    }
  }

  const selectFixedLayout = (layoutKey: string) => {
    const design = FIXED_DESIGNS.find((d) => d.key === layoutKey)
    if (!design) return
    const existing = templates.find((t) => t.presetKey === layoutKey)
    if (existing) {
      loadTemplate(existing)
      return
    }
    setEditingId(null)
    setTemplateName(design.name)
    setDocumentType('SALES_INVOICE')
    setEditorMode('SECTION')
    setConfig(configForFixedDesign(layoutKey))
  }

  const save = async () => {
    try {
      const payload: CreateInvoiceTemplateRequest = {
        templateName: templateName.trim() || `Template ${templates.length + 1}`,
        documentType,
        editorMode,
        presetKey: config.layoutKey || undefined,
      }
      if (editorMode === 'UNLAYER') {
        const exported = await editorRef.current!.exportHtml()
        payload.designJson = exported.design
        payload.html = exported.html
        payload.configJson = config
      } else {
        payload.configJson = {
          ...config,
          layoutKey: config.layoutKey,
        }
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
        setConfig(configForFixedDesign('classic-sage'))
        setEditorMode('SECTION')
      }
      await queryClient.invalidateQueries({ queryKey: ['templates'] })
      toast.success('Template deleted')
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }

  const preview = async () => {
    try {
      if (editorMode !== 'UNLAYER' && !config.layoutKey) {
        toast.error('Select a fixed design before previewing')
        return
      }
      const payload: {
        configJson?: InvoiceTemplateConfig
        documentType?: string
        sampleInvoiceId?: string
        editorMode?: string
        html?: string
      } = {
        documentType,
        sampleInvoiceId: previewInvoiceId || undefined,
        editorMode: editorMode === 'UNLAYER' ? 'UNLAYER' : 'SECTION',
      }
      if (editorMode === 'UNLAYER') {
        const exported = await editorRef.current!.exportHtml()
        payload.html = exported.html
      } else {
        // Always include layoutKey explicitly so the server picks the matching HTML layout
        payload.configJson = {
          ...config,
          layoutKey: config.layoutKey,
          footer: {
            ...config.footer,
            defaultTerms: config.footer?.defaultTerms || config.footer?.note,
          },
        }
      }
      const blob = await templateApi.preview(payload)
      if (blob.type && blob.type.includes('json')) {
        const text = await blob.text()
        throw new Error(text || 'Preview failed')
      }
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
          <h1 className="text-2xl font-semibold text-slate-900">Invoice templates</h1>
          <p className="mt-1 text-sm text-slate-500">
            Choose a fixed design, edit default terms/notes, then pick that template on each invoice.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setEditingId(null)
              setTemplateName(FIXED_DESIGNS[0].name)
              setDocumentType('SALES_INVOICE')
              setEditorMode('SECTION')
              setConfig(configForFixedDesign('classic-sage'))
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
            <h2 className="font-semibold text-slate-900">Design settings</h2>
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
            </div>

            <div className="space-y-2">
              <Label>Fixed design</Label>
              <p className="text-xs text-slate-500">
                These match your brand layouts. Invoice data and terms fill in automatically on PDF.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {FIXED_DESIGNS.map((design) => (
                  <Button
                    key={design.key}
                    type="button"
                    variant={selectedLayout === design.key ? 'default' : 'outline'}
                    className="justify-start"
                    onClick={() => selectFixedLayout(design.key)}
                  >
                    <span
                      className="mr-2 inline-block size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: design.accent }}
                      aria-hidden
                    />
                    {design.name}
                  </Button>
                ))}
              </div>
              {selectedLayout ? (
                <p className="text-xs text-slate-600">
                  Selected layout: <span className="font-medium text-slate-900">{selectedLayout}</span>
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label>Default terms &amp; conditions</Label>
              <Textarea
                rows={4}
                value={config.footer?.defaultTerms ?? config.footer?.note ?? ''}
                onChange={(e) =>
                  patchConfig({
                    ...config,
                    footer: {
                      ...config.footer,
                      defaultTerms: e.target.value,
                      note: e.target.value,
                      showTerms: true,
                    },
                  })
                }
              />
              <p className="text-xs text-slate-500">
                Used on the PDF when an invoice does not override terms. You can still change terms per invoice.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Header title (simple layouts)</Label>
              <Input
                value={config.header?.title ?? ''}
                onChange={(e) => patchConfig({ ...config, header: { ...config.header, title: e.target.value } })}
              />
            </div>

            <details className="rounded-lg border border-slate-200 p-4">
              <summary className="cursor-pointer text-sm font-medium text-slate-800">Advanced options</summary>
              <div className="mt-4 space-y-4">
                <div className="space-y-1.5">
                  <Label>Editor mode</Label>
                  <Select
                    value={editorMode}
                    onValueChange={(value) => setEditorMode(value === 'UNLAYER' ? 'UNLAYER' : 'SECTION')}
                  >
                    <SelectTrigger>{editorMode}</SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SECTION">Fixed design (recommended)</SelectItem>
                      <SelectItem value="UNLAYER">Custom drag-and-drop (legacy)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {editorMode === 'SECTION' && (
                  <>
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
                    <div className="space-y-3 rounded-lg border border-slate-200 p-4">
                      <p className="text-sm font-medium text-slate-800">Sections (simple OpenPDF layouts)</p>
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
                    {otherPresets.length > 0 && (
                      <div className="space-y-2">
                        <Label>Other section presets</Label>
                        <div className="flex flex-wrap gap-2">
                          {otherPresets.map((preset) => (
                            <Button key={preset.key} variant="outline" size="sm" onClick={() => applyPreset(preset)}>
                              {preset.name}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {editorMode === 'UNLAYER' && (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-500">
                      Legacy Unlayer editor. Prefer fixed designs above for consistent PDFs.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {documentPresets.map((preset) => (
                        <Button
                          key={preset.key}
                          type="button"
                          variant="outline"
                          size="sm"
                          title={preset.description}
                          onClick={() => {
                            const next = getDocumentPreset(preset.key)
                            if (!next) return
                            if (next.documentType) setDocumentType(next.documentType)
                            setTemplateName(next.name)
                            editorRef.current?.loadDesign(next.design)
                            toast.success(`Loaded “${next.name}”`)
                          }}
                        >
                          {preset.name}
                        </Button>
                      ))}
                    </div>
                    <EmailDesignEditor
                      ref={editorRef}
                      minHeight={640}
                      displayMode="email"
                      mergeTags={{
                        logoHtml: { name: 'Organization logo', value: '{{logoHtml}}', sample: '[logo]' },
                        customerDetails: {
                          name: 'Customer details block',
                          value: '{{customerDetails}}',
                          sample: 'Bill to…',
                        },
                        lineItemsHtml: {
                          name: 'All line items table',
                          value: '{{lineItemsHtml}}',
                          sample: 'Items…',
                        },
                        lineItemsHtmlIvonne: {
                          name: 'Ivonne line items (tax % + disc %)',
                          value: '{{lineItemsHtmlIvonne}}',
                          sample: 'Items…',
                        },
                        invoiceNumber: { name: 'Invoice number', value: '{{invoiceNumber}}', sample: 'INV-001' },
                        customerName: { name: 'Customer name', value: '{{customerName}}', sample: 'Acme' },
                        grandTotal: { name: 'Grand total', value: '{{grandTotal}}', sample: '11,800.00' },
                        organizationName: { name: 'Organization', value: '{{organizationName}}', sample: 'FlowLedger' },
                        invoiceDate: { name: 'Invoice date', value: '{{invoiceDate}}', sample: '13-07-2026' },
                        notes: { name: 'Notes', value: '{{notes}}', sample: 'Thank you' },
                        terms: { name: 'Terms', value: '{{terms}}', sample: 'Net 15' },
                      }}
                    />
                  </div>
                )}
              </div>
            </details>

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
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-semibold text-slate-900">Saved templates</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            {templates.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-500">No templates yet.</p>
            ) : (
              templates.map((template) => (
                <div
                  key={template.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-3"
                >
                  <div>
                    <p className="font-medium text-slate-900">{template.templateName}</p>
                    <p className="text-xs text-slate-500">
                      {template.documentType ?? 'SALES_INVOICE'}
                      {template.presetKey ? ` · ${template.presetKey}` : ''}
                      {template.isDefault ? ' · default' : ''}
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
                    <Button variant="outline" size="sm" onClick={() => remove(template.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function defaultTemplateConfig(): InvoiceTemplateConfig {
  return configForFixedDesign('classic-sage')
}

function normalizeTemplateConfig(raw: InvoiceTemplateConfig | string | null | undefined): InvoiceTemplateConfig {
  const base = defaultTemplateConfig()
  if (!raw) return base
  try {
    const parsed = typeof raw === 'string' ? (JSON.parse(raw) as InvoiceTemplateConfig) : raw
    return {
      layoutKey: parsed.layoutKey,
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
  const [taxType, setTaxType] = useState<'GST' | 'IGST' | 'OTHER'>('GST')
  const [rate, setRate] = useState(18)
  const [cgstShare, setCgstShare] = useState(50)
  const [sgstShare, setSgstShare] = useState(50)
  const showSplit = taxType === 'GST'
  const setEqualSplit = () => {
    setCgstShare(50)
    setSgstShare(50)
  }
  const onCgstChange = (value: number) => {
    const next = Math.min(100, Math.max(0, value))
    setCgstShare(next)
    setSgstShare(Number((100 - next).toFixed(4)))
  }
  const onSgstChange = (value: number) => {
    const next = Math.min(100, Math.max(0, value))
    setSgstShare(next)
    setCgstShare(Number((100 - next).toFixed(4)))
  }
  const create = async () => {
    try {
      if (showSplit && Math.abs(cgstShare + sgstShare - 100) > 0.01) {
        toast.error('CGST and SGST shares must sum to 100%')
        return
      }
      await taxRateApi.create({
        name,
        rate,
        taxType,
        splitStrategy:
          taxType === 'IGST' ? 'NO_SPLIT_IGST' : taxType === 'OTHER' ? 'NO_SPLIT_OTHER' : 'PLACE_OF_SUPPLY',
        ...(showSplit
          ? { cgstSharePercent: cgstShare, sgstSharePercent: sgstShare }
          : { cgstSharePercent: 0, sgstSharePercent: 0 }),
      })
      setName('')
      setTaxType('GST')
      setRate(18)
      setEqualSplit()
      await queryClient.invalidateQueries({ queryKey: ['tax-rates'] })
      toast.success('Tax rate created')
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }
  const typeHint =
    taxType === 'GST'
      ? 'GST uses your CGST/SGST split within state, or full IGST across states.'
      : taxType === 'IGST'
        ? 'IGST always applies the full rate; it never splits into CGST/SGST.'
        : 'Other taxes apply the rate as marked, with no GST split.'
  const cgstPreview = showSplit ? ((rate * cgstShare) / 100).toFixed(2) : '0'
  const sgstPreview = showSplit ? ((rate * sgstShare) / 100).toFixed(2) : '0'
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Tax rates</h1>
        <p className="mt-1 text-sm text-slate-500">Manage GST and other tax rates used on documents.</p>
      </div>
      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="grid gap-3 sm:grid-cols-4">
            <Input placeholder="Name" value={name} onChange={(event) => setName(event.target.value)} />
            <Select
              value={taxType}
              onValueChange={(value) => {
                const next = value as 'GST' | 'IGST' | 'OTHER'
                setTaxType(next)
                if (next === 'GST') setEqualSplit()
              }}
            >
              <SelectTrigger>{taxType}</SelectTrigger>
              <SelectContent>
                <SelectItem value="GST">GST (CGST + SGST / IGST)</SelectItem>
                <SelectItem value="IGST">IGST (full rate)</SelectItem>
                <SelectItem value="OTHER">Other (flat rate)</SelectItem>
              </SelectContent>
            </Select>
            <NumberInput placeholder="Rate %" value={rate} onValueChange={setRate} />
            <Button onClick={create}>Add tax rate</Button>
          </div>
          {showSplit ? (
            <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-medium text-slate-700">Split of total tax (intra-state)</p>
                <Button type="button" variant="outline" size="sm" onClick={setEqualSplit}>
                  Equal 50/50
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">CGST share %</Label>
                  <NumberInput value={cgstShare} onValueChange={onCgstChange} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">SGST share %</Label>
                  <NumberInput value={sgstShare} onValueChange={onSgstChange} />
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Preview: {rate}% → CGST {cgstPreview}% + SGST {sgstPreview}% ({cgstShare}/{sgstShare})
              </p>
            </div>
          ) : null}
          <p className="text-xs text-slate-500">{typeHint}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <Table>
            <thead>
              <tr className="border-b">
                <th className="p-3 text-xs text-slate-500">NAME</th>
                <th className="p-3 text-xs text-slate-500">TYPE</th>
                <th className="p-3 text-xs text-slate-500">RATE</th>
                <th className="p-3 text-xs text-slate-500">COMPONENTS</th>
                <th className="p-3 text-xs text-slate-500">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => {
                const cgstSharePct = Number(row.cgstSharePercent ?? 50)
                const sgstSharePct = Number(row.sgstSharePercent ?? 50)
                const cgstComponent =
                  Number(row.cgstRate) || (Number(row.rate) * cgstSharePct) / 100
                const sgstComponent =
                  Number(row.sgstRate) || (Number(row.rate) * sgstSharePct) / 100
                return (
                  <tr key={row.id} className="border-b">
                    <td className="p-3">{row.name}</td>
                    <td className="p-3 font-medium text-slate-800">{row.taxType ?? 'GST'}</td>
                    <td className="p-3">{row.rate}%</td>
                    <td className="p-3 text-xs text-slate-500">
                      {row.taxType === 'IGST' || row.splitStrategy === 'NO_SPLIT_IGST'
                        ? `IGST ${row.rate}%`
                        : row.taxType === 'OTHER' || row.splitStrategy === 'NO_SPLIT_OTHER'
                          ? `Flat ${row.rate}%`
                          : `CGST ${cgstComponent.toFixed(2)}% + SGST ${sgstComponent.toFixed(2)}% (${cgstSharePct}/${sgstSharePct})`}
                    </td>
                    <td className="p-3">{row.active ? 'Active' : 'Inactive'}</td>
                  </tr>
                )
              })}
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
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { data = [], isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => auditApi.list({ size: 50 }),
  })
  const detailQuery = useQuery({
    queryKey: ['audit-logs', selectedId],
    queryFn: () => auditApi.get(selectedId!),
    enabled: !!selectedId,
  })
  const detail = detailQuery.data

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Audit log</h1>
        <p className="mt-1 text-sm text-slate-500">Track important activity across your organization.</p>
      </div>
      <Card>
        <CardContent className="p-4">
          {isLoading ? (
            <p className="py-20 text-center text-sm text-slate-500">Loading audit events…</p>
          ) : data.length ? (
            <Table>
              <thead>
                <tr className="border-b">
                  <th className="p-3 text-left text-xs text-slate-500">ACTION</th>
                  <th className="p-3 text-left text-xs text-slate-500">ENTITY</th>
                  <th className="p-3 text-left text-xs text-slate-500">PERFORMED BY</th>
                  <th className="p-3 text-left text-xs text-slate-500">DATE</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr
                    key={row.id}
                    className="cursor-pointer border-b transition-colors hover:bg-slate-50"
                    onClick={() => setSelectedId(row.id)}
                  >
                    <td className="p-3 font-medium text-slate-900">{formatAuditAction(row.action)}</td>
                    <td className="p-3 text-slate-700">{row.entityType}</td>
                    <td className="p-3 text-slate-700">
                      <div className="font-medium text-slate-900">{row.userName ?? 'System / unknown'}</div>
                      {row.userEmail ? <div className="text-xs text-slate-500">{row.userEmail}</div> : null}
                    </td>
                    <td className="p-3 text-slate-600">{new Date(row.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <p className="py-20 text-center text-sm text-slate-500">
              No audit events to display. Creating invoices, payments, and other changes will appear here.
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedId} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogTitle className="text-lg font-semibold text-slate-900">Audit event details</DialogTitle>
          {detailQuery.isLoading ? (
            <p className="mt-4 text-sm text-slate-500">Loading details…</p>
          ) : detailQuery.isError ? (
            <p className="mt-4 text-sm text-rose-600">{getApiErrorMessage(detailQuery.error)}</p>
          ) : detail ? (
            <div className="mt-4 space-y-5">
              <dl className="grid gap-3 sm:grid-cols-2">
                <DetailField label="Action" value={formatAuditAction(detail.action)} />
                <DetailField label="Entity" value={detail.entityType} />
                <DetailField label="Entity ID" value={detail.entityId ?? '—'} mono />
                <DetailField label="When" value={new Date(detail.createdAt).toLocaleString()} />
                <DetailField
                  label="Performed by"
                  value={
                    detail.userName
                      ? `${detail.userName}${detail.userEmail ? ` (${detail.userEmail})` : ''}`
                      : 'System / unknown'
                  }
                />
                <DetailField label="IP address" value={detail.ipAddress ?? '—'} mono />
              </dl>
              {detail.userAgent ? (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">User agent</p>
                  <p className="mt-1 break-all text-sm text-slate-700">{detail.userAgent}</p>
                </div>
              ) : null}
              <JsonBlock label="Request details" value={detail.newValue} />
              <JsonBlock label="Previous value" value={detail.oldValue} />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function formatAuditAction(action: string) {
  return action.replaceAll('_', ' ')
}

function DetailField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className={`mt-1 text-sm text-slate-900 ${mono ? 'font-mono text-xs break-all' : ''}`}>{value}</dd>
    </div>
  )
}

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  if (value == null || (typeof value === 'object' && value !== null && Object.keys(value as object).length === 0)) {
    return null
  }
  let text: string
  try {
    text = JSON.stringify(value, null, 2)
  } catch {
    text = String(value)
  }
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <pre className="mt-1 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800">
        {text}
      </pre>
    </div>
  )
}
