import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { Building2, CreditCard, KeyRound, Mail, UserRound } from 'lucide-react'
import { z } from 'zod'
import { toast } from 'sonner'
import { authApi } from '@/services/api'
import { getApiErrorMessage } from '@/lib/api-error'
import { useAuth } from '@/features/auth/auth'
import { PageHeader } from '@/components/layout/PageChrome'
import { Button, Card, CardContent, CardHeader, Input, Label } from '@/components/ui'

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Confirm your password'),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export function ProfileSettingsPage() {
  const { session, activeOrganization, canAccessModule } = useAuth()
  const user = session?.user
  const form = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })

  const submitPassword = form.handleSubmit(async (values) => {
    try {
      await authApi.changePassword(values.currentPassword, values.newPassword)
      form.reset()
      toast.success('Password updated')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to change password'))
    }
  })

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Profile settings"
        subtitle="Your account details for this FlowLedger workspace."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-slate-200/90 shadow-[var(--shadow-soft)]">
          <CardHeader className="border-b border-slate-100 p-5 pb-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Account</p>
            <h2 className="font-[family-name:var(--font-display)] text-base font-semibold text-slate-900">
              Personal details
            </h2>
          </CardHeader>
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center gap-3">
              <span className="grid size-12 place-items-center rounded-full bg-gradient-to-br from-teal-400 to-teal-700 text-sm font-semibold text-white shadow-md">
                {`${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.trim() || 'FL'}
              </span>
              <div>
                <p className="font-semibold text-slate-900">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs capitalize text-slate-500">
                  {activeOrganization?.roles?.[0]?.replace(/_/g, ' ') ?? 'Member'}
                </p>
              </div>
            </div>
            <InfoRow icon={Mail} label="Email" value={user?.email ?? '—'} />
            <InfoRow
              icon={UserRound}
              label="Status"
              value={user?.status?.replace(/_/g, ' ') ?? '—'}
            />
            <InfoRow
              icon={Building2}
              label="Organization"
              value={activeOrganization?.organizationName ?? '—'}
            />
          </CardContent>
        </Card>

        <Card className="border-slate-200/90 shadow-[var(--shadow-soft)]">
          <CardHeader className="border-b border-slate-100 p-5 pb-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Shortcuts</p>
            <h2 className="font-[family-name:var(--font-display)] text-base font-semibold text-slate-900">
              Workspace
            </h2>
          </CardHeader>
          <CardContent className="space-y-2 p-5">
            {canAccessModule('settings') ? (
              <ShortcutLink
                to="/settings/organization"
                icon={Building2}
                title="Organization settings"
                detail="Company profile, GSTIN, and defaults"
              />
            ) : null}
            {canAccessModule('billing') ? (
              <ShortcutLink
                to="/settings/billing"
                icon={CreditCard}
                title="Subscription"
                detail="Plan, usage, and invoices"
              />
            ) : null}
            <ShortcutLink
              to="/settings/password"
              icon={KeyRound}
              title="Password only"
              detail="Dedicated change-password page"
            />
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200/90 shadow-[var(--shadow-soft)]">
        <CardHeader className="border-b border-slate-100 p-5 pb-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Security</p>
          <h2 className="font-[family-name:var(--font-display)] text-base font-semibold text-slate-900">
            Change password
          </h2>
        </CardHeader>
        <CardContent className="p-5">
          <form className="grid max-w-md gap-4" onSubmit={submitPassword}>
            <div className="space-y-1.5">
              <Label>Current password</Label>
              <Input type="password" autoComplete="current-password" {...form.register('currentPassword')} />
              {form.formState.errors.currentPassword && (
                <p className="text-xs text-rose-600">{form.formState.errors.currentPassword.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>New password</Label>
              <Input type="password" autoComplete="new-password" {...form.register('newPassword')} />
              {form.formState.errors.newPassword && (
                <p className="text-xs text-rose-600">{form.formState.errors.newPassword.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Confirm new password</Label>
              <Input type="password" autoComplete="new-password" {...form.register('confirmPassword')} />
              {form.formState.errors.confirmPassword && (
                <p className="text-xs text-rose-600">{form.formState.errors.confirmPassword.message}</p>
              )}
            </div>
            <Button type="submit" className="cursor-pointer" loading={form.formState.isSubmitting}>
              Update password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
      <Icon className="mt-0.5 size-4 text-teal-700" />
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="text-sm font-medium text-slate-800">{value}</p>
      </div>
    </div>
  )
}

function ShortcutLink({
  to,
  icon: Icon,
  title,
  detail,
}: {
  to: string
  icon: typeof Mail
  title: string
  detail: string
}) {
  return (
    <Link
      to={to}
      className="flex items-start gap-3 rounded-xl border border-slate-200/80 px-3 py-2.5 transition hover:border-teal-200 hover:bg-teal-50/40"
    >
      <span className="mt-0.5 grid size-8 place-items-center rounded-lg bg-slate-100 text-teal-700">
        <Icon className="size-3.5" />
      </span>
      <span>
        <span className="block text-sm font-semibold text-slate-900">{title}</span>
        <span className="text-xs text-slate-500">{detail}</span>
      </span>
    </Link>
  )
}
