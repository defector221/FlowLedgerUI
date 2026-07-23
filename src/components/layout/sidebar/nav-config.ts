import type { LucideIcon } from 'lucide-react'
import {
  ArrowLeftRight,
  BarChart3,
  BookOpen,
  Boxes,
  Building2,
  Clock3,
  CreditCard,
  FileText,
  Gift,
  LayoutDashboard,
  Lightbulb,
  LineChart,
  Megaphone,
  MessageSquare,
  Package,
  Percent,
  ReceiptText,
  RotateCcw,
  ScanBarcode,
  Search,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Store,
  Tag,
  Target,
  Truck,
  Users,
  Wallet,
  Workflow,
} from 'lucide-react'
import type { MODULE_PERMISSIONS } from '@/lib/permissions'

export type NavModuleKey = keyof typeof MODULE_PERMISSIONS

export type NavLeaf = {
  id: string
  to: string
  label: string
  icon: LucideIcon
  module: NavModuleKey
  badge?: 'LIVE' | 'NEW' | 'BETA'
  keywords?: string[]
}

export type NavSection = {
  id: string
  label: string
  icon: LucideIcon
  /** When set, entire section is gated (plus per-item modules). */
  featureFlag?: 'ai' | 'retail' | 'transport'
  items: NavLeaf[]
}

export type NavEntry =
  | { type: 'link'; item: NavLeaf }
  | { type: 'section'; section: NavSection }

/** Hierarchical navigation — routes and modules must match existing app routes / RBAC. */
export const NAV_ENTRIES: NavEntry[] = [
  {
    type: 'link',
    item: {
      id: 'dashboard',
      to: '/',
      label: 'Dashboard',
      icon: LayoutDashboard,
      module: 'dashboard',
      keywords: ['home', 'overview'],
    },
  },
  {
    type: 'section',
    section: {
      id: 'sales',
      label: 'Sales',
      icon: ReceiptText,
      items: [
        { id: 'sales-quotations', to: '/sales/quotations', label: 'Quotations', icon: FileText, module: 'sales' },
        { id: 'sales-orders', to: '/sales/orders', label: 'Sales Orders', icon: ShoppingCart, module: 'sales' },
        { id: 'sales-challans', to: '/sales/challans', label: 'Delivery Challans', icon: Package, module: 'sales' },
        { id: 'sales-invoices', to: '/sales/invoices', label: 'Sales Invoices', icon: ReceiptText, module: 'sales' },
        { id: 'sales-customers', to: '/customers', label: 'Customers', icon: Users, module: 'customers' },
      ],
    },
  },
  {
    type: 'section',
    section: {
      id: 'purchasing',
      label: 'Purchasing',
      icon: ShoppingCart,
      items: [
        {
          id: 'purchases-orders',
          to: '/purchases/orders',
          label: 'Purchase Orders',
          icon: ShoppingCart,
          module: 'purchases',
        },
        { id: 'purchases-grn', to: '/purchases/grn', label: 'Goods Receipt', icon: Boxes, module: 'purchases' },
        {
          id: 'purchases-invoices',
          to: '/purchases/invoices',
          label: 'Purchase Invoices',
          icon: ReceiptText,
          module: 'purchases',
        },
        { id: 'purchases-suppliers', to: '/suppliers', label: 'Suppliers', icon: Building2, module: 'suppliers' },
      ],
    },
  },
  {
    type: 'section',
    section: {
      id: 'inventory',
      label: 'Inventory',
      icon: Boxes,
      items: [
        { id: 'inv-products', to: '/products', label: 'Products & Services', icon: Package, module: 'products' },
        { id: 'inv-categories', to: '/categories', label: 'Categories', icon: FileText, module: 'categories' },
        { id: 'inv-warehouses', to: '/warehouses', label: 'Warehouses', icon: Building2, module: 'warehouses' },
        { id: 'inv-overview', to: '/inventory', label: 'Stock Overview', icon: Boxes, module: 'inventory' },
        { id: 'inv-ledger', to: '/inventory/ledger', label: 'Stock Ledger', icon: BookOpen, module: 'inventory' },
        {
          id: 'inv-transfers',
          to: '/inventory/transfers',
          label: 'Transfers',
          icon: ArrowLeftRight,
          module: 'inventory',
        },
        {
          id: 'inv-adjustments',
          to: '/inventory/adjustments',
          label: 'Adjustments',
          icon: Package,
          module: 'inventory',
        },
        {
          id: 'inv-opening',
          to: '/inventory/opening-stock',
          label: 'Opening Stock',
          icon: Package,
          module: 'inventory',
        },
      ],
    },
  },
  {
    type: 'section',
    section: {
      id: 'transport',
      label: 'Transport',
      icon: Truck,
      items: [
        { id: 'tr-overview', to: '/transport', label: 'Overview', icon: Truck, module: 'transport' },
        { id: 'tr-companies', to: '/transport/companies', label: 'Companies', icon: Building2, module: 'transport' },
        { id: 'tr-vehicles', to: '/transport/vehicles', label: 'Vehicles', icon: Truck, module: 'transport' },
        { id: 'tr-drivers', to: '/transport/drivers', label: 'Drivers', icon: Users, module: 'transport' },
        { id: 'tr-shipments', to: '/transport/shipments', label: 'Shipments', icon: Package, module: 'transport' },
        { id: 'tr-search', to: '/transport/search', label: 'Shipment Search', icon: Search, module: 'transport' },
        { id: 'tr-reports', to: '/transport/reports', label: 'Transport Reports', icon: BarChart3, module: 'transport' },
      ],
    },
  },
  {
    type: 'section',
    section: {
      id: 'retail',
      label: 'Retail',
      icon: Store,
      featureFlag: 'retail',
      items: [
        { id: 'retail-pos', to: '/retail/pos', label: 'POS', icon: ScanBarcode, module: 'retail', badge: 'LIVE' },
        { id: 'retail-stores', to: '/retail/stores', label: 'Stores', icon: Store, module: 'retail' },
        { id: 'retail-shifts', to: '/retail/shifts', label: 'Shifts', icon: Clock3, module: 'retail' },
        { id: 'retail-catalog', to: '/retail/catalog', label: 'Catalog', icon: Tag, module: 'retail' },
        { id: 'retail-pricing', to: '/retail/pricing', label: 'Pricing', icon: Percent, module: 'retail' },
        { id: 'retail-returns', to: '/retail/returns', label: 'Returns', icon: RotateCcw, module: 'retail' },
        { id: 'retail-loyalty', to: '/retail/loyalty', label: 'Loyalty', icon: Gift, module: 'retail' },
        { id: 'retail-inventory', to: '/retail/inventory', label: 'Retail Inventory', icon: Boxes, module: 'retail' },
        { id: 'retail-labels', to: '/retail/labels', label: 'Labels', icon: FileText, module: 'retail' },
        {
          id: 'retail-analytics',
          to: '/retail/analytics',
          label: 'Retail Reports',
          icon: BarChart3,
          module: 'retail',
        },
      ],
    },
  },
  {
    type: 'section',
    section: {
      id: 'crm',
      label: 'CRM',
      icon: Target,
      items: [
        { id: 'crm-customers', to: '/customers', label: 'Customers', icon: Users, module: 'customers' },
        { id: 'crm-leads', to: '/leads', label: 'Leads', icon: Target, module: 'leads' },
        { id: 'crm-campaigns', to: '/marketing/campaigns', label: 'Campaigns', icon: Megaphone, module: 'marketing' },
        {
          id: 'crm-sequences',
          to: '/marketing/sequences',
          label: 'Sequences',
          icon: Megaphone,
          module: 'marketing',
        },
        {
          id: 'crm-templates',
          to: '/marketing/email-templates',
          label: 'Email Templates',
          icon: FileText,
          module: 'marketing',
        },
      ],
    },
  },
  {
    type: 'section',
    section: {
      id: 'finance',
      label: 'Finance',
      icon: Wallet,
      items: [
        {
          id: 'fin-received',
          to: '/payments/received',
          label: 'Payments Received',
          icon: Wallet,
          module: 'payments',
        },
        {
          id: 'fin-suppliers',
          to: '/payments/suppliers',
          label: 'Supplier Payments',
          icon: Wallet,
          module: 'payments',
        },
        { id: 'fin-accounting', to: '/accounting', label: 'Accounting', icon: BookOpen, module: 'accounting' },
        {
          id: 'fin-coa',
          to: '/accounting/chart-of-accounts',
          label: 'Chart of Accounts',
          icon: FileText,
          module: 'accounting',
        },
        {
          id: 'fin-journals',
          to: '/accounting/journals',
          label: 'Journals',
          icon: ReceiptText,
          module: 'accounting',
        },
        {
          id: 'fin-tax-rates',
          to: '/settings/tax-rates',
          label: 'Tax Rates',
          icon: Percent,
          module: 'settings',
        },
      ],
    },
  },
  {
    type: 'section',
    section: {
      id: 'reports',
      label: 'Reports',
      icon: BarChart3,
      items: [
        { id: 'rep-main', to: '/reports', label: 'Business Reports', icon: BarChart3, module: 'reports' },
        {
          id: 'rep-accounting',
          to: '/accounting/reports',
          label: 'Finance Reports',
          icon: BookOpen,
          module: 'accounting',
        },
        {
          id: 'rep-transport',
          to: '/transport/reports',
          label: 'Transport Reports',
          icon: Truck,
          module: 'transport',
        },
        {
          id: 'rep-retail',
          to: '/retail/analytics',
          label: 'Retail Analytics',
          icon: Store,
          module: 'retail',
        },
      ],
    },
  },
  {
    type: 'section',
    section: {
      id: 'ai',
      label: 'AI',
      icon: Sparkles,
      featureFlag: 'ai',
      items: [
        { id: 'ai-chat', to: '/ai/chat', label: 'Assistant', icon: MessageSquare, module: 'ai' },
        {
          id: 'ai-insights',
          to: '/ai/recommendations',
          label: 'Insights',
          icon: Lightbulb,
          module: 'aiRecommendations',
        },
        { id: 'ai-forecasts', to: '/ai/analytics', label: 'Forecasts', icon: LineChart, module: 'ai' },
        { id: 'ai-workflows', to: '/ai/workflows', label: 'Automation', icon: Workflow, module: 'aiWorkflow' },
      ],
    },
  },
  {
    type: 'section',
    section: {
      id: 'admin',
      label: 'Administration',
      icon: Settings,
      items: [
        {
          id: 'admin-settings',
          to: '/settings/organization',
          label: 'Settings',
          icon: Settings,
          module: 'settings',
        },
        { id: 'admin-users', to: '/settings/users', label: 'Team', icon: Users, module: 'users' },
        { id: 'admin-tax', to: '/settings/tax-rates', label: 'Tax Rates', icon: Percent, module: 'settings' },
        { id: 'admin-units', to: '/settings/units', label: 'Units', icon: Package, module: 'settings' },
        { id: 'admin-templates', to: '/templates', label: 'Templates', icon: FileText, module: 'templates' },
        {
          id: 'admin-billing',
          to: '/settings/billing',
          label: 'Subscription',
          icon: CreditCard,
          module: 'billing',
        },
        {
          id: 'admin-reminders',
          to: '/settings/reminder-rules',
          label: 'Reminder Rules',
          icon: Wallet,
          module: 'payments',
        },
        { id: 'admin-audit', to: '/audit', label: 'Audit Logs', icon: ShieldCheck, module: 'audit' },
      ],
    },
  },
]

export function flattenNavLeaves(entries: NavEntry[] = NAV_ENTRIES): NavLeaf[] {
  const leaves: NavLeaf[] = []
  for (const entry of entries) {
    if (entry.type === 'link') leaves.push(entry.item)
    else leaves.push(...entry.section.items)
  }
  return leaves
}

export function pathMatches(pathname: string, to: string) {
  if (to === '/') return pathname === '/'
  return pathname === to || pathname.startsWith(`${to}/`)
}

export function resolveActivePath(pathname: string, paths: string[]) {
  return paths.filter((to) => pathMatches(pathname, to)).sort((a, b) => b.length - a.length)[0]
}

export function findSectionForPath(pathname: string, entries: NavEntry[] = NAV_ENTRIES): string | null {
  for (const entry of entries) {
    if (entry.type !== 'section') continue
    const paths = entry.section.items.map((i) => i.to)
    if (resolveActivePath(pathname, paths)) return entry.section.id
  }
  return null
}
