import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactElement } from 'react'
import { createPortal } from 'react-dom'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Building2,
  ChevronDown,
  ChevronRight,
  CreditCard,
  HelpCircle,
  KeyRound,
  LogOut,
  Search,
  Settings,
  Star,
  UserRound,
  X,
} from 'lucide-react'
import { useAuth } from '@/features/auth/auth'
import { aiApi } from '@/services/api'
import { cn } from '@/lib/utils'
import { isPlatformFeatureEnabled, isPlatformModuleEnabled, platformCodeForRbac, useCapabilities } from '@/platform'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui'
import { OrganizationSwitcher } from '@/components/layout/OrganizationSwitcher'
import {
  NAV_ENTRIES,
  findSectionForPath,
  flattenNavLeaves,
  resolveActivePath,
  type NavEntry,
  type NavLeaf,
  type NavSection,
} from './nav-config'
import { useExpandedModule, useNavFavorites, useNavRecents } from './use-nav-preferences'

function MenuBadge({ badge }: { badge?: NavLeaf['badge'] }) {
  if (!badge) return null
  const styles =
    badge === 'LIVE'
      ? 'bg-teal-500/15 text-teal-300'
      : badge === 'NEW'
        ? 'bg-sky-500/15 text-sky-300'
        : 'bg-violet-500/15 text-violet-300'
  return <span className={cn('rounded px-1.5 py-0.5 text-[9px] font-semibold tracking-wide', styles)}>{badge}</span>
}

function IconTooltip({
  label,
  side = 'right',
  disabled,
  children,
}: {
  label: string
  side?: 'right' | 'top' | 'bottom'
  disabled?: boolean
  children: ReactElement
}) {
  if (disabled || !label) return children
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side}>{label}</TooltipContent>
    </Tooltip>
  )
}

function NavItemRow({
  item,
  active,
  compact,
  nested,
  favorite,
  onToggleFavorite,
  onNavigate,
}: {
  item: NavLeaf
  active: boolean
  compact?: boolean
  nested?: boolean
  favorite?: boolean
  onToggleFavorite?: () => void
  onNavigate?: () => void
}) {
  const Icon = item.icon
  const link = (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      aria-label={compact ? item.label : undefined}
      onClick={onNavigate}
      className={cn(
        'relative flex h-10 items-center rounded-[10px] text-sm font-medium transition-colors duration-150',
        compact ? 'justify-center px-0' : 'gap-3 px-4',
        nested && !compact && 'pl-10',
        active ? 'bg-white/[0.08] font-semibold text-white' : 'text-slate-300 hover:bg-white/[0.05] hover:text-white',
      )}
    >
      {active ? <span className="absolute inset-y-1.5 left-0 w-1 rounded-r bg-teal-400" aria-hidden /> : null}
      <Icon className={cn('size-[18px] shrink-0', active ? 'text-teal-300' : 'opacity-90')} />
      {!compact ? (
        <>
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
          <MenuBadge badge={item.badge} />
        </>
      ) : null}
    </NavLink>
  )
  return (
    <div className="group relative">
      <IconTooltip label={item.label} disabled={!compact}>
        {link}
      </IconTooltip>
      {!compact && onToggleFavorite ? (
        <button
          type="button"
          aria-label={favorite ? `Unpin ${item.label}` : `Pin ${item.label}`}
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            onToggleFavorite()
          }}
          className={cn(
            'absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 opacity-0 transition hover:text-amber-300 group-hover:opacity-100',
            favorite && 'opacity-100 text-amber-300',
          )}
        >
          <Star className={cn('size-3.5', favorite && 'fill-amber-300')} />
        </button>
      ) : null}
    </div>
  )
}

function CompactSectionFlyout({
  section,
  activePath,
  anchorRect,
  onNavigate,
}: {
  section: NavSection
  activePath: string | undefined
  anchorRect: DOMRect
  onNavigate: () => void
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: anchorRect.top, left: anchorRect.right + 8 })

  useLayoutEffect(() => {
    const panel = panelRef.current
    if (!panel) return
    const height = panel.offsetHeight
    const width = panel.offsetWidth
    const margin = 8
    let top = anchorRect.top
    let left = anchorRect.right + margin
    if (top + height > window.innerHeight - margin) {
      top = Math.max(margin, window.innerHeight - height - margin)
    }
    if (left + width > window.innerWidth - margin) {
      left = Math.max(margin, anchorRect.left - width - margin)
    }
    setPos({ top, left })
  }, [anchorRect])

  return createPortal(
    <div
      ref={panelRef}
      data-sidebar-flyout=""
      role="menu"
      aria-label={section.label}
      className="fixed z-[80] min-w-[13.5rem] rounded-xl border border-white/10 bg-slate-900 p-2 shadow-2xl"
      style={{ top: pos.top, left: pos.left }}
    >
      <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{section.label}</p>
      {section.items.map((item) => (
        <NavItemRow key={item.id} item={item} active={item.to === activePath} onNavigate={onNavigate} />
      ))}
    </div>,
    document.body,
  )
}

function NavSectionBlock({
  section,
  expanded,
  onToggle,
  compact,
  activePath,
  favoriteIds,
  onToggleFavorite,
  onNavigate,
}: {
  section: NavSection
  expanded: boolean
  onToggle: () => void
  compact: boolean
  activePath: string | undefined
  favoriteIds: string[]
  onToggleFavorite: (id: string) => void
  onNavigate: () => void
}) {
  const Icon = section.icon
  const childActive = section.items.some((item) => item.to === activePath)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)

  useLayoutEffect(() => {
    if (!compact || !expanded || !buttonRef.current) {
      setAnchorRect(null)
      return
    }
    const sync = () => {
      if (buttonRef.current) setAnchorRect(buttonRef.current.getBoundingClientRect())
    }
    sync()
    window.addEventListener('resize', sync)
    window.addEventListener('scroll', sync, true)
    return () => {
      window.removeEventListener('resize', sync)
      window.removeEventListener('scroll', sync, true)
    }
  }, [compact, expanded])

  if (compact) {
    return (
      <div className="relative mb-0.5">
        <IconTooltip label={section.label} disabled={expanded}>
          <button
            ref={buttonRef}
            type="button"
            aria-label={section.label}
            aria-expanded={expanded}
            aria-haspopup="menu"
            onClick={onToggle}
            className={cn(
              'relative flex h-10 w-full items-center justify-center rounded-[10px] transition-colors duration-150',
              childActive
                ? 'bg-white/[0.08] text-white'
                : expanded
                  ? 'bg-white/[0.06] text-white ring-1 ring-white/15'
                  : 'text-slate-300 hover:bg-white/[0.05] hover:text-white',
            )}
          >
            {childActive ? (
              <span className="absolute inset-y-1.5 left-0 w-1 rounded-r bg-teal-400" aria-hidden />
            ) : null}
            <Icon className={cn('size-[18px]', childActive && 'text-teal-300')} />
          </button>
        </IconTooltip>
        {expanded && anchorRect ? (
          <CompactSectionFlyout
            section={section}
            activePath={activePath}
            anchorRect={anchorRect}
            onNavigate={onNavigate}
          />
        ) : null}
      </div>
    )
  }

  return (
    <div className="mb-0.5">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={onToggle}
        className={cn(
          'flex h-10 w-full items-center gap-3 rounded-[10px] px-4 text-sm font-medium transition-colors duration-150',
          childActive || expanded
            ? 'bg-white/[0.06] text-white'
            : 'text-slate-300 hover:bg-white/[0.05] hover:text-white',
        )}
      >
        <Icon className={cn('size-[18px] shrink-0', childActive && 'text-teal-300')} />
        <span className="min-w-0 flex-1 truncate text-left">{section.label}</span>
        <ChevronDown
          className={cn('size-4 shrink-0 text-slate-500 transition-transform duration-150', expanded && 'rotate-180')}
        />
      </button>
      <div
        className={cn(
          'grid transition-[grid-template-rows,opacity] duration-[180ms] ease-out',
          expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        )}
      >
        <div className="overflow-hidden">
          <div className="space-y-0.5 py-1">
            {section.items.map((item) => (
              <NavItemRow
                key={item.id}
                item={item}
                active={item.to === activePath}
                nested
                favorite={favoriteIds.includes(item.id)}
                onToggleFavorite={() => onToggleFavorite(item.id)}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function filterLeaves(leaves: NavLeaf[], query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return leaves
  return leaves.filter((leaf) => {
    const hay = [leaf.label, leaf.to, ...(leaf.keywords ?? [])].join(' ').toLowerCase()
    return hay.includes(q)
  })
}

export function AppSidebar({
  mobileOpen,
  onMobileClose,
  collapsed,
}: {
  mobileOpen: boolean
  onMobileClose: () => void
  collapsed: boolean
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const { session, canAccessModule, logout } = useAuth()
  const [moduleQuery, setModuleQuery] = useState('')
  const { favoriteLeaves, favoriteIds, toggleFavorite, isFavorite } = useNavFavorites()
  const { recentLeaves } = useNavRecents()

  const initials = `${session?.user.firstName?.[0] ?? ''}${session?.user.lastName?.[0] ?? ''}`.trim() || 'FL'
  const roleLabel = session?.activeOrganization?.roles?.[0]?.replace(/_/g, ' ') ?? 'User'
  const email = session?.user.email

  const aiHealth = useQuery({
    queryKey: ['ai-health'],
    queryFn: () => aiApi.health(),
    retry: false,
    staleTime: 60_000,
  })
  const aiAvailable = aiHealth.isSuccess && aiHealth.data?.enabled !== false

  const { data: capabilities } = useCapabilities()

  const visibleEntries = useMemo(() => {
    const result: NavEntry[] = []
    for (const entry of NAV_ENTRIES) {
      if (entry.type === 'link') {
        if (!canAccessModule(entry.item.module)) continue
        const code = platformCodeForRbac(entry.item.module)
        if (!isPlatformModuleEnabled(capabilities, code)) continue
        result.push(entry)
        continue
      }
      const section = entry.section
      if (section.featureFlag === 'ai' && !aiAvailable) continue
      if (section.featureFlag === 'ai' && !isPlatformModuleEnabled(capabilities, 'AI')) continue
      if (section.featureFlag === 'retail' && !isPlatformModuleEnabled(capabilities, 'RETAIL')) continue
      if (section.featureFlag === 'transport' && !isPlatformModuleEnabled(capabilities, 'TRANSPORT')) continue

      const items = section.items.filter((item) => {
        if (!canAccessModule(item.module)) return false
        const code = platformCodeForRbac(item.module)
        if (!isPlatformModuleEnabled(capabilities, code)) return false
        if (item.feature && code && !isPlatformFeatureEnabled(capabilities, code, item.feature)) return false
        if (item.module === 'retail' || item.to.startsWith('/retail')) {
          if (!isPlatformModuleEnabled(capabilities, 'RETAIL')) return false
        }
        if (item.to.startsWith('/transport')) {
          if (!isPlatformModuleEnabled(capabilities, 'TRANSPORT')) return false
        }
        if (item.module === 'ai' || item.module === 'aiRecommendations' || item.module === 'aiWorkflow') {
          if (!aiAvailable || !isPlatformModuleEnabled(capabilities, 'AI')) return false
        }
        return true
      })
      if (!items.length) continue
      result.push({ type: 'section', section: { ...section, items } })
    }
    return result
  }, [canAccessModule, capabilities, aiAvailable])

  const visibleLeaves = useMemo(() => flattenNavLeaves(visibleEntries), [visibleEntries])
  const visiblePaths = visibleLeaves.map((leaf) => leaf.to)
  const activePath = resolveActivePath(location.pathname, visiblePaths)
  const activeSectionId = findSectionForPath(location.pathname, visibleEntries)
  const { expandedId, toggle, setExpandedId } = useExpandedModule(activeSectionId, {
    autoExpand: !collapsed,
  })
  const asideRef = useRef<HTMLElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (collapsed) setExpandedId(null)
  }, [collapsed, setExpandedId])

  const searchableLeaves = useMemo(() => filterLeaves(visibleLeaves, moduleQuery), [visibleLeaves, moduleQuery])
  const showSearchResults = moduleQuery.trim().length > 0

  useEffect(() => {
    if (!mobileOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onMobileClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [mobileOpen, onMobileClose])

  useEffect(() => {
    if (!collapsed || !expandedId) return
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null
      if (!target) return
      if (asideRef.current?.contains(target)) return
      if (target instanceof Element && target.closest('[data-sidebar-flyout]')) return
      setExpandedId(null)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpandedId(null)
    }
    document.addEventListener('mousedown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [collapsed, expandedId, setExpandedId])

  const go = (path: string) => {
    onMobileClose()
    navigate(path)
  }

  const handleLogout = async () => {
    onMobileClose()
    await logout()
  }

  const pinnedFavorites = favoriteLeaves.filter((leaf) => visibleLeaves.some((v) => v.id === leaf.id))
  const pinnedRecents = recentLeaves
    .filter((leaf) => visibleLeaves.some((v) => v.id === leaf.id))
    .filter((leaf) => !favoriteIds.includes(leaf.id))
    .slice(0, 5)

  const renderAside = (opts: { compact: boolean; showClose?: boolean }) => {
    const compact = opts.compact
    const accountLabel = `${session?.user.firstName ?? ''} ${session?.user.lastName ?? ''}`.trim() || 'Account'
    return (
      <TooltipProvider delayDuration={250}>
        <aside
          ref={asideRef}
          className={cn(
            'flex h-full w-full flex-col overflow-hidden text-slate-300 shadow-[4px_0_24px_rgb(2_6_23/0.28)] transition-[width] duration-200 ease-out [color-scheme:dark]',
            'bg-[#0F172A]',
            compact ? 'px-2 py-3' : 'px-3 py-4',
          )}
          style={{
            backgroundImage: 'linear-gradient(180deg, #0F172A 0%, #111827 100%)',
          }}
        >
          {/* Header */}
          <div className={cn('mb-3 shrink-0', compact ? 'flex flex-col items-center gap-2' : 'space-y-3 px-1')}>
            <div className={cn('flex items-center', compact ? 'justify-center' : 'justify-between')}>
              <IconTooltip label="FlowLedger" disabled={!compact}>
                <Link
                  to="/"
                  onClick={onMobileClose}
                  aria-label="FlowLedger"
                  className={cn(
                    'font-display font-semibold tracking-tight text-white',
                    compact ? 'grid size-10 place-items-center rounded-xl bg-white/5 text-sm' : 'text-xl',
                  )}
                >
                  {compact ? (
                    'FL'
                  ) : (
                    <>
                      Flow
                      <span className="bg-gradient-to-r from-teal-300 to-cyan-300 bg-clip-text text-transparent">
                        Ledger
                      </span>
                    </>
                  )}
                </Link>
              </IconTooltip>
              {opts.showClose ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-slate-400 hover:bg-white/5 hover:text-white lg:hidden"
                  onClick={onMobileClose}
                  aria-label="Close menu"
                >
                  <X className="size-5" />
                </Button>
              ) : null}
            </div>
            {!compact ? (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-1 [&_button]:border-0 [&_button]:bg-transparent [&_button]:px-2 [&_button]:py-1.5 [&_button]:hover:bg-white/5 [&_p]:text-slate-200 [&_p.text-slate-500]:text-slate-400 [&_p.text-slate-900]:text-white [&_span.bg-teal-700]:bg-teal-600">
                <OrganizationSwitcher variant="sidebar" />
              </div>
            ) : null}
          </div>

          {/* Module search */}
          {!compact ? (
            <div className="relative mb-3 shrink-0 px-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
              <input
                ref={searchInputRef}
                value={moduleQuery}
                onChange={(event) => setModuleQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') setModuleQuery('')
                }}
                placeholder="Search modules..."
                aria-label="Search modules"
                className="h-10 w-full rounded-[10px] border border-white/10 bg-white/[0.04] py-2 pl-10 pr-14 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-teal-500/40 focus:ring-2 focus:ring-teal-500/20"
              />
              <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-slate-500 sm:inline">
                {typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘K' : 'Ctrl K'}
              </kbd>
            </div>
          ) : null}

          <nav className="sidebar-scroll min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden pb-2">
            {showSearchResults ? (
              <div className="space-y-0.5">
                <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Modules
                </p>
                {searchableLeaves.length ? (
                  searchableLeaves.map((item) => (
                    <NavItemRow
                      key={item.id}
                      item={item}
                      active={item.to === activePath}
                      compact={compact}
                      favorite={isFavorite(item.id)}
                      onToggleFavorite={() => toggleFavorite(item.id)}
                      onNavigate={() => {
                        setModuleQuery('')
                        onMobileClose()
                      }}
                    />
                  ))
                ) : (
                  <p className="px-3 py-6 text-center text-xs text-slate-500">No modules match “{moduleQuery}”</p>
                )}
              </div>
            ) : (
              <>
                {!compact && pinnedFavorites.length ? (
                  <div>
                    <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Favorites
                    </p>
                    <div className="space-y-0.5">
                      {pinnedFavorites.map((item) => (
                        <NavItemRow
                          key={`fav-${item.id}`}
                          item={item}
                          active={item.to === activePath}
                          favorite
                          onToggleFavorite={() => toggleFavorite(item.id)}
                          onNavigate={onMobileClose}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}

                {!compact && pinnedRecents.length ? (
                  <div>
                    <p className="mb-2 mt-1 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Recent
                    </p>
                    <div className="space-y-0.5">
                      {pinnedRecents.map((item) => (
                        <NavItemRow
                          key={`recent-${item.id}`}
                          item={item}
                          active={item.to === activePath}
                          favorite={isFavorite(item.id)}
                          onToggleFavorite={() => toggleFavorite(item.id)}
                          onNavigate={onMobileClose}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="space-y-0.5">
                  {!compact ? (
                    <p className="mb-2 mt-1 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Modules
                    </p>
                  ) : null}
                  {visibleEntries.map((entry) => {
                    if (entry.type === 'link') {
                      return (
                        <NavItemRow
                          key={entry.item.id}
                          item={entry.item}
                          active={entry.item.to === activePath}
                          compact={compact}
                          favorite={isFavorite(entry.item.id)}
                          onToggleFavorite={() => toggleFavorite(entry.item.id)}
                          onNavigate={onMobileClose}
                        />
                      )
                    }
                    return (
                      <NavSectionBlock
                        key={entry.section.id}
                        section={entry.section}
                        expanded={expandedId === entry.section.id}
                        onToggle={() => toggle(entry.section.id)}
                        compact={compact}
                        activePath={activePath}
                        favoriteIds={favoriteIds}
                        onToggleFavorite={toggleFavorite}
                        onNavigate={() => {
                          // Icon-rail flyout should close after navigation; keep desktop accordion open.
                          if (compact) setExpandedId(null)
                          onMobileClose()
                        }}
                      />
                    )
                  })}
                </div>
              </>
            )}
          </nav>

          {/* Sticky footer */}
          <div className="mt-auto shrink-0 border-t border-white/10 pt-3">
            {!compact ? (
              <div className="mb-2 space-y-0.5">
                {canAccessModule('settings') ? (
                  <button
                    type="button"
                    onClick={() => go('/settings/organization')}
                    className="flex h-10 w-full items-center gap-3 rounded-[10px] px-4 text-sm font-medium text-slate-300 transition hover:bg-white/[0.05] hover:text-white"
                  >
                    <Settings className="size-[18px]" />
                    Settings
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => go('/settings/profile')}
                  className="flex h-10 w-full items-center gap-3 rounded-[10px] px-4 text-sm font-medium text-slate-300 transition hover:bg-white/[0.05] hover:text-white"
                >
                  <UserRound className="size-[18px]" />
                  Profile
                </button>
                <button
                  type="button"
                  onClick={() => go('/settings/profile')}
                  className="flex h-10 w-full items-center gap-3 rounded-[10px] px-4 text-sm font-medium text-slate-300 transition hover:bg-white/[0.05] hover:text-white"
                >
                  <HelpCircle className="size-[18px]" />
                  Help
                </button>
              </div>
            ) : null}

            <DropdownMenu>
              <IconTooltip label={accountLabel} side="top" disabled={!compact}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label={accountLabel}
                    className={cn(
                      'flex w-full cursor-pointer items-center rounded-[10px] text-left text-sm transition-colors hover:bg-white/[0.05] data-[state=open]:bg-white/[0.05]',
                      compact ? 'justify-center px-0 py-2' : 'gap-2 px-3 py-2',
                    )}
                  >
                    <span className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-teal-400 to-teal-700 text-xs font-semibold text-white shadow-md">
                      {initials}
                    </span>
                    {!compact ? (
                      <>
                        <span className="min-w-0 flex-1 overflow-hidden">
                          <b className="block truncate text-xs font-semibold text-white">
                            {session?.user.firstName} {session?.user.lastName}
                          </b>
                          <small className="block truncate text-[10px] capitalize text-slate-500">{roleLabel}</small>
                        </span>
                        <ChevronRight className="size-4 shrink-0 rotate-[-90deg] text-slate-500" />
                      </>
                    ) : null}
                  </button>
                </DropdownMenuTrigger>
              </IconTooltip>
              <DropdownMenuContent side="top" align={compact ? 'center' : 'start'} sideOffset={8} className="w-56">
                <div className="px-3 py-2">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {session?.user.firstName} {session?.user.lastName}
                  </p>
                  {email ? <p className="truncate text-xs text-slate-500">{email}</p> : null}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => go('/settings/profile')}>
                  <UserRound className="size-4 text-slate-500" />
                  Profile settings
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => go('/settings/password')}>
                  <KeyRound className="size-4 text-slate-500" />
                  Change password
                </DropdownMenuItem>
                {canAccessModule('settings') ? (
                  <DropdownMenuItem onSelect={() => go('/settings/organization')}>
                    <Building2 className="size-4 text-slate-500" />
                    Organization
                  </DropdownMenuItem>
                ) : null}
                {canAccessModule('billing') ? (
                  <DropdownMenuItem onSelect={() => go('/settings/billing')}>
                    <CreditCard className="size-4 text-slate-500" />
                    Subscription
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-rose-700 data-[highlighted]:bg-rose-50 data-[highlighted]:text-rose-800"
                  onSelect={() => void handleLogout()}
                >
                  <LogOut className="size-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </aside>
      </TooltipProvider>
    )
  }

  return (
    <>
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-40 hidden overflow-hidden bg-[#0F172A] transition-[width] duration-200 ease-out lg:block',
          collapsed ? 'w-[72px]' : 'w-[280px]',
        )}
      >
        {renderAside({ compact: collapsed })}
      </div>
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 bg-slate-950/50 lg:hidden" onClick={onMobileClose} aria-hidden={!mobileOpen}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="h-full w-[min(280px,88vw)] overflow-hidden bg-[#0F172A] shadow-2xl transition-transform duration-200 ease-out"
            onClick={(event) => event.stopPropagation()}
          >
            {renderAside({ compact: false, showClose: true })}
          </div>
        </div>
      ) : null}
    </>
  )
}
