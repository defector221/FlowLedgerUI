import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { authApi } from '@/services/api'
import { getApiErrorMessage } from '@/lib/api-error'
import { Button, Card, CardContent, Input, Label } from '@/components/ui'

const schema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export function AcceptInvitePage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') ?? ''
  const [preview, setPreview] = useState<{
    organizationName: string
    email: string
    firstName: string
    lastName: string | null
  } | null>(null)
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { password: '', confirmPassword: '' } })

  useEffect(() => {
    if (!token) return
    authApi
      .previewInvitation(token)
      .then(setPreview)
      .catch((error) => toast.error(getApiErrorMessage(error, 'Invalid invitation link')))
  }, [token])

  const submit = form.handleSubmit(async (values) => {
    try {
      await authApi.acceptInvitation({ token, password: values.password })
      toast.success('Invitation accepted. You can now sign in.')
      navigate('/login')
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  })

  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-7">
          <Link to="/" className="mb-8 block text-2xl font-semibold text-slate-950">
            Flow<span className="text-teal-700">Ledger</span>
          </Link>
          <h1 className="text-xl font-semibold text-slate-900">Accept invitation</h1>
          <p className="mt-1 text-sm text-slate-500">
            {preview ? (
              <>
                Join <b>{preview.organizationName}</b> as <b>{preview.email}</b>
              </>
            ) : (
              'Loading invitation details…'
            )}
          </p>
          <form className="mt-6 space-y-4" onSubmit={submit}>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input type="password" {...form.register('password')} />
              {form.formState.errors.password && (
                <p className="text-xs text-rose-600">{form.formState.errors.password.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Confirm password</Label>
              <Input type="password" {...form.register('confirmPassword')} />
              {form.formState.errors.confirmPassword && (
                <p className="text-xs text-rose-600">{form.formState.errors.confirmPassword.message}</p>
              )}
            </div>
            <Button className="w-full" size="lg" disabled={!token || !preview}>
              Accept invitation
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
