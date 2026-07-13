import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Download, Save } from 'lucide-react'
import { toast } from 'sonner'
import { auditApi, organizationApi, reportApi, templateApi } from '@/services/api'
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
  Table,
  Textarea,
} from '@/components/ui'

import { mergeDefined } from '@/lib/api-payload'
import type { UpdateOrganizationRequest } from '@/types/api'

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
    </div>
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
  const { data: templates = [] } = useQuery({ queryKey: ['templates'], queryFn: templateApi.list })
  const [json, setJson] = useState(
    '{\n  "companyName": "FlowLedger",\n  "columns": ["Description", "Qty", "Rate", "Amount"]\n}',
  )
  const save = async () => {
    try {
      await templateApi.create({ templateName: `Template ${templates.length + 1}`, configJson: json })
      await queryClient.invalidateQueries({ queryKey: ['templates'] })
      toast.success('Template saved')
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Invoice template designer</h1>
          <p className="mt-1 text-sm text-slate-500">Configure printable document layouts via backend template APIs.</p>
        </div>
        <Button onClick={save}>
          <Save className="size-4" />
          Save template
        </Button>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-slate-900">Template JSON</h2>
          </CardHeader>
          <CardContent>
            <Textarea
              className="min-h-[420px] font-mono text-xs"
              value={json}
              onChange={(event) => setJson(event.target.value)}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-slate-900">Saved templates</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            {templates.length ? (
              templates.map((template) => (
                <div key={template.id} className="rounded-lg border p-3 text-sm">
                  <b>{template.templateName}</b>
                  <p className="text-slate-500">
                    {template.isDefault ? 'Default template' : (template.presetKey ?? 'Custom template')}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No templates yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
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
