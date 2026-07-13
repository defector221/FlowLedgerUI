import { Bell, Menu, Search } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { OrganizationSwitcher } from '@/components/layout/OrganizationSwitcher'
import { Button, Input } from '@/components/ui'

const SEARCHABLE_ROUTES = [
  { prefix: '/customers', path: '/customers' },
  { prefix: '/suppliers', path: '/suppliers' },
  { prefix: '/products', path: '/products' },
  { prefix: '/categories', path: '/categories' },
  { prefix: '/warehouses', path: '/warehouses' },
  { prefix: '/settings/users', path: '/settings/users' },
] as const

export function Header({ onMenu }: { onMenu: () => void }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const page = location.pathname.split('/').filter(Boolean).pop()?.replaceAll('-', ' ') ?? 'dashboard'

  const submitSearch = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) return
    const match = SEARCHABLE_ROUTES.find((route) => location.pathname.startsWith(route.prefix))
    const target = match?.path ?? '/customers'
    navigate(`${target}?q=${encodeURIComponent(trimmed)}`)
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenu}>
        <Menu className="size-5" />
      </Button>
      <OrganizationSwitcher />
      <form className="hidden max-w-sm flex-1 md:block" onSubmit={submitSearch}>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Search customers, products…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </form>
      <div className="ml-auto flex items-center gap-3">
        <span className="hidden text-sm capitalize text-slate-500 sm:block">{page}</span>
        <Button variant="ghost" size="icon" className="relative" type="button" aria-label="Notifications">
          <Bell className="size-5" />
        </Button>
      </div>
    </header>
  )
}
