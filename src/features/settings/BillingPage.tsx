import { useQuery } from '@tanstack/react-query'
import { billingApi } from '@/services/api'
import { Badge, Card, CardContent, CardHeader } from '@/components/ui'

export function BillingPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['billing-current'],
    queryFn: billingApi.current,
  })

  if (isLoading) {
    return <p className="py-16 text-center text-sm text-slate-500">Loading billing…</p>
  }

  if (error || !data) {
    return <p className="py-16 text-center text-sm text-red-600">Unable to load billing details.</p>
  }

  const { plan, usage, subscriptionStatus } = data
  const orgPct = plan.maxOrganizations > 0 ? Math.min(100, (usage.organizationCount / plan.maxOrganizations) * 100) : 0
  const userPct = plan.maxUsersPerOrg > 0 ? Math.min(100, (usage.userCount / plan.maxUsersPerOrg) * 100) : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Billing & plan</h1>
        <p className="mt-1 text-sm text-slate-500">Current subscription limits and usage for your account.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="space-y-1 p-4 pb-0">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-slate-900">{plan.name}</h2>
              <Badge>{subscriptionStatus}</Badge>
            </div>
            <p className="text-sm text-slate-500">{plan.description ?? plan.code}</p>
          </CardHeader>
          <CardContent className="space-y-3 p-4">
            <p className="text-2xl font-semibold text-slate-900">
              ₹{Number(plan.priceMonthly).toLocaleString('en-IN')}
              <span className="text-sm font-normal text-slate-500"> / month</span>
            </p>
            <ul className="space-y-1 text-sm text-slate-600">
              <li>Up to {plan.maxOrganizations} organization(s)</li>
              <li>Up to {plan.maxUsersPerOrg} users per organization</li>
              <li>Up to {plan.maxInvoicesPerMonth} invoices / month</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-0">
            <h2 className="text-lg font-semibold text-slate-900">Usage</h2>
          </CardHeader>
          <CardContent className="space-y-5 p-4">
            <UsageBar
              label="Organizations (owned)"
              used={usage.organizationCount}
              limit={usage.organizationLimit}
              percent={orgPct}
            />
            <UsageBar label="Users in current org" used={usage.userCount} limit={usage.userLimit} percent={userPct} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function UsageBar({ label, used, limit, percent }: { label: string; used: number; limit: number; percent: number }) {
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
