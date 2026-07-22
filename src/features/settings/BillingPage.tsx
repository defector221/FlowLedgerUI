import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { billingApi, subscriptionApi, type SubscriptionPlan, type CheckoutResponse } from '@/services/api'
import { getApiErrorMessage } from '@/lib/api-error'
import { PageHeader } from '@/components/layout/PageChrome'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Table,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui'

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
      handler: async (payment: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
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
    return <p className="py-16 text-center text-sm text-slate-500">Loading subscription…</p>
  }

  const plan = current?.plan
  const status = current?.status ?? legacy?.subscriptionStatus ?? 'NONE'
  const usageView = usage ?? {
    organizationCount: legacy?.usage.organizationCount ?? 0,
    organizationLimit: legacy?.usage.organizationLimit ?? plan?.maxOrganizations ?? 0,
    userCount: legacy?.usage.userCount ?? 0,
    userLimit: legacy?.usage.userLimit ?? plan?.maxUsersPerOrg ?? 0,
    invoiceCount: 0,
    invoiceLimit: plan?.maxInvoicesPerMonth ?? 0,
  }

  const isCurrentPlan = (p: SubscriptionPlan) =>
    current?.plan?.code === p.code || (!current && legacy?.plan.code === p.code)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscription"
        subtitle="Manage your plan, billing cycle, invoices, and usage limits."
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="current">Current</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-3 p-4 pb-0">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{plan?.name ?? legacy?.plan.name ?? '—'}</h2>
                <p className="text-sm text-slate-500">{plan?.description ?? legacy?.plan.description}</p>
              </div>
              <Badge>{status}</Badge>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              <p className="text-sm text-slate-600">
                Billing cycle: <b>{current?.billingCycle ?? 'MONTHLY'}</b>
                {current?.nextBillingDate
                  ? ` · Next bill ${new Date(current.nextBillingDate).toLocaleDateString()}`
                  : null}
              </p>
              <ul className="space-y-1 text-sm text-slate-600">
                <li>Up to {plan?.maxOrganizations ?? legacy?.plan.maxOrganizations} organization(s)</li>
                <li>Up to {plan?.maxUsersPerOrg ?? legacy?.plan.maxUsersPerOrg} users per organization</li>
                <li>Up to {plan?.maxInvoicesPerMonth ?? legacy?.plan.maxInvoicesPerMonth} invoices / month</li>
              </ul>
              {current?.autoRenew && current.plan?.code !== 'FREE' ? (
                <Button
                  variant="outline"
                  loading={cancelMutation.isPending}
                  onClick={() => {
                    if (window.confirm('Cancel auto-renew at period end?')) cancelMutation.mutate()
                  }}
                >
                  Cancel auto-renew
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing" className="mt-4 space-y-4">
          <div className="flex items-center gap-2">
            <Button size="sm" variant={cycle === 'MONTHLY' ? 'default' : 'outline'} onClick={() => setCycle('MONTHLY')}>
              Monthly
            </Button>
            <Button size="sm" variant={cycle === 'YEARLY' ? 'default' : 'outline'} onClick={() => setCycle('YEARLY')}>
              Yearly
            </Button>
          </div>
          {loadingPlans ? (
            <p className="text-sm text-slate-500">Loading plans…</p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-3">
              {plans.map((p) => {
                const price = cycle === 'YEARLY' ? Number(p.priceYearly) : Number(p.priceMonthly)
                const currentBadge = isCurrentPlan(p)
                return (
                  <Card key={p.id} className={p.highlightPlan ? 'ring-2 ring-teal-500' : undefined}>
                    <CardHeader className="space-y-1 p-4 pb-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-lg font-semibold text-slate-900">{p.name}</h3>
                        <div className="flex gap-1">
                          {currentBadge ? <Badge variant="success">Current</Badge> : null}
                          {p.recommended ? <Badge>Recommended</Badge> : null}
                        </div>
                      </div>
                      <p className="text-sm text-slate-500">{p.description}</p>
                    </CardHeader>
                    <CardContent className="space-y-4 p-4">
                      <p className="text-2xl font-semibold text-slate-900">
                        ₹{price.toLocaleString('en-IN')}
                        <span className="text-sm font-normal text-slate-500">
                          {' '}
                          / {cycle === 'YEARLY' ? 'year' : 'month'}
                        </span>
                      </p>
                      <ul className="space-y-1 text-sm text-slate-600">
                        <li>{p.maxOrganizations} org(s)</li>
                        <li>{p.maxUsersPerOrg} users / org</li>
                        <li>{p.maxInvoicesPerMonth} invoices / month</li>
                      </ul>
                      {!currentBadge ? (
                        <Button
                          className="w-full"
                          loading={checkoutMutation.isPending || upgradeMutation.isPending}
                          onClick={() => {
                            if (current?.plan && current.plan.code !== 'FREE') upgradeMutation.mutate(p.code)
                            else checkoutMutation.mutate(p.code)
                          }}
                        >
                          {p.code === 'FREE' ? 'Switch to Free' : current?.plan?.code === 'FREE' || !current ? 'Upgrade' : 'Change plan'}
                        </Button>
                      ) : (
                        <Button className="w-full" variant="outline" disabled>
                          Current plan
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="billing" className="mt-4">
          <Card>
            <CardContent className="space-y-3 p-4 text-sm text-slate-700">
              <p>
                Provider: <b>{current?.paymentProvider ?? '—'}</b>
              </p>
              <p>
                Reference: <b>{current?.paymentReference ?? '—'}</b>
              </p>
              <p>
                Auto-renew: <b>{current?.autoRenew ? 'On' : 'Off'}</b>
              </p>
              <p>
                Period: {current?.startDate ? new Date(current.startDate).toLocaleDateString() : '—'}
                {current?.endDate ? ` → ${new Date(current.endDate).toLocaleDateString()}` : ''}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          <Card>
            <CardContent className="p-4">
              <Table>
                <thead>
                  <tr className="border-b">
                    <th className="p-3 text-xs text-slate-500">INVOICE</th>
                    <th className="p-3 text-xs text-slate-500">TOTAL</th>
                    <th className="p-3 text-xs text-slate-500">PAID</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-b">
                      <td className="p-3">{inv.invoiceNumber}</td>
                      <td className="p-3">₹{Number(inv.total).toLocaleString('en-IN')}</td>
                      <td className="p-3">
                        {inv.paidAt ? new Date(inv.paidAt).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                  {!invoices.length ? (
                    <tr>
                      <td colSpan={3} className="py-12 text-center text-sm text-slate-500">
                        No subscription invoices yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage" className="mt-4">
          <Card>
            <CardContent className="space-y-5 p-4">
              <UsageBar
                label="Organizations (owned)"
                used={usageView.organizationCount}
                limit={usageView.organizationLimit}
              />
              <UsageBar label="Users in current org" used={usageView.userCount} limit={usageView.userLimit} />
              <UsageBar label="Invoices this month" used={usageView.invoiceCount} limit={usageView.invoiceLimit} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const percent = limit > 0 ? Math.min(100, (used / limit) * 100) : 0
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        <span className="font-medium text-slate-800">
          {used} / {limit}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-teal-600 transition-all" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
