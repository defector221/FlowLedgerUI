import { BarChart3, Boxes, Building2, ChevronDown, FileText, LayoutDashboard, Package, ReceiptText, Settings, ShieldCheck, ShoppingCart, Users, Wallet, X } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Button, Separator } from '@/components/ui'

const groups = [
  { label: '', items: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard }] },
  { label: 'TRANSACTIONS', items: [{ to: '/sales/invoices', label: 'Sales', icon: ReceiptText }, { to: '/purchases/orders', label: 'Purchases', icon: ShoppingCart }, { to: '/inventory', label: 'Inventory', icon: Boxes }] },
  { label: 'MASTERS', items: [{ to: '/customers', label: 'Customers', icon: Users }, { to: '/suppliers', label: 'Suppliers', icon: Building2 }, { to: '/products', label: 'Products', icon: Package }, { to: '/categories', label: 'Categories', icon: FileText }, { to: '/warehouses', label: 'Warehouses', icon: Building2 }] },
  { label: 'FINANCE', items: [{ to: '/payments/received', label: 'Payments', icon: Wallet }, { to: '/reports', label: 'Reports', icon: BarChart3 }] },
  { label: 'SYSTEM', items: [{ to: '/settings/organization', label: 'Settings', icon: Settings }, { to: '/audit', label: 'Audit log', icon: ShieldCheck }] },
]

export function AppSidebar({ mobileOpen, onMobileClose }: { mobileOpen: boolean; onMobileClose: () => void }) {
  const content = <aside className="flex h-full w-64 flex-col bg-slate-950 px-3 py-5 text-slate-300">
    <div className="mb-7 flex items-center justify-between px-3"><Link to="/" className="text-xl font-semibold tracking-tight text-white">Flow<span className="text-teal-400">Ledger</span></Link><Button variant="ghost" size="icon" className="text-slate-400 lg:hidden" onClick={onMobileClose}><X className="size-5" /></Button></div>
    <nav className="flex-1 space-y-5 overflow-auto">{groups.map((group) => <div key={group.label}><p className="mb-2 px-3 text-[10px] font-semibold tracking-wider text-slate-500">{group.label}</p>{group.items.map((item) => <NavLink key={item.to} to={item.to} onClick={onMobileClose} className={({ isActive }) => cn('mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-slate-800 hover:text-white', isActive && 'bg-teal-700 text-white')}><item.icon className="size-4" />{item.label}</NavLink>)}</div>)}</nav>
    <Separator className="mb-3 bg-slate-800" /><button className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-800"><span className="grid size-7 place-items-center rounded-full bg-teal-700 text-xs font-semibold text-white">AR</span><span className="flex-1"><b className="block text-xs text-white">Admin user</b><small className="text-[10px] text-slate-500">Administrator</small></span><ChevronDown className="size-4" /></button>
  </aside>
  return <><div className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">{content}</div>{mobileOpen && <div className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden" onClick={onMobileClose}><div className="h-full w-64" onClick={(event) => event.stopPropagation()}>{content}</div></div>}</>
}
