import type { AuditLogResponse } from '@/types/api'

export type AuditModule =
  | 'Sales'
  | 'Purchase'
  | 'Inventory'
  | 'Finance'
  | 'Retail'
  | 'Transport'
  | 'Manufacturing'
  | 'CRM'
  | 'AI'
  | 'Settings'
  | 'Other'

export type AuditStatus = 'success' | 'failed' | 'warning' | 'pending'
export type AuditSeverity = 'information' | 'warning' | 'critical' | 'security'

export type ActivityViewMode = 'table' | 'timeline'

export type SavedViewId = 'today' | 'security' | 'inventory' | 'retail' | 'finance' | 'ai' | 'failed' | 'configuration'

export type ActivityFiltersState = {
  search: string
  action: string
  entityType: string
  module: AuditModule | 'All'
  from: string
  to: string
  severity: AuditSeverity | 'all'
  ipAddress: string
}

export const EMPTY_FILTERS: ActivityFiltersState = {
  search: '',
  action: '',
  entityType: '',
  module: 'All',
  from: '',
  to: '',
  severity: 'all',
  ipAddress: '',
}

export const MODULE_CHIPS: Array<{ id: AuditModule | 'All'; label: string }> = [
  { id: 'All', label: 'All' },
  { id: 'Sales', label: 'Sales' },
  { id: 'Purchase', label: 'Purchase' },
  { id: 'Inventory', label: 'Inventory' },
  { id: 'Finance', label: 'Finance' },
  { id: 'Retail', label: 'Retail' },
  { id: 'Transport', label: 'Transport' },
  { id: 'Manufacturing', label: 'Manufacturing' },
  { id: 'CRM', label: 'CRM' },
  { id: 'AI', label: 'AI' },
  { id: 'Settings', label: 'Settings' },
]

export const SAVED_VIEWS: Array<{
  id: SavedViewId
  label: string
  description: string
  filters: Partial<ActivityFiltersState>
}> = [
  {
    id: 'today',
    label: "Today's Events",
    description: 'Everything recorded since midnight',
    filters: { from: todayIso(), to: todayIso() },
  },
  {
    id: 'security',
    label: 'Security Events',
    description: 'Auth, access, and permission changes',
    filters: { search: 'PASSWORD', severity: 'security' },
  },
  {
    id: 'inventory',
    label: 'Inventory',
    description: 'Stock, warehouses, and products',
    filters: { module: 'Inventory', entityType: 'Product' },
  },
  {
    id: 'retail',
    label: 'Retail',
    description: 'POS and store activity',
    filters: { module: 'Retail', entityType: 'Pos' },
  },
  {
    id: 'finance',
    label: 'Finance',
    description: 'Accounting and ledger activity',
    filters: { module: 'Finance', entityType: 'Journal' },
  },
  {
    id: 'ai',
    label: 'AI',
    description: 'AI workflows and recommendations',
    filters: { module: 'AI', entityType: 'Ai' },
  },
  {
    id: 'failed',
    label: 'Destructive Actions',
    description: 'Deletes and cancellations',
    filters: { action: 'DELETE', severity: 'critical' },
  },
  {
    id: 'configuration',
    label: 'Configuration Changes',
    description: 'Settings and organization updates',
    filters: { module: 'Settings', entityType: 'Organization' },
  },
]

const MODULE_MATCHERS: Array<{ module: AuditModule; patterns: RegExp[] }> = [
  { module: 'Retail', patterns: [/retail/i, /\bpos\b/i, /store/i, /shift/i, /loyalty/i] },
  { module: 'Transport', patterns: [/transport/i, /shipment/i, /driver/i, /vehicle/i] },
  { module: 'AI', patterns: [/\bai\b/i, /workflow/i, /recommend/i, /chat/i] },
  { module: 'Finance', patterns: [/account/i, /journal/i, /ledger/i, /fiscal/i, /payment/i] },
  {
    module: 'Inventory',
    patterns: [/inventor/i, /warehouse/i, /stock/i, /product/i, /categor/i, /unit/i],
  },
  { module: 'Purchase', patterns: [/purchase/i, /supplier/i, /\bgrn\b/i, /bill/i] },
  {
    module: 'CRM',
    patterns: [/lead/i, /marketing/i, /campaign/i, /customer/i, /sequence/i],
  },
  {
    module: 'Sales',
    patterns: [/sales/i, /invoice/i, /quotation/i, /challan/i, /order/i],
  },
  { module: 'Manufacturing', patterns: [/manufactur/i, /bom/i, /work.?order/i, /production/i] },
  {
    module: 'Settings',
    patterns: [/organiz/i, /setting/i, /user/i, /role/i, /tax/i, /template/i, /permission/i, /platform/i],
  },
]

export function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

export function resolveModule(entityType: string): AuditModule {
  for (const entry of MODULE_MATCHERS) {
    if (entry.patterns.some((pattern) => pattern.test(entityType))) return entry.module
  }
  return 'Other'
}

export function moduleEntityHint(module: AuditModule | 'All'): string {
  switch (module) {
    case 'Sales':
      return 'Invoice'
    case 'Purchase':
      return 'Purchase'
    case 'Inventory':
      return 'Product'
    case 'Finance':
      return 'Journal'
    case 'Retail':
      return 'Pos'
    case 'Transport':
      return 'Shipment'
    case 'Manufacturing':
      return 'Manufactur'
    case 'CRM':
      return 'Lead'
    case 'AI':
      return 'Ai'
    case 'Settings':
      return 'Organization'
    default:
      return ''
  }
}

export function classifyAction(action: string): string {
  const value = action.toUpperCase()
  if (/(DELETE|REMOVE|CANCEL|VOID)/.test(value)) return 'DELETE'
  if (/(CREATE|ADD|POST|REGISTER|ONBOARD)/.test(value)) return 'CREATE'
  if (/(UPDATE|PUT|PATCH|EDIT|ADJUST|ALLOCATE)/.test(value)) return 'UPDATE'
  if (/APPROVE/.test(value)) return 'APPROVE'
  if (/LOGIN|SIGN.?IN/.test(value)) return 'LOGIN'
  if (/LOGOUT|SIGN.?OUT/.test(value)) return 'LOGOUT'
  if (/EXPORT/.test(value)) return 'EXPORT'
  if (/IMPORT/.test(value)) return 'IMPORT'
  if (/CONFIG|SETTING/.test(value)) return 'CONFIGURE'
  if (/ENABLE/.test(value)) return 'ENABLE'
  if (/DISABLE/.test(value)) return 'DISABLE'
  if (/PASSWORD|RESET/.test(value)) return 'RESET PASSWORD'
  return value.replaceAll('_', ' ')
}

export function resolveStatus(action: string): AuditStatus {
  const kind = classifyAction(action)
  if (kind === 'DELETE') return 'warning'
  if (kind === 'RESET PASSWORD' || kind === 'DISABLE') return 'warning'
  return 'success'
}

export function resolveSeverity(action: string, entityType: string): AuditSeverity {
  const value = `${action} ${entityType}`.toUpperCase()
  if (/(PASSWORD|PERMISSION|ROLE|AUTH|LOGIN|LOGOUT|TOKEN)/.test(value)) return 'security'
  if (/(DELETE|DISABLE|REMOVE|VOID|CANCEL)/.test(value)) return 'critical'
  if (/(WARN|FAIL|RETRY)/.test(value)) return 'warning'
  return 'information'
}

export function parseUserAgent(userAgent?: string | null) {
  const ua = userAgent ?? ''
  let browser = 'Unknown browser'
  let os = 'Unknown OS'
  if (/Edg\//.test(ua)) browser = 'Edge'
  else if (/Chrome\//.test(ua)) browser = 'Chrome'
  else if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) browser = 'Safari'
  else if (/Firefox\//.test(ua)) browser = 'Firefox'
  if (/Windows NT/i.test(ua)) os = 'Windows'
  else if (/Mac OS X|Macintosh/i.test(ua)) os = 'macOS'
  else if (/Android/i.test(ua)) os = 'Android'
  else if (/iPhone|iPad|iOS/i.test(ua)) os = 'iOS'
  else if (/Linux/i.test(ua)) os = 'Linux'
  const device = /Mobile|Android|iPhone|iPad/i.test(ua) ? 'Mobile' : 'Desktop'
  return { browser, os, device }
}

export function entityDisplayName(row: AuditLogResponse): string {
  const detail = asRecord(row.newValue)
  const result = asRecord(detail?.result)
  const request = asRecord(detail?.request)
  const candidates = [
    result?.invoiceNumber,
    result?.documentNumber,
    result?.name,
    result?.templateName,
    result?.email,
    request?.name,
    request?.customerName,
    request?.supplierName,
    request?.invoiceNumber,
    request?.documentNumber,
  ]
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim()
  }
  return formatEntityType(row.entityType)
}

export function formatEntityType(entityType: string) {
  return entityType
    .replaceAll(/([a-z])([A-Z])/g, '$1 $2')
    .replaceAll('_', ' ')
    .replaceAll('/', ' / ')
}

export function extractAuditMeta(row: AuditLogResponse) {
  const detail = asRecord(row.newValue)
  const result = asRecord(detail?.result)
  return {
    httpMethod: typeof detail?.httpMethod === 'string' ? detail.httpMethod : null,
    path: typeof detail?.path === 'string' ? detail.path : null,
    controller: typeof detail?.controller === 'string' ? detail.controller : null,
    method: typeof detail?.method === 'string' ? detail.method : null,
    responseStatus:
      typeof result?.status === 'string' || typeof result?.status === 'number' ? String(result.status) : '200',
  }
}

export function relatedRecordPath(row: AuditLogResponse): string | null {
  if (!row.entityId) return null
  const type = row.entityType.toLowerCase()
  if (type.includes('salesinvoice') || type === 'invoice') return `/sales/invoices/${row.entityId}`
  if (type.includes('purchaseinvoice')) return `/purchases/invoices/${row.entityId}`
  if (type.includes('quotation')) return `/sales/quotations/${row.entityId}`
  if (type.includes('salesorder')) return `/sales/orders/${row.entityId}`
  if (type.includes('deliverychallan') || type.includes('challan')) return `/sales/challans/${row.entityId}`
  if (type.includes('payment')) return `/payments/${row.entityId}`
  if (type.includes('customer')) return `/customers/${row.entityId}`
  if (type.includes('supplier')) return `/suppliers/${row.entityId}`
  if (type.includes('product')) return `/products/${row.entityId}`
  if (type.includes('shipment')) return `/transport/shipments/${row.entityId}`
  if (type.includes('lead')) return `/leads/${row.entityId}`
  if (type.includes('journal')) return `/accounting/journals/${row.entityId}`
  return null
}

export function initials(name?: string | null, email?: string | null) {
  const source = (name || email || '?').trim()
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase()
  return source.slice(0, 2).toUpperCase()
}

export function formatAbsoluteDate(iso: string) {
  const date = new Date(iso)
  return {
    day: date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }),
    time: date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
  }
}

export function formatRelativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.round(diffMs / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 14) return `${days}d ago`
  return formatAbsoluteDate(iso).day
}

export function highlightMatch(text: string, query: string) {
  if (!query.trim()) return [{ text, match: false }]
  const needle = query.trim()
  const lower = text.toLowerCase()
  const index = lower.indexOf(needle.toLowerCase())
  if (index < 0) return [{ text, match: false }]
  return [
    { text: text.slice(0, index), match: false },
    { text: text.slice(index, index + needle.length), match: true },
    { text: text.slice(index + needle.length), match: false },
  ].filter((part) => part.text.length > 0)
}

export function matchesClientFilters(row: AuditLogResponse, filters: ActivityFiltersState) {
  if (filters.module !== 'All' && resolveModule(row.entityType) !== filters.module) return false
  if (filters.severity !== 'all' && resolveSeverity(row.action, row.entityType) !== filters.severity) return false
  if (filters.ipAddress && !(row.ipAddress ?? '').toLowerCase().includes(filters.ipAddress.toLowerCase())) {
    return false
  }
  return true
}

export function buildListParams(filters: ActivityFiltersState, page: number, size: number) {
  return {
    page,
    size,
    ...(filters.search ? { search: filters.search } : {}),
    ...(filters.action ? { action: filters.action } : {}),
    ...(filters.entityType ? { entityType: filters.entityType } : {}),
    ...(filters.from ? { from: filters.from } : {}),
    ...(filters.to ? { to: filters.to } : {}),
  }
}

export function downloadText(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function rowsToCsv(rows: AuditLogResponse[]) {
  const header = ['id', 'action', 'entityType', 'entityId', 'userName', 'userEmail', 'ipAddress', 'createdAt']
  const escape = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`
  const lines = [
    header.join(','),
    ...rows.map((row) =>
      [row.id, row.action, row.entityType, row.entityId, row.userName, row.userEmail, row.ipAddress, row.createdAt]
        .map(escape)
        .join(','),
    ),
  ]
  return lines.join('\n')
}
