import { useQuery } from '@tanstack/react-query'
import { ArrowDownRight, ArrowUpRight, CreditCard, IndianRupee, Package, Users } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { dashboardApi } from '@/services/api'
import { currency } from '@/lib/utils'
import { useAuth } from '@/features/auth/auth'
import { Card, CardContent, CardHeader, Skeleton } from '@/components/ui'

export function DashboardPage() {
  const { session } = useAuth()
  const { data, isLoading } = useQuery({ queryKey: ['dashboard'], queryFn: dashboardApi.summary })
  const chart = (data?.salesTrend ?? []).map(([name, sales]) => ({ name, sales: Number(sales) }))
  const metrics = [
    {
      label: 'Sales this month',
      value: Number(data?.monthSales ?? 0),
      delta: 'Current month',
      icon: IndianRupee,
      up: true,
      money: true,
    },
    {
      label: 'Outstanding receivables',
      value: Number(data?.receivables ?? 0),
      delta: 'Open invoices',
      icon: CreditCard,
      up: false,
      money: true,
    },
    {
      label: 'Low stock items',
      value: Number(data?.lowStock ?? 0),
      delta: 'Needs attention',
      icon: Package,
      up: false,
      money: false,
    },
    {
      label: 'Overdue invoices',
      value: Number(data?.overdueInvoices ?? 0),
      delta: 'Follow up',
      icon: Users,
      up: false,
      money: false,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Good morning, {session?.user.firstName}</h1>
        <p className="mt-1 text-sm text-slate-500">Here is an overview of your business today.</p>
      </div>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <CardContent className="p-5">
              {isLoading ? (
                <Skeleton className="h-20" />
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">{metric.label}</span>
                    <metric.icon className="size-4 text-teal-700" />
                  </div>
                  <p className="mt-3 text-2xl font-semibold text-slate-900">
                    {metric.money ? currency(metric.value) : metric.value.toLocaleString()}
                  </p>
                  <span
                    className={`mt-2 inline-flex items-center gap-1 text-xs ${metric.up ? 'text-emerald-600' : 'text-rose-600'}`}
                  >
                    {metric.up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                    {metric.delta}
                  </span>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </section>
      <section className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <div>
              <h2 className="font-semibold text-slate-900">Sales performance</h2>
              <p className="text-sm text-slate-500">Revenue over the last six months</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {chart.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chart}>
                    <defs>
                      <linearGradient id="sales" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#0f766e" stopOpacity=".28" />
                        <stop offset="100%" stopColor="#0f766e" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <Tooltip formatter={(value) => currency(Number(value))} />
                    <Area type="monotone" dataKey="sales" stroke="#0f766e" strokeWidth={2.5} fill="url(#sales)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-24 text-center text-sm text-slate-500">No sales data yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-slate-900">Needs attention</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <AttentionItem
              title={`${data?.overdueInvoices ?? 0} overdue invoices`}
              detail={`${currency(Number(data?.receivables ?? 0))} receivable`}
            />
            <AttentionItem title={`${data?.lowStock ?? 0} low stock items`} detail="Reorder recommended" />
            <AttentionItem title={`${data?.payables ?? 0} payables outstanding`} detail="Review supplier payments" />
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

function AttentionItem({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex gap-3">
      <div className="mt-1 size-2 rounded-full bg-amber-500" />
      <div>
        <p className="text-sm font-medium text-slate-800">{title}</p>
        <p className="text-xs text-slate-500">{detail}</p>
      </div>
    </div>
  )
}
