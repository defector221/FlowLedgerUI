import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from './auth'
import { authApi } from '@/services/api'
import { getApiErrorMessage } from '@/lib/api-error'
import { Button, Card, CardContent, Input, Label } from '@/components/ui'

const loginSchema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

const registerSchema = z.object({
  organizationName: z.string().min(1, 'Organization name is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().optional(),
  email: z.email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

const forgotSchema = z.object({
  organizationId: z.string().uuid('Organization ID is required'),
  email: z.email('Enter a valid email'),
})

const resetSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

function Shell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden p-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_20%_0%,rgb(20_184_166/0.22),transparent_55%),radial-gradient(ellipse_50%_40%_at_90%_10%,rgb(14_165_233/0.16),transparent_50%),linear-gradient(160deg,#0b1a2b_0%,#10263d_45%,#0f766e_140%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            'linear-gradient(rgb(255 255 255 / 40%) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / 40%) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      <Card className="relative w-full max-w-md border-white/60 bg-white/95 shadow-[0_24px_80px_rgb(2_6_23/0.35)]">
        <CardContent className="p-8">
          <Link to="/" className="font-display mb-8 block text-2xl font-semibold tracking-tight text-slate-950">
            Flow<span className="bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">Ledger</span>
          </Link>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{subtitle}</p>
          {children}
        </CardContent>
      </Card>
    </main>
  )
}

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const form = useForm({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } })
  const submit = form.handleSubmit(async (values) => {
    try {
      await login(values.email, values.password)
      toast.success('Welcome back')
      navigate(location.state?.from?.pathname ?? '/')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to sign in. Check your credentials.'))
    }
  })
  return (
    <Shell title="Welcome back" subtitle="Sign in to manage your business">
      <form className="mt-6 space-y-4" onSubmit={submit}>
        <div className="space-y-1.5">
          <Label>Email address</Label>
          <Input type="email" {...form.register('email')} placeholder="you@company.com" />
          {form.formState.errors.email && (
            <p className="text-xs text-rose-600">{form.formState.errors.email.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between">
            <Label>Password</Label>
            <Link className="text-xs text-teal-700 hover:underline" to="/forgot-password">
              Forgot password?
            </Link>
          </div>
          <Input type="password" {...form.register('password')} />
          {form.formState.errors.password && (
            <p className="text-xs text-rose-600">{form.formState.errors.password.message}</p>
          )}
        </div>
        <Button className="w-full" size="lg" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>
        <p className="text-center text-sm text-slate-500">
          New to FlowLedger?{' '}
          <Link className="text-teal-700 hover:underline" to="/register">
            Create organization
          </Link>
        </p>
      </form>
    </Shell>
  )
}

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const form = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { organizationName: '', firstName: '', lastName: '', email: '', password: '' },
  })
  const submit = form.handleSubmit(async (values) => {
    try {
      await register(values)
      toast.success('Organization created')
      navigate('/onboarding')
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  })
  return (
    <Shell title="Create your organization" subtitle="Start your FlowLedger workspace">
      <form className="mt-6 space-y-4" onSubmit={submit}>
        <div className="space-y-1.5">
          <Label>Organization name</Label>
          <Input {...form.register('organizationName')} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>First name</Label>
            <Input {...form.register('firstName')} />
          </div>
          <div className="space-y-1.5">
            <Label>Last name</Label>
            <Input {...form.register('lastName')} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Work email</Label>
          <Input type="email" {...form.register('email')} />
        </div>
        <div className="space-y-1.5">
          <Label>Password</Label>
          <Input type="password" {...form.register('password')} />
        </div>
        <Button className="w-full" size="lg">
          Create organization
        </Button>
        <p className="text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link className="text-teal-700 hover:underline" to="/login">
            Sign in
          </Link>
        </p>
      </form>
    </Shell>
  )
}

export function ForgotPasswordPage() {
  const form = useForm({ resolver: zodResolver(forgotSchema), defaultValues: { organizationId: '', email: '' } })
  const submit = form.handleSubmit(async (values) => {
    try {
      await authApi.forgotPassword(values.organizationId, values.email)
      toast.success('If the account exists, reset instructions were sent')
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  })
  return (
    <Shell title="Reset your password" subtitle="Enter your organization ID and email">
      <form className="mt-6 space-y-4" onSubmit={submit}>
        <div className="space-y-1.5">
          <Label>Organization ID</Label>
          <Input {...form.register('organizationId')} placeholder="UUID from your administrator" />
        </div>
        <div className="space-y-1.5">
          <Label>Email address</Label>
          <Input type="email" {...form.register('email')} />
        </div>
        <Button className="w-full" size="lg">
          Send reset link
        </Button>
        <Link to="/login" className="block text-center text-sm text-teal-700 hover:underline">
          Back to sign in
        </Link>
      </form>
    </Shell>
  )
}

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const form = useForm({ resolver: zodResolver(resetSchema), defaultValues: { password: '' } })
  const submit = form.handleSubmit(async (values) => {
    try {
      await authApi.resetPassword(params.get('token') ?? '', values.password)
      toast.success('Password updated')
      navigate('/login')
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  })
  return (
    <Shell title="Set a new password" subtitle="Choose a secure password for your account">
      <form className="mt-6 space-y-4" onSubmit={submit}>
        <div className="space-y-1.5">
          <Label>New password</Label>
          <Input type="password" {...form.register('password')} />
        </div>
        <Button className="w-full" size="lg">
          Reset password
        </Button>
        <Link to="/login" className="block text-center text-sm text-teal-700 hover:underline">
          Back to sign in
        </Link>
      </form>
    </Shell>
  )
}
