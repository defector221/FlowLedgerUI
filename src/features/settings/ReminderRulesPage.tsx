import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { paymentApi } from '@/services/api'
import { getApiErrorMessage } from '@/lib/api-error'
import { PageHeader, EmptyState } from '@/components/layout/PageChrome'
import type { PaymentReminderRuleRequest, PaymentReminderRuleResponse } from '@/types/api'
import {
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogTitle,
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

const emptyForm: PaymentReminderRuleRequest = {
  name: '',
  daysOffset: 3,
  offsetType: 'AFTER_DUE',
  channel: 'EMAIL',
  enabled: true,
  subjectTemplate: 'Payment reminder for invoice {{invoiceNumber}}',
  bodyTemplate:
    'Dear {{customerName}}, outstanding amount for invoice {{invoiceNumber}} is {{outstanding}}.',
}

export function ReminderRulesPage() {
  const queryClient = useQueryClient()
  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['payment-reminder-rules'],
    queryFn: paymentApi.listReminderRules,
  })
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<PaymentReminderRuleResponse | null>(null)
  const [form, setForm] = useState<PaymentReminderRuleRequest>(emptyForm)

  const save = useMutation({
    mutationFn: async () => {
      if (editing) return paymentApi.updateReminderRule(editing.id, form)
      return paymentApi.createReminderRule(form)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['payment-reminder-rules'] })
      setOpen(false)
      setEditing(null)
      toast.success(editing ? 'Reminder rule updated' : 'Reminder rule created')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Unable to save reminder rule')),
  })

  const remove = useMutation({
    mutationFn: (id: string) => paymentApi.deleteReminderRule(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['payment-reminder-rules'] })
      toast.success('Reminder rule deleted')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Unable to delete reminder rule')),
  })

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setOpen(true)
  }

  const openEdit = (rule: PaymentReminderRuleResponse) => {
    setEditing(rule)
    setForm({
      name: rule.name,
      daysOffset: rule.daysOffset,
      offsetType: rule.offsetType,
      channel: rule.channel,
      enabled: rule.enabled,
      subjectTemplate: rule.subjectTemplate ?? '',
      bodyTemplate: rule.bodyTemplate ?? '',
    })
    setOpen(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment reminder rules"
        subtitle="Automate overdue reminders by due-date offset over email or WhatsApp."
        actions={<Button onClick={openCreate}>Add rule</Button>}
      />

      <Card>
        <CardContent className="p-4">
          {isLoading ? (
            <EmptyState title="Loading rules…" />
          ) : rules.length === 0 ? (
            <EmptyState
              title="No reminder rules yet"
              description="Create one to send automated reminders each morning."
              action={<Button onClick={openCreate}>Add rule</Button>}
            />
          ) : (
            <Table>
              <thead>
                <tr className="border-b">
                  <th className="p-3 text-left text-xs text-slate-500">NAME</th>
                  <th className="p-3 text-left text-xs text-slate-500">WHEN</th>
                  <th className="p-3 text-left text-xs text-slate-500">CHANNEL</th>
                  <th className="p-3 text-left text-xs text-slate-500">ENABLED</th>
                  <th className="p-3 text-right text-xs text-slate-500">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => (
                  <tr key={rule.id} className="border-b">
                    <td className="p-3 font-medium text-slate-900">{rule.name}</td>
                    <td className="p-3 text-slate-700">{formatWhen(rule)}</td>
                    <td className="p-3 text-slate-700">{rule.channel}</td>
                    <td className="p-3 text-slate-700">{rule.enabled ? 'Yes' : 'No'}</td>
                    <td className="p-3 text-right">
                      <div className="inline-flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(rule)}>
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (confirm('Delete this reminder rule?')) remove.mutate(rule.id)
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogTitle className="text-lg font-semibold">
            {editing ? 'Edit reminder rule' : 'New reminder rule'}
          </DialogTitle>
          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="rule-name">Name</Label>
              <Input
                id="rule-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="3 days overdue email"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Offset type</Label>
                <Select
                  value={form.offsetType}
                  onValueChange={(offsetType) => setForm((f) => ({ ...f, offsetType }))}
                >
                  <SelectTrigger>
                    {form.offsetType === 'BEFORE_DUE'
                      ? 'Before due'
                      : form.offsetType === 'ON_DUE'
                        ? 'On due date'
                        : 'After due'}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BEFORE_DUE">Before due</SelectItem>
                    <SelectItem value="ON_DUE">On due date</SelectItem>
                    <SelectItem value="AFTER_DUE">After due</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="days-offset">Days</Label>
                <Input
                  id="days-offset"
                  type="number"
                  min={0}
                  value={form.daysOffset}
                  onChange={(e) => setForm((f) => ({ ...f, daysOffset: Number(e.target.value || 0) }))}
                  disabled={form.offsetType === 'ON_DUE'}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Channel</Label>
              <Select value={form.channel} onValueChange={(channel) => setForm((f) => ({ ...f, channel }))}>
                <SelectTrigger>{form.channel === 'WHATSAPP' ? 'WhatsApp' : 'Email'}</SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMAIL">Email</SelectItem>
                  <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
              <div>
                <p className="text-sm font-medium text-slate-900">Enabled</p>
                <p className="text-xs text-slate-500">Include this rule in the daily 9:00 job</p>
              </div>
              <Switch
                checked={!!form.enabled}
                onCheckedChange={(enabled) => setForm((f) => ({ ...f, enabled }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="subject">Subject template</Label>
              <Input
                id="subject"
                value={form.subjectTemplate ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, subjectTemplate: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="body">Body template</Label>
              <Textarea
                id="body"
                rows={4}
                value={form.bodyTemplate ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, bodyTemplate: e.target.value }))}
              />
              <p className="text-xs text-slate-500">
                Tags: {'{{customerName}}'}, {'{{invoiceNumber}}'}, {'{{outstanding}}'}
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button disabled={!form.name.trim() || save.isPending} onClick={() => save.mutate()}>
                {save.isPending ? 'Saving…' : 'Save rule'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function formatWhen(rule: PaymentReminderRuleResponse) {
  if (rule.offsetType === 'ON_DUE') return 'On due date'
  if (rule.offsetType === 'BEFORE_DUE') return `${rule.daysOffset} day(s) before due`
  return `${rule.daysOffset} day(s) after due`
}
