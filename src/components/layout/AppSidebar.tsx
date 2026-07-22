import {
  ArrowLeftRight,
  BarChart3,
  BookOpen,
  Boxes,
  Building2,
  ChevronUp,
  CreditCard,
  FileText,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Percent,
  ReceiptText,
  Search,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Target,
  UserRound,
  Users,
  Wallet,
  Truck,
  X,
  Sparkles,
  MessageSquare,
  Lightbulb,
  LineChart,
  Workflow,
} from 'lucide-react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { useAuth } from '@/features/auth/auth'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Separator,
} from '@/components/ui'
import { aiApi } from '@/services/api'

function pathMatches(pathname: string, to: string) {
  if (to === '/') return pathname === '/'
  return pathname === to || pathname.startsWith(`${to}/`)
}

function resolveActivePath(pathname: string, paths: string[]) {
  return paths.filter((to) => pathMatches(pathname, to)).sort((a, b) => b.length - a.length)[0]
}

const groups = [
  { label: '', items: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard, module: 'dashboard' as const }] },
  {
    label: 'TRANSACTIONS',
    items: [
      { to: '/sales/invoices', label: 'Sales invoices', icon: ReceiptText, module: 'sales' as const },
      { to: '/sales/quotations', label: 'Quotations', icon: FileText, module: 'sales' as const },
      { to: '/sales/orders', label: 'Sales orders', icon: ShoppingCart, module: 'sales' as const },
      { to: '/sales/challans', label: 'Delivery challans', icon: Package, module: 'sales' as const },
      { to: '/purchases/orders', label: 'Purchase orders', icon: ShoppingCart, module: 'purchases' as const },
      { to: '/purchases/grn', label: 'Goods receipts', icon: Boxes, module: 'purchases' as const },
      { to: '/purchases/invoices', label: 'Purchase invoices', icon: ReceiptText, module: 'purchases' as const },
      { to: '/leads', label: 'Leads', icon: Target, module: 'leads' as const },
      { to: '/marketing/sequences', label: 'Sequences', icon: Megaphone, module: 'marketing' as const },
      { to: '/marketing/campaigns', label: 'Campaigns', icon: Megaphone, module: 'marketing' as const },
      { to: '/marketing/email-templates', label: 'Email templates', icon: FileText, module: 'marketing' as const },
      { to: '/inventory', label: 'Inventory', icon: Boxes, module: 'inventory' as const },
      { to: '/inventory/ledger', label: 'Stock ledger', icon: BookOpen, module: 'inventory' as const },
      { to: '/inventory/adjustments', label: 'Adjustments', icon: Package, module: 'inventory' as const },
      { to: '/inventory/transfers', label: 'Transfers', icon: ArrowLeftRight, module: 'inventory' as const },
      { to: '/inventory/opening-stock', label: 'Opening stock', icon: Package, module: 'inventory' as const },
    ],
  },
  {
    label: 'TRANSPORT',
    items: [
      { to: '/transport', label: 'Overview', icon: Truck, module: 'transport' as const },
      { to: '/transport/companies', label: 'Companies', icon: Building2, module: 'transport' as const },
      { to: '/transport/vehicles', label: 'Vehicles', icon: Truck, module: 'transport' as const },
      { to: '/transport/drivers', label: 'Drivers', icon: Users, module: 'transport' as const },
      { to: '/transport/shipments', label: 'Shipments', icon: Package, module: 'transport' as const },
      { to: '/transport/search', label: 'Shipment search', icon: Search, module: 'transport' as const },
    ],
  },
  {
    label: 'MASTERS',
    items: [
      { to: '/customers', label: 'Customers', icon: Users, module: 'customers' as const },
      { to: '/suppliers', label: 'Suppliers', icon: Building2, module: 'suppliers' as const },
      { to: '/products', label: 'Products & services', icon: Package, module: 'products' as const },
      { to: '/categories', label: 'Categories', icon: FileText, module: 'categories' as const },
      { to: '/warehouses', label: 'Warehouses', icon: Building2, module: 'warehouses' as const },
    ],
  },
  {
    label: 'FINANCE',
    items: [
      { to: '/payments/received', label: 'Payments received', icon: Wallet, module: 'payments' as const },
      { to: '/payments/suppliers', label: 'Supplier payments', icon: Wallet, module: 'payments' as const },
      { to: '/accounting', label: 'Accounting', icon: BookOpen, module: 'accounting' as const },
      {
        to: '/accounting/chart-of-accounts',
        label: 'Chart of accounts',
        icon: FileText,
        module: 'accounting' as const,
      },
      { to: '/accounting/journals', label: 'Journals', icon: ReceiptText, module: 'accounting' as const },
      { to: '/accounting/reports', label: 'Accounting reports', icon: BarChart3, module: 'accounting' as const },
      { to: '/reports', label: 'Reports', icon: BarChart3, module: 'reports' as const },
    ],
  },
  {
    label: 'AI ASSISTANT',
    items: [
      { to: '/ai/chat', label: 'Assistant', icon: MessageSquare, module: 'ai' as const },
      { to: '/ai/recommendations', label: 'Insights', icon: Lightbulb, module: 'aiRecommendations' as const },
      { to: '/ai/analytics', label: 'Forecasts', icon: LineChart, module: 'ai' as const },
      { to: '/ai/workflows', label: 'Workflows', icon: Workflow, module: 'aiWorkflow' as const },
    ],
  },
  {
    label: 'SYSTEM',
    items: [
      { to: '/settings/organization', label: 'Settings', icon: Settings, module: 'settings' as const },
      { to: '/settings/password', label: 'Change password', icon: ShieldCheck, module: 'dashboard' as const },
      { to: '/settings/reminder-rules', label: 'Reminder rules', icon: Wallet, module: 'payments' as const },
      { to: '/settings/billing', label: 'Subscription', icon: CreditCard, module: 'billing' as const },
      { to: '/templates', label: 'Templates', icon: FileText, module: 'templates' as const },
      { to: '/settings/tax-rates', label: 'Tax rates', icon: Percent, module: 'settings' as const },
      { to: '/settings/units', label: 'Units', icon: Package, module: 'settings' as const },
      { to: '/settings/users', label: 'Team', icon: Users, module: 'users' as const },
      { to: '/audit', label: 'Audit log', icon: ShieldCheck, module: 'audit' as const },
    ],
  },
]

export function AppSidebar({
  mobileOpen,
  onMobileClose,
  collapsed,
  onToggleCollapsed,
}: {
  mobileOpen: boolean
  onMobileClose: () => void
  collapsed: boolean
  onToggleCollapsed: () => void
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const { session, activeOrganization, canAccessModule, logout } = useAuth()
  const initials = `${session?.user.firstName?.[0] ?? ''}${session?.user.lastName?.[0] ?? ''}`.trim() || 'FL'
  const roleLabel = activeOrganization?.roles?.[0]?.replace(/_/g, ' ') ?? 'User'
  const email = session?.user.email

  const aiHealth = useQuery({
    queryKey: ['ai-health'],
    queryFn: () => aiApi.health(),
    retry: false,
    staleTime: 60_000,
  })
  const aiAvailable = aiHealth.isSuccess && aiHealth.data?.enabled !== false

  const visibleGroups = groups.map((group) => {
    if (group.label !== 'AI ASSISTANT') return group
    if (!aiAvailable) return { ...group, items: [] }
    return group
  })

  const visiblePaths = visibleGroups.flatMap((group) =>
    group.items.filter((item) => canAccessModule(item.module)).map((item) => item.to),
  )
  const activePath = resolveActivePath(location.pathname, visiblePaths)

  const go = (path: string) => {
    onMobileClose()
    navigate(path)
  }

  const handleLogout = async () => {
    onMobileClose()
    await logout()
  }

  const renderAside = (opts: { compact: boolean; showClose?: boolean }) => {
    const compact = opts.compact
    return (
      <aside
        className={cn(
          'flex h-full flex-col bg-[linear-gradient(180deg,#07111f_0%,#0b1a2b_48%,#0d2438_100%)] py-4 text-slate-300 shadow-[4px_0_24px_rgb(2_6_23/0.25)] transition-[width] duration-200 ease-out',
          compact ? 'w-[4.5rem] px-2' : 'w-64 px-3',
        )}
      >
        <div className={cn('mb-6 flex items-center', compact ? 'flex-col gap-2' : 'justify-between px-2')}>
          {!compact ? (
            <Link to="/" className="font-display text-xl font-semibold tracking-tight text-white">
              Flow<span className="bg-gradient-to-r from-teal-300 to-cyan-300 bg-clip-text text-transparent">Ledger</span>
            </Link>
          ) : (
            <Link
              to="/"
              className="font-display grid size-9 place-items-center rounded-xl bg-white/5 text-sm font-bold text-white"
              title="FlowLedger"
            >
              FL
            </Link>
          )}
          {opts.showClose ? (
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-400 hover:bg-white/5 hover:text-white lg:hidden"
              onClick={onMobileClose}
            >
              <X className="size-5" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="hidden cursor-pointer text-slate-400 hover:bg-white/5 hover:text-white lg:inline-flex"
              onClick={onToggleCollapsed}
              aria-label={compact ? 'Expand sidebar' : 'Collapse sidebar'}
              title={compact ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {compact ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            </Button>
          )}
        </div>

        <nav className="scrollbar-dark relative min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden">
          {visibleGroups.map((group) => {
            const items = group.items.filter((item) => canAccessModule(item.module))
            if (!items.length) return null
            return (
              <div key={group.label || 'root'}>
                {group.label && !compact ? (
                  <p className="mb-2 px-3 text-[10px] font-semibold tracking-[0.14em] text-slate-500">
                    {group.label === 'AI ASSISTANT' ? (
                      <span className="inline-flex items-center gap-1">
                        <Sparkles className="size-3" />
                        {group.label}
                      </span>
                    ) : (
                      group.label
                    )}
                  </p>
                ) : null}
                {compact && group.label ? <div className="mx-auto mb-1.5 h-px w-6 bg-white/10" /> : null}
                {items.map((item) => {
                  const isActive = item.to === activePath
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === '/'}
                      onClick={onMobileClose}
                      title={compact ? item.label : undefined}
                      className={cn(
                        'mb-0.5 flex items-center rounded-xl text-sm font-medium transition-all hover:bg-white/5 hover:text-white',
                        compact ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2',
                        isActive &&
                          'bg-gradient-to-r from-teal-600 to-teal-500 text-white shadow-[0_8px_20px_rgb(13_148_136/0.35)]',
                      )}
                    >
                      <item.icon className="size-4 shrink-0 opacity-90" />
                      {!compact ? <span className="truncate">{item.label}</span> : null}
                    </NavLink>
                  )
                })}
              </div>
            )
          })}
        </nav>

        <Separator className="mb-3 bg-white/10" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              title={compact ? `${session?.user.firstName ?? ''} ${session?.user.lastName ?? ''}`.trim() : undefined}
              className={cn(
                'flex w-full cursor-pointer items-center rounded-xl text-left text-sm transition-colors hover:bg-white/5 data-[state=open]:bg-white/5',
                compact ? 'justify-center px-0 py-2' : 'gap-2 px-3 py-2.5',
              )}
            >
              <span className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-teal-400 to-teal-700 text-xs font-semibold text-white shadow-md">
                {initials}
              </span>
              {!compact ? (
                <>
                  <span className="flex-1 overflow-hidden">
                    <b className="block truncate text-xs font-semibold text-white">
                      {session?.user.firstName} {session?.user.lastName}
                    </b>
                    <small className="block truncate text-[10px] capitalize text-slate-500">{roleLabel}</small>
                  </span>
                  <ChevronUp className="size-4 shrink-0 text-slate-500" />
                </>
              ) : null}
            </button>
          </DropdownMenuTrigger>
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
      </aside>
    )
  }

  return (
    <>
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-40 hidden transition-[width] duration-200 ease-out lg:block',
          collapsed ? 'w-[4.5rem]' : 'w-64',
        )}
      >
        {renderAside({ compact: collapsed })}
      </div>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 lg:hidden" onClick={onMobileClose}>
          <div className="h-full w-[min(16rem,88vw)]" onClick={(event) => event.stopPropagation()}>
            {renderAside({ compact: false, showClose: true })}
          </div>
        </div>
      )}
    </>
  )
}
