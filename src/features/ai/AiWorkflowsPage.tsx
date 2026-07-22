import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { GitBranch, Plus, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { aiApi, type AiWorkflowDraft } from '@/services/api'
import { getApiErrorMessage } from '@/lib/api-error'
import { EmptyState, PageHeader } from '@/components/layout/PageChrome'
import { Badge, Button, Input, Skeleton, Textarea } from '@/components/ui'

export function AiWorkflowsPage() {
  const queryClient = useQueryClient()
  const [prompt, setPrompt] = useState('')
  const [name, setName] = useState('')

  const drafts = useQuery({
    queryKey: ['ai-workflow-drafts'],
    queryFn: () => aiApi.workflowDrafts(),
  })

  const suggest = useMutation({
    mutationFn: (text: string) => aiApi.suggestWorkflow(text),
    onSuccess: () => {
      toast.success('Draft workflow created from your prompt')
      setPrompt('')
      void queryClient.invalidateQueries({ queryKey: ['ai-workflow-drafts'] })
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const create = useMutation({
    mutationFn: () =>
      aiApi.createWorkflowDraft({
        name: name.trim() || 'New approval workflow',
        triggerType: 'MANUAL',
        description: 'Manual draft — configure steps before activate.',
        stepsJson: '[{"order":1,"role":"REQUESTER","action":"SUBMIT"},{"order":2,"role":"ORGANIZATION_ADMIN","action":"APPROVE"}]',
        suggestedApprovers: 'ORGANIZATION_ADMIN',
      }),
    onSuccess: () => {
      setName('')
      void queryClient.invalidateQueries({ queryKey: ['ai-workflow-drafts'] })
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const activate = useMutation({
    mutationFn: (id: string) => aiApi.activateWorkflow(id),
    onSuccess: () => {
      toast.success('Workflow marked ACTIVE (config only — no auto-approve)')
      void queryClient.invalidateQueries({ queryKey: ['ai-workflow-drafts'] })
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const deactivate = useMutation({
    mutationFn: (id: string) => aiApi.deactivateWorkflow(id),
    onSuccess: () => {
      toast.success('Workflow deactivated')
      void queryClient.invalidateQueries({ queryKey: ['ai-workflow-drafts'] })
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const rows: AiWorkflowDraft[] = drafts.data ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workflow Builder"
        subtitle="Design advisory approval flows with AI. Activation stores configuration only — it never bypasses ERP posting or approvals."
      />

      <div className="rounded-2xl border border-amber-200/80 bg-amber-50/60 px-4 py-3 text-sm text-amber-950">
        <strong className="font-semibold">Advisory mode:</strong> Active workflows do not auto-approve invoices,
        POs, or payments. Use them as playbooks until execution hooks are enabled.
      </div>

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
              placeholder="e.g. Require admin approval for purchase orders over ₹50,000, then accountant review for payments…"
            />
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
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Workflow name"
            />
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
        <div className="border-b border-slate-100 px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Drafts</p>
          <h2 className="font-[family-name:var(--font-display)] text-base font-semibold text-slate-900">
            Saved workflows
          </h2>
        </div>
        <div className="divide-y divide-slate-100">
          {drafts.isLoading ? (
            <div className="space-y-3 p-5">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : null}
          {!drafts.isLoading && !rows.length ? (
            <div className="p-10">
              <EmptyState
                title="No workflow drafts"
                description="Generate one from a natural-language prompt or create a blank draft."
              />
            </div>
          ) : null}
          {rows.map((d) => (
            <article key={d.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <GitBranch className="size-4 text-teal-700" />
                  <h3 className="font-semibold text-slate-900">{d.name}</h3>
                  <Badge variant={d.status === 'ACTIVE' ? 'success' : 'neutral'}>{d.status}</Badge>
                  <Badge variant="outline">{d.triggerType}</Badge>
                </div>
                {d.description ? <p className="text-sm text-slate-600">{d.description}</p> : null}
                {d.suggestedApprovers ? (
                  <p className="text-xs text-slate-500">Approvers: {d.suggestedApprovers}</p>
                ) : null}
                {d.stepsJson ? (
                  <pre className="max-h-28 overflow-auto rounded-lg bg-slate-50 p-2 text-[11px] text-slate-600">
                    {d.stepsJson}
                  </pre>
                ) : null}
              </div>
              <div className="flex shrink-0 gap-2">
                {d.status === 'ACTIVE' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="cursor-pointer"
                    disabled={deactivate.isPending}
                    onClick={() => deactivate.mutate(d.id)}
                  >
                    Deactivate
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="cursor-pointer"
                    disabled={activate.isPending}
                    onClick={() => activate.mutate(d.id)}
                  >
                    Activate
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
