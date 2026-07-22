import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { leadApi } from '@/services/api'
import { getApiErrorMessage } from '@/lib/api-error'
import { PageHeader, EmptyState, ListPageShell, ListTablePanel, ListPanelMessage } from '@/components/layout/PageChrome'
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

const leadSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().optional(),
  company: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  source: z.string().optional(),
  status: z.string().min(1),
  notes: z.string().optional(),
})

export function LeadsListPage() {
  const { data = [], isLoading } = useQuery({ queryKey: ['leads'], queryFn: () => leadApi.list({ size: 100 }) })
  return (
    <ListPageShell
      header={
        <PageHeader
          title="Leads"
          subtitle="Track prospects and convert them to customers."
          actions={
            <Button asChild>
              <Link to="/leads/new">
                <Plus className="size-4" />
                New lead
              </Link>
            </Button>
          }
        />
      }
    >
      <ListTablePanel>
        {isLoading ? (
          <ListPanelMessage>
            <EmptyState title="Loading…" />
          </ListPanelMessage>
        ) : (
          <Table fill stickyHeader>
            <thead>
              <tr className="border-b">
                <th className="p-3 text-xs text-slate-500">NAME</th>
                <th className="p-3 text-xs text-slate-500">COMPANY</th>
                <th className="p-3 text-xs text-slate-500">EMAIL</th>
                <th className="p-3 text-xs text-slate-500">PHONE</th>
                <th className="p-3 text-xs text-slate-500">SOURCE</th>
                <th className="p-3 text-xs text-slate-500">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {data.length ? (
                data.map((lead) => (
                  <tr key={String(lead.id)} className="border-b">
                    <td className="p-3">
                      <Link className="text-teal-700 hover:underline" to={`/leads/${String(lead.id)}`}>
                        {String(lead.leadName ?? '—')}
                      </Link>
                    </td>
                    <td className="p-3">{String(lead.companyName ?? '—')}</td>
                    <td className="p-3">{String(lead.email ?? '—')}</td>
                    <td className="p-3">{String(lead.phone ?? '—')}</td>
                    <td className="p-3">{String(lead.source ?? '—')}</td>
                    <td className="p-3">
                      <Badge>{String(lead.status ?? 'NEW')}</Badge>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-sm text-slate-500">
                    No leads found.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        )}
      </ListTablePanel>
    </ListPageShell>
  )
}

export function LeadCreatePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const form = useForm({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      company: '',
      email: '',
      phone: '',
      source: 'WEBSITE',
      status: 'NEW',
      notes: '',
    },
  })

  const save = form.handleSubmit(async (values) => {
    try {
      const leadName = [values.firstName, values.lastName].filter(Boolean).join(' ').trim()
      const lead = await leadApi.create({
        leadName,
        companyName: values.company || undefined,
        email: values.email || undefined,
        phone: values.phone || undefined,
        source: values.source || undefined,
        status: values.status,
        notes: values.notes || undefined,
      })
      await queryClient.invalidateQueries({ queryKey: ['leads'] })
      toast.success('Lead created')
      navigate(`/leads/${String(lead.id)}`)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to create lead'))
    }
  })

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="New lead"
        subtitle="Capture prospect details to follow up later."
        actions={<Button onClick={save}>Save lead</Button>}
      />
      <Card>
        <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>First name</Label>
            <Input {...form.register('firstName')} />
          </div>
          <div className="space-y-1.5">
            <Label>Last name</Label>
            <Input {...form.register('lastName')} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Company</Label>
            <Input {...form.register('company')} />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" {...form.register('email')} />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input {...form.register('phone')} />
          </div>
          <div className="space-y-1.5">
            <Label>Source</Label>
            <Select value={form.watch('source')} onValueChange={(value) => form.setValue('source', value)}>
              <SelectTrigger>{form.watch('source')}</SelectTrigger>
              <SelectContent>
                {['WEBSITE', 'REFERRAL', 'COLD_CALL', 'TRADE_SHOW', 'OTHER'].map((source) => (
                  <SelectItem key={source} value={source}>
                    {source}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.watch('status')} onValueChange={(value) => form.setValue('status', value)}>
              <SelectTrigger>{form.watch('status')}</SelectTrigger>
              <SelectContent>
                {['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST'].map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Notes</Label>
            <Textarea {...form.register('notes')} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function LeadDetailPage() {
  const { id = '' } = useParams()
  const queryClient = useQueryClient()
  const [followUpAt, setFollowUpAt] = useState('')
  const [followUpNotes, setFollowUpNotes] = useState('')
  const { data: lead, isLoading } = useQuery({
    queryKey: ['leads', id],
    queryFn: () => leadApi.get(id),
    enabled: !!id,
  })
  const { data: followUps = [] } = useQuery({
    queryKey: ['leads', id, 'follow-ups'],
    queryFn: () => leadApi.listFollowUps(id),
    enabled: !!id,
  })

  const addFollowUp = async () => {
    try {
      if (!followUpAt) throw new Error('Pick a follow-up date/time')
      await leadApi.addFollowUp(id, {
        followUpAt: new Date(followUpAt).toISOString(),
        notes: followUpNotes || undefined,
      })
      setFollowUpAt('')
      setFollowUpNotes('')
      await queryClient.invalidateQueries({ queryKey: ['leads', id, 'follow-ups'] })
      toast.success('Follow-up added')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to add follow-up'))
    }
  }

  const completeFollowUp = async (followUpId: string) => {
    try {
      await leadApi.completeFollowUp(id, followUpId)
      await queryClient.invalidateQueries({ queryKey: ['leads', id, 'follow-ups'] })
      toast.success('Follow-up completed')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to complete follow-up'))
    }
  }

  const convert = async () => {
    try {
      await leadApi.convert(id)
      await queryClient.invalidateQueries({ queryKey: ['leads', id] })
      await queryClient.invalidateQueries({ queryKey: ['leads'] })
      toast.success('Lead converted to customer')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to convert lead'))
    }
  }

  if (isLoading || !lead) {
    return <p className="py-20 text-center text-sm text-slate-500">Loading lead…</p>
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={String(lead.leadName)}
        subtitle={`${String(lead.companyName ?? 'No company')} · ${String(lead.email ?? 'No email')} · ${String(lead.phone ?? 'No phone')}`}
        actions={
          <>
            <Badge>{String(lead.status)}</Badge>
            {!lead.convertedCustomerId ? <Button onClick={convert}>Convert to customer</Button> : null}
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-slate-900">Details</h2>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-slate-500">Source:</span> {String(lead.source ?? '—')}
            </p>
            <p>
              <span className="text-slate-500">Estimated value:</span> {String(lead.estimatedValue ?? '—')}
            </p>
            <p>
              <span className="text-slate-500">Notes:</span> {String(lead.notes ?? '—')}
            </p>
            {lead.convertedCustomerId ? (
              <p>
                <span className="text-slate-500">Converted customer:</span> {String(lead.convertedCustomerId)}
              </p>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-slate-900">Add follow-up</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>When</Label>
              <Input type="datetime-local" value={followUpAt} onChange={(event) => setFollowUpAt(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={followUpNotes} onChange={(event) => setFollowUpNotes(event.target.value)} />
            </div>
            <Button onClick={addFollowUp}>Schedule follow-up</Button>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-slate-900">Follow-ups</h2>
        </CardHeader>
        <CardContent className="p-4">
          <Table>
            <thead>
              <tr className="border-b">
                <th className="p-3 text-xs text-slate-500">WHEN</th>
                <th className="p-3 text-xs text-slate-500">NOTES</th>
                <th className="p-3 text-xs text-slate-500">STATUS</th>
                <th className="p-3 text-xs text-slate-500">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {followUps.length ? (
                followUps.map((item) => (
                  <tr key={String(item.id)} className="border-b">
                    <td className="p-3">
                      {item.followUpAt ? new Date(String(item.followUpAt)).toLocaleString() : '—'}
                    </td>
                    <td className="p-3">{String(item.notes ?? '—')}</td>
                    <td className="p-3">
                      <Badge>{String(item.status ?? 'PENDING')}</Badge>
                    </td>
                    <td className="p-3">
                      {String(item.status) !== 'COMPLETED' && (
                        <Button variant="outline" size="sm" onClick={() => completeFollowUp(String(item.id))}>
                          Complete
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-sm text-slate-500">
                    No follow-ups yet.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
