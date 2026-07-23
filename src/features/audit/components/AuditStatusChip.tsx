import { Badge } from '@/components/ui'
import type { AuditStatus } from '../audit-model'

const LABELS: Record<AuditStatus, { label: string; variant: 'success' | 'danger' | 'warning' | 'default' }> = {
  success: { label: 'Success', variant: 'success' },
  failed: { label: 'Failed', variant: 'danger' },
  warning: { label: 'Warning', variant: 'warning' },
  pending: { label: 'Pending', variant: 'default' },
}

export function AuditStatusChip({ status }: { status: AuditStatus }) {
  const meta = LABELS[status]
  return <Badge variant={meta.variant}>{meta.label}</Badge>
}
