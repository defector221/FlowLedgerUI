import { useState } from 'react'
import { Building2, Check, ChevronDown, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/auth'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
} from '@/components/ui'

export function OrganizationSwitcher() {
  const navigate = useNavigate()
  const { activeOrganization, organizations, switchOrganization, createOrganization } = useAuth()
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')

  if (!activeOrganization) return null

  const multiple = organizations.length > 1

  const content = (
    <div className="flex min-w-0 items-center gap-2">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-teal-700 text-xs font-semibold text-white">
        {activeOrganization.organizationName.slice(0, 2).toUpperCase()}
      </span>
      <div className="hidden min-w-0 text-left md:block">
        <p className="truncate text-sm font-medium text-slate-900">{activeOrganization.organizationName}</p>
        <p className="truncate text-xs text-slate-500">{activeOrganization.roles[0]?.replace(/_/g, ' ') ?? 'Member'}</p>
      </div>
      {multiple && <ChevronDown className="size-4 shrink-0 text-slate-500" />}
    </div>
  )

  if (!multiple && !creating) {
    return (
      <div className="flex min-w-0 items-center gap-1 sm:gap-2">
        {content}
        <Button variant="ghost" size="sm" className="shrink-0 px-2 sm:px-3" onClick={() => setCreating(true)}>
          <Plus className="size-4" />
          <span className="hidden sm:inline">New org</span>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex max-w-full min-w-0 items-center gap-2 rounded-lg border border-slate-200 px-2 py-1.5 hover:bg-slate-50 sm:px-3 sm:py-2"
          >
            {content}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[min(18rem,calc(100vw-2rem))]">
          <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Switch organization</p>
          {organizations.map((org) => (
            <DropdownMenuItem
              key={org.id}
              onClick={async () => {
                if (org.id !== activeOrganization.id) {
                  await switchOrganization(org.id)
                  navigate('/')
                }
              }}
            >
              <Building2 className="size-4 shrink-0 text-slate-500" />
              <span className="min-w-0 flex-1 truncate">{org.organizationName}</span>
              {org.id === activeOrganization.id ? (
                <Check className="size-4 shrink-0 text-teal-700" />
              ) : (
                <span className="size-4 shrink-0" aria-hidden />
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setCreating(true)}>
            <Plus className="size-4 shrink-0" />
            <span>Create new organization</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {creating && (
        <form
          className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center"
          onSubmit={async (event) => {
            event.preventDefault()
            if (!name.trim()) return
            await createOrganization(name.trim())
            setCreating(false)
            setName('')
            navigate('/onboarding')
          }}
        >
          <Input
            className="h-8 w-full sm:w-44"
            placeholder="Organization name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <div className="flex gap-2">
            <Button size="sm" type="submit">
              Create
            </Button>
            <Button
              size="sm"
              type="button"
              variant="outline"
              onClick={() => {
                setCreating(false)
                setName('')
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
