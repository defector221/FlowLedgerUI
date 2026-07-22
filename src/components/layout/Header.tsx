import { Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { GlobalAskButton } from '@/features/ai/GlobalAskFab'
import { GlobalSearch } from '@/components/layout/GlobalSearch'
import { NotificationBell } from '@/components/layout/NotificationBell'
import { OrganizationSwitcher } from '@/components/layout/OrganizationSwitcher'
import { Button } from '@/components/ui'

export function Header({
  onMenu,
  collapsed,
  onToggleCollapsed,
}: {
  onMenu: () => void
  collapsed: boolean
  onToggleCollapsed: () => void
}) {
  const location = useLocation()
  const page = location.pathname.split('/').filter(Boolean).pop()?.replaceAll('-', ' ') ?? 'dashboard'

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-slate-200/80 bg-white/80 px-3 shadow-[0_1px_0_rgb(15_23_42/0.03)] backdrop-blur-xl sm:h-16 sm:gap-4 sm:px-6">
      <Button variant="ghost" size="icon" className="shrink-0 lg:hidden" onClick={onMenu} aria-label="Open menu">
        <Menu className="size-5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="hidden shrink-0 cursor-pointer text-slate-600 hover:text-slate-900 lg:inline-flex"
        onClick={onToggleCollapsed}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <PanelLeftOpen className="size-5" /> : <PanelLeftClose className="size-5" />}
      </Button>
      <div className="min-w-0 shrink">
        <OrganizationSwitcher />
      </div>
      <GlobalSearch />
      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
        <span className="hidden max-w-[10rem] truncate rounded-md bg-teal-50 px-2.5 py-1 text-xs font-semibold capitalize tracking-wide text-teal-800 xl:block">
          {page}
        </span>
        <GlobalAskButton />
        <NotificationBell />
      </div>
    </header>
  )
}
