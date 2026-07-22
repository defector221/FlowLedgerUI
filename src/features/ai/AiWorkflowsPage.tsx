import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Check, FileText, GitBranch, IndianRupee, Plus, Sparkles, X } from 'lucide-react'
import { toast } from 'sonner'
import { aiApi, type AiWorkflowApproval, type AiWorkflowDraft } from '@/services/api'
import { getApiErrorMessage } from '@/lib/api-error'
import { EmptyState, PageHeader } from '@/components/layout/PageChrome'
import { Badge, Button, Input, Skeleton, Textarea } from '@/components/ui'

type WorkflowStep = { order?: number; role?: string; action?: string }
type WorkflowConditions = { minAmount?: number | string; documentTypes?: string[] }

type StatusFilter = 'ALL' | 'ACTIVE' | 'DRAFT'

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

function WorkflowCard({
  draft,
  onActivate,
  onDeactivate,
  busy,
}: {
  draft: AiWorkflowDraft
  onActivate: () => void
  onDeactivate: () => void
  busy: boolean
}) {
  const conditions = parseJson<WorkflowConditions>(draft.conditionsJson, {})
  const steps = parseJson<WorkflowStep[]>(draft.stepsJson, [])
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const minAmount = formatInr(conditions.minAmount)
  const docTypes = conditions.documentTypes ?? []
  const isActive = draft.status === 'ACTIVE'
  const staleAdvisoryCopy = /stores config only|advisory workflow|does not auto-approve/i.test(
    draft.description ?? '',
  )

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
                Enforcing approvals on matching convert / confirm actions.
              </p>
            ) : (
              <p className="text-sm text-slate-500">
                Draft only — activate to gate matching sales documents.
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
            {docTypes.length
              ? docTypes.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700"
                  >
                    <FileText className="size-3.5 text-slate-400" />
                    {humanize(t)}
                  </span>
                ))
              : (
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

        <div className="flex shrink-0 gap-2">
          {isActive ? (
            <Button size="sm" variant="outline" className="cursor-pointer" disabled={busy} onClick={onDeactivate}>
              Deactivate
            </Button>
          ) : (
            <Button size="sm" className="cursor-pointer" disabled={busy} onClick={onActivate}>
              Activate
            </Button>
          )}
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

  const approve = useMutation({
    mutationFn: (id: string) => aiApi.approveWorkflow(id),
    onSuccess: () => {
      toast.success('Approved — retry the original convert/confirm action')
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
    const all = drafts.data ?? []
    if (statusFilter === 'ACTIVE') return all.filter((d) => d.status === 'ACTIVE')
    if (statusFilter === 'DRAFT') return all.filter((d) => d.status !== 'ACTIVE')
    return all
  }, [drafts.data, statusFilter])

  const pending: AiWorkflowApproval[] = approvals.data ?? []
  const activeCount = (drafts.data ?? []).filter((d) => d.status === 'ACTIVE').length
  const draftCount = (drafts.data ?? []).length - activeCount

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workflow Builder"
        subtitle="Create drafts with AI, then activate them to gate sales convert and confirm until approved."
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
            return (
              <article
                key={a.id}
                className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="warning">{a.status}</Badge>
                    <Badge variant="outline">{humanize(a.entityType)}</Badge>
                    {href ? (
                      <Link to={href} className="text-xs font-medium text-teal-700 hover:underline">
                        Open document
                      </Link>
                    ) : (
                      <span className="font-mono text-xs text-slate-500">{a.entityId.slice(0, 8)}…</span>
                    )}
                  </div>
                  {a.remarks ? <p className="text-sm text-slate-600">{a.remarks}</p> : null}
                  <p className="text-xs text-slate-400">
                    Requested {new Date(a.requestedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    className="cursor-pointer gap-1"
                    disabled={approve.isPending}
                    onClick={() => approve.mutate(a.id)}
                  >
                    <Check className="size-3.5" />
                    Approve
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
              AI creates a <span className="font-medium text-slate-700">draft</span>. Nothing is enforced until you
              activate it.
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
              Starts as a draft with ₹50,000 min on quotation / order / invoice. Activate to enforce.
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
                description="Generate one from a prompt or create a blank draft, then activate to enforce."
              />
            </div>
          ) : null}
          {rows.map((d) => (
            <WorkflowCard
              key={d.id}
              draft={d}
              busy={activate.isPending || deactivate.isPending}
              onActivate={() => activate.mutate(d.id)}
              onDeactivate={() => deactivate.mutate(d.id)}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
