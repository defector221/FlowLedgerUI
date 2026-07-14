import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { emailTemplateApi, marketingApi } from '@/services/api'
import { getApiErrorMessage } from '@/lib/api-error'
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  NumberInput,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Table,
  Textarea,
} from '@/components/ui'

const stepSchema = z
  .object({
    delayDays: z.number().min(0),
    channel: z.string().min(1),
    subject: z.string().optional(),
    body: z.string().optional(),
    emailTemplateId: z.string().optional(),
  })
  .superRefine((step, ctx) => {
    if (step.channel === 'EMAIL' && step.emailTemplateId) return
    if (!step.body || !step.body.trim()) {
      ctx.addIssue({ code: 'custom', message: 'Body is required', path: ['body'] })
    }
  })

const sequenceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  triggerType: z.string().min(1),
  status: z.string().min(1),
  steps: z.array(stepSchema).min(1, 'Add at least one step'),
})

type SequenceForm = z.infer<typeof sequenceSchema>

export function MarketingSequencesPage() {
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const { data: sequences = [], isLoading } = useQuery({
    queryKey: ['marketing-sequences'],
    queryFn: marketingApi.listSequences,
  })
  const { data: emailTemplates = [] } = useQuery({
    queryKey: ['email-templates'],
    queryFn: emailTemplateApi.list,
  })

  const form = useForm<SequenceForm>({
    resolver: zodResolver(sequenceSchema),
    defaultValues: {
      name: '',
      triggerType: 'LEAD_CREATED',
      status: 'ACTIVE',
      steps: [{ delayDays: 0, channel: 'EMAIL', subject: '', body: '', emailTemplateId: '' }],
    },
  })
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'steps' })

  const create = form.handleSubmit(async (values) => {
    try {
      await marketingApi.createSequence({
        name: values.name,
        triggerType: values.triggerType,
        status: values.status,
        steps: values.steps.map((step) => ({
          delayDays: step.delayDays,
          channel: step.channel,
          subject: step.subject || undefined,
          body: step.body || undefined,
          emailTemplateId:
            step.emailTemplateId && step.emailTemplateId !== '__plain__' ? step.emailTemplateId : undefined,
        })),
      })
      toast.success('Sequence created')
      form.reset({
        name: '',
        triggerType: 'LEAD_CREATED',
        status: 'ACTIVE',
        steps: [{ delayDays: 0, channel: 'EMAIL', subject: '', body: '', emailTemplateId: '' }],
      })
      setShowCreate(false)
      await queryClient.invalidateQueries({ queryKey: ['marketing-sequences'] })
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Marketing sequences</h1>
          <p className="mt-1 text-sm text-slate-500">
            Automate follow-ups when leads are created or enrolled manually.{' '}
            <Link className="text-teal-700 hover:underline" to="/marketing/email-templates">
              Manage email templates
            </Link>
          </p>
        </div>
        <Button type="button" onClick={() => setShowCreate((open) => !open)}>
          <Plus className="size-4" />
          {showCreate ? 'Hide form' : 'New sequence'}
        </Button>
      </div>

      {showCreate && (
        <Card>
          <CardContent className="space-y-4 p-4">
            <form className="space-y-4" onSubmit={create}>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5 sm:col-span-1">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" {...form.register('name')} />
                </div>
                <div className="space-y-1.5">
                  <Label>Trigger</Label>
                  <Select
                    value={form.watch('triggerType')}
                    onValueChange={(value) => form.setValue('triggerType', value)}
                  >
                    <SelectTrigger>
                      <span>{form.watch('triggerType')}</span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MANUAL">MANUAL</SelectItem>
                      <SelectItem value="LEAD_CREATED">LEAD_CREATED</SelectItem>
                      <SelectItem value="CUSTOMER_CREATED">CUSTOMER_CREATED</SelectItem>
                      <SelectItem value="INVOICE_OVERDUE">INVOICE_OVERDUE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={form.watch('status')} onValueChange={(value) => form.setValue('status', value)}>
                    <SelectTrigger>
                      <span>{form.watch('status')}</span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">DRAFT</SelectItem>
                      <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                      <SelectItem value="PAUSED">PAUSED</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-medium text-slate-800">Steps</h2>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      append({ delayDays: 1, channel: 'EMAIL', subject: '', body: '', emailTemplateId: '' })
                    }
                  >
                    <Plus className="size-3.5" />
                    Add step
                  </Button>
                </div>
                {fields.map((field, index) => {
                  const channel = form.watch(`steps.${index}.channel`)
                  return (
                    <div key={field.id} className="grid gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-12">
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label>Delay (days)</Label>
                        <NumberInput
                          allowDecimal={false}
                          value={Number(form.watch(`steps.${index}.delayDays`) ?? 0)}
                          onValueChange={(value) => form.setValue(`steps.${index}.delayDays`, value)}
                        />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label>Channel</Label>
                        <Select
                          value={channel}
                          onValueChange={(value) => form.setValue(`steps.${index}.channel`, value)}
                        >
                          <SelectTrigger>
                            <span>{channel}</span>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="EMAIL">EMAIL</SelectItem>
                            <SelectItem value="WHATSAPP">WHATSAPP</SelectItem>
                            <SelectItem value="SMS">SMS</SelectItem>
                            <SelectItem value="IN_APP">IN_APP</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {channel === 'EMAIL' ? (
                        <div className="space-y-1.5 sm:col-span-7">
                          <Label>Email template</Label>
                          <Select
                            value={form.watch(`steps.${index}.emailTemplateId`) || '__plain__'}
                            onValueChange={(value) => {
                              const next = value === '__plain__' ? '' : value
                              form.setValue(`steps.${index}.emailTemplateId`, next)
                              const selected = emailTemplates.find((template) => template.id === next)
                              if (selected) {
                                form.setValue(`steps.${index}.subject`, selected.subject)
                                form.setValue(`steps.${index}.body`, '')
                              }
                            }}
                          >
                            <SelectTrigger>
                              <span>
                                {emailTemplates.find((t) => t.id === form.watch(`steps.${index}.emailTemplateId`))
                                  ?.name || 'Select template (or use plain body)'}
                              </span>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__plain__">Plain body</SelectItem>
                              {emailTemplates.map((template) => (
                                <SelectItem key={template.id} value={template.id}>
                                  {template.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {(!form.watch(`steps.${index}.emailTemplateId`) ||
                            form.watch(`steps.${index}.emailTemplateId`) === '__plain__') && (
                            <div className="mt-2 grid gap-2 sm:grid-cols-2">
                              <Input placeholder="Subject" {...form.register(`steps.${index}.subject`)} />
                              <Textarea rows={2} placeholder="Body" {...form.register(`steps.${index}.body`)} />
                            </div>
                          )}
                        </div>
                      ) : (
                        <>
                          <div className="space-y-1.5 sm:col-span-3">
                            <Label>Subject</Label>
                            <Input {...form.register(`steps.${index}.subject`)} />
                          </div>
                          <div className="space-y-1.5 sm:col-span-4">
                            <Label>Body</Label>
                            <Textarea rows={2} {...form.register(`steps.${index}.body`)} />
                          </div>
                        </>
                      )}
                      <div className="flex items-end sm:col-span-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={fields.length === 1}
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>

              <Button type="submit">Create sequence</Button>
            </form>
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
                  <th className="p-3 text-xs text-slate-500">TRIGGER</th>
                  <th className="p-3 text-xs text-slate-500">STATUS</th>
                  <th className="p-3 text-xs text-slate-500">STEPS</th>
                </tr>
              </thead>
              <tbody>
                {sequences.length ? (
                  sequences.map((sequence) => (
                    <tr key={sequence.id} className="border-b">
                      <td className="p-3 font-medium text-slate-800">{sequence.name}</td>
                      <td className="p-3">{sequence.triggerType}</td>
                      <td className="p-3">
                        <Badge>{sequence.status}</Badge>
                      </td>
                      <td className="p-3 text-sm text-slate-600">
                        {(sequence.steps ?? [])
                          .map(
                            (step) =>
                              `D+${step.delayDays} ${step.channel}${step.subjectTemplate ? ` — ${step.subjectTemplate}` : ''}`,
                          )
                          .join(' · ') || '—'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-16 text-center text-sm text-slate-500">
                      No sequences yet.
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
