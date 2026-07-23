import { Badge } from '@/components/ui'
import { cn } from '@/lib/utils'
import { classifyAction } from '../audit-model'

const TONE: Record<string, string> = {
  CREATE: 'bg-emerald-50 text-emerald-800',
  UPDATE: 'bg-sky-50 text-sky-800',
  DELETE: 'bg-rose-50 text-rose-800',
  APPROVE: 'bg-teal-50 text-teal-800',
  LOGIN: 'bg-indigo-50 text-indigo-800',
  LOGOUT: 'bg-slate-100 text-slate-700',
  EXPORT: 'bg-violet-50 text-violet-800',
  IMPORT: 'bg-violet-50 text-violet-800',
  CONFIGURE: 'bg-amber-50 text-amber-900',
  ENABLE: 'bg-emerald-50 text-emerald-800',
  DISABLE: 'bg-rose-50 text-rose-800',
  'RESET PASSWORD': 'bg-amber-50 text-amber-900',
}

export function AuditActionBadge({ action }: { action: string }) {
  const label = classifyAction(action)
  return (
    <Badge className={cn('font-semibold tracking-wide', TONE[label] ?? 'bg-slate-100 text-slate-700')} title={action}>
      {label}
    </Badge>
  )
}
