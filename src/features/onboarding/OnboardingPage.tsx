import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/features/auth/auth'
import { organizationApi, roleApi, userApi, warehouseApi } from '@/services/api'
import { getApiErrorMessage, getApiFieldErrors } from '@/lib/api-error'
import { mergeDefined } from '@/lib/api-payload'
import { generateEntityCode, slugifyName } from '@/lib/entity-code'
import {
  Button,
  Card,
  CardContent,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Switch,
  Table,
} from '@/components/ui'
import type { InviteUserRequest, RoleCode, UpdateOrganizationRequest, UserListResponse } from '@/types/api'

const defaultOrgProfile: UpdateOrganizationRequest = {
  country: 'India',
  currency: 'INR',
  financialYearStart: '04-01',
  invoicePrefix: 'INV',
  invoiceNumberFormat: '{PREFIX}/{FY}/{SEQ:6}',
}

const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/

const businessSchema = z.object({
  name: z.string().min(1, 'Organization name is required'),
  legalName: z.string().optional(),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  website: z.string().optional(),
})

const taxSchema = z
  .object({
    gstRegistered: z.boolean(),
    gstin: z.string().optional(),
    pan: z.string().optional(),
    cin: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.gstRegistered && !data.gstin) {
      ctx.addIssue({ code: 'custom', message: 'GSTIN is required when GST registered', path: ['gstin'] })
    }
    if (data.gstRegistered && data.gstin && !gstinRegex.test(data.gstin)) {
      ctx.addIssue({ code: 'custom', message: 'Invalid GSTIN format', path: ['gstin'] })
    }
  })

const addressSchema = z.object({
  billingAddress: z.string().optional(),
  shippingAddress: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  stateCode: z.string().optional(),
  country: z.string().min(1, 'Country is required'),
})

const financialSchema = z.object({
  currency: z.string().min(1),
  financialYearStart: z.string().min(1),
  paymentTerms: z.string().optional(),
  taxInclusiveDefault: z.boolean(),
  roundOffEnabled: z.boolean(),
})

const invoiceSchema = z.object({
  invoicePrefix: z.string().min(1),
  invoiceNumberFormat: z.string().min(1),
})

const bankSchema = z.object({
  bankName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankIfsc: z.string().optional(),
  bankBranch: z.string().optional(),
  upiId: z.string().optional(),
})

const warehouseSchema = z.object({
  warehouseCode: z.string().optional(),
  warehouseName: z.string().min(1, 'Warehouse name is required'),
  address: z.string().optional(),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  defaultWarehouse: z.boolean(),
})

const inviteSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().optional(),
  email: z.string().email('Enter a valid email'),
  role: z.string().min(1, 'Role is required'),
})

const steps = [
  'Welcome',
  'Business Information',
  'Tax Information',
  'Business Address',
  'Financial Settings',
  'Invoice Setup',
  'Business Branding',
  'Bank Details',
  'Default Warehouse',
  'Invite Your Team',
  'Setup Complete',
]

export function OnboardingPage() {
  const navigate = useNavigate()
  const { refreshOrganization } = useAuth()
  const [step, setStep] = useState(0)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [pendingInvites, setPendingInvites] = useState<UserListResponse[]>([])
  const [roles, setRoles] = useState<{ code: RoleCode; name: string }[]>([])
  const [orgProfile, setOrgProfile] = useState<UpdateOrganizationRequest>(defaultOrgProfile)
  const [summary, setSummary] = useState({
    organization: '',
    gstin: '',
    warehouse: '',
    invoiceFormat: '',
    teamCount: 0,
  })

  const persistOrganization = async (patch: Partial<UpdateOrganizationRequest>) => {
    const merged = mergeDefined(mergeDefined(defaultOrgProfile, orgProfile), patch)
    const saved = await organizationApi.update(merged)
    setOrgProfile(merged)
    await refreshOrganization()
    return saved
  }

  const businessForm = useForm({
    resolver: zodResolver(businessSchema),
    defaultValues: { name: '', legalName: '', email: '', phone: '', website: '' },
  })
  const taxForm = useForm({
    resolver: zodResolver(taxSchema),
    defaultValues: { gstRegistered: false, gstin: '', pan: '', cin: '' },
  })
  const addressForm = useForm({
    resolver: zodResolver(addressSchema),
    defaultValues: { billingAddress: '', shippingAddress: '', city: '', state: '', stateCode: '', country: 'India' },
  })
  const financialForm = useForm({
    resolver: zodResolver(financialSchema),
    defaultValues: {
      currency: 'INR',
      financialYearStart: '04-01',
      paymentTerms: 'Net 30',
      taxInclusiveDefault: false,
      roundOffEnabled: true,
    },
  })
  const invoiceForm = useForm({
    resolver: zodResolver(invoiceSchema),
    defaultValues: { invoicePrefix: 'INV', invoiceNumberFormat: '{PREFIX}/{FY}/{SEQ:6}' },
  })
  const bankForm = useForm({
    resolver: zodResolver(bankSchema),
    defaultValues: { bankName: '', bankAccountNumber: '', bankIfsc: '', bankBranch: '', upiId: '' },
  })
  const warehouseForm = useForm({
    resolver: zodResolver(warehouseSchema),
    defaultValues: {
      warehouseCode: generateEntityCode('Main Warehouse', 'WH'),
      warehouseName: 'Main Warehouse',
      address: '',
      contactPerson: '',
      phone: '',
      defaultWarehouse: true,
    },
  })
  const inviteForm = useForm({
    resolver: zodResolver(inviteSchema),
    defaultValues: { firstName: '', lastName: '', email: '', role: 'SALES_MANAGER' },
  })

  const lastWarehouseSlug = useRef(slugifyName('Main Warehouse'))
  useEffect(() => {
    const subscription = warehouseForm.watch((values, info) => {
      if (info.name && info.name !== 'warehouseName') return
      const source = String(values.warehouseName ?? '').trim()
      if (!source) {
        lastWarehouseSlug.current = ''
        warehouseForm.setValue('warehouseCode', '', { shouldValidate: false })
        return
      }
      const slug = slugifyName(source)
      if (lastWarehouseSlug.current === slug && values.warehouseCode) return
      lastWarehouseSlug.current = slug
      warehouseForm.setValue('warehouseCode', generateEntityCode(source, 'WH'), {
        shouldValidate: false,
      })
    })
    return () => subscription.unsubscribe()
  }, [warehouseForm])

  const progress = Math.round(((step + 1) / steps.length) * 100)

  const loadRoles = async () => {
    if (roles.length) return
    const data = await roleApi.list()
    setRoles(data.map((r) => ({ code: r.code, name: r.name })))
  }

  const next = () => setStep((current) => Math.min(current + 1, steps.length - 1))
  const back = () => setStep((current) => Math.max(current - 1, 0))

  // Server field names may not match every step-specific form shape.
  const handleFormError = (
    error: unknown,
    setError: (name: string, fieldError: { type?: string; message?: string }) => void,
  ) => {
    const fieldErrors = getApiFieldErrors(error)
    if (fieldErrors) {
      for (const [field, message] of Object.entries(fieldErrors)) setError(field, { type: 'server', message })
      return
    }
    toast.error(getApiErrorMessage(error))
  }

  const saveBusiness = businessForm.handleSubmit(async (values) => {
    try {
      await persistOrganization(values)
      next()
    } catch (error) {
      handleFormError(error, (name, fieldError) => businessForm.setError(name as never, fieldError))
    }
  })

  const saveTax = taxForm.handleSubmit(async (values) => {
    try {
      await persistOrganization({
        gstin: values.gstRegistered ? values.gstin : '',
        pan: values.pan,
        cin: values.cin,
      })
      next()
    } catch (error) {
      handleFormError(error, (name, fieldError) => taxForm.setError(name as never, fieldError))
    }
  })

  const saveAddress = addressForm.handleSubmit(async (values) => {
    try {
      await persistOrganization(values)
      next()
    } catch (error) {
      handleFormError(error, (name, fieldError) => addressForm.setError(name as never, fieldError))
    }
  })

  const saveFinancial = financialForm.handleSubmit(async (values) => {
    try {
      await persistOrganization({
        currency: values.currency,
        financialYearStart: values.financialYearStart,
        paymentTerms: values.paymentTerms,
      })
      await organizationApi.updateSettings({
        taxInclusiveDefault: values.taxInclusiveDefault,
        roundOffEnabled: values.roundOffEnabled,
      })
      next()
    } catch (error) {
      handleFormError(error, (name, fieldError) => financialForm.setError(name as never, fieldError))
    }
  })

  const saveInvoice = invoiceForm.handleSubmit(async (values) => {
    try {
      await persistOrganization(values)
      next()
    } catch (error) {
      handleFormError(error, (name, fieldError) => invoiceForm.setError(name as never, fieldError))
    }
  })

  const saveLogo = async () => {
    try {
      if (logoFile) await organizationApi.uploadLogo(logoFile)
      await refreshOrganization()
      next()
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }

  const saveBank = bankForm.handleSubmit(async (values) => {
    try {
      await persistOrganization(values)
      next()
    } catch (error) {
      handleFormError(error, (name, fieldError) => bankForm.setError(name as never, fieldError))
    }
  })

  const saveWarehouse = warehouseForm.handleSubmit(async (values) => {
    try {
      const warehouse = await warehouseApi.create(values)
      await organizationApi.updateSettings({ defaultWarehouseId: warehouse.id })
      setSummary((current) => ({ ...current, warehouse: values.warehouseName }))
      next()
    } catch (error) {
      handleFormError(error, (name, fieldError) => warehouseForm.setError(name as never, fieldError))
    }
  })

  const addInvite = inviteForm.handleSubmit(async (values) => {
    try {
      const invited = await userApi.invite(values as InviteUserRequest)
      setPendingInvites((current) => [...current, invited])
      inviteForm.reset({ firstName: '', lastName: '', email: '', role: values.role })
      toast.success('Invitation sent')
    } catch (error) {
      handleFormError(error, (name, fieldError) => inviteForm.setError(name as never, fieldError))
    }
  })

  const finishOnboarding = async () => {
    try {
      const org = await organizationApi.completeOnboarding()
      setSummary({
        organization: org.name,
        gstin: org.gstin ?? 'Not configured',
        warehouse: summary.warehouse || 'Main Warehouse',
        invoiceFormat: `${org.invoicePrefix ?? 'INV'}/2026-27/000001`,
        teamCount: pendingInvites.length,
      })
      await refreshOrganization()
      setStep(steps.length - 1)
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }

  const gstRegistered = taxForm.watch('gstRegistered')
  const invoicePrefix = invoiceForm.watch('invoicePrefix')

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <LinkBrand />
          <div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-teal-700 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Step {step + 1} of {steps.length}: {steps[step]}
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            {step === 0 && (
              <div className="space-y-4 text-center">
                <h1 className="text-2xl font-semibold text-slate-900">Welcome to FlowLedger</h1>
                <p className="text-sm text-slate-500">
                  Let's set up your business so you can start creating invoices and managing inventory.
                </p>
                <Button className="mt-4" onClick={next}>
                  Continue
                </Button>
              </div>
            )}

            {step === 1 && (
              <form className="space-y-4" onSubmit={saveBusiness}>
                <h2 className="text-xl font-semibold text-slate-900">Business Information</h2>
                <Field label="Organization Name" error={businessForm.formState.errors.name?.message}>
                  <Input {...businessForm.register('name')} />
                </Field>
                <Field label="Legal Name" error={businessForm.formState.errors.legalName?.message}>
                  <Input {...businessForm.register('legalName')} />
                </Field>
                <Field label="Email" error={businessForm.formState.errors.email?.message}>
                  <Input type="email" {...businessForm.register('email')} />
                </Field>
                <Field label="Phone">
                  <Input {...businessForm.register('phone')} />
                </Field>
                <Field label="Website">
                  <Input {...businessForm.register('website')} />
                </Field>
                <Actions onBack={back} submitLabel="Continue" />
              </form>
            )}

            {step === 2 && (
              <form className="space-y-4" onSubmit={saveTax}>
                <h2 className="text-xl font-semibold text-slate-900">Tax Information</h2>
                <label className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <span>GST Registered</span>
                  <Switch
                    checked={gstRegistered}
                    onCheckedChange={(value) => taxForm.setValue('gstRegistered', value)}
                  />
                </label>
                {gstRegistered && (
                  <Field label="GSTIN" error={taxForm.formState.errors.gstin?.message}>
                    <Input {...taxForm.register('gstin')} placeholder="27AAAAA0000A1Z5" />
                  </Field>
                )}
                <Field label="PAN">
                  <Input {...taxForm.register('pan')} />
                </Field>
                <Field label="CIN">
                  <Input {...taxForm.register('cin')} />
                </Field>
                <Actions onBack={back} submitLabel="Continue" />
              </form>
            )}

            {step === 3 && (
              <form className="space-y-4" onSubmit={saveAddress}>
                <h2 className="text-xl font-semibold text-slate-900">Business Address</h2>
                <Field label="Address Line 1">
                  <Input {...addressForm.register('billingAddress')} />
                </Field>
                <Field label="Address Line 2">
                  <Input {...addressForm.register('shippingAddress')} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="City">
                    <Input {...addressForm.register('city')} />
                  </Field>
                  <Field label="State">
                    <Input {...addressForm.register('state')} />
                  </Field>
                  <Field label="State Code">
                    <Input {...addressForm.register('stateCode')} />
                  </Field>
                  <Field label="Country">
                    <Input {...addressForm.register('country')} />
                  </Field>
                </div>
                <Actions onBack={back} submitLabel="Continue" />
              </form>
            )}

            {step === 4 && (
              <form className="space-y-4" onSubmit={saveFinancial}>
                <h2 className="text-xl font-semibold text-slate-900">Financial Settings</h2>
                <Field label="Currency">
                  <Input {...financialForm.register('currency')} />
                </Field>
                <Field label="Financial Year Start">
                  <Input {...financialForm.register('financialYearStart')} placeholder="04-01" />
                </Field>
                <Field label="Default Payment Terms">
                  <Input {...financialForm.register('paymentTerms')} />
                </Field>
                <label className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <span>Tax Inclusive Default</span>
                  <Switch
                    checked={financialForm.watch('taxInclusiveDefault')}
                    onCheckedChange={(value) => financialForm.setValue('taxInclusiveDefault', value)}
                  />
                </label>
                <label className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <span>Round Off Enabled</span>
                  <Switch
                    checked={financialForm.watch('roundOffEnabled')}
                    onCheckedChange={(value) => financialForm.setValue('roundOffEnabled', value)}
                  />
                </label>
                <Actions onBack={back} submitLabel="Continue" />
              </form>
            )}

            {step === 5 && (
              <form className="space-y-4" onSubmit={saveInvoice}>
                <h2 className="text-xl font-semibold text-slate-900">Invoice Setup</h2>
                <Field label="Invoice Prefix">
                  <Input {...invoiceForm.register('invoicePrefix')} />
                </Field>
                <Field label="Invoice Number Format">
                  <Input {...invoiceForm.register('invoiceNumberFormat')} />
                </Field>
                <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                  Example: {invoicePrefix || 'INV'}/2026-27/000001
                </p>
                <Actions onBack={back} submitLabel="Continue" />
              </form>
            )}

            {step === 6 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-slate-900">Business Branding</h2>
                <Field label="Organization Logo">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)}
                  />
                </Field>
                <Actions onBack={back} onContinue={saveLogo} continueLabel="Continue" />
              </div>
            )}

            {step === 7 && (
              <form className="space-y-4" onSubmit={saveBank}>
                <h2 className="text-xl font-semibold text-slate-900">Bank Details</h2>
                <Field label="Account Holder Name">
                  <Input value={businessForm.getValues('legalName') || businessForm.getValues('name')} readOnly />
                </Field>
                <Field label="Bank Name">
                  <Input {...bankForm.register('bankName')} />
                </Field>
                <Field label="Account Number">
                  <Input {...bankForm.register('bankAccountNumber')} />
                </Field>
                <Field label="IFSC">
                  <Input {...bankForm.register('bankIfsc')} />
                </Field>
                <Field label="Branch">
                  <Input {...bankForm.register('bankBranch')} />
                </Field>
                <Field label="UPI ID">
                  <Input {...bankForm.register('upiId')} />
                </Field>
                <Actions onBack={back} submitLabel="Continue" />
              </form>
            )}

            {step === 8 && (
              <form className="space-y-4" onSubmit={saveWarehouse}>
                <h2 className="text-xl font-semibold text-slate-900">Default Warehouse</h2>
                <Field label="Warehouse Name" error={warehouseForm.formState.errors.warehouseName?.message}>
                  <Input {...warehouseForm.register('warehouseName')} />
                </Field>
                <Field label="Warehouse Code" error={warehouseForm.formState.errors.warehouseCode?.message}>
                  <Input {...warehouseForm.register('warehouseCode')} readOnly className="bg-slate-50 text-slate-600" />
                  <p className="mt-1 text-xs text-slate-500">Generated from the warehouse name</p>
                </Field>
                <Field label="Address">
                  <Input {...warehouseForm.register('address')} />
                </Field>
                <Field label="Contact Person">
                  <Input {...warehouseForm.register('contactPerson')} />
                </Field>
                <Field label="Phone">
                  <Input {...warehouseForm.register('phone')} />
                </Field>
                <Actions onBack={back} submitLabel="Continue" />
              </form>
            )}

            {step === 9 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Invite your team</h2>
                  <p className="text-sm text-slate-500">Give employees access to the areas they need.</p>
                </div>
                <form className="grid gap-4 sm:grid-cols-2" onSubmit={addInvite}>
                  <Field label="First Name" error={inviteForm.formState.errors.firstName?.message}>
                    <Input {...inviteForm.register('firstName')} />
                  </Field>
                  <Field label="Last Name">
                    <Input {...inviteForm.register('lastName')} />
                  </Field>
                  <Field label="Email" error={inviteForm.formState.errors.email?.message}>
                    <Input type="email" {...inviteForm.register('email')} />
                  </Field>
                  <Field label="Role" error={inviteForm.formState.errors.role?.message}>
                    <Select
                      value={inviteForm.watch('role')}
                      onValueChange={(value) => inviteForm.setValue('role', value)}
                      onOpenChange={(open) => open && loadRoles()}
                    >
                      <SelectTrigger>
                        {roles.find((r) => r.code === inviteForm.watch('role'))?.name ?? 'Select role'}
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role.code} value={role.code}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <div className="col-span-full">
                    <Button type="submit" variant="outline">
                      Add team member
                    </Button>
                  </div>
                </form>
                {pendingInvites.length > 0 && (
                  <Table>
                    <thead>
                      <tr className="border-b">
                        <th className="p-2 text-xs text-slate-500">NAME</th>
                        <th className="p-2 text-xs text-slate-500">EMAIL</th>
                        <th className="p-2 text-xs text-slate-500">ROLE</th>
                        <th className="p-2 text-xs text-slate-500">STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingInvites.map((user) => (
                        <tr key={user.id} className="border-b">
                          <td className="p-2">
                            {user.firstName} {user.lastName}
                          </td>
                          <td className="p-2">{user.email}</td>
                          <td className="p-2">{user.roles.join(', ')}</td>
                          <td className="p-2">{user.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
                <div className="flex justify-between">
                  <Button variant="outline" onClick={back}>
                    Back
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={finishOnboarding}>
                      Skip for now
                    </Button>
                    <Button onClick={finishOnboarding}>Continue</Button>
                  </div>
                </div>
              </div>
            )}

            {step === 10 && (
              <div className="space-y-6 text-center">
                <CheckCircle2 className="mx-auto size-12 text-teal-700" />
                <h2 className="text-2xl font-semibold text-slate-900">Your FlowLedger workspace is ready</h2>
                <div className="rounded-lg bg-slate-50 p-4 text-left text-sm text-slate-600">
                  <p>
                    <b>Organization:</b> {summary.organization}
                  </p>
                  <p>
                    <b>GST configuration:</b> {summary.gstin}
                  </p>
                  <p>
                    <b>Default warehouse:</b> {summary.warehouse}
                  </p>
                  <p>
                    <b>Invoice format:</b> {summary.invoiceFormat}
                  </p>
                  <p>
                    <b>Team members invited:</b> {summary.teamCount}
                  </p>
                </div>
                <Button onClick={() => navigate('/')}>Go to Dashboard</Button>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button variant="outline" onClick={() => navigate('/products/new')}>
                    Create First Product
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/customers/new')}>
                    Create First Customer
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/sales/invoices/new')}>
                    Create First Invoice
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

function LinkBrand() {
  return (
    <div className="text-2xl font-semibold text-slate-950">
      Flow<span className="text-teal-700">Ledger</span>
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      {children}
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </label>
  )
}

function Actions({
  onBack,
  submitLabel,
  onContinue,
  continueLabel,
}: {
  onBack: () => void
  submitLabel?: string
  onContinue?: () => void
  continueLabel?: string
}) {
  return (
    <div className="flex justify-between pt-2">
      <Button type="button" variant="outline" onClick={onBack}>
        Back
      </Button>
      {onContinue ? (
        <Button type="button" onClick={onContinue}>
          {continueLabel ?? 'Continue'}
        </Button>
      ) : (
        <Button type="submit">{submitLabel ?? 'Continue'}</Button>
      )}
    </div>
  )
}
