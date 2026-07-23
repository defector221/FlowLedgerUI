import { useEffect, useId, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { organizationApi, warehouseApi } from '@/services/api'
import { applyApiFieldErrors, getApiErrorMessage } from '@/lib/api-error'
import { mergeDefined } from '@/lib/api-payload'
import { useAuth } from '@/features/auth/auth'
import { LogoUploadZone } from '@/features/onboarding/LogoUploadZone'
import {
  Button,
  Input,
  NumberInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from '@/components/ui'
import type { UpdateOrganizationRequest } from '@/types/api'
import {
  SectionCard,
  SettingSwitch,
  SettingsField,
  StickyActionBar,
  previewInvoiceNumber,
} from './settings-ui'

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

type OrgFormValues = z.infer<typeof orgSchema>

type OpsState = {
  inventoryDeductionEvent: string
  taxInclusiveDefault: boolean
  roundOffEnabled: boolean
  defaultWarehouseId: string
  transportEnabled: boolean
  transportRequiredDefault: boolean
  transportAllowOverride: boolean
  transportApprovalRequired: boolean
  transportDefaultFreightPayer: string
  transportDelayThresholdHours: number
  retailEnabled: boolean
}

const TABS = [
  { value: 'general', label: 'General' },
  { value: 'branding', label: 'Branding' },
  { value: 'billing', label: 'Billing & Tax' },
  { value: 'banking', label: 'Banking' },
  { value: 'operations', label: 'Operations' },
  { value: 'transport', label: 'Transport' },
  { value: 'retail', label: 'Retail / POS' },
] as const

const inputClass =
  'text-[15px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30 focus-visible:ring-offset-1'

export function OrganizationSettingsPage() {
  const queryClient = useQueryClient()
  const { refreshOrganization, session, activeOrganization } = useAuth()
  const formId = useId()
  const [tab, setTab] = useState<(typeof TABS)[number]['value']>('general')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [savingLogo, setSavingLogo] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingOps, setSavingOps] = useState(false)

  const orgId = session?.activeOrganization?.id
  const { data: organization } = useQuery({
    queryKey: ['organization', 'current', orgId],
    queryFn: organizationApi.current,
    enabled: !!orgId,
  })
  const { data: warehouses = [] } = useQuery({ queryKey: ['warehouses'], queryFn: warehouseApi.list })
  const { data: settings } = useQuery({
    queryKey: ['organization', 'ops-settings'],
    queryFn: organizationApi.settings,
  })
  const { data: existingLogoUrl } = useQuery({
    queryKey: ['organization', 'logo', organization?.logoObjectKey],
    queryFn: () => organizationApi.fetchLogoObjectUrl(),
    enabled: !!organization?.logoObjectKey,
    staleTime: 5 * 60_000,
  })

  useEffect(() => {
    return () => {
      if (existingLogoUrl) URL.revokeObjectURL(existingLogoUrl)
    }
  }, [existingLogoUrl])

  const form = useForm<OrgFormValues>({
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

  const [ops, setOps] = useState<OpsState>({
    inventoryDeductionEvent: 'INVOICE_CONFIRM',
    taxInclusiveDefault: false,
    roundOffEnabled: true,
    defaultWarehouseId: '',
    transportEnabled: false,
    transportRequiredDefault: false,
    transportAllowOverride: true,
    transportApprovalRequired: false,
    transportDefaultFreightPayer: 'SENDER',
    transportDelayThresholdHours: 24,
    retailEnabled: false,
  })
  const [opsBaseline, setOpsBaseline] = useState<OpsState | null>(null)

  useEffect(() => {
    if (!settings) return
    const next: OpsState = {
      inventoryDeductionEvent: settings.inventoryDeductionEvent ?? 'INVOICE_CONFIRM',
      taxInclusiveDefault: !!settings.taxInclusiveDefault,
      roundOffEnabled: settings.roundOffEnabled !== false,
      defaultWarehouseId: settings.defaultWarehouseId ?? '',
      transportEnabled: !!settings.transportEnabled,
      transportRequiredDefault: !!settings.transportRequiredDefault,
      transportAllowOverride: settings.transportAllowOverride !== false,
      transportApprovalRequired: !!settings.transportApprovalRequired,
      transportDefaultFreightPayer: settings.transportDefaultFreightPayer ?? 'SENDER',
      transportDelayThresholdHours: settings.transportDelayThresholdHours ?? 24,
      retailEnabled: !!settings.retailEnabled,
    }
    setOps(next)
    setOpsBaseline(next)
  }, [settings])

  const patchOps = <K extends keyof OpsState>(key: K, value: OpsState[K]) => {
    setOps((prev) => ({ ...prev, [key]: value }))
  }

  const profileDirty = form.formState.isDirty
  const opsDirty = useMemo(() => {
    if (!opsBaseline) return false
    return JSON.stringify(ops) !== JSON.stringify(opsBaseline)
  }, [ops, opsBaseline])
  const logoDirty = !!logoFile
  const dirty = profileDirty || opsDirty || logoDirty
  const saving = savingProfile || savingOps || savingLogo

  const invoicePreview = previewInvoiceNumber(form.watch('invoicePrefix') || 'INV', form.watch('invoiceNumberFormat') || '')

  const updatedHint = useMemo(() => {
    const who =
      `${session?.user.firstName ?? ''} ${session?.user.lastName ?? ''}`.trim() ||
      activeOrganization?.organizationName ||
      'Admin'
    return `Signed in as ${who}`
  }, [session, activeOrganization])

  const saveProfile = form.handleSubmit(async (values) => {
    setSavingProfile(true)
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
      await queryClient.invalidateQueries({ queryKey: ['organization', 'current'] })
      form.reset(values)
      toast.success('Organization updated')
    } catch (error) {
      if (!applyApiFieldErrors(error, form.setError)) toast.error(getApiErrorMessage(error))
    } finally {
      setSavingProfile(false)
    }
  })

  const saveOps = async () => {
    setSavingOps(true)
    try {
      await organizationApi.updateSettings({
        inventoryDeductionEvent: ops.inventoryDeductionEvent,
        taxInclusiveDefault: ops.taxInclusiveDefault,
        roundOffEnabled: ops.roundOffEnabled,
        defaultWarehouseId: ops.defaultWarehouseId || undefined,
        transportEnabled: ops.transportEnabled,
        transportRequiredDefault: ops.transportRequiredDefault,
        transportAllowOverride: ops.transportAllowOverride,
        transportApprovalRequired: ops.transportApprovalRequired,
        transportDefaultFreightPayer: ops.transportDefaultFreightPayer as 'SENDER' | 'RECEIVER' | 'THIRD_PARTY',
        transportDelayThresholdHours: ops.transportDelayThresholdHours,
        retailEnabled: ops.retailEnabled,
      })
      await queryClient.invalidateQueries({ queryKey: ['organization', 'ops-settings'] })
      setOpsBaseline(ops)
      toast.success('Operational settings saved')
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    } finally {
      setSavingOps(false)
    }
  }

  const saveLogo = async () => {
    if (!logoFile) {
      toast.message('Choose a logo file first')
      return
    }
    setSavingLogo(true)
    try {
      await organizationApi.uploadLogo(logoFile)
      setLogoFile(null)
      await refreshOrganization()
      await queryClient.invalidateQueries({ queryKey: ['organization', 'current'] })
      await queryClient.invalidateQueries({ queryKey: ['organization', 'logo'] })
      toast.success('Logo updated')
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    } finally {
      setSavingLogo(false)
    }
  }

  const saveChanges = async () => {
    if (logoDirty) await saveLogo()
    if (profileDirty) await saveProfile()
    if (opsDirty) await saveOps()
  }

  const resetChanges = () => {
    form.reset()
    if (opsBaseline) setOps(opsBaseline)
    setLogoFile(null)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-28">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-[family-name:var(--font-display)] text-[2rem] font-semibold tracking-tight text-slate-900">
            Organization Settings
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-500">
            Manage organization profile, branding, invoicing and operational preferences.
          </p>
          <p className="mt-2 text-xs text-slate-400">{updatedHint}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {dirty ? (
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
              Unsaved changes
            </span>
          ) : null}
          <Button type="button" disabled={!dirty || saving} loading={saving} onClick={() => void saveChanges()}>
            Save Changes
          </Button>
        </div>
      </header>

      <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)} className="space-y-6">
        <div className="overflow-x-auto pb-1">
          <TabsList className="min-w-max bg-slate-100/90 p-1">
            {TABS.map((item) => (
              <TabsTrigger key={item.value} value={item.value} className="px-3.5 py-2 text-sm">
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <form id={formId} className="space-y-6" onSubmit={(e) => void saveProfile(e)}>
          <TabsContent value="general" className="mt-0 focus-visible:outline-none data-[state=inactive]:hidden">
            <SectionCard title="Business Information" description="Basic details used across invoices and reports.">
              <div className="grid gap-4 sm:grid-cols-2">
                <SettingsField label="Organization Name" htmlFor="org-name" hint="Displayed on invoices." error={form.formState.errors.name?.message}>
                  <Input id="org-name" className={inputClass} {...form.register('name')} />
                </SettingsField>
                <SettingsField label="Legal Name" htmlFor="org-legal" hint="Registered legal entity name.">
                  <Input id="org-legal" className={inputClass} {...form.register('legalName')} />
                </SettingsField>
                <SettingsField label="GSTIN" htmlFor="org-gstin">
                  <Input id="org-gstin" className={inputClass} {...form.register('gstin')} />
                </SettingsField>
                <SettingsField label="PAN" htmlFor="org-pan">
                  <Input id="org-pan" className={inputClass} {...form.register('pan')} />
                </SettingsField>
                <SettingsField label="CIN" htmlFor="org-cin">
                  <Input id="org-cin" className={inputClass} {...form.register('cin')} />
                </SettingsField>
                <SettingsField label="Business Email" htmlFor="org-email" error={form.formState.errors.email?.message}>
                  <Input id="org-email" type="email" className={inputClass} {...form.register('email')} />
                </SettingsField>
                <SettingsField label="Phone Number" htmlFor="org-phone">
                  <Input id="org-phone" className={inputClass} {...form.register('phone')} />
                </SettingsField>
                <SettingsField label="Website" htmlFor="org-website">
                  <Input id="org-website" className={inputClass} {...form.register('website')} />
                </SettingsField>
                <SettingsField label="Billing Address" htmlFor="org-billing" className="sm:col-span-2">
                  <Textarea id="org-billing" rows={3} className={inputClass} {...form.register('billingAddress')} />
                </SettingsField>
                <SettingsField label="Shipping Address" htmlFor="org-shipping" className="sm:col-span-2">
                  <Textarea id="org-shipping" rows={3} className={inputClass} {...form.register('shippingAddress')} />
                </SettingsField>
                <SettingsField label="City" htmlFor="org-city">
                  <Input id="org-city" className={inputClass} {...form.register('city')} />
                </SettingsField>
                <SettingsField label="State" htmlFor="org-state">
                  <Input id="org-state" className={inputClass} {...form.register('state')} />
                </SettingsField>
                <SettingsField label="Country" htmlFor="org-country" error={form.formState.errors.country?.message}>
                  <Input id="org-country" className={inputClass} {...form.register('country')} />
                </SettingsField>
                <SettingsField label="State Code" htmlFor="org-state-code" hint="GST state code, e.g. 27.">
                  <Input id="org-state-code" className={inputClass} {...form.register('stateCode')} />
                </SettingsField>
              </div>
            </SectionCard>
          </TabsContent>

          <TabsContent value="branding" className="mt-0 focus-visible:outline-none data-[state=inactive]:hidden">
            <SectionCard title="Brand Logo" description="Appears on invoices, PDFs, and customer-facing documents.">
              <div className="mx-auto max-w-lg space-y-4">
                <LogoUploadZone
                  file={logoFile}
                  onChange={setLogoFile}
                  existingUrl={existingLogoUrl}
                  pendingHint="Click Replace Logo to upload"
                  className="[&>div]:min-h-[12rem]"
                />
                <p className="text-center text-xs text-slate-500">
                  Supported formats: PNG, JPG, SVG, WebP · Maximum size 2 MB
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button type="button" disabled={!logoFile || savingLogo} loading={savingLogo} onClick={() => void saveLogo()}>
                    Replace Logo
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!logoFile}
                    onClick={() => setLogoFile(null)}
                  >
                    Remove Logo
                  </Button>
                </div>
              </div>
            </SectionCard>
          </TabsContent>

          <TabsContent value="billing" className="mt-0 focus-visible:outline-none data-[state=inactive]:hidden">
            <SectionCard title="Financial Preferences" description="Currency, financial year, and invoice numbering.">
              <div className="grid gap-4 sm:grid-cols-2">
                <SettingsField label="Currency" hint={`Shown on invoices as ${form.watch('currency') || 'INR'}.`}>
                  <Controller
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                      <Select value={field.value || 'INR'} onValueChange={(value) => field.onChange(value)}>
                        <SelectTrigger className={inputClass}>{field.value || 'INR'}</SelectTrigger>
                        <SelectContent>
                          {['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'AUD', 'CAD'].map((code) => (
                            <SelectItem key={code} value={code}>
                              {code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </SettingsField>
                <SettingsField
                  label="Financial Year"
                  htmlFor="org-fy"
                  hint="Start date as MM-DD (e.g. 04-01)."
                  error={form.formState.errors.financialYearStart?.message}
                >
                  <Input id="org-fy" className={inputClass} {...form.register('financialYearStart')} />
                </SettingsField>
                <SettingsField
                  label="Invoice Prefix"
                  htmlFor="org-prefix"
                  error={form.formState.errors.invoicePrefix?.message}
                >
                  <Input id="org-prefix" className={inputClass} {...form.register('invoicePrefix')} />
                </SettingsField>
                <SettingsField
                  label="Invoice Number Format"
                  htmlFor="org-format"
                  className="sm:col-span-2"
                  hint="Use placeholders: {PREFIX}, {FY}, {SEQ} or {SEQ:6}."
                  error={form.formState.errors.invoiceNumberFormat?.message}
                >
                  <Input id="org-format" className={inputClass} {...form.register('invoiceNumberFormat')} />
                </SettingsField>
                <div className="sm:col-span-2 rounded-xl border border-teal-100 bg-teal-50/60 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-teal-800/70">Preview</p>
                  <p className="mt-1 font-[family-name:var(--font-display)] text-lg font-semibold tabular-nums text-teal-900">
                    {invoicePreview}
                  </p>
                  <p className="mt-1 text-xs text-teal-800/70">Example · updates as you edit prefix and format</p>
                </div>
              </div>
            </SectionCard>
          </TabsContent>

          <TabsContent value="banking" className="mt-0 focus-visible:outline-none data-[state=inactive]:hidden">
            <SectionCard title="Bank Details" description="Printed on invoices to help customers pay you.">
              <div className="grid gap-4 sm:grid-cols-2">
                <SettingsField label="Bank Name" htmlFor="org-bank">
                  <Input id="org-bank" className={inputClass} {...form.register('bankName')} />
                </SettingsField>
                <SettingsField label="Account Number" htmlFor="org-account">
                  <Input id="org-account" className={inputClass} {...form.register('bankAccountNumber')} />
                </SettingsField>
                <SettingsField label="Branch" htmlFor="org-branch">
                  <Input id="org-branch" className={inputClass} {...form.register('bankBranch')} />
                </SettingsField>
                <SettingsField label="IFSC" htmlFor="org-ifsc">
                  <Input id="org-ifsc" className={inputClass} {...form.register('bankIfsc')} />
                </SettingsField>
                <SettingsField label="UPI ID" htmlFor="org-upi">
                  <Input id="org-upi" className={inputClass} {...form.register('upiId')} />
                </SettingsField>
                <SettingsField label="Payment Terms" htmlFor="org-terms" className="sm:col-span-2" hint="e.g. Net 15, Due on receipt.">
                  <Input id="org-terms" className={inputClass} {...form.register('paymentTerms')} />
                </SettingsField>
              </div>
            </SectionCard>
          </TabsContent>
        </form>

        <TabsContent value="operations" className="mt-0 focus-visible:outline-none data-[state=inactive]:hidden">
          <SectionCard title="Operational Preferences" description="How inventory and invoices behave by default.">
            <div className="grid gap-4 sm:grid-cols-2">
              <SettingsField label="Inventory Deduction Event" hint="When stock is reduced for sales.">
                <Select
                  value={ops.inventoryDeductionEvent}
                  onValueChange={(value) => patchOps('inventoryDeductionEvent', value)}
                >
                  <SelectTrigger className={inputClass}>{ops.inventoryDeductionEvent}</SelectTrigger>
                  <SelectContent>
                    {['INVOICE_CONFIRM', 'DELIVERY_CHALLAN', 'SALES_ORDER'].map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SettingsField>
              <SettingsField label="Default Warehouse" hint="Used when creating sales documents.">
                <Select value={ops.defaultWarehouseId} onValueChange={(value) => patchOps('defaultWarehouseId', value)}>
                  <SelectTrigger className={inputClass}>
                    {warehouses.find((w) => w.id === ops.defaultWarehouseId)?.warehouseName ?? 'Select warehouse'}
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((warehouse) => (
                      <SelectItem key={warehouse.id} value={warehouse.id}>
                        {warehouse.warehouseName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SettingsField>
              <div className="space-y-3 sm:col-span-2">
                <SettingSwitch
                  title="Tax Inclusive"
                  description="Treat rates as tax-inclusive by default on new documents."
                  checked={ops.taxInclusiveDefault}
                  onCheckedChange={(checked) => patchOps('taxInclusiveDefault', checked)}
                />
                <SettingSwitch
                  title="Enable Round Off"
                  description="Automatically round invoice totals according to configured precision."
                  checked={ops.roundOffEnabled}
                  onCheckedChange={(checked) => patchOps('roundOffEnabled', checked)}
                />
              </div>
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="transport" className="mt-0 focus-visible:outline-none data-[state=inactive]:hidden">
          <SectionCard
            title="Transport Management"
            description="Configure shipment requirements and logistics workflow."
          >
            <div className="space-y-3">
              <SettingSwitch
                title="Enable Transport Module"
                description="Enable shipment, LR and logistics workflow."
                checked={ops.transportEnabled}
                onCheckedChange={(checked) => patchOps('transportEnabled', checked)}
              />
              <SettingSwitch
                title="Require Transport by Default"
                description="Automatically require transport information on delivery documents."
                checked={ops.transportRequiredDefault}
                onCheckedChange={(checked) => patchOps('transportRequiredDefault', checked)}
              />
              <SettingSwitch
                title="Allow Per Document Override"
                description="Allow transport requirements to be overridden on individual documents."
                checked={ops.transportAllowOverride}
                onCheckedChange={(checked) => patchOps('transportAllowOverride', checked)}
              />
              <SettingSwitch
                title="Require Shipment Approval"
                description="Require manager approval before shipment dispatch."
                checked={ops.transportApprovalRequired}
                onCheckedChange={(checked) => patchOps('transportApprovalRequired', checked)}
              />
            </div>
            <div className="mt-5 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
              <SettingsField label="Default Freight Payer">
                <Select
                  value={ops.transportDefaultFreightPayer}
                  onValueChange={(value) => patchOps('transportDefaultFreightPayer', value)}
                >
                  <SelectTrigger className={inputClass}>{ops.transportDefaultFreightPayer}</SelectTrigger>
                  <SelectContent>
                    {['SENDER', 'RECEIVER', 'THIRD_PARTY'].map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SettingsField>
              <SettingsField label="Delay Threshold" hint="Hours before a shipment is considered delayed.">
                <div className="flex items-center gap-2">
                  <NumberInput
                    value={ops.transportDelayThresholdHours}
                    onValueChange={(value) => patchOps('transportDelayThresholdHours', value)}
                    className={inputClass}
                  />
                  <span className="text-sm text-slate-500">Hours</span>
                </div>
              </SettingsField>
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="retail" className="mt-0 focus-visible:outline-none data-[state=inactive]:hidden">
          <SectionCard title="Retail & POS" description="Point of sale, stores, shifts, and retail operations.">
            <SettingSwitch
              title="Enable Retail Module"
              description="Enable POS, stores and retail operations for this organization."
              checked={ops.retailEnabled}
              onCheckedChange={(checked) => patchOps('retailEnabled', checked)}
            />
          </SectionCard>
        </TabsContent>
      </Tabs>

      <StickyActionBar dirty={dirty} saving={saving} onReset={resetChanges} onSave={() => void saveChanges()} />
    </div>
  )
}
