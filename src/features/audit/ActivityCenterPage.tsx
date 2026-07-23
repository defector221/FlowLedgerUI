import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  AlertTriangle,
  Bot,
  LayoutList,
  ListTree,
  RefreshCw,
  Settings2,
  ShieldAlert,
  Users,
} from 'lucide-react'
import { auditApi } from '@/services/api'
import { getApiErrorMessage } from '@/lib/api-error'
import { cn } from '@/lib/utils'
import { PageHeader, PageShell } from '@/components/layout/PageChrome'
import { Button, Card, Switch } from '@/components/ui'
import {
  EMPTY_FILTERS,
  buildListParams,
  matchesClientFilters,
  resolveSeverity,
  todayIso,
  type ActivityFiltersState,
  type ActivityViewMode,
  type SavedViewId,
} from './audit-model'
import { ActivityDrawer } from './components/ActivityDrawer'
import { ActivityFilters } from './components/ActivityFilters'
import { ActivityPagination } from './components/ActivityPagination'
import { ActivitySummaryCards, type SummaryMetric } from './components/ActivitySummaryCards'
import { AuditTable } from './components/AuditTable'
import { AuditTimeline } from './components/AuditTimeline'
import { ExportMenu } from './components/ExportMenu'
import { SavedViewsMenu } from './components/SavedViewsMenu'

export function AuditLogsPage() {
  return <ActivityCenterPage />
}

export function ActivityCenterPage() {
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(20)
  const [filters, setFilters] = useState<ActivityFiltersState>(EMPTY_FILTERS)
  const [searchInput, setSearchInput] = useState('')
  const [viewMode, setViewMode] = useState<ActivityViewMode>('table')
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeView, setActiveView] = useState<SavedViewId | null>(null)

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const nextSearch = searchInput.trim()
      setFilters((current) => {
        if (current.search === nextSearch) return current
        queueMicrotask(() => setPage(0))
        return { ...current, search: nextSearch }
      })
    }, 300)
    return () => window.clearTimeout(handle)
  }, [searchInput])

  const listParams = useMemo(() => buildListParams(filters, page, size), [filters, page, size])

  const listQuery = useQuery({
    queryKey: ['audit-logs', listParams],
    queryFn: () => auditApi.list(listParams),
    placeholderData: (previous) => previous,
    refetchInterval: autoRefresh ? 30_000 : false,
  })

  const today = todayIso()
  const summaryQuery = useQuery({
    queryKey: ['audit-logs', 'summary', today],
    queryFn: async () => {
      const [todayPage, deletePage, aiPage, settingsPage] = await Promise.all([
        auditApi.list({ page: 0, size: 100, from: today, to: today }),
        auditApi.list({ page: 0, size: 1, from: today, to: today, action: 'DELETE' }),
        auditApi.list({ page: 0, size: 1, from: today, to: today, entityType: 'Ai' }),
        auditApi.list({ page: 0, size: 1, from: today, to: today, entityType: 'Organization' }),
      ])
      const uniqueUsers = new Set(
        todayPage.content.map((row) => row.userId ?? row.userEmail ?? row.userName).filter(Boolean),
      ).size
      const securityEvents = todayPage.content.filter(
        (row) => resolveSeverity(row.action, row.entityType) === 'security',
      ).length
      const criticalEvents = todayPage.content.filter(
        (row) => resolveSeverity(row.action, row.entityType) === 'critical',
      ).length
      return {
        todayEvents: todayPage.totalElements,
        uniqueUsers,
        securityEvents,
        criticalEvents,
        deleteEvents: deletePage.totalElements,
        aiEvents: aiPage.totalElements,
        configEvents: settingsPage.totalElements,
      }
    },
    staleTime: 60_000,
    refetchInterval: autoRefresh ? 30_000 : false,
  })

  const serverRows = listQuery.data?.content ?? []
  const rows = useMemo(
    () => serverRows.filter((row) => matchesClientFilters(row, filters)),
    [serverRows, filters],
  )
  const totalElements = listQuery.data?.totalElements ?? 0
  const totalPages = Math.max(1, listQuery.data?.totalPages ?? 1)
  const hasFilters = Boolean(
    filters.search ||
      filters.action ||
      filters.entityType ||
      filters.module !== 'All' ||
      filters.from ||
      filters.to ||
      filters.severity !== 'all' ||
      filters.ipAddress,
  )

  const activeChips = useMemo(() => {
    const chips: Array<{ id: string; label: string }> = []
    if (filters.module !== 'All') chips.push({ id: 'module', label: filters.module })
    if (filters.action) chips.push({ id: 'action', label: `Action: ${filters.action}` })
    if (filters.entityType) chips.push({ id: 'entityType', label: `Entity: ${filters.entityType}` })
    if (filters.severity !== 'all') chips.push({ id: 'severity', label: `Severity: ${filters.severity}` })
    if (filters.ipAddress) chips.push({ id: 'ipAddress', label: `IP: ${filters.ipAddress}` })
    if (filters.from || filters.to) {
      chips.push({ id: 'date', label: `${filters.from || '…'} → ${filters.to || '…'}` })
    }
    if (filters.search) chips.push({ id: 'search', label: `Search: ${filters.search}` })
    if (activeView) chips.push({ id: 'view', label: `View: ${activeView}` })
    return chips
  }, [filters, activeView])

  const metrics: SummaryMetric[] = [
    {
      id: 'today',
      label: "Today's events",
      value: summaryQuery.data?.todayEvents ?? '—',
      subtitle: 'Across all modules',
      trend: 'Live',
      icon: Activity,
      tone: 'teal',
    },
    {
      id: 'users',
      label: "Today's users",
      value: summaryQuery.data?.uniqueUsers ?? '—',
      subtitle: 'Unique actors (sample)',
      icon: Users,
      tone: 'sky',
    },
    {
      id: 'critical',
      label: 'Critical events',
      value: summaryQuery.data?.criticalEvents ?? '—',
      subtitle: 'Deletes & destructive',
      icon: AlertTriangle,
      tone: 'amber',
    },
    {
      id: 'failed',
      label: 'Destructive actions',
      value: summaryQuery.data?.deleteEvents ?? '—',
      subtitle: 'DELETE actions today',
      icon: ShieldAlert,
      tone: 'rose',
    },
    {
      id: 'config',
      label: 'Configuration changes',
      value: summaryQuery.data?.configEvents ?? '—',
      subtitle: 'Org & settings',
      icon: Settings2,
      tone: 'slate',
    },
    {
      id: 'ai',
      label: 'AI activities',
      value: summaryQuery.data?.aiEvents ?? '—',
      subtitle: 'AI module events',
      icon: Bot,
      tone: 'violet',
    },
  ]

  const updateFilters = (next: ActivityFiltersState) => {
    setFilters(next)
    setActiveView(null)
    setPage(0)
  }

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS)
    setSearchInput('')
    setActiveView(null)
    setPage(0)
  }

  const removeChip = (id: string) => {
    if (id === 'view') {
      setActiveView(null)
      return
    }
    if (id === 'module') updateFilters({ ...filters, module: 'All' })
    else if (id === 'action') updateFilters({ ...filters, action: '' })
    else if (id === 'entityType') updateFilters({ ...filters, entityType: '' })
    else if (id === 'severity') updateFilters({ ...filters, severity: 'all' })
    else if (id === 'ipAddress') updateFilters({ ...filters, ipAddress: '' })
    else if (id === 'date') updateFilters({ ...filters, from: '', to: '' })
    else if (id === 'search') {
      setSearchInput('')
      updateFilters({ ...filters, search: '' })
    }
  }

  return (
    <PageShell className="pb-8">
      <PageHeader
        title="Activity Center"
        subtitle="Monitor and investigate every important event across your organization."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ExportMenu rows={rows} />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void listQuery.refetch()}
              disabled={listQuery.isFetching}
            >
              <RefreshCw className={cn('size-3.5', listQuery.isFetching && 'animate-spin')} />
              Refresh
            </Button>
            <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600">
              <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} aria-label="Auto refresh" />
              Auto refresh
            </label>
            <SavedViewsMenu
              onApply={(viewId, nextFilters) => {
                setFilters(nextFilters)
                setSearchInput(nextFilters.search)
                setActiveView(viewId)
                setPage(0)
              }}
            />
          </div>
        }
      />

      <ActivitySummaryCards metrics={metrics} loading={summaryQuery.isLoading} />

      <ActivityFilters
        draft={filters}
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        onChange={updateFilters}
        onClear={clearFilters}
        activeChips={activeChips}
        onRemoveChip={removeChip}
      />

      <Card className="overflow-hidden rounded-xl border-slate-200/90 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Audit activity</h2>
            <p className="text-xs text-slate-500">
              {listQuery.isError
                ? getApiErrorMessage(listQuery.error)
                : `${totalElements.toLocaleString()} matching events · ${resolveModuleLabel(filters.module)}`}
            </p>
          </div>
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1" role="tablist" aria-label="View mode">
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'table'}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800',
              )}
              onClick={() => setViewMode('table')}
            >
              <LayoutList className="size-3.5" />
              Table
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'timeline'}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                viewMode === 'timeline' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800',
              )}
              onClick={() => setViewMode('timeline')}
            >
              <ListTree className="size-3.5" />
              Timeline
            </button>
          </div>
        </div>

        {viewMode === 'table' ? (
          <AuditTable
            rows={rows}
            search={filters.search}
            loading={listQuery.isLoading && !listQuery.data}
            hasFilters={hasFilters}
            onClearFilters={clearFilters}
            onOpen={setSelectedId}
          />
        ) : (
          <AuditTimeline
            rows={rows}
            loading={listQuery.isLoading && !listQuery.data}
            onOpen={setSelectedId}
          />
        )}

        <ActivityPagination
          page={page}
          size={size}
          totalElements={totalElements}
          totalPages={totalPages}
          busy={listQuery.isFetching}
          onPageChange={setPage}
          onSizeChange={(nextSize) => {
            setSize(nextSize)
            setPage(0)
          }}
        />
      </Card>

      <ActivityDrawer eventId={selectedId} open={!!selectedId} onClose={() => setSelectedId(null)} />
    </PageShell>
  )
}

function resolveModuleLabel(module: ActivityFiltersState['module']) {
  return module === 'All' ? 'All modules' : `${module} module`
}
