import { Bell, Menu, Search } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { OrganizationSwitcher } from '@/components/layout/OrganizationSwitcher'
import { Button, Input } from '@/components/ui'

export function Header({ onMenu }: { onMenu: () => void }) {
  const location = useLocation()
  const page = location.pathname.split('/').filter(Boolean).pop()?.replaceAll('-', ' ') ?? 'dashboard'
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenu}>
        <Menu className="size-5" />
      </Button>
      <OrganizationSwitcher />
      <div className="hidden max-w-sm flex-1 md:block">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
          <Input className="pl-9" placeholder="Search records, invoices…" />
        </div>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <span className="hidden text-sm capitalize text-slate-500 sm:block">{page}</span>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="size-5" />
          <i className="absolute right-2 top-2 size-1.5 rounded-full bg-rose-500" />
        </Button>
      </div>
    </header>
  )
}
