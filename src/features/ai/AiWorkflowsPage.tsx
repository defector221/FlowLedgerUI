import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Check,
  FileText,
  GitBranch,
  IndianRupee,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { aiApi, type AiWorkflowApproval, type AiWorkflowDraft } from '@/services/api'
import { getApiErrorMessage } from '@/lib/api-error'
import { EmptyState, PageHeader } from '@/components/layout/PageChrome'
import { Badge, Button, Input, Skeleton, Textarea } from '@/components/ui'

type WorkflowStep = { order?: number; role?: string; action?: string }
type WorkflowConditions = { minAmount?: number | string; documentTypes?: string[]; [key: string]: unknown }

type StatusFilter = 'ALL' | 'ACTIVE' | 'DRAFT'

type EditorState = {
  name: string
  description: string
  minAmount: string
  documentTypes: string[]
  steps: WorkflowStep[]
}

const DOC_TYPE_OPTIONS = [
  'QUOTATION',
  'SALES_ORDER',
  'SALES_INVOICE',
  'PURCHASE_ORDER',
  'PURCHASE_INVOICE',
] as const
const ROLE_OPTIONS = ['REQUESTER', 'ORGANIZATION_ADMIN', 'ACCOUNTANT', 'MANAGER', 'CFO'] as const
const ACTION_OPTIONS = ['SUBMIT', 'APPROVE', 'REVIEW', 'NOTIFY'] as const

const selectClass =
  'h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-800 outline-none focus:border-teal-400'

function parseJson<T>(raw: string | undefined, fallback: T): T {
  if (!raw?.trim()) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function formatInr(amount: number | string | undefined): string | null {
  if (amount == null || amount === '') return null
  const n = typeof amount === 'number' ? amount : Number(amount)
  if (!Number.isFinite(n)) return null
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n)
}

function humanize(value: string | undefined): string {
  if (!value) return '—'
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function docPath(entityType: string, entityId: string): string | null {
  switch (entityType) {
    case 'QUOTATION':
      return `/sales/quotations/${entityId}`
    case 'SALES_ORDER':
      return `/sales/orders/${entityId}`
    case 'SALES_INVOICE':
      return `/sales/invoices/${entityId}`
    default:
      return null
  }
}

function sortedSteps(raw: WorkflowStep[]): WorkflowStep[] {
  return raw
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((s, i) => ({ ...s, order: i + 1 }))
}

function toEditorState(draft: AiWorkflowDraft): EditorState {
  const conditions = parseJson<WorkflowConditions>(draft.conditionsJson, {})
  const steps = sortedSteps(parseJson<WorkflowStep[]>(draft.stepsJson, []))
  return {
    name: draft.name,
    description: draft.description ?? '',
    minAmount: conditions.minAmount != null ? String(conditions.minAmount) : '',
    documentTypes: conditions.documentTypes ?? [],
    steps: steps.length
      ? steps
      : [
          { order: 1, role: 'REQUESTER', action: 'SUBMIT' },
          { order: 2, role: 'ORGANIZATION_ADMIN', action: 'APPROVE' },
        ],
  }
}

function buildUpdatePayload(draft: AiWorkflowDraft, editor: EditorState) {
  const steps = sortedSteps(editor.steps)
  const prev = parseJson<WorkflowConditions>(draft.conditionsJson, {})
  const min = editor.minAmount.trim() === '' ? undefined : Number(editor.minAmount)
  const conditions: WorkflowConditions = { ...prev }
  if (min != null && Number.isFinite(min)) conditions.minAmount = min
  else delete conditions.minAmount
  if (editor.documentTypes.length) conditions.documentTypes = editor.documentTypes
  else delete conditions.documentTypes

  const suggestedApprovers = steps
    .map((s) => s.role)
    .filter((r): r is string => !!r && r !== 'REQUESTER')
    .filter((r, i, arr) => arr.indexOf(r) === i)
    .join(',')

  return {
    name: editor.name.trim() || draft.name,
    triggerType: draft.triggerType,
    description: editor.description,
    conditionsJson: JSON.stringify(conditions),
    stepsJson: JSON.stringify(steps),
    suggestedApprovers: suggestedApprovers || 'ORGANIZATION_ADMIN',
  }
}

function InsertStepButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex size-7 cursor-pointer items-center justify-center rounded-full border border-dashed border-slate-300 bg-white text-slate-500 transition hover:border-teal-400 hover:text-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
      title="Insert step"
      aria-label="Insert step"
    >
      <Plus className="size-3.5" />
    </button>
  )
}

function WorkflowCard({
  draft,
  busy,
  onActivate,
  onDeactivate,
  onDelete,
  onSave,
}: {
  draft: AiWorkflowDraft
  busy: boolean
  onActivate: () => void
  onDeactivate: () => void
  onDelete: () => void
  onSave: (payload: ReturnType<typeof buildUpdatePayload>) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [editor, setEditor] = useState<EditorState>(() => toEditorState(draft))
  const [saving, setSaving] = useState(false)

  const conditions = parseJson<WorkflowConditions>(draft.conditionsJson, {})
  const steps = sortedSteps(parseJson<WorkflowStep[]>(draft.stepsJson, []))
  const minAmount = formatInr(conditions.minAmount)
  const docTypes = conditions.documentTypes ?? []
  const isActive = draft.status === 'ACTIVE'
  const staleAdvisoryCopy = /stores config only|advisory workflow|does not auto-approve/i.test(
    draft.description ?? '',
  )

  const startEdit = () => {
    setEditor(toEditorState(draft))
    setEditing(true)
  }

  const cancelEdit = () => {
    setEditor(toEditorState(draft))
    setEditing(false)
  }

  const updateStep = (index: number, patch: Partial<WorkflowStep>) => {
    setEditor((prev) => ({
      ...prev,
      steps: prev.steps.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    }))
  }

  const insertStep = (at: number) => {
    setEditor((prev) => {
      const next = prev.steps.slice()
      next.splice(at, 0, { order: at + 1, role: 'ORGANIZATION_ADMIN', action: 'APPROVE' })
      return { ...prev, steps: sortedSteps(next) }
    })
  }

  const removeStep = (index: number) => {
    setEditor((prev) => {
      if (prev.steps.length <= 1) return prev
      return { ...prev, steps: sortedSteps(prev.steps.filter((_, i) => i !== index)) }
    })
  }

  const moveStep = (index: number, dir: -1 | 1) => {
    setEditor((prev) => {
      const target = index + dir
      if (target < 0 || target >= prev.steps.length) return prev
      const next = prev.steps.slice()
      const [item] = next.splice(index, 1)
      next.splice(target, 0, item)
      return { ...prev, steps: sortedSteps(next) }
    })
  }

  const toggleDocType = (type: string) => {
    setEditor((prev) => {
      const has = prev.documentTypes.includes(type)
      return {
        ...prev,
        documentTypes: has ? prev.documentTypes.filter((t) => t !== type) : [...prev.documentTypes, type],
      }
    })
  }

  const save = async () => {
    setSaving(true)
    try {
      await onSave(buildUpdatePayload(draft, editor))
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  if (editing && !isActive) {
    return (
      <article className="space-y-4 bg-slate-50/60 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge variant="neutral">Editing draft</Badge>
            <Badge variant="outline">{humanize(draft.triggerType)}</Badge>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="cursor-pointer" disabled={saving || busy} onClick={cancelEdit}>
              Cancel
            </Button>
            <Button size="sm" className="cursor-pointer" disabled={saving || busy || !editor.name.trim()} onClick={() => void save()}>
              Save
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Name</span>
            <Input value={editor.name} onChange={(e) => setEditor((p) => ({ ...p, name: e.target.value }))} />
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Min amount (₹)</span>
            <Input
              type="number"
              min={0}
              value={editor.minAmount}
              onChange={(e) => setEditor((p) => ({ ...p, minAmount: e.target.value }))}
              placeholder="e.g. 50000"
            />
          </label>
        </div>

        <label className="block space-y-1.5 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Description</span>
          <Textarea
            rows={2}
            value={editor.description}
            onChange={(e) => setEditor((p) => ({ ...p, description: e.target.value }))}
          />
        </label>

        <div className="space-y-2">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Document types</p>
              <p className="mt-0.5 text-xs text-slate-500">
                Click to include or exclude. Leave none selected to match all types for this trigger.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="cursor-pointer text-xs font-medium text-teal-700 hover:underline"
                onClick={() =>
                  setEditor((p) => ({
                    ...p,
                    documentTypes: [...DOC_TYPE_OPTIONS],
                  }))
                }
              >
                Select all
              </button>
              <button
                type="button"
                className="cursor-pointer text-xs font-medium text-slate-500 hover:underline"
                onClick={() => setEditor((p) => ({ ...p, documentTypes: [] }))}
              >
                Clear
              </button>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {DOC_TYPE_OPTIONS.map((type) => {
              const on = editor.documentTypes.includes(type)
              return (
                <label
                  key={type}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition ${
                    on
                      ? 'border-teal-300 bg-teal-50 text-teal-950'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="size-4 cursor-pointer accent-teal-700"
                    checked={on}
                    onChange={() => toggleDocType(type)}
                  />
                  <span className="font-medium">{humanize(type)}</span>
                </label>
              )
            })}
          </div>
          {editor.documentTypes.length === 0 ? (
            <p className="text-xs text-amber-800">No types selected — workflow will match any document for this trigger.</p>
          ) : (
            <p className="text-xs text-slate-500">
              Selected: {editor.documentTypes.map((t) => humanize(t)).join(', ')}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Steps</p>
          <div className="flex flex-wrap items-center gap-2">
            <InsertStepButton onClick={() => insertStep(0)} disabled={saving} />
            {editor.steps.map((step, idx) => (
              <div key={`edit-${idx}`} className="flex items-center gap-2">
                <div className="min-w-[11rem] space-y-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Step {idx + 1}</p>
                  <select
                    className={`${selectClass} w-full`}
                    value={step.role ?? 'ORGANIZATION_ADMIN'}
                    onChange={(e) => updateStep(idx, { role: e.target.value })}
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {humanize(r)}
                      </option>
                    ))}
                  </select>
                  <select
                    className={`${selectClass} w-full`}
                    value={step.action ?? 'APPROVE'}
                    onChange={(e) => updateStep(idx, { action: e.target.value })}
                  >
                    {ACTION_OPTIONS.map((a) => (
                      <option key={a} value={a}>
                        {humanize(a)}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      className="cursor-pointer rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      title="Move up"
                      disabled={idx === 0}
                      onClick={() => moveStep(idx, -1)}
                    >
                      <ArrowUp className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      className="cursor-pointer rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      title="Move down"
                      disabled={idx === editor.steps.length - 1}
                      onClick={() => moveStep(idx, 1)}
                    >
                      <ArrowDown className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      className="ml-auto cursor-pointer rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-700"
                      title="Remove step"
                      disabled={editor.steps.length <= 1}
                      onClick={() => removeStep(idx)}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
                <InsertStepButton onClick={() => insertStep(idx + 1)} disabled={saving} />
              </div>
            ))}
          </div>
        </div>
      </article>
    )
  }

  return (
    <article className="p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex size-8 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                <GitBranch className="size-4" />
              </span>
              <h3 className="font-[family-name:var(--font-display)] text-base font-semibold text-slate-900">
                {draft.name}
              </h3>
              <Badge variant={isActive ? 'success' : 'neutral'}>{isActive ? 'Active' : 'Draft'}</Badge>
              <Badge variant="outline">{humanize(draft.triggerType)}</Badge>
            </div>
            {draft.description && !staleAdvisoryCopy ? (
              <p className="text-sm leading-relaxed text-slate-600">{draft.description}</p>
            ) : null}
            {isActive ? (
              <p className="text-sm text-teal-800">
                Enforcing approvals on matching convert / confirm actions. Deactivate to edit steps.
              </p>
            ) : (
              <p className="text-sm text-slate-500">Draft only — edit steps, then activate to gate matching sales documents.</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {minAmount ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                <IndianRupee className="size-3.5 text-slate-500" />
                Min amount {minAmount}
              </span>
            ) : null}
            {docTypes.length ? (
              docTypes.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700"
                >
                  <FileText className="size-3.5 text-slate-400" />
                  {humanize(t)}
                </span>
              ))
            ) : (
              <span className="rounded-lg border border-dashed border-slate-200 px-2.5 py-1 text-xs text-slate-500">
                All document types for this trigger
              </span>
            )}
          </div>

          {steps.length ? (
            <ol className="flex flex-wrap items-center gap-2">
              {steps.map((step, idx) => (
                <li key={`${step.order}-${step.role}-${idx}`} className="flex items-center gap-2">
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Step {step.order ?? idx + 1}
                    </p>
                    <p className="text-sm font-medium text-slate-800">{humanize(step.role)}</p>
                    <p className="text-xs text-slate-500">{humanize(step.action)}</p>
                  </div>
                  {idx < steps.length - 1 ? <ArrowRight className="size-3.5 text-slate-300" /> : null}
                </li>
              ))}
            </ol>
          ) : null}

          {draft.suggestedApprovers ? (
            <p className="text-xs text-slate-500">
              Suggested approvers:{' '}
              <span className="font-medium text-slate-700">
                {draft.suggestedApprovers
                  .split(',')
                  .map((s) => humanize(s.trim()))
                  .join(' · ')}
              </span>
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {!isActive ? (
            <Button size="sm" variant="outline" className="cursor-pointer gap-1" disabled={busy} onClick={startEdit}>
              <Pencil className="size-3.5" />
              Edit
            </Button>
          ) : null}
          {isActive ? (
            <Button size="sm" variant="outline" className="cursor-pointer" disabled={busy} onClick={onDeactivate}>
              Deactivate
            </Button>
          ) : (
            <Button size="sm" className="cursor-pointer" disabled={busy} onClick={onActivate}>
              Activate
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="cursor-pointer gap-1 text-rose-700 hover:bg-rose-50"
            disabled={busy}
            onClick={onDelete}
          >
            <Trash2 className="size-3.5" />
            Delete
          </Button>
        </div>
      </div>
    </article>
  )
}

export function AiWorkflowsPage() {
  const queryClient = useQueryClient()
  const [prompt, setPrompt] = useState('')
  const [name, setName] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')

  const drafts = useQuery({
    queryKey: ['ai-workflow-drafts'],
    queryFn: () => aiApi.workflowDrafts(),
  })

  const approvals = useQuery({
    queryKey: ['ai-workflow-approvals'],
    queryFn: () => aiApi.workflowApprovals('pending'),
  })

  const suggest = useMutation({
    mutationFn: (text: string) => aiApi.suggestWorkflow(text),
    onSuccess: () => {
      toast.success('Draft created — activate it when you are ready to enforce approvals')
      setPrompt('')
      void queryClient.invalidateQueries({ queryKey: ['ai-workflow-drafts'] })
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const create = useMutation({
    mutationFn: () =>
      aiApi.createWorkflowDraft({
        name: name.trim() || 'New approval workflow',
        triggerType: 'PAYMENT_OR_INVOICE',
        description: 'Draft approval flow. Activate to require approval before matching sales convert/confirm.',
        conditionsJson: '{"minAmount":50000,"documentTypes":["QUOTATION","SALES_ORDER","SALES_INVOICE"]}',
        stepsJson:
          '[{"order":1,"role":"REQUESTER","action":"SUBMIT"},{"order":2,"role":"ORGANIZATION_ADMIN","action":"APPROVE"}]',
        suggestedApprovers: 'ORGANIZATION_ADMIN',
      }),
    onSuccess: () => {
      setName('')
      toast.success('Draft saved')
      void queryClient.invalidateQueries({ queryKey: ['ai-workflow-drafts'] })
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const activate = useMutation({
    mutationFn: (id: string) => aiApi.activateWorkflow(id),
    onSuccess: () => {
      toast.success('Workflow active — matching sales actions now need approval')
      void queryClient.invalidateQueries({ queryKey: ['ai-workflow-drafts'] })
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const deactivate = useMutation({
    mutationFn: (id: string) => aiApi.deactivateWorkflow(id),
    onSuccess: () => {
      toast.success('Workflow deactivated — sales actions proceed without this gate')
      void queryClient.invalidateQueries({ queryKey: ['ai-workflow-drafts'] })
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const remove = useMutation({
    mutationFn: (id: string) => aiApi.deleteWorkflowDraft(id),
    onSuccess: () => {
      toast.success('Workflow removed')
      void queryClient.invalidateQueries({ queryKey: ['ai-workflow-drafts'] })
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const update = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof aiApi.updateWorkflowDraft>[1] }) =>
      aiApi.updateWorkflowDraft(id, payload),
    onSuccess: () => {
      toast.success('Workflow updated')
      void queryClient.invalidateQueries({ queryKey: ['ai-workflow-drafts'] })
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const approve = useMutation({
    mutationFn: (id: string) => aiApi.approveWorkflow(id),
    onSuccess: (result) => {
      if (result.status === 'APPROVED') {
        toast.success('Fully approved — retry the original convert/confirm action')
      } else {
        const nextRole = result.currentStepRole ? humanize(result.currentStepRole) : 'next approver'
        toast.success(
          `Step approved · waiting for ${nextRole} (${result.currentStep ?? '?'}/${result.totalSteps ?? '?'})`,
        )
      }
      void queryClient.invalidateQueries({ queryKey: ['ai-workflow-approvals'] })
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const reject = useMutation({
    mutationFn: (id: string) => aiApi.rejectWorkflow(id),
    onSuccess: () => {
      toast.success('Rejected')
      void queryClient.invalidateQueries({ queryKey: ['ai-workflow-approvals'] })
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const rows = useMemo(() => {
    const all = (drafts.data ?? []).filter((d) => d.status !== 'DELETED')
    if (statusFilter === 'ACTIVE') return all.filter((d) => d.status === 'ACTIVE')
    if (statusFilter === 'DRAFT') return all.filter((d) => d.status !== 'ACTIVE')
    return all
  }, [drafts.data, statusFilter])

  const pending: AiWorkflowApproval[] = approvals.data ?? []
  const visible = (drafts.data ?? []).filter((d) => d.status !== 'DELETED')
  const activeCount = visible.filter((d) => d.status === 'ACTIVE').length
  const draftCount = visible.length - activeCount
  const libraryBusy = activate.isPending || deactivate.isPending || remove.isPending || update.isPending

  const confirmDelete = (d: AiWorkflowDraft) => {
    const ok = window.confirm(
      `Remove "${d.name}"? It will stop gating sales actions and disappear from the library.`,
    )
    if (ok) remove.mutate(d.id)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workflow Builder"
        subtitle="Create drafts with AI, edit steps, then activate them to gate sales convert and confirm until approved."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/90 bg-white px-4 py-3 shadow-[var(--shadow-soft)]">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Drafts</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold text-slate-900">
            {draftCount}
          </p>
          <p className="text-xs text-slate-500">Config only — not enforcing yet</p>
        </div>
        <div className="rounded-2xl border border-teal-200/80 bg-teal-50/50 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-teal-700/80">Active</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold text-teal-950">
            {activeCount}
          </p>
          <p className="text-xs text-teal-800/80">Gate matching sales actions</p>
        </div>
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/50 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800/80">Pending</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold text-amber-950">
            {pending.length}
          </p>
          <p className="text-xs text-amber-900/70">Waiting for approve / reject</p>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[var(--shadow-soft)]">
        <div className="border-b border-slate-100 px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Inbox</p>
          <h2 className="font-[family-name:var(--font-display)] text-base font-semibold text-slate-900">
            Pending approvals
          </h2>
        </div>
        <div className="divide-y divide-slate-100">
          {approvals.isLoading ? (
            <div className="space-y-3 p-5">
              <Skeleton className="h-16 w-full" />
            </div>
          ) : null}
          {!approvals.isLoading && !pending.length ? (
            <div className="p-8">
              <EmptyState
                title="No pending approvals"
                description="When an active workflow matches a convert/confirm, the request lands here."
              />
            </div>
          ) : null}
          {pending.map((a) => {
            const href = docPath(a.entityType, a.entityId)
            const total = a.totalSteps ?? 1
            const current = a.currentStep ?? 1
            const canApprove = a.canApprove !== false
            const stepSteps = parseJson<{ order?: number; role?: string; action?: string }[]>(
              a.stepsSnapshotJson,
              [],
            )
            return (
              <article
                key={a.id}
                className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="warning">{a.status}</Badge>
                    <Badge variant="outline">{humanize(a.entityType)}</Badge>
                    {a.workflowName ? <Badge variant="neutral">{a.workflowName}</Badge> : null}
                    <Badge variant="outline">
                      Step {current}/{total}
                      {a.currentStepRole ? ` · ${humanize(a.currentStepRole)}` : ''}
                    </Badge>
                    {href ? (
                      <Link to={href} className="text-xs font-medium text-teal-700 hover:underline">
                        Open document
                      </Link>
                    ) : (
                      <span className="font-mono text-xs text-slate-500">{a.entityId.slice(0, 8)}…</span>
                    )}
                  </div>
                  {stepSteps.length > 1 ? (
                    <ol className="flex flex-wrap items-center gap-1.5">
                      {stepSteps.map((s, idx) => {
                        const n = idx + 1
                        const done = n < current || a.status === 'APPROVED'
                        const active = n === current && a.status === 'PENDING'
                        return (
                          <li
                            key={`${a.id}-step-${n}`}
                            className={`rounded-md px-2 py-1 text-[11px] font-medium ${
                              done
                                ? 'bg-emerald-50 text-emerald-800'
                                : active
                                  ? 'bg-amber-50 text-amber-900 ring-1 ring-amber-200'
                                  : 'bg-slate-50 text-slate-500'
                            }`}
                          >
                            {n}. {humanize(s.role)}
                          </li>
                        )
                      })}
                    </ol>
                  ) : null}
                  {a.remarks ? <p className="text-sm text-slate-600">{a.remarks}</p> : null}
                  {!canApprove && a.currentStepRole ? (
                    <p className="text-xs text-amber-800">
                      Waiting for {humanize(a.currentStepRole)} (or Organization Admin) to approve this step.
                    </p>
                  ) : null}
                  <p className="text-xs text-slate-400">
                    Requested {new Date(a.requestedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    className="cursor-pointer gap-1"
                    disabled={approve.isPending || !canApprove}
                    title={
                      canApprove
                        ? undefined
                        : `Requires ${humanize(a.currentStepRole)} or Organization Admin`
                    }
                    onClick={() => approve.mutate(a.id)}
                  >
                    <Check className="size-3.5" />
                    {total > 1 ? `Approve step ${current}` : 'Approve'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="cursor-pointer gap-1"
                    disabled={reject.isPending}
                    onClick={() => reject.mutate(a.id)}
                  >
                    <X className="size-3.5" />
                    Reject
                  </Button>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[var(--shadow-soft)]">
          <div className="border-b border-slate-100 bg-gradient-to-r from-teal-50/70 to-white px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Suggest with AI</p>
            <h2 className="font-[family-name:var(--font-display)] text-base font-semibold text-slate-900">
              Describe an approval process
            </h2>
          </div>
          <div className="space-y-3 p-5">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              placeholder="e.g. Require admin approval for sales documents over ₹50,000…"
            />
            <p className="text-xs text-slate-500">
              AI creates a <span className="font-medium text-slate-700">draft</span>. Edit steps, then activate to
              enforce.
            </p>
            <Button
              className="cursor-pointer gap-1.5"
              disabled={!prompt.trim() || suggest.isPending}
              onClick={() => suggest.mutate(prompt.trim())}
            >
              <Sparkles className="size-3.5" />
              Generate draft
            </Button>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[var(--shadow-soft)]">
          <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Blank draft</p>
            <h2 className="font-[family-name:var(--font-display)] text-base font-semibold text-slate-900">
              Create manually
            </h2>
          </div>
          <div className="space-y-3 p-5">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Workflow name" />
            <p className="text-xs text-slate-500">
              Starts as a draft with ₹50,000 min on quotation / order / invoice. Edit or activate as needed.
            </p>
            <Button
              variant="outline"
              className="cursor-pointer gap-1.5"
              disabled={create.isPending}
              onClick={() => create.mutate()}
            >
              <Plus className="size-3.5" />
              Create draft
            </Button>
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[var(--shadow-soft)]">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Library</p>
            <h2 className="font-[family-name:var(--font-display)] text-base font-semibold text-slate-900">
              Saved workflows
            </h2>
          </div>
          <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
            {(
              [
                ['ALL', 'All'],
                ['ACTIVE', 'Active'],
                ['DRAFT', 'Drafts'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  statusFilter === value
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                onClick={() => setStatusFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {drafts.isLoading ? (
            <div className="space-y-3 p-5">
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
            </div>
          ) : null}
          {!drafts.isLoading && !rows.length ? (
            <div className="p-10">
              <EmptyState
                title={statusFilter === 'ACTIVE' ? 'No active workflows' : 'No workflow drafts'}
                description="Generate one from a prompt or create a blank draft, then edit and activate to enforce."
              />
            </div>
          ) : null}
          {rows.map((d) => (
            <WorkflowCard
              key={d.id}
              draft={d}
              busy={libraryBusy}
              onActivate={() => activate.mutate(d.id)}
              onDeactivate={() => deactivate.mutate(d.id)}
              onDelete={() => confirmDelete(d)}
              onSave={async (payload) => {
                await update.mutateAsync({ id: d.id, payload })
              }}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
