import { useState } from 'react'
import { Building2, Check, ChevronDown, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/auth'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
    <div className="flex items-center gap-2">
      <span className="grid size-8 place-items-center rounded-lg bg-teal-700 text-xs font-semibold text-white">
        {activeOrganization.organizationName.slice(0, 2).toUpperCase()}
      </span>
      <div className="hidden text-left sm:block">
        <p className="text-sm font-medium text-slate-900">{activeOrganization.organizationName}</p>
        <p className="text-xs text-slate-500">{activeOrganization.roles[0]?.replace(/_/g, ' ') ?? 'Member'}</p>
      </div>
      {multiple && <ChevronDown className="size-4 text-slate-500" />}
    </div>
  )

  if (!multiple && !creating) {
    return (
      <div className="flex items-center gap-2">
        {content}
        <Button variant="ghost" size="sm" onClick={() => setCreating(true)}>
          <Plus className="size-4" />
          New org
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50"
          >
            {content}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72">
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
              <Building2 className="size-4" />
              <span className="flex-1">{org.organizationName}</span>
              {org.id === activeOrganization.id && <Check className="size-4 text-teal-700" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem onClick={() => setCreating(true)}>
            <Plus className="size-4" />
            Create new organization
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {creating && (
        <form
          className="flex items-center gap-2"
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
            className="h-8 w-44"
            placeholder="Organization name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Button size="sm" type="submit">
            Create
          </Button>
        </form>
      )}
    </div>
  )
}
