import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { authApi } from '@/services/api'
import { getApiErrorMessage } from '@/lib/api-error'
import { PageHeader } from '@/components/layout/PageChrome'
import { Button, Card, CardContent, Input, Label } from '@/components/ui'

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Confirm your password'),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export function ChangePasswordPage() {
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })

  const submit = form.handleSubmit(async (values) => {
    try {
      await authApi.changePassword(values.currentPassword, values.newPassword)
      form.reset()
      toast.success('Password updated')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to change password'))
    }
  })

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <PageHeader title="Change password" subtitle="Update the password you use to sign in to FlowLedger." />
      <Card>
        <CardContent className="p-6">
          <form className="space-y-4" onSubmit={submit}>
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
            <Button disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Updating…' : 'Update password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
