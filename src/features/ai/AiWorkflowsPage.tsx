import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
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
import { workflowDocumentPath } from '@/lib/workflow-docs'
import { ApprovalHistoryPanel } from '@/features/ai/ApprovalHistoryPanel'
import { getApiErrorMessage } from '@/lib/api-error'
import { EmptyState, PageHeader } from '@/components/layout/PageChrome'
import { Badge, Button, Dialog, DialogContent, DialogTitle, Input, Skeleton, Textarea } from '@/components/ui'

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

const DOC_TYPE_OPTIONS = ['QUOTATION', 'SALES_ORDER', 'SALES_INVOICE', 'PURCHASE_ORDER', 'PURCHASE_INVOICE'] as const
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
  return workflowDocumentPath(entityType, entityId)
}

function parseApprovalContext(remarks: string | undefined): { action?: string; amount?: string } {
  if (!remarks) return {}
  const actionMatch = remarks.match(/action=([^·]+)/i)
  const amountMatch = remarks.match(/amount=([0-9.]+)/i)
  const action = actionMatch?.[1]?.trim()
  const amountRaw = amountMatch?.[1]?.trim()
  const amount = amountRaw ? (formatInr(amountRaw) ?? undefined) : undefined
  return {
    action: action ? action.charAt(0).toUpperCase() + action.slice(1) : undefined,
    amount: amount ?? undefined,
  }
}

function approvalHeadline(entityType: string, action?: string): string {
  const doc = humanize(entityType)
  if (!action) return doc
  return `${doc} · ${action}`
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
  const isActive = (draft.status ?? '').toUpperCase() === 'ACTIVE'
  const staleAdvisoryCopy = /stores config only|advisory workflow|does not auto-approve/i.test(draft.description ?? '')

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
            <Button
              size="sm"
              variant="outline"
              className="cursor-pointer"
              disabled={saving || busy}
              onClick={cancelEdit}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="cursor-pointer"
              disabled={saving || busy || !editor.name.trim()}
              onClick={() => void save()}
            >
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
            <p className="text-xs text-amber-800">
              No types selected — workflow will match any document for this trigger.
            </p>
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
              <p className="text-sm text-slate-500">
                Draft only — edit steps, then activate to gate matching sales documents.
              </p>
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
  const [searchParams, setSearchParams] = useSearchParams()
  const focusId = searchParams.get('focus')
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const focusRef = useRef<HTMLElement | null>(null)
  const [prompt, setPrompt] = useState('')
  const [name, setName] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [decision, setDecision] = useState<{ id: string; mode: 'approve' | 'reject' } | null>(null)
  const [decisionComment, setDecisionComment] = useState('')

  const drafts = useQuery({
    queryKey: ['ai-workflow-drafts'],
    queryFn: () => aiApi.workflowDrafts(),
  })

  const approvals = useQuery({
    queryKey: ['ai-workflow-approvals'],
    queryFn: () => aiApi.workflowApprovals('pending'),
  })

  const approvalHistory = useQuery({
    queryKey: ['ai-workflow-approvals', 'history'],
    queryFn: () => aiApi.workflowApprovals('all'),
  })

  useEffect(() => {
    if (focusId) setHighlightId(focusId)
  }, [focusId])

  useEffect(() => {
    if (!highlightId || !approvals.data?.length) return
    const el = focusRef.current
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    if (searchParams.has('focus')) {
      const next = new URLSearchParams(searchParams)
      next.delete('focus')
      setSearchParams(next, { replace: true })
    }
  }, [highlightId, approvals.data, searchParams, setSearchParams])

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
    onSuccess: (updated) => {
      toast.success('Workflow active — matching sales actions now need approval')
      queryClient.setQueryData<AiWorkflowDraft[]>(['ai-workflow-drafts'], (current) =>
        (current ?? []).map((d) => (d.id === updated.id ? { ...d, ...updated } : d)),
      )
      void queryClient.invalidateQueries({ queryKey: ['ai-workflow-drafts'] })
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const deactivate = useMutation({
    mutationFn: (id: string) => aiApi.deactivateWorkflow(id),
    onSuccess: (updated) => {
      toast.success('Workflow deactivated — sales actions proceed without this gate')
      queryClient.setQueryData<AiWorkflowDraft[]>(['ai-workflow-drafts'], (current) =>
        (current ?? []).map((d) => (d.id === updated.id ? { ...d, ...updated } : d)),
      )
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
    mutationFn: ({ id, remarks }: { id: string; remarks?: string }) => aiApi.approveWorkflow(id, remarks),
    onSuccess: (result) => {
      if (result.status === 'APPROVED') {
        toast.success('Fully approved — retry the original convert/confirm action')
      } else {
        const nextRole = result.currentStepRole ? humanize(result.currentStepRole) : 'next approver'
        toast.success(
          `Step approved · waiting for ${nextRole} (${result.currentStep ?? '?'}/${result.totalSteps ?? '?'})`,
        )
      }
      setDecision(null)
      setDecisionComment('')
      queryClient.setQueryData<AiWorkflowApproval[]>(['ai-workflow-approvals'], (current) => {
        const rows = current ?? []
        if (result.status === 'APPROVED' || result.status === 'REJECTED') {
          return rows.filter((row) => row.id !== result.id)
        }
        return rows.map((row) => (row.id === result.id ? { ...row, ...result } : row))
      })
      void queryClient.invalidateQueries({ queryKey: ['ai-workflow-approvals'] })
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
      if (result.entityType && result.entityId) {
        void queryClient.invalidateQueries({ queryKey: ['workflow-approvals', result.entityType, result.entityId] })
        if (result.entityType === 'SALES_ORDER') {
          void queryClient.invalidateQueries({ queryKey: ['sales-order', result.entityId] })
        }
        if (result.entityType === 'DELIVERY_CHALLAN') {
          void queryClient.invalidateQueries({ queryKey: ['challan', result.entityId] })
        }
      }
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const reject = useMutation({
    mutationFn: ({ id, remarks }: { id: string; remarks?: string }) => aiApi.rejectWorkflow(id, remarks),
    onSuccess: (result) => {
      toast.success('Rejected — the requester can review comments on the document')
      setDecision(null)
      setDecisionComment('')
      queryClient.setQueryData<AiWorkflowApproval[]>(['ai-workflow-approvals'], (current) =>
        (current ?? []).filter((row) => row.id !== result.id),
      )
      void queryClient.invalidateQueries({ queryKey: ['ai-workflow-approvals'] })
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
      if (result.entityType && result.entityId) {
        void queryClient.invalidateQueries({ queryKey: ['workflow-approvals', result.entityType, result.entityId] })
        if (result.entityType === 'SALES_ORDER') {
          void queryClient.invalidateQueries({ queryKey: ['sales-order', result.entityId] })
        }
        if (result.entityType === 'DELIVERY_CHALLAN') {
          void queryClient.invalidateQueries({ queryKey: ['challan', result.entityId] })
        }
      }
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const rows = useMemo(() => {
    const all = (drafts.data ?? []).filter((d) => (d.status ?? '').toUpperCase() !== 'DELETED')
    if (statusFilter === 'ACTIVE') return all.filter((d) => (d.status ?? '').toUpperCase() === 'ACTIVE')
    if (statusFilter === 'DRAFT') return all.filter((d) => (d.status ?? '').toUpperCase() !== 'ACTIVE')
    return all
  }, [drafts.data, statusFilter])

  const pending: AiWorkflowApproval[] = approvals.data ?? []
  const decidedHistory = useMemo(
    () =>
      (approvalHistory.data ?? []).filter((row) => row.status === 'APPROVED' || row.status === 'REJECTED').slice(0, 40),
    [approvalHistory.data],
  )
  const visible = (drafts.data ?? []).filter((d) => (d.status ?? '').toUpperCase() !== 'DELETED')
  const activeCount = visible.filter((d) => (d.status ?? '').toUpperCase() === 'ACTIVE').length
  const draftCount = visible.length - activeCount
  const libraryBusy = activate.isPending || deactivate.isPending || remove.isPending || update.isPending

  const confirmDelete = (d: AiWorkflowDraft) => {
    const ok = window.confirm(`Remove "${d.name}"? It will stop gating sales actions and disappear from the library.`)
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

      {activeCount > 1 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm text-amber-950">
          <p className="font-medium">Multiple active workflows overlap</p>
          <p className="mt-1 text-amber-900/80">
            For each document, FlowLedger applies the strictest matching workflow (most approval steps). Deactivate
            extras like “test” if you only want Seed’s Admin → Accountant path.
          </p>
        </div>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[var(--shadow-soft)]">
        <div className="border-b border-slate-100 px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Inbox</p>
          <h2 className="font-[family-name:var(--font-display)] text-base font-semibold text-slate-900">
            Pending approvals
          </h2>
          <p className="mt-1 text-sm text-slate-500">Review requests before convert or confirm can continue.</p>
        </div>
        <div className="max-h-[28rem] divide-y divide-slate-100 overflow-y-auto">
          {approvals.isLoading ? (
            <div className="space-y-3 p-5">
              <Skeleton className="h-24 w-full" />
            </div>
          ) : null}
          {!approvals.isLoading && !pending.length ? (
            <div className="p-8">
              <EmptyState
                title="No pending approvals"
                description="When an active workflow matches a convert or confirm, the request lands here."
              />
            </div>
          ) : null}
          {pending.map((a) => {
            const href = docPath(a.entityType, a.entityId)
            const total = Number(a.totalSteps ?? 1) || 1
            const current = Number(a.currentStep ?? 1) || 1
            const canApprove = a.canApprove !== false
            const stepSteps = parseJson<WorkflowStep[]>(a.stepsSnapshotJson, [])
            const { action, amount } = parseApprovalContext(a.remarks)
            const waitingRole = a.currentStepRole ? humanize(a.currentStepRole) : 'approver'
            const focused = highlightId === a.id
            const stepActors = (a.actions ?? []).filter((action) => action.action === 'STEP_APPROVED')
            return (
              <article
                key={a.id}
                ref={focused ? focusRef : undefined}
                className={`grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center ${
                  focused ? 'bg-teal-50/50 ring-2 ring-inset ring-teal-300' : ''
                }`}
              >
                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900 ring-1 ring-amber-200/80">
                          Needs approval
                        </span>
                        {amount ? (
                          <span className="text-sm font-semibold tabular-nums text-slate-900">{amount}</span>
                        ) : null}
                      </div>
                      <h3 className="truncate text-base font-semibold text-slate-900">
                        {approvalHeadline(a.entityType, action)}
                      </h3>
                      <p className="text-sm text-slate-500">
                        {a.workflowName ?? 'Approval workflow'}
                        {a.requestedByName ? ` · requested by ${a.requestedByName}` : null}
                        {href ? (
                          <>
                            {' · '}
                            <Link to={href} className="font-medium text-teal-700 hover:underline">
                              Open document
                            </Link>
                          </>
                        ) : null}
                      </p>
                    </div>
                  </div>

                  {stepSteps.length > 0 ? (
                    <ol className="flex flex-wrap items-center gap-2">
                      {stepSteps.map((s, idx) => {
                        const n = idx + 1
                        const done = n < current || a.status === 'APPROVED'
                        const active = n === current && a.status === 'PENDING'
                        const actorLabel = done
                          ? stepActors[idx]?.actorName?.trim() || humanize(s.role)
                          : humanize(s.role)
                        return (
                          <li key={`${a.id}-step-${n}`} className="flex items-center gap-2">
                            {idx > 0 ? <ArrowRight className="size-3.5 text-slate-300" aria-hidden /> : null}
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                                done
                                  ? 'bg-emerald-50 text-emerald-800'
                                  : active
                                    ? 'bg-slate-900 text-white'
                                    : 'bg-slate-100 text-slate-500'
                              }`}
                              title={done && stepActors[idx]?.actorName ? humanize(s.role) : undefined}
                            >
                              <span
                                className={`flex size-4 items-center justify-center rounded-full text-[10px] font-bold ${
                                  done
                                    ? 'bg-emerald-200/80 text-emerald-900'
                                    : active
                                      ? 'bg-white/20 text-white'
                                      : 'bg-white text-slate-400'
                                }`}
                              >
                                {done ? <Check className="size-2.5" /> : n}
                              </span>
                              {actorLabel}
                            </span>
                          </li>
                        )
                      })}
                    </ol>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Step {current} of {total}
                    </p>
                  )}

                  <p className="text-xs text-slate-400">
                    {canApprove
                      ? a.currentStepRole && a.currentStepRole.toUpperCase() !== 'ORGANIZATION_ADMIN'
                        ? `Waiting for ${waitingRole} · you can approve as admin · requested ${new Date(a.requestedAt).toLocaleString()}`
                        : `Your turn · requested ${new Date(a.requestedAt).toLocaleString()}`
                      : `Waiting for ${waitingRole} · requested ${new Date(a.requestedAt).toLocaleString()}`}
                  </p>
                </div>

                <div className="flex shrink-0 gap-2 sm:flex-col sm:items-stretch lg:flex-row">
                  <Button
                    size="sm"
                    className="cursor-pointer gap-1"
                    disabled={approve.isPending || reject.isPending || !canApprove}
                    title={canApprove ? undefined : `Requires ${waitingRole} or Organization Admin`}
                    onClick={() => {
                      setDecisionComment('')
                      setDecision({ id: a.id, mode: 'approve' })
                    }}
                  >
                    <Check className="size-3.5" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="cursor-pointer gap-1"
                    disabled={approve.isPending || reject.isPending}
                    onClick={() => {
                      setDecisionComment('')
                      setDecision({ id: a.id, mode: 'reject' })
                    }}
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

      <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[var(--shadow-soft)]">
        <div className="border-b border-slate-100 px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">History</p>
          <h2 className="font-[family-name:var(--font-display)] text-base font-semibold text-slate-900">
            Approval history
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Recently approved or rejected requests — open the linked document to validate what was decided.
          </p>
        </div>
        <div className="p-5">
          {approvalHistory.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <ApprovalHistoryPanel
              requests={decidedHistory}
              emptyLabel="No decided approvals yet. Completed inbox items will show up here."
              showDocumentLink
            />
          )}
        </div>
      </section>

      <Dialog
        open={!!decision}
        onOpenChange={(open) => {
          if (!open) {
            setDecision(null)
            setDecisionComment('')
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogTitle>{decision?.mode === 'reject' ? 'Reject request' : 'Approve request'}</DialogTitle>
          <p className="mt-1 text-sm text-slate-500">
            {decision?.mode === 'reject'
              ? 'Optional comment is shared with the requester on the sales document.'
              : 'Optional comment is recorded on this approval step.'}
          </p>
          <div className="mt-4 space-y-2">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Comment (optional)</label>
            <Textarea
              rows={4}
              value={decisionComment}
              onChange={(e) => setDecisionComment(e.target.value)}
              placeholder={
                decision?.mode === 'reject'
                  ? 'e.g. Please revise delivery address before converting…'
                  : 'e.g. Looks good — proceed to next step…'
              }
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button
              variant="outline"
              className="cursor-pointer"
              disabled={approve.isPending || reject.isPending}
              onClick={() => {
                setDecision(null)
                setDecisionComment('')
              }}
            >
              Cancel
            </Button>
            <Button
              className="cursor-pointer"
              variant={decision?.mode === 'reject' ? 'outline' : 'default'}
              disabled={!decision || approve.isPending || reject.isPending}
              onClick={() => {
                if (!decision) return
                const payload = { id: decision.id, remarks: decisionComment.trim() || undefined }
                if (decision.mode === 'reject') reject.mutate(payload)
                else approve.mutate(payload)
              }}
            >
              {decision?.mode === 'reject' ? 'Confirm reject' : 'Confirm approve'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
                  statusFilter === value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
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
