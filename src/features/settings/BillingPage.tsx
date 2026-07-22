import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Building2,
  CalendarClock,
  Check,
  CreditCard,
  FileText,
  Receipt,
  Sparkles,
  Users,
} from 'lucide-react'
import { billingApi, subscriptionApi, type SubscriptionPlan, type CheckoutResponse } from '@/services/api'
import { getApiErrorMessage } from '@/lib/api-error'
import { PageHeader } from '@/components/layout/PageChrome'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Skeleton,
  Table,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui'
import { cn } from '@/lib/utils'

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void }
  }
}

function loadRazorpay(): Promise<void> {
  if (window.Razorpay) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Razorpay'))
    document.body.appendChild(script)
  })
}

function formatMoney(value: number) {
  return `₹${Number(value).toLocaleString('en-IN')}`
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function statusVariant(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  const normalized = status.toUpperCase()
  if (normalized === 'ACTIVE' || normalized === 'TRIAL') return 'success'
  if (normalized === 'PAST_DUE') return 'warning'
  if (normalized === 'CANCELLED' || normalized === 'EXPIRED') return 'danger'
  return 'neutral'
}

export function BillingPage() {
  const queryClient = useQueryClient()
  const [cycle, setCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY')
  const [tab, setTab] = useState('current')

  const { data: legacy, isLoading: loadingLegacy } = useQuery({
    queryKey: ['billing-current'],
    queryFn: billingApi.current,
  })
  const { data: current, isLoading: loadingCurrent, refetch: refetchCurrent } = useQuery({
    queryKey: ['subscriptions-current'],
    queryFn: subscriptionApi.current,
  })
  const { data: plans = [], isLoading: loadingPlans } = useQuery({
    queryKey: ['subscriptions-plans'],
    queryFn: subscriptionApi.plans,
  })
  const { data: usage } = useQuery({
    queryKey: ['subscriptions-usage'],
    queryFn: subscriptionApi.usage,
  })
  const { data: invoices = [] } = useQuery({
    queryKey: ['subscriptions-invoices'],
    queryFn: subscriptionApi.invoices,
  })

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['billing-current'] })
    await queryClient.invalidateQueries({ queryKey: ['subscriptions-current'] })
    await queryClient.invalidateQueries({ queryKey: ['subscriptions-usage'] })
    await queryClient.invalidateQueries({ queryKey: ['subscriptions-invoices'] })
  }

  const openCheckout = async (response: CheckoutResponse) => {
    if (response.activated) {
      toast.success('Subscription activated')
      await invalidate()
      setTab('current')
      return
    }
    if (response.provider !== 'razorpay' || !response.orderId || !response.keyId) {
      toast.error(`Checkout via ${response.provider} is not available in the UI yet`)
      return
    }
    await loadRazorpay()
    if (!window.Razorpay) throw new Error('Razorpay unavailable')
    const rzp = new window.Razorpay({
      key: response.keyId,
      amount: Math.round(Number(response.amount) * 100),
      currency: response.currency || 'INR',
      order_id: response.orderId,
      name: 'FlowLedger',
      description: `${response.planCode} (${response.billingCycle})`,
      handler: async (payment: {
        razorpay_order_id: string
        razorpay_payment_id: string
        razorpay_signature: string
      }) => {
        try {
          await subscriptionApi.verifyPayment({
            razorpayOrderId: payment.razorpay_order_id,
            razorpayPaymentId: payment.razorpay_payment_id,
            razorpaySignature: payment.razorpay_signature,
          })
          toast.success('Payment verified — subscription updated')
          await invalidate()
          setTab('current')
        } catch (error) {
          toast.error(getApiErrorMessage(error, 'Payment verification failed'))
        }
      },
    })
    rzp.open()
  }

  const checkoutMutation = useMutation({
    mutationFn: (planCode: string) => subscriptionApi.checkout({ planCode, billingCycle: cycle }),
    onSuccess: openCheckout,
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })
  const upgradeMutation = useMutation({
    mutationFn: (planCode: string) => subscriptionApi.upgrade({ planCode, billingCycle: cycle }),
    onSuccess: openCheckout,
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })
  const cancelMutation = useMutation({
    mutationFn: () => subscriptionApi.cancel(),
    onSuccess: async () => {
      toast.success('Auto-renew cancelled')
      await invalidate()
      await refetchCurrent()
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  const isLoading = loadingLegacy || loadingCurrent
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }

  const plan = current?.plan
  const status = current?.status ?? legacy?.subscriptionStatus ?? 'NONE'
  const planName = plan?.name ?? legacy?.plan.name ?? '—'
  const planDescription = plan?.description ?? legacy?.plan.description
  const usageView = usage ?? {
    organizationCount: legacy?.usage.organizationCount ?? 0,
    organizationLimit: legacy?.usage.organizationLimit ?? plan?.maxOrganizations ?? 0,
    userCount: legacy?.usage.userCount ?? 0,
    userLimit: legacy?.usage.userLimit ?? plan?.maxUsersPerOrg ?? 0,
    invoiceCount: legacy?.usage.invoiceCount ?? 0,
    invoiceLimit: legacy?.usage.invoiceLimit ?? plan?.maxInvoicesPerMonth ?? 0,
  }

  const isCurrentPlan = (p: SubscriptionPlan) =>
    current?.plan?.code === p.code || (!current && legacy?.plan.code === p.code)

  const yearlySavingsLabel = (p: SubscriptionPlan) => {
    const monthlyYear = Number(p.priceMonthly) * 12
    const yearly = Number(p.priceYearly)
    if (monthlyYear <= 0 || yearly <= 0 || yearly >= monthlyYear) return null
    const pct = Math.round(((monthlyYear - yearly) / monthlyYear) * 100)
    return pct > 0 ? `Save ${pct}%` : null
  }

  const selectPlan = (p: SubscriptionPlan) => {
    if (current?.plan && current.plan.code !== 'FREE') upgradeMutation.mutate(p.code)
    else checkoutMutation.mutate(p.code)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscription"
        subtitle="Plan limits, billing cycle, invoices, and usage for this organization."
        actions={
          <Button variant="outline" className="cursor-pointer" onClick={() => setTab('pricing')}>
            <Sparkles className="size-4" />
            View plans
          </Button>
        }
      />

      <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[var(--shadow-soft)]">
        <div className="border-b border-slate-100 bg-gradient-to-r from-teal-50/80 via-white to-sky-50/50 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-slate-900">
                  {planName}
                </h2>
                <Badge variant={statusVariant(status)}>{status.replaceAll('_', ' ')}</Badge>
                {current?.billingCycle ? (
                  <Badge variant="outline">{current.billingCycle.toLowerCase()}</Badge>
                ) : null}
              </div>
              {planDescription ? <p className="max-w-xl text-sm text-slate-500">{planDescription}</p> : null}
            </div>
            <div className="rounded-xl border border-teal-100 bg-white/80 px-4 py-3 text-right shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Next billing</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-800">{formatDate(current?.nextBillingDate)}</p>
            </div>
          </div>
        </div>
        <div className="grid gap-px bg-slate-100 sm:grid-cols-3">
          <SummaryStat
            icon={Building2}
            label="Organizations"
            value={`${usageView.organizationCount} / ${usageView.organizationLimit}`}
          />
          <SummaryStat
            icon={Users}
            label="Users in org"
            value={`${usageView.userCount} / ${usageView.userLimit}`}
          />
          <SummaryStat
            icon={FileText}
            label="Invoices this month"
            value={`${usageView.invoiceCount} / ${usageView.invoiceLimit}`}
          />
        </div>
      </section>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-slate-100/90 p-1.5 sm:w-auto">
          <TabsTrigger value="current" className="cursor-pointer px-3.5 py-2">
            Current plan
          </TabsTrigger>
          <TabsTrigger value="pricing" className="cursor-pointer px-3.5 py-2">
            Pricing
          </TabsTrigger>
          <TabsTrigger value="billing" className="cursor-pointer px-3.5 py-2">
            Billing details
          </TabsTrigger>
          <TabsTrigger value="invoices" className="cursor-pointer px-3.5 py-2">
            Invoices
          </TabsTrigger>
          <TabsTrigger value="usage" className="cursor-pointer px-3.5 py-2">
            Usage
          </TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="mt-5">
          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <Card className="border-slate-200/90 shadow-[var(--shadow-soft)]">
              <CardHeader className="space-y-1 border-b border-slate-100 p-5 pb-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Included limits</p>
                <h3 className="text-base font-semibold text-slate-900">What you can use on {planName}</h3>
              </CardHeader>
              <CardContent className="grid gap-3 p-5 sm:grid-cols-3">
                <LimitTile
                  icon={Building2}
                  label="Organizations"
                  value={plan?.maxOrganizations ?? legacy?.plan.maxOrganizations}
                />
                <LimitTile
                  icon={Users}
                  label="Users / org"
                  value={plan?.maxUsersPerOrg ?? legacy?.plan.maxUsersPerOrg}
                />
                <LimitTile
                  icon={Receipt}
                  label="Invoices / month"
                  value={plan?.maxInvoicesPerMonth ?? legacy?.plan.maxInvoicesPerMonth}
                />
              </CardContent>
            </Card>

            <Card className="border-slate-200/90 shadow-[var(--shadow-soft)]">
              <CardHeader className="space-y-1 border-b border-slate-100 p-5 pb-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Renewal</p>
                <h3 className="text-base font-semibold text-slate-900">Billing controls</h3>
              </CardHeader>
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start gap-3 rounded-xl bg-slate-50 px-3.5 py-3">
                  <CalendarClock className="mt-0.5 size-4 text-teal-700" />
                  <div className="text-sm">
                    <p className="font-medium text-slate-800">
                      Cycle: {(current?.billingCycle ?? 'MONTHLY').toLowerCase()}
                    </p>
                    <p className="mt-0.5 text-slate-500">
                      Auto-renew {current?.autoRenew ? 'enabled' : 'disabled'}
                      {current?.endDate ? ` · ends ${formatDate(current.endDate)}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" className="cursor-pointer" onClick={() => setTab('pricing')}>
                    Change plan
                  </Button>
                  {current?.autoRenew && current.plan?.code !== 'FREE' ? (
                    <Button
                      variant="ghost"
                      className="cursor-pointer text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                      loading={cancelMutation.isPending}
                      onClick={() => {
                        if (window.confirm('Cancel auto-renew at the end of the current period?')) {
                          cancelMutation.mutate()
                        }
                      }}
                    >
                      Cancel auto-renew
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pricing" className="mt-5 space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Choose a plan</h3>
              <p className="text-sm text-slate-500">Same plans for monthly or yearly billing — no duplicate SKUs.</p>
            </div>
            <div
              className="inline-flex rounded-xl border border-slate-200 bg-slate-100/80 p-1"
              role="group"
              aria-label="Billing cycle"
            >
              <button
                type="button"
                className={cn(
                  'cursor-pointer rounded-lg px-3.5 py-1.5 text-sm font-medium transition',
                  cycle === 'MONTHLY' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800',
                )}
                onClick={() => setCycle('MONTHLY')}
              >
                Monthly
              </button>
              <button
                type="button"
                className={cn(
                  'cursor-pointer rounded-lg px-3.5 py-1.5 text-sm font-medium transition',
                  cycle === 'YEARLY' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800',
                )}
                onClick={() => setCycle('YEARLY')}
              >
                Yearly
              </button>
            </div>
          </div>

          {loadingPlans ? (
            <div className="grid gap-4 lg:grid-cols-3">
              {[1, 2, 3].map((id) => (
                <Skeleton key={id} className="h-80 w-full rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-3">
              {plans.map((p) => {
                const price = cycle === 'YEARLY' ? Number(p.priceYearly) : Number(p.priceMonthly)
                const currentBadge = isCurrentPlan(p)
                const savings = cycle === 'YEARLY' ? yearlySavingsLabel(p) : null
                const busy = checkoutMutation.isPending || upgradeMutation.isPending
                return (
                  <Card
                    key={p.id}
                    className={cn(
                      'relative flex flex-col overflow-hidden border-slate-200/90 shadow-[var(--shadow-soft)] transition hover:shadow-[var(--shadow-lift)]',
                      p.highlightPlan && 'border-teal-300 ring-2 ring-teal-500/30',
                      currentBadge && 'bg-teal-50/20',
                    )}
                  >
                    {(p.recommended || p.highlightPlan) && (
                      <div className="bg-gradient-to-r from-teal-700 to-teal-600 px-4 py-1.5 text-center text-[11px] font-semibold uppercase tracking-wide text-white">
                        {p.recommended ? 'Recommended' : 'Most popular'}
                      </div>
                    )}
                    <CardHeader className="space-y-2 p-5 pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-slate-900">
                          {p.name}
                        </h3>
                        {currentBadge ? <Badge variant="success">Current</Badge> : null}
                      </div>
                      <p className="min-h-10 text-sm leading-relaxed text-slate-500">{p.description}</p>
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col gap-5 p-5 pt-0">
                      <div>
                        <p className="flex items-baseline gap-1">
                          <span className="text-3xl font-semibold tracking-tight text-slate-900">
                            {formatMoney(price)}
                          </span>
                          <span className="text-sm text-slate-500">
                            / {cycle === 'YEARLY' ? 'year' : 'month'}
                          </span>
                        </p>
                        {savings ? (
                          <p className="mt-1 text-xs font-medium text-teal-700">{savings} vs paying monthly</p>
                        ) : null}
                      </div>
                      <ul className="space-y-2.5 text-sm text-slate-600">
                        <FeatureLine>{p.maxOrganizations} organization(s)</FeatureLine>
                        <FeatureLine>{p.maxUsersPerOrg} users per organization</FeatureLine>
                        <FeatureLine>{p.maxInvoicesPerMonth.toLocaleString('en-IN')} invoices / month</FeatureLine>
                        {p.trialDays > 0 ? <FeatureLine>{p.trialDays}-day trial available</FeatureLine> : null}
                      </ul>
                      <div className="mt-auto pt-1">
                        {currentBadge ? (
                          <Button className="w-full cursor-not-allowed" variant="outline" disabled>
                            Current plan
                          </Button>
                        ) : (
                          <Button
                            className="w-full cursor-pointer"
                            loading={busy}
                            onClick={() => selectPlan(p)}
                          >
                            {p.code === 'FREE'
                              ? 'Switch to Free'
                              : current?.plan?.code === 'FREE' || !current
                                ? 'Upgrade'
                                : 'Change plan'}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="billing" className="mt-5">
          <Card className="border-slate-200/90 shadow-[var(--shadow-soft)]">
            <CardHeader className="border-b border-slate-100 p-5 pb-4">
              <div className="flex items-center gap-2">
                <CreditCard className="size-4 text-teal-700" />
                <h3 className="text-base font-semibold text-slate-900">Payment & period</h3>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
              <DetailRow label="Payment provider" value={current?.paymentProvider ?? '—'} />
              <DetailRow label="Payment reference" value={current?.paymentReference ?? '—'} />
              <DetailRow label="Auto-renew" value={current?.autoRenew ? 'On' : 'Off'} />
              <DetailRow label="Billing cycle" value={current?.billingCycle ?? 'MONTHLY'} />
              <DetailRow label="Period start" value={formatDate(current?.startDate)} />
              <DetailRow label="Period end" value={formatDate(current?.endDate)} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="mt-5">
          <Card className="border-slate-200/90 shadow-[var(--shadow-soft)]">
            <CardHeader className="border-b border-slate-100 p-5 pb-4">
              <h3 className="text-base font-semibold text-slate-900">Subscription invoices</h3>
              <p className="text-sm text-slate-500">Receipts for plan checkout and upgrades.</p>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <thead>
                  <tr className="border-b bg-slate-50/80">
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Invoice
                    </th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Total
                    </th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Paid on
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-5 py-3.5 font-medium text-slate-800">{inv.invoiceNumber}</td>
                      <td className="px-5 py-3.5 text-slate-700">{formatMoney(Number(inv.total))}</td>
                      <td className="px-5 py-3.5 text-slate-600">{formatDate(inv.paidAt)}</td>
                    </tr>
                  ))}
                  {!invoices.length ? (
                    <tr>
                      <td colSpan={3} className="px-5 py-16 text-center text-sm text-slate-500">
                        No subscription invoices yet. Paid upgrades will appear here.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage" className="mt-5">
          <Card className="border-slate-200/90 shadow-[var(--shadow-soft)]">
            <CardHeader className="border-b border-slate-100 p-5 pb-4">
              <h3 className="text-base font-semibold text-slate-900">Usage against plan limits</h3>
              <p className="text-sm text-slate-500">Counts reset or recalculate based on your organization activity.</p>
            </CardHeader>
            <CardContent className="space-y-6 p-5">
              <UsageBar
                label="Organizations (owned)"
                used={usageView.organizationCount}
                limit={usageView.organizationLimit}
              />
              <UsageBar label="Users in current org" used={usageView.userCount} limit={usageView.userLimit} />
              <UsageBar
                label="Invoices this month"
                used={usageView.invoiceCount}
                limit={usageView.invoiceLimit}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function SummaryStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3 bg-white px-5 py-4">
      <div className="flex size-9 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
        <Icon className="size-4" />
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="text-sm font-semibold text-slate-900">{value}</p>
      </div>
    </div>
  )
}

function LimitTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2
  label: string
  value?: number | null
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3.5 py-3">
      <div className="mb-2 flex size-8 items-center justify-center rounded-lg bg-white text-teal-700 shadow-sm">
        <Icon className="size-3.5" />
      </div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-0.5 text-lg font-semibold text-slate-900">{value ?? '—'}</p>
    </div>
  )
}

function FeatureLine({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-700">
        <Check className="size-2.5" strokeWidth={3} />
      </span>
      <span>{children}</span>
    </li>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-3.5 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 break-all text-sm font-medium text-slate-800">{value}</p>
    </div>
  )
}

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const percent = limit > 0 ? Math.min(100, (used / limit) * 100) : 0
  const tone = percent >= 90 ? 'bg-rose-500' : percent >= 70 ? 'bg-amber-500' : 'bg-teal-600'
  return (
    <div>
      <div className="mb-2 flex justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="tabular-nums text-slate-800">
          {used} <span className="text-slate-400">/</span> {limit}
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div className={cn('h-full rounded-full transition-all duration-300', tone)} style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
