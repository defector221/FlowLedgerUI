import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Search } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { roleApi, userApi } from '@/services/api'
import { getApiErrorMessage } from '@/lib/api-error'
import { useAuth } from '@/features/auth/auth'
import { PageHeader, MetricCard } from '@/components/layout/PageChrome'
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Table,
} from '@/components/ui'
import type { InviteUserRequest } from '@/types/api'

const inviteSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().optional(),
  email: z.string().email('Enter a valid email'),
  role: z.string().min(1, 'Role is required'),
})

export function TeamManagementPage() {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const [open, setOpen] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('q') ?? '')
  const deferredSearch = useDeferredValue(search.trim().toLowerCase())
  const { data: users = [], isLoading } = useQuery({ queryKey: ['users'], queryFn: userApi.list })
  const { data: roles = [] } = useQuery({ queryKey: ['roles'], queryFn: roleApi.list })
  const form = useForm({
    resolver: zodResolver(inviteSchema),
    defaultValues: { firstName: '', lastName: '', email: '', role: 'SALES_MANAGER' },
  })

  useEffect(() => {
    const next = searchParams.get('q') ?? ''
    setSearch((current) => (current === next ? current : next))
  }, [searchParams])

  useEffect(() => {
    const current = (searchParams.get('q') ?? '').toLowerCase()
    if (deferredSearch === current) return
    const next = new URLSearchParams(searchParams)
    if (deferredSearch) next.set('q', deferredSearch)
    else next.delete('q')
    setSearchParams(next, { replace: true })
  }, [deferredSearch, searchParams, setSearchParams])

  const filteredUsers = useMemo(() => {
    if (!deferredSearch) return users
    return users.filter((user) => {
      const haystack = `${user.firstName} ${user.lastName ?? ''} ${user.email} ${user.roles.join(' ')}`.toLowerCase()
      return haystack.includes(deferredSearch)
    })
  }, [users, deferredSearch])

  const totalUsers = users.length
  const activeUsers = users.filter((user) => user.status === 'ACTIVE').length
  const pendingInvitations = users.filter((user) => user.status === 'INVITED').length
  const administrators = users.filter((user) => user.roles.includes('ORGANIZATION_ADMIN')).length

  const invite = form.handleSubmit(async (values) => {
    try {
      await userApi.invite(values as InviteUserRequest)
      await queryClient.invalidateQueries({ queryKey: ['users'] })
      form.reset({ firstName: '', lastName: '', email: '', role: values.role })
      setOpen(false)
      toast.success('Employee invited. They will receive an email to accept the invitation.')
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  })

  const changeRole = async (id: string, role: string) => {
    try {
      await userApi.changeRole(id, role)
      await queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Role updated')
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }

  const deactivate = async (id: string) => {
    try {
      await userApi.deactivate(id)
      await queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Access removed')
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }

  const resend = async (id: string) => {
    try {
      await userApi.resendInvitation(id)
      toast.success('Invitation resent')
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team & Access"
        subtitle={`Manage employees and permissions for ${session?.user.firstName}'s organization.`}
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" />
            Invite Employee
          </Button>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Total Users', totalUsers],
          ['Active Users', activeUsers],
          ['Pending Invitations', pendingInvitations],
          ['Administrators', administrators],
        ].map(([label, value]) => (
          <MetricCard key={label} label={label} value={value} />
        ))}
      </section>

      <Card>
        <CardContent className="p-4">
          <div className="mb-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
              <Input
                className="pl-9"
                placeholder="Search employees by name, email, or role…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>
          {isLoading ? (
            <p className="py-10 text-center text-sm text-slate-500">Loading team members…</p>
          ) : (
            <Table>
              <thead>
                <tr className="border-b">
                  <th className="p-3 text-xs text-slate-500">EMPLOYEE</th>
                  <th className="p-3 text-xs text-slate-500">EMAIL</th>
                  <th className="p-3 text-xs text-slate-500">ROLE</th>
                  <th className="p-3 text-xs text-slate-500">STATUS</th>
                  <th className="p-3 text-xs text-slate-500">LAST LOGIN</th>
                  <th className="p-3 text-xs text-slate-500">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length ? (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b">
                      <td className="p-3">
                        {user.firstName} {user.lastName}
                      </td>
                      <td className="p-3">{user.email}</td>
                      <td className="p-3">
                        {user.id === session?.user.id ? (
                          <Badge>{roles.find((r) => r.code === user.roles[0])?.name ?? user.roles[0]}</Badge>
                        ) : (
                          <Select value={user.roles[0]} onValueChange={(role) => changeRole(user.id, role)}>
                            <SelectTrigger className="h-8 w-44">
                              {roles.find((r) => r.code === user.roles[0])?.name ?? user.roles[0]}
                            </SelectTrigger>
                            <SelectContent>
                              {roles.map((role) => (
                                <SelectItem key={role.code} value={role.code}>
                                  {role.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </td>
                      <td className="p-3">
                        <Badge>{user.status}</Badge>
                      </td>
                      <td className="p-3">{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : '—'}</td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          {user.status === 'INVITED' && (
                            <Button size="sm" variant="outline" onClick={() => resend(user.id)}>
                              Resend
                            </Button>
                          )}
                          {user.status !== 'INACTIVE' && user.id !== session?.user.id && (
                            <Button size="sm" variant="outline" onClick={() => deactivate(user.id)}>
                              Remove
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-sm text-slate-500">
                      {deferredSearch ? `No employees match “${deferredSearch}”.` : 'No employees found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle className="text-lg font-semibold">Invite Employee</DialogTitle>
          <form className="space-y-4" onSubmit={invite}>
            <div className="space-y-1.5">
              <Label>First Name</Label>
              <Input {...form.register('firstName')} />
              {form.formState.errors.firstName && (
                <p className="text-xs text-rose-600">{form.formState.errors.firstName.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Last Name</Label>
              <Input {...form.register('lastName')} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" {...form.register('email')} />
              {form.formState.errors.email && (
                <p className="text-xs text-rose-600">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select
                value={form.watch('role')}
                onValueChange={(value) => form.setValue('role', value, { shouldValidate: true })}
              >
                <SelectTrigger>{roles.find((r) => r.code === form.watch('role'))?.name ?? 'Select role'}</SelectTrigger>
                <SelectContent>
                  {roles.length ? (
                    roles.map((role) => (
                      <SelectItem key={role.code} value={role.code}>
                        {role.name}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-slate-500">Loading roles…</div>
                  )}
                </SelectContent>
              </Select>
              {form.formState.errors.role && (
                <p className="text-xs text-rose-600">{form.formState.errors.role.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full">
              Send Invitation
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
