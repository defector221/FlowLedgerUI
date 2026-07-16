import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { EmailDesignEditor, type EmailDesignEditorHandle } from '@/components/email/EmailDesignEditor'
import { PageHeader } from '@/components/layout/PageChrome'
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Table,
} from '@/components/ui'
import { getApiErrorMessage } from '@/lib/api-error'
import { emailTemplateApi, marketingApi } from '@/services/api'
import { emailPresets, getEmailPreset } from '@/lib/unlayer-presets'

const leadMergeTags = {
  firstName: { name: 'First name', value: '{{firstName}}', sample: 'Asha' },
  leadName: { name: 'Lead name', value: '{{leadName}}', sample: 'Asha Patel' },
  company: { name: 'Company', value: '{{company}}', sample: 'Acme Traders' },
  email: { name: 'Email', value: '{{email}}', sample: 'asha@example.com' },
  phone: { name: 'Phone', value: '{{phone}}', sample: '+91 98765 43210' },
}

export function EmailTemplatesPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['email-templates'],
    queryFn: emailTemplateApi.list,
  })

  const remove = async (id: string) => {
    try {
      await emailTemplateApi.delete(id)
      toast.success('Template deleted')
      await queryClient.invalidateQueries({ queryKey: ['email-templates'] })
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Email templates"
        subtitle="Drag-and-drop designs for nurture sequences and blast campaigns. Start from a professional sales, quotation, or reminder layout."
        actions={
          <Button type="button" onClick={() => navigate('/marketing/email-templates/new')}>
            <Plus className="size-4" />
            New template
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {emailPresets.map((preset) => (
          <button
            key={preset.key}
            type="button"
            className="rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-teal-300 hover:shadow-sm"
            onClick={() => navigate(`/marketing/email-templates/new?preset=${preset.key}`)}
          >
            <p className="font-medium text-slate-900">{preset.name}</p>
            <p className="mt-1 text-xs text-slate-500">{preset.description}</p>
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-4">
          {isLoading ? (
            <p className="py-16 text-center text-sm text-slate-500">Loading…</p>
          ) : (
            <Table>
              <thead>
                <tr className="border-b">
                  <th className="p-3 text-xs text-slate-500">NAME</th>
                  <th className="p-3 text-xs text-slate-500">SUBJECT</th>
                  <th className="p-3 text-xs text-slate-500">UPDATED</th>
                  <th className="p-3 text-xs text-slate-500" />
                </tr>
              </thead>
              <tbody>
                {templates.length ? (
                  templates.map((template) => (
                    <tr key={template.id} className="border-b">
                      <td className="p-3">
                        <Link
                          className="font-medium text-teal-700 hover:underline"
                          to={`/marketing/email-templates/${template.id}`}
                        >
                          {template.name}
                        </Link>
                      </td>
                      <td className="p-3 text-sm text-slate-600">{template.subject || '—'}</td>
                      <td className="p-3 text-sm text-slate-500">
                        {template.updatedAt ? new Date(template.updatedAt).toLocaleString() : '—'}
                      </td>
                      <td className="p-3 text-right">
                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(template.id)}>
                          <Trash2 className="size-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-16 text-center text-sm text-slate-500">
                      No email templates yet.
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

export function EmailTemplateEditorPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const isNew = !id || id === 'new'
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const editorRef = useRef<EmailDesignEditorHandle>(null)
  const [name, setName] = useState('Welcome email')
  const [subject, setSubject] = useState('Thanks for connecting with us')
  const [saving, setSaving] = useState(false)
  const [editorReady, setEditorReady] = useState(false)
  const presetKey = searchParams.get('preset') || 'sales-welcome'

  const { data: existing } = useQuery({
    queryKey: ['email-templates', id],
    queryFn: () => emailTemplateApi.get(id!),
    enabled: !isNew,
  })

  useEffect(() => {
    if (!existing || !editorReady) return
    setName(existing.name)
    setSubject(existing.subject)
    if (existing.designJson && typeof existing.designJson === 'object') {
      editorRef.current?.loadDesign(existing.designJson as Record<string, unknown>)
    }
  }, [existing, editorReady])

  useEffect(() => {
    if (!isNew || !editorReady || existing) return
    const preset = getEmailPreset(presetKey) ?? getEmailPreset('sales-welcome')
    if (!preset) return
    setName(preset.name)
    setSubject(preset.subject ?? '')
    editorRef.current?.loadDesign(preset.design)
  }, [isNew, editorReady, existing, presetKey])

  const applyPreset = (key: string) => {
    const preset = getEmailPreset(key)
    if (!preset) return
    setName(preset.name)
    setSubject(preset.subject ?? '')
    editorRef.current?.loadDesign(preset.design)
    toast.success(`Loaded “${preset.name}” — customise in the editor, then save`)
  }

  const save = async () => {
    try {
      setSaving(true)
      const exported = await editorRef.current!.exportHtml()
      const payload = {
        name: name.trim() || 'Untitled template',
        subject: subject.trim(),
        designJson: exported.design,
        html: exported.html,
      }
      if (isNew) {
        const created = await emailTemplateApi.create(payload)
        toast.success('Template saved')
        await queryClient.invalidateQueries({ queryKey: ['email-templates'] })
        navigate(`/marketing/email-templates/${created.id}`, { replace: true })
      } else {
        await emailTemplateApi.update(id!, payload)
        toast.success('Template updated')
        await queryClient.invalidateQueries({ queryKey: ['email-templates'] })
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid flex-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Template name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => navigate('/marketing/email-templates')}>
            Back
          </Button>
          <Button type="button" disabled={saving} onClick={save}>
            {saving ? 'Saving…' : 'Save template'}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div>
            <p className="text-sm font-medium text-slate-800">Professional starters</p>
            <p className="text-xs text-slate-500">
              Load a polished Unlayer layout, then tweak colours, copy, and merge tags ({'{{firstName}}'},{' '}
              {'{{company}}'}, …).
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {emailPresets.map((preset) => (
              <Button
                key={preset.key}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyPreset(preset.key)}
              >
                {preset.name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <EmailDesignEditor ref={editorRef} mergeTags={leadMergeTags} onReady={() => setEditorReady(true)} />
    </div>
  )
}

export function MarketingCampaignsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['marketing-campaigns'],
    queryFn: marketingApi.listCampaigns,
  })
  const { data: templates = [] } = useQuery({
    queryKey: ['email-templates'],
    queryFn: emailTemplateApi.list,
  })

  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [audienceType, setAudienceType] = useState('LEAD')
  const [emailTemplateId, setEmailTemplateId] = useState('')
  const [leadStatus, setLeadStatus] = useState('')
  const [search, setSearch] = useState('')
  const [previewCount, setPreviewCount] = useState<number | null>(null)

  const payload = () => ({
    name: name.trim() || 'Untitled campaign',
    audienceType,
    emailTemplateId,
    filterJson: {
      leadStatus: leadStatus || undefined,
      search: search || undefined,
      includeArchivedCustomers: false,
    },
  })

  const preview = async () => {
    try {
      if (!emailTemplateId) {
        toast.error('Pick an email template first')
        return
      }
      const result = await marketingApi.previewAudience(payload())
      setPreviewCount(result.count)
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }

  const create = async () => {
    try {
      if (!emailTemplateId) {
        toast.error('Pick an email template first')
        return
      }
      const created = await marketingApi.createCampaign(payload())
      toast.success('Campaign draft created')
      setShowCreate(false)
      await queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] })
      navigate(`/marketing/campaigns/${created.id}`)
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Email campaigns"
        subtitle="One-shot blasts to leads and customers using Unlayer templates."
        actions={
          <Button type="button" onClick={() => setShowCreate((open) => !open)}>
            <Plus className="size-4" />
            {showCreate ? 'Hide form' : 'New campaign'}
          </Button>
        }
      />

      {showCreate && (
        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Audience</Label>
                <Select value={audienceType} onValueChange={setAudienceType}>
                  <SelectTrigger>
                    <span>{audienceType}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LEAD">LEAD</SelectItem>
                    <SelectItem value="CUSTOMER">CUSTOMER</SelectItem>
                    <SelectItem value="MIXED">MIXED</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Email template</Label>
                <Select value={emailTemplateId} onValueChange={setEmailTemplateId}>
                  <SelectTrigger>
                    <span>{templates.find((t) => t.id === emailTemplateId)?.name || 'Select template'}</span>
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Lead status filter</Label>
                <Input
                  value={leadStatus}
                  onChange={(e) => setLeadStatus(e.target.value)}
                  placeholder="NEW / CONTACTED…"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Search</Label>
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or email" />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="outline" onClick={preview}>
                Preview audience
              </Button>
              {previewCount != null && <span className="text-sm text-slate-600">{previewCount} recipients</span>}
              <Button type="button" onClick={create}>
                Create draft
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4">
          {isLoading ? (
            <p className="py-16 text-center text-sm text-slate-500">Loading…</p>
          ) : (
            <Table>
              <thead>
                <tr className="border-b">
                  <th className="p-3 text-xs text-slate-500">NAME</th>
                  <th className="p-3 text-xs text-slate-500">AUDIENCE</th>
                  <th className="p-3 text-xs text-slate-500">STATUS</th>
                  <th className="p-3 text-xs text-slate-500">PROGRESS</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.length ? (
                  campaigns.map((campaign) => (
                    <tr key={campaign.id} className="border-b">
                      <td className="p-3">
                        <Link
                          className="font-medium text-teal-700 hover:underline"
                          to={`/marketing/campaigns/${campaign.id}`}
                        >
                          {campaign.name}
                        </Link>
                      </td>
                      <td className="p-3">{campaign.audienceType}</td>
                      <td className="p-3">
                        <Badge>{campaign.status}</Badge>
                      </td>
                      <td className="p-3 text-sm text-slate-600">
                        {campaign.sentCount}/{campaign.totalCount} sent · {campaign.failedCount} failed
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-16 text-center text-sm text-slate-500">
                      No campaigns yet.
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

export function MarketingCampaignDetailPage() {
  const { id } = useParams()
  const queryClient = useQueryClient()
  const { data: campaign } = useQuery({
    queryKey: ['marketing-campaigns', id],
    queryFn: () => marketingApi.getCampaign(id!),
    enabled: !!id,
  })
  const { data: recipients = [] } = useQuery({
    queryKey: ['marketing-campaigns', id, 'recipients'],
    queryFn: () => marketingApi.listRecipients(id!),
    enabled: !!id,
  })

  const schedule = async () => {
    try {
      await marketingApi.scheduleCampaign(id!)
      toast.success('Campaign scheduled')
      await queryClient.invalidateQueries({ queryKey: ['marketing-campaigns', id] })
      await queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] })
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }

  const cancel = async () => {
    try {
      await marketingApi.cancelCampaign(id!)
      toast.success('Campaign cancelled')
      await queryClient.invalidateQueries({ queryKey: ['marketing-campaigns', id] })
      await queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] })
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }

  if (!campaign) {
    return <p className="py-16 text-center text-sm text-slate-500">Loading campaign…</p>
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={campaign.name}
        subtitle={
          <>
            {campaign.audienceType} · <Badge className="ml-1">{campaign.status}</Badge>
          </>
        }
        actions={
          <>
            {(campaign.status === 'DRAFT' || campaign.status === 'CANCELLED') && (
              <Button type="button" onClick={schedule}>
                Schedule now
              </Button>
            )}
            {campaign.status !== 'SENT' && campaign.status !== 'CANCELLED' && (
              <Button type="button" variant="outline" onClick={cancel}>
                Cancel
              </Button>
            )}
          </>
        }
      />

      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-4">
          <Stat label="Total" value={campaign.totalCount} />
          <Stat label="Sent" value={campaign.sentCount} />
          <Stat label="Failed" value={campaign.failedCount} />
          <Stat label="Skipped" value={campaign.skippedCount} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h2 className="mb-3 font-semibold text-slate-900">Recipients</h2>
          <Table>
            <thead>
              <tr className="border-b">
                <th className="p-3 text-xs text-slate-500">TYPE</th>
                <th className="p-3 text-xs text-slate-500">EMAIL</th>
                <th className="p-3 text-xs text-slate-500">STATUS</th>
                <th className="p-3 text-xs text-slate-500">ERROR</th>
              </tr>
            </thead>
            <tbody>
              {recipients.length ? (
                recipients.map((recipient) => (
                  <tr key={recipient.id} className="border-b">
                    <td className="p-3">{recipient.recipientType}</td>
                    <td className="p-3">{recipient.email || '—'}</td>
                    <td className="p-3">
                      <Badge>{recipient.status}</Badge>
                    </td>
                    <td className="p-3 text-sm text-slate-500">{recipient.errorMessage || '—'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-sm text-slate-500">
                    Recipients appear after you schedule the campaign.
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  )
}
