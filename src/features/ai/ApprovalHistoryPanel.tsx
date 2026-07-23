import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui'
import type { AiWorkflowApproval } from '@/services/api'
import { humanizeWorkflowToken, workflowDocumentLabel, workflowDocumentPath } from '@/lib/workflow-docs'

function formatActionRemarks(remarks: string) {
  return remarks
    .replace(/\b[A-Z][A-Z0-9_]+\b/g, (token) => humanizeWorkflowToken(token))
    .replace(/\s·\sApprove$/i, '')
    .replace(/\s·\sReview$/i, '')
    .trim()
}

export function ApprovalHistoryPanel({
  requests,
  emptyLabel = 'No approval history yet.',
  showDocumentLink = true,
  className = '',
}: {
  requests: AiWorkflowApproval[]
  emptyLabel?: string
  showDocumentLink?: boolean
  className?: string
}) {
  if (!requests.length) {
    return <p className="text-sm text-slate-500">{emptyLabel}</p>
  }

  return (
    <div className={`max-h-96 space-y-3 overflow-y-auto pr-1 ${className}`}>
      {requests.map((request) => {
        const rejected = request.status === 'REJECTED'
        const approved = request.status === 'APPROVED'
        const pending = request.status === 'PENDING'
        const href = workflowDocumentPath(request.entityType, request.entityId)
        const contextLabel =
          request.entityType === 'DELIVERY_CHALLAN'
            ? 'Convert challan → invoice'
            : request.entityType === 'SALES_INVOICE'
              ? 'Sales invoice'
              : humanizeWorkflowToken(request.entityType)
        const decisionComments = (request.actions ?? []).filter(
          (action) =>
            action.remarks &&
            (action.action === 'REJECTED' || action.action === 'APPROVED' || action.action === 'STEP_APPROVED'),
        )
        return (
          <div
            key={request.id}
            className={`rounded-xl border p-4 ${
              rejected
                ? 'border-rose-200 bg-rose-50/50'
                : approved
                  ? 'border-emerald-200 bg-emerald-50/40'
                  : 'border-amber-200 bg-amber-50/40'
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={rejected ? 'danger' : approved ? 'success' : 'warning'}>{request.status}</Badge>
              <span className="text-sm font-medium text-slate-800">{request.workflowName ?? 'Workflow approval'}</span>
              <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-medium text-slate-500 ring-1 ring-slate-200/80">
                {contextLabel}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Requested {new Date(request.requestedAt).toLocaleString()}
              {request.requestedByName ? ` by ${request.requestedByName}` : null}
              {request.decidedAt ? ` · Decided ${new Date(request.decidedAt).toLocaleString()}` : null}
              {request.decidedByName ? ` by ${request.decidedByName}` : null}
            </p>
            {pending ? (
              <p className="mt-2 text-sm text-amber-900">
                Waiting for{' '}
                {request.currentStepRole ? humanizeWorkflowToken(request.currentStepRole).toLowerCase() : 'approver'}{' '}
                (step {request.currentStep ?? 1}/{request.totalSteps ?? 1}).
              </p>
            ) : null}
            {rejected && request.remarks ? (
              <div className="mt-3 rounded-lg bg-white/80 p-3 text-sm text-rose-950">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-700">
                  Rejection comment
                  {request.decidedByName ? ` · ${request.decidedByName}` : null}
                </p>
                <p className="mt-1 whitespace-pre-wrap">{request.remarks}</p>
              </div>
            ) : null}
            {decisionComments.length ? (
              <ul className="mt-3 space-y-2">
                {decisionComments.map((action) => {
                  const isReject = action.action === 'REJECTED'
                  const label = humanizeWorkflowToken(action.action)
                  const who = action.actorName?.trim()
                  return (
                    <li key={action.id} className="rounded-lg bg-white/80 px-3 py-2 text-sm text-slate-700">
                      <p
                        className={`text-[11px] font-semibold uppercase tracking-wide ${
                          isReject ? 'text-rose-700' : 'text-slate-400'
                        }`}
                      >
                        {label}
                        {who ? ` · ${who}` : null}
                        {' · '}
                        {new Date(action.actedAt).toLocaleString()}
                      </p>
                      {action.remarks ? (
                        <p className="mt-1 whitespace-pre-wrap">{formatActionRemarks(action.remarks)}</p>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-3">
              {showDocumentLink && href ? (
                <Link to={href} className="text-xs font-medium text-teal-700 hover:underline">
                  {workflowDocumentLabel(request.entityType)}
                </Link>
              ) : null}
              {pending ? (
                <Link
                  to={`/ai/workflows?focus=${request.id}`}
                  className="text-xs font-medium text-teal-700 hover:underline"
                >
                  Open workflows inbox
                </Link>
              ) : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}
