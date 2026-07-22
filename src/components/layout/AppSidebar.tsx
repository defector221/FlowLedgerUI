import {
  ArrowLeftRight,
  BarChart3,
  BookOpen,
  Boxes,
  Building2,
  ChevronDown,
  CreditCard,
  FileText,
  LayoutDashboard,
  Megaphone,
  Package,
  Percent,
  ReceiptText,
  Search,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Target,
  Users,
  Wallet,
  Truck,
  X,
} from 'lucide-react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuth } from '@/features/auth/auth'
import { Button, Separator } from '@/components/ui'

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
    label: 'SYSTEM',
    items: [
      { to: '/settings/organization', label: 'Settings', icon: Settings, module: 'settings' as const },
      { to: '/settings/password', label: 'Change password', icon: ShieldCheck, module: 'dashboard' as const },
      { to: '/settings/reminder-rules', label: 'Reminder rules', icon: Wallet, module: 'payments' as const },
      { to: '/settings/billing', label: 'Billing', icon: CreditCard, module: 'billing' as const },
      { to: '/templates', label: 'Templates', icon: FileText, module: 'templates' as const },
      { to: '/settings/tax-rates', label: 'Tax rates', icon: Percent, module: 'settings' as const },
      { to: '/settings/units', label: 'Units', icon: Package, module: 'settings' as const },
      { to: '/settings/users', label: 'Team', icon: Users, module: 'users' as const },
      { to: '/audit', label: 'Audit log', icon: ShieldCheck, module: 'audit' as const },
    ],
  },
]

export function AppSidebar({ mobileOpen, onMobileClose }: { mobileOpen: boolean; onMobileClose: () => void }) {
  const location = useLocation()
  const { session, activeOrganization, canAccessModule, logout } = useAuth()
  const initials = `${session?.user.firstName?.[0] ?? ''}${session?.user.lastName?.[0] ?? ''}`.trim() || 'FL'
  const roleLabel = activeOrganization?.roles?.[0]?.replace(/_/g, ' ') ?? 'User'
  const visiblePaths = groups.flatMap((group) =>
    group.items.filter((item) => canAccessModule(item.module)).map((item) => item.to),
  )
  const activePath = resolveActivePath(location.pathname, visiblePaths)

  const content = (
    <aside className="flex h-full w-64 flex-col bg-[linear-gradient(180deg,#07111f_0%,#0b1a2b_48%,#0d2438_100%)] px-3 py-5 text-slate-300 shadow-[4px_0_24px_rgb(2_6_23/0.25)]">
      <div className="mb-8 flex items-center justify-between px-3">
        <Link to="/" className="font-display text-xl font-semibold tracking-tight text-white">
          Flow<span className="bg-gradient-to-r from-teal-300 to-cyan-300 bg-clip-text text-transparent">Ledger</span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="text-slate-400 hover:bg-white/5 hover:text-white lg:hidden"
          onClick={onMobileClose}
        >
          <X className="size-5" />
        </Button>
      </div>
      <nav className="flex-1 space-y-5 overflow-auto">
        {groups.map((group) => {
          const items = group.items.filter((item) => canAccessModule(item.module))
          if (!items.length) return null
          return (
            <div key={group.label}>
              {group.label ? (
                <p className="mb-2 px-3 text-[10px] font-semibold tracking-[0.14em] text-slate-500">{group.label}</p>
              ) : null}
              {items.map((item) => {
                const isActive = item.to === activePath
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    onClick={onMobileClose}
                    className={cn(
                      'mb-0.5 flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all hover:bg-white/5 hover:text-white',
                      isActive &&
                        'bg-gradient-to-r from-teal-600 to-teal-500 text-white shadow-[0_8px_20px_rgb(13_148_136/0.35)]',
                    )}
                  >
                    <item.icon className="size-4 shrink-0 opacity-90" />
                    {item.label}
                  </NavLink>
                )
              })}
            </div>
          )
        })}
      </nav>
      <Separator className="mb-3 bg-white/10" />
      <button
        className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-white/5"
        onClick={() => logout()}
      >
        <span className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-teal-400 to-teal-700 text-xs font-semibold text-white shadow-md">
          {initials}
        </span>
        <span className="flex-1 overflow-hidden">
          <b className="block truncate text-xs font-semibold text-white">
            {session?.user.firstName} {session?.user.lastName}
          </b>
          <small className="text-[10px] capitalize text-slate-500">{roleLabel}</small>
        </span>
        <ChevronDown className="size-4 text-slate-500" />
      </button>
    </aside>
  )

  return (
    <>
      <div className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">{content}</div>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden" onClick={onMobileClose}>
          <div className="h-full w-[min(16rem,88vw)]" onClick={(event) => event.stopPropagation()}>
            {content}
          </div>
        </div>
      )}
    </>
  )
}
