import { Building2, Package, ReceiptText, Search, ShoppingCart, Truck, Users } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/auth'
import { getApiErrorMessage } from '@/lib/api-error'
import { cn } from '@/lib/utils'
import { aiApi, searchApi } from '@/services/api'
import type { GlobalSearchHit, GlobalSearchResponse, SearchEntityType } from '@/types/api'
import { Button, Dialog, DialogContent, DialogDescription, DialogTitle, Input } from '@/components/ui'
import { flattenNavLeaves, type NavLeaf } from '@/components/layout/sidebar/nav-config'
import { isPlatformFeatureEnabled, isPlatformModuleEnabled, platformCodeForRbac, useCapabilities } from '@/platform'

const PAGE_SIZE = 15

type PaletteItem = { kind: 'page'; leaf: NavLeaf } | { kind: 'hit'; hit: GlobalSearchHit; groupIcon: typeof Package }

const GROUP_ORDER: { type: SearchEntityType; label: string; icon: typeof Package }[] = [
  { type: 'PRODUCT', label: 'Products', icon: Package },
  { type: 'CUSTOMER', label: 'Customers', icon: Users },
  { type: 'SUPPLIER', label: 'Suppliers', icon: Building2 },
  { type: 'SALES_INVOICE', label: 'Sales Invoices', icon: ReceiptText },
  { type: 'PURCHASE_INVOICE', label: 'Purchase Invoices', icon: ShoppingCart },
  { type: 'SHIPMENT', label: 'Shipments', icon: Truck },
]

function pathFor(hit: GlobalSearchHit) {
  switch (hit.entityType) {
    case 'PRODUCT':
      return `/products/${hit.entityId}`
    case 'CUSTOMER':
      return `/customers/${hit.entityId}`
    case 'SUPPLIER':
      return `/suppliers/${hit.entityId}`
    case 'SALES_INVOICE':
      return `/sales/invoices/${hit.entityId}`
    case 'PURCHASE_INVOICE':
      return `/purchases/invoices/${hit.entityId}`
    case 'SHIPMENT':
      return `/transport/shipments/${hit.entityId}`
    default:
      return '/'
  }
}

function normalizeHits(payload: GlobalSearchResponse | Record<string, unknown>): GlobalSearchHit[] {
  if (payload && typeof payload === 'object' && Array.isArray((payload as GlobalSearchResponse).results)) {
    return (payload as GlobalSearchResponse).results
  }
  const groups = (payload as { groups?: Array<{ hits?: GlobalSearchHit[] }> }).groups
  if (Array.isArray(groups)) {
    return groups.flatMap((group) => group.hits ?? [])
  }
  return []
}

function SearchResults({
  listId,
  query,
  loading,
  loadingMore,
  error,
  pages,
  groups,
  flat,
  activeIndex,
  setActiveIndex,
  onSelectPage,
  onSelect,
  hasMore,
  total,
  onLoadMore,
}: {
  listId: string
  query: string
  loading: boolean
  loadingMore: boolean
  error: string | null
  pages: NavLeaf[]
  groups: Array<(typeof GROUP_ORDER)[number] & { hits: GlobalSearchHit[] }>
  flat: PaletteItem[]
  activeIndex: number
  setActiveIndex: (index: number) => void
  onSelectPage: (leaf: NavLeaf) => void
  onSelect: (hit: GlobalSearchHit) => void
  hasMore: boolean
  total: number
  onLoadMore: () => void
}) {
  const trimmed = query.trim()
  const entityFlat = flat.filter((item) => item.kind === 'hit')
  const empty = !loading && !error && trimmed.length > 0 && flat.length === 0

  return (
    <div id={listId} role="listbox" className="max-h-[min(28rem,70vh)] overflow-auto p-2">
      {trimmed.length === 0 ? (
        <p className="px-3 py-6 text-sm text-slate-500">Search pages, customers, products, invoices…</p>
      ) : null}

      {pages.length > 0 ? (
        <div className="mb-2">
          <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Pages</p>
          {pages.map((leaf) => {
            const index = flat.findIndex((item) => item.kind === 'page' && item.leaf.id === leaf.id)
            const active = index === activeIndex
            const Icon = leaf.icon
            return (
              <button
                key={leaf.id}
                type="button"
                role="option"
                aria-selected={active}
                className={cn(
                  'flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left transition-colors',
                  active ? 'bg-teal-50 text-teal-950' : 'hover:bg-slate-50',
                )}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => onSelectPage(leaf)}
              >
                <Icon className="mt-0.5 size-4 shrink-0 text-slate-500" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{leaf.label}</span>
                  <span className="block truncate text-xs text-slate-500">{leaf.to}</span>
                </span>
              </button>
            )
          })}
        </div>
      ) : null}

      {trimmed.length > 0 && trimmed.length < 2 && pages.length === 0 ? (
        <p className="px-3 py-4 text-sm text-slate-500">Type at least 2 characters to search records.</p>
      ) : null}
      {loading ? <p className="px-3 py-6 text-sm text-slate-500">Searching…</p> : null}
      {!loading && error ? <p className="px-3 py-6 text-sm text-rose-600">{error}</p> : null}
      {empty ? <p className="px-3 py-6 text-sm text-slate-500">No matches for “{trimmed}”</p> : null}
      {!loading && !error
        ? groups.map((group) => (
            <div key={group.type} className="mb-2">
              <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                {group.label}
              </p>
              {group.hits.map((hit) => {
                const index = flat.findIndex(
                  (item) =>
                    item.kind === 'hit' && item.hit.entityId === hit.entityId && item.hit.entityType === hit.entityType,
                )
                const active = index === activeIndex
                const Icon = group.icon
                return (
                  <button
                    key={`${hit.entityType}-${hit.entityId}`}
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left transition-colors',
                      active ? 'bg-teal-50 text-teal-950' : 'hover:bg-slate-50',
                    )}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => onSelect(hit)}
                  >
                    <Icon className="mt-0.5 size-4 shrink-0 text-slate-500" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{hit.title}</span>
                      {hit.subtitle ? (
                        <span className="block truncate text-xs text-slate-500">{hit.subtitle}</span>
                      ) : null}
                    </span>
                    {hit.referenceNumber ? (
                      <span className="hidden max-w-[7rem] shrink-0 truncate text-xs font-medium text-slate-400 sm:inline">
                        {hit.referenceNumber}
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>
          ))
        : null}
      {!loading && !error && entityFlat.length > 0 ? (
        <div className="border-t border-slate-100 px-2 pt-2">
          <p className="px-1 pb-2 text-[11px] text-slate-400">
            Showing {entityFlat.length}
            {total > 0 ? ` of ${total}` : ''}
          </p>
          {hasMore ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mb-1 w-full"
              disabled={loadingMore}
              onClick={onLoadMore}
            >
              {loadingMore ? 'Loading…' : 'Load more'}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export function GlobalSearch() {
  const navigate = useNavigate()
  const { activeOrganization, canAccessModule } = useAuth()
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dialogInputRef = useRef<HTMLInputElement>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GlobalSearchHit[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const searchActive = dropdownOpen || paletteOpen

  const aiHealth = useQuery({
    queryKey: ['ai-health'],
    queryFn: () => aiApi.health(),
    retry: false,
    staleTime: 60_000,
  })
  const { data: capabilities } = useCapabilities()
  const aiAvailable = aiHealth.isSuccess && aiHealth.data?.enabled !== false

  useEffect(() => {
    setDropdownOpen(false)
    setPaletteOpen(false)
    setQuery('')
    setResults([])
    setPage(1)
    setHasMore(false)
    setTotal(0)
    setError(null)
    setActiveIndex(0)
  }, [activeOrganization?.id])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setDropdownOpen(false)
        setPaletteOpen(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

  useEffect(() => {
    if (!paletteOpen) return
    const timer = window.setTimeout(() => dialogInputRef.current?.focus(), 10)
    return () => window.clearTimeout(timer)
  }, [paletteOpen])

  useEffect(() => {
    const trimmed = query.trim()
    if (!searchActive || trimmed.length < 2) {
      setResults([])
      setPage(1)
      setHasMore(false)
      setTotal(0)
      setLoading(false)
      setLoadingMore(false)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    setPage(1)
    const timer = window.setTimeout(async () => {
      try {
        const response = await searchApi.search(trimmed, { limit: PAGE_SIZE, page: 1 })
        if (!cancelled) {
          setResults(normalizeHits(response))
          setHasMore(Boolean(response.hasMore))
          setTotal(Number(response.total ?? normalizeHits(response).length))
          setPage(1)
          setActiveIndex(0)
        }
      } catch (err) {
        if (!cancelled) {
          setResults([])
          setHasMore(false)
          setTotal(0)
          setError(getApiErrorMessage(err))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 300)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [query, searchActive, activeOrganization?.id])

  const loadMore = async () => {
    const trimmed = query.trim()
    if (!hasMore || loadingMore || trimmed.length < 2) return
    const nextPage = page + 1
    setLoadingMore(true)
    try {
      const response = await searchApi.search(trimmed, { limit: PAGE_SIZE, page: nextPage })
      const nextHits = normalizeHits(response)
      setResults((current) => {
        const seen = new Set(current.map((hit) => `${hit.entityType}:${hit.entityId}`))
        return [...current, ...nextHits.filter((hit) => !seen.has(`${hit.entityType}:${hit.entityId}`))]
      })
      setHasMore(Boolean(response.hasMore))
      setTotal(Number(response.total ?? 0))
      setPage(nextPage)
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setLoadingMore(false)
    }
  }

  const pageMatches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q || !searchActive) return []
    return flattenNavLeaves()
      .filter((leaf) => {
        if (!canAccessModule(leaf.module)) return false
        const code = platformCodeForRbac(leaf.module)
        if (!isPlatformModuleEnabled(capabilities, code)) return false
        if (leaf.module === 'retail' || leaf.to.startsWith('/retail')) {
          if (!isPlatformModuleEnabled(capabilities, 'RETAIL')) return false
        }
        if (leaf.module === 'ai' || leaf.module === 'aiRecommendations' || leaf.module === 'aiWorkflow') {
          if (!aiAvailable || !isPlatformModuleEnabled(capabilities, 'AI')) return false
        }
        if (leaf.feature && code && !isPlatformFeatureEnabled(capabilities, code, leaf.feature)) return false
        const hay = [leaf.label, leaf.to, ...(leaf.keywords ?? [])].join(' ').toLowerCase()
        return hay.includes(q)
      })
      .slice(0, 8)
  }, [query, searchActive, canAccessModule, capabilities, aiAvailable])

  const groups = useMemo(
    () =>
      GROUP_ORDER.map((group) => ({
        ...group,
        hits: results.filter((hit) => hit.entityType === group.type),
      })).filter((group) => group.hits.length > 0),
    [results],
  )

  const flat = useMemo<PaletteItem[]>(
    () => [
      ...pageMatches.map((leaf) => ({ kind: 'page' as const, leaf })),
      ...groups.flatMap((group) => group.hits.map((hit) => ({ kind: 'hit' as const, hit, groupIcon: group.icon }))),
    ],
    [pageMatches, groups],
  )

  const resetSearch = () => {
    setDropdownOpen(false)
    setPaletteOpen(false)
    setQuery('')
    setResults([])
    setPage(1)
    setHasMore(false)
    setTotal(0)
  }

  const goTo = (hit: GlobalSearchHit) => {
    resetSearch()
    navigate(pathFor(hit))
  }

  const goToPage = (leaf: NavLeaf) => {
    resetSearch()
    navigate(leaf.to)
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setDropdownOpen(false)
      setPaletteOpen(false)
      return
    }
    if (!flat.length) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => (index + 1) % flat.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => (index - 1 + flat.length) % flat.length)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const item = flat[activeIndex]
      if (!item) return
      if (item.kind === 'page') goToPage(item.leaf)
      else goTo(item.hit)
    }
  }

  const shortcut = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘K' : 'Ctrl K'
  const showDropdown = dropdownOpen && !paletteOpen && query.trim().length >= 1

  const resultsProps = {
    query,
    loading,
    loadingMore,
    error,
    pages: pageMatches,
    groups,
    flat,
    activeIndex,
    setActiveIndex,
    onSelectPage: goToPage,
    onSelect: goTo,
    hasMore,
    total,
    onLoadMore: loadMore,
  }

  return (
    <>
      <div ref={rootRef} className="relative hidden min-w-0 max-w-xl flex-1 lg:block">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-slate-400" />
          <Input
            ref={inputRef}
            className="border-slate-200/90 bg-slate-50/80 pl-9 pr-14 shadow-none focus:bg-white"
            placeholder="Search pages, customers, invoices…"
            value={query}
            role="combobox"
            aria-expanded={showDropdown}
            aria-controls={listId}
            autoComplete="off"
            onFocus={() => {
              setPaletteOpen(false)
              setDropdownOpen(true)
            }}
            onChange={(event) => {
              setQuery(event.target.value)
              setPaletteOpen(false)
              setDropdownOpen(true)
            }}
            onKeyDown={onKeyDown}
          />
          <kbd className="pointer-events-none absolute right-2 top-2 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
            {shortcut}
          </kbd>
        </div>
        {showDropdown ? (
          <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[90] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_16px_40px_rgb(15_23_42/0.16)]">
            <SearchResults listId={listId} {...resultsProps} />
          </div>
        ) : null}
      </div>

      <button
        type="button"
        className="grid size-9 shrink-0 place-items-center rounded-xl text-slate-600 hover:bg-slate-100 lg:hidden"
        aria-label="Search"
        onClick={() => {
          setDropdownOpen(false)
          setPaletteOpen(true)
        }}
      >
        <Search className="size-5" />
      </button>

      <Dialog
        open={paletteOpen}
        onOpenChange={(next) => {
          setPaletteOpen(next)
          if (next) setDropdownOpen(false)
        }}
      >
        <DialogContent className="top-[max(0.75rem,env(safe-area-inset-top))] max-h-[min(92dvh,40rem)] w-[calc(100%-1rem)] max-w-xl translate-y-0 gap-0 overflow-hidden p-0 sm:top-1/2 sm:-translate-y-1/2">
          <div className="border-b border-slate-200 px-4 py-3 pr-12">
            <DialogTitle className="sr-only">Global search</DialogTitle>
            <DialogDescription className="sr-only">
              Search pages and records across your active organization
            </DialogDescription>
            <div className="relative">
              <Search className="absolute left-0 top-2.5 size-4 text-slate-400" />
              <Input
                ref={dialogInputRef}
                className="border-0 bg-transparent pl-7 shadow-none focus:ring-0"
                placeholder="Search pages, customers, invoices…"
                value={query}
                autoComplete="off"
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={onKeyDown}
              />
            </div>
          </div>
          <SearchResults listId={`${listId}-dialog`} {...resultsProps} />
          <div className="flex items-center gap-3 border-t border-slate-200 px-4 py-2 text-[11px] text-slate-400">
            <span className="hidden sm:inline">↑↓ Navigate</span>
            <span className="hidden sm:inline">↵ Open</span>
            <span className="hidden sm:inline">Esc Close</span>
            <span className="sm:hidden">Tap a result to open</span>
            {activeOrganization ? (
              <span className="ml-auto truncate">{activeOrganization.organizationName}</span>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
