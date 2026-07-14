import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Banknote,
  BookOpen,
  FileSpreadsheet,
  IndianRupee,
  Landmark,
  Receipt,
  Scale,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { toast } from 'sonner'
import { accountingApi } from '@/services/api'
import { getApiErrorMessage } from '@/lib/api-error'
import { currency } from '@/lib/utils'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Table,
} from '@/components/ui'
import type {
  AccountResponse,
  AccountingDashboardResponse,
  BalanceSheetResponse,
  GstSummaryResponse,
  JournalLineRequest,
  JournalResponse,
  LedgerLineResponse,
  ProfitAndLossResponse,
  TrialBalanceResponse,
} from '@/types/api'

const CHART = {
  teal: '#0f766e',
  tealSoft: '#14b8a6',
  cyan: '#0891b2',
  amber: '#d97706',
  rose: '#e11d48',
  slate: '#64748b',
  indigo: '#4f46e5',
  emerald: '#059669',
}

function money(n?: number | null) {
  return currency(Number(n ?? 0))
}

function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Indian FY slices (Apr–Mar) clipped to [from, to]. */
function indianFySlices(fromStr: string, toStr: string) {
  const from = new Date(`${fromStr}T00:00:00`)
  const to = new Date(`${toStr}T00:00:00`)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) return []
  const fyStartYear = (d: Date) => (d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1)
  let y = fyStartYear(from)
  const endY = fyStartYear(to)
  const slices: Array<{ label: string; from: string; to: string }> = []
  while (y <= endY) {
    const sliceFrom = new Date(y, 3, 1)
    const sliceTo = new Date(y + 1, 2, 31)
    const clipFrom = from > sliceFrom ? from : sliceFrom
    const clipTo = to < sliceTo ? to : sliceTo
    if (clipFrom <= clipTo) {
      slices.push({
        label: `${y}-${String((y + 1) % 100).padStart(2, '0')}`,
        from: isoDate(clipFrom),
        to: isoDate(clipTo),
      })
    }
    y += 1
  }
  return slices
}

function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle: string
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle">{subtitle}</p>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  )
}

function SectionTitle({ title, detail }: { title: string; detail?: string }) {
  return (
    <div>
      <h2 className="font-display text-[0.95rem] font-semibold tracking-tight text-slate-900">{title}</h2>
      {detail ? <p className="mt-0.5 text-[0.8rem] leading-snug text-slate-500">{detail}</p> : null}
    </div>
  )
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ name?: string; value?: number | string; color?: string; payload?: Record<string, unknown> }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-[var(--shadow-soft)]">
      {label ? <p className="mb-1 text-[0.7rem] font-semibold uppercase tracking-wide text-slate-500">{label}</p> : null}
      {payload.map((p, i) => (
        <p key={`${p.name}-${i}`} className="text-sm font-medium text-slate-800">
          <span className="mr-2 inline-block size-2 rounded-full" style={{ background: p.color ?? CHART.teal }} />
          {p.name}: {money(Number(p.value ?? 0))}
        </p>
      ))}
    </div>
  )
}

/** CSS bars — avoids Recharts ResponsiveContainer collapsing to 0 height inside CSS grids. */
function SnapshotBars({
  rows,
  emptyLabel = 'No amounts in this date range',
}: {
  rows: Array<{ name: string; values: Array<{ key: string; amount: number; color: string }> }>
  emptyLabel?: string
}) {
  const max = Math.max(
    1,
    ...rows.flatMap((r) => r.values.map((v) => Math.abs(Number(v.amount) || 0))),
  )
  const any = rows.some((r) => r.values.some((v) => Number(v.amount) !== 0))
  if (!any) {
    return (
      <div className="grid h-56 place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 text-center text-sm text-slate-500">
        {emptyLabel}
      </div>
    )
  }
  return (
    <div className="space-y-5">
      {rows.map((row) => {
        const multi = row.values.length > 1
        return (
          <div key={row.name} className="space-y-2">
            {!multi ? (
              <div className="flex items-baseline justify-between gap-2">
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <span className="size-2.5 rounded-full" style={{ background: row.values[0]?.color }} />
                  {row.name}
                </p>
                <p className="text-sm tabular-nums font-medium text-slate-700">{money(row.values[0]?.amount ?? 0)}</p>
              </div>
            ) : (
              <p className="text-sm font-semibold text-slate-800">{row.name}</p>
            )}
            <div className="space-y-2">
              {row.values.map((v) => {
                const amount = Math.abs(Number(v.amount) || 0)
                const pct = Math.min(100, (amount / max) * 100)
                return (
                  <div key={v.key} className="space-y-1">
                    {multi ? (
                      <div className="flex items-baseline justify-between gap-2 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="size-2 rounded-full" style={{ background: v.color }} />
                          {v.key}
                        </span>
                        <span className="tabular-nums font-medium text-slate-700">{money(v.amount)}</span>
                      </div>
                    ) : null}
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full transition-[width] duration-300"
                        style={{ width: `${amount ? Math.max(pct, 3) : 0}%`, background: v.color }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function MetricBars({
  rows,
  emptyLabel,
}: {
  rows: Array<{ name: string; amount: number; color: string }>
  emptyLabel: string
}) {
  return (
    <SnapshotBars
      emptyLabel={emptyLabel}
      rows={rows.map((r) => ({
        name: r.name,
        values: [{ key: r.name, amount: r.amount, color: r.color }],
      }))}
    />
  )
}

export function AccountingDashboardPage() {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  /** Indian FY start (1 Apr) → today — matches seeded GL periods better than calendar MTD. */
  const fyStart = useMemo(() => {
    const d = new Date()
    const year = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1
    return `${year}-04-01`
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ['accounting-dashboard'],
    queryFn: () => accountingApi.dashboard() as Promise<AccountingDashboardResponse>,
  })
  const { data: pl } = useQuery({
    queryKey: ['accounting', 'dash-pl', fyStart, today],
    queryFn: () => accountingApi.profitAndLoss({ from: fyStart, to: today }) as Promise<ProfitAndLossResponse>,
  })
  const { data: gst } = useQuery({
    queryKey: ['accounting', 'dash-gst', fyStart, today],
    queryFn: () => accountingApi.gstSummary({ from: fyStart, to: today }) as Promise<GstSummaryResponse>,
  })

  const salesVsExpense = [
    { name: 'Sales / income', amount: Number(pl?.totalIncome ?? 0), fill: CHART.teal },
    { name: 'Expenses', amount: Number(pl?.totalExpenses ?? 0), fill: CHART.rose },
  ]
  const incomeBreakdown = (pl?.income ?? []).map((i, idx) => ({
    name: i.name,
    value: Number(i.amount),
    fill: [CHART.teal, CHART.cyan, CHART.emerald, CHART.indigo, CHART.amber][idx % 5],
  }))
  const gstDetail = gst
    ? [
        { name: 'CGST', output: Number(gst.outputCgst), input: Number(gst.inputCgst) },
        { name: 'SGST', output: Number(gst.outputSgst), input: Number(gst.inputSgst) },
        { name: 'IGST', output: Number(gst.outputIgst), input: Number(gst.inputIgst) },
      ]
    : []

  const metrics = [
    { label: 'Receivables', value: data?.totalReceivables, icon: Wallet, hint: 'Open AR balance' },
    { label: 'Payables', value: data?.totalPayables, icon: Landmark, hint: 'Open AP balance' },
    { label: 'Cash & bank', value: data?.cashAndBank, icon: Banknote, hint: 'Liquid funds' },
    { label: 'FYTD net profit', value: data?.netProfitMtd, icon: TrendingUp, hint: `P&L since ${fyStart}` },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounting"
        subtitle="Double-entry ledgers, journals and statutory views for your organisation."
        actions={
          <Link
            to="/accounting/reports"
            className="inline-flex h-9 items-center rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-600"
          >
            Open reports
          </Link>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((m) => (
          <Card key={m.label} className="metric-card">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[0.8rem] font-medium text-slate-500">{m.label}</p>
                  <p className="font-display mt-2 text-[1.45rem] font-semibold tracking-tight text-slate-900">
                    {isLoading ? '—' : money(m.value as number)}
                  </p>
                  <p className="mt-1 text-[0.7rem] text-slate-400">{m.hint}</p>
                </div>
                <span className="grid size-9 place-items-center rounded-xl bg-teal-50 text-teal-700">
                  <m.icon className="size-4" />
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <SectionTitle
              title="Sales vs expenses (FYTD)"
              detail={`Income and expense totals since ${fyStart} (Indian financial year)`}
            />
          </CardHeader>
          <CardContent>
            <MetricBars
              emptyLabel="No income or expenses posted in the current financial year yet"
              rows={salesVsExpense.map((r) => ({ name: r.name, amount: r.amount, color: r.fill }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SectionTitle title="Income mix" detail="Revenue accounts this FYTD" />
          </CardHeader>
          <CardContent>
            <MetricBars
              emptyLabel="No income posted in the current financial year yet"
              rows={incomeBreakdown.map((r) => ({ name: r.name, amount: r.value, color: r.fill }))}
            />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <SectionTitle title="GST position (FYTD)" detail="Output vs input by component" />
          </CardHeader>
          <CardContent>
            <SnapshotBars
              emptyLabel="No GST posted in the current financial year yet"
              rows={gstDetail.map((r) => ({
                name: r.name,
                values: [
                  { key: 'Output', amount: r.output, color: CHART.amber },
                  { key: 'Input', amount: r.input, color: CHART.teal },
                ],
              }))}
            />
            {gst && Number(gst.netPayable) !== 0 ? (
              <p className="mt-3 text-sm font-semibold text-slate-800">
                Net GST payable: <span className="text-teal-800">{money(gst.netPayable)}</span>
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SectionTitle title="Quick links" detail="Jump into the ledger workflow" />
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {[
              { to: '/accounting/chart-of-accounts', label: 'Chart of accounts', icon: BookOpen },
              { to: '/accounting/journals', label: 'Journals', icon: FileSpreadsheet },
              { to: '/accounting/reports', label: 'Full reports', icon: Scale },
              { to: '/sales/invoices', label: 'Sales invoices', icon: Receipt },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-3 text-sm font-medium text-slate-800 transition hover:border-teal-200 hover:bg-teal-50/50"
              >
                <span className="grid size-8 place-items-center rounded-lg bg-white text-teal-700 shadow-sm">
                  <item.icon className="size-4" />
                </span>
                {item.label}
              </Link>
            ))}
          </CardContent>
        </Card>
      </section>

      {data?.unbalancedJournals ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {data.unbalancedJournals} unbalanced posted journal(s) detected — run integrity check from reports.
        </p>
      ) : null}
    </div>
  )
}

export function ChartOfAccountsPage() {
  const { data = [], refetch, isLoading } = useQuery({
    queryKey: ['accounting', 'accounts'],
    queryFn: () => accountingApi.listAccounts() as Promise<AccountResponse[]>,
  })
  const grouped = useMemo(() => {
    const map = new Map<string, AccountResponse[]>()
    for (const a of data) {
      const list = map.get(a.accountType) ?? []
      list.push(a)
      map.set(a.accountType, list)
    }
    return map
  }, [data])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chart of accounts"
        subtitle="System and custom ledger accounts for this organisation."
        actions={
          <Button variant="outline" onClick={() => refetch()}>
            Refresh
          </Button>
        }
      />
      {isLoading ? <p className="text-sm text-slate-500">Loading accounts…</p> : null}
      {[...grouped.entries()].map(([type, rows]) => (
        <Card key={type}>
          <CardContent className="p-0">
            <div className="border-b border-slate-100 px-5 py-3.5">
              <h2 className="font-display text-[0.8rem] font-semibold uppercase tracking-[0.08em] text-slate-500">
                {type}
              </h2>
            </div>
            <Table>
              <thead>
                <tr className="text-left text-[0.7rem] uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3 font-semibold">Code</th>
                  <th className="px-5 py-3 font-semibold">Name</th>
                  <th className="px-5 py-3 font-semibold">System</th>
                  <th className="px-5 py-3 font-semibold">Active</th>
                  <th className="px-5 py-3 font-semibold" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100 text-[0.875rem] text-slate-800">
                    <td className="px-5 py-3 font-mono text-[0.8rem] text-slate-600">{row.accountCode}</td>
                    <td className="px-5 py-3 font-medium">{row.accountName}</td>
                    <td className="px-5 py-3 text-slate-500">
                      {row.systemAccount ? row.systemAccountKey ?? 'Yes' : '—'}
                    </td>
                    <td className="px-5 py-3">{row.active ? 'Yes' : 'No'}</td>
                    <td className="px-5 py-3 text-right">
                      <Link className="text-[0.8rem] font-semibold text-teal-700 hover:underline" to={`/accounting/ledgers/accounts/${row.id}`}>
                        Ledger
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function JournalsPage() {
  const { data = [], refetch, isLoading } = useQuery({
    queryKey: ['accounting', 'journals'],
    queryFn: () => accountingApi.listJournals({ size: 50 }) as Promise<JournalResponse[]>,
  })
  return (
    <div className="space-y-6">
      <PageHeader
        title="Journals"
        subtitle="Manual and system-generated double-entry vouchers."
        actions={
          <>
            <Button variant="outline" onClick={() => refetch()}>
              Refresh
            </Button>
            <Link
              className="inline-flex h-9 items-center rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-600"
              to="/accounting/journals/new"
            >
              New journal
            </Link>
          </>
        }
      />
      <Card>
        <CardContent className="p-0">
          {isLoading ? <p className="p-5 text-sm text-slate-500">Loading…</p> : null}
          <Table>
            <thead>
              <tr className="text-left text-[0.7rem] uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3 font-semibold">Number</th>
                <th className="px-5 py-3 font-semibold">Date</th>
                <th className="px-5 py-3 font-semibold">Source</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 text-right font-semibold">Debit</th>
                <th className="px-5 py-3 text-right font-semibold">Credit</th>
              </tr>
            </thead>
            <tbody>
              {data.map((j) => (
                <tr key={j.id} className="border-t border-slate-100 text-[0.875rem]">
                  <td className="px-5 py-3">
                    <Link className="font-semibold text-teal-700 hover:underline" to={`/accounting/journals/${j.id}`}>
                      {j.entryNumber}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-slate-600">{j.entryDate}</td>
                  <td className="px-5 py-3 text-slate-600">{j.source}</td>
                  <td className="px-5 py-3">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.7rem] font-semibold text-slate-700">
                      {j.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">{money(j.totalDebit)}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{money(j.totalCredit)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

export function JournalDetailPage() {
  const { id = '' } = useParams()
  const qc = useQueryClient()
  const { data, refetch } = useQuery({
    queryKey: ['accounting', 'journal', id],
    queryFn: () => accountingApi.getJournal(id) as Promise<JournalResponse>,
    enabled: !!id,
  })
  const post = useMutation({
    mutationFn: () => accountingApi.postJournal(id),
    onSuccess: () => {
      toast.success('Journal posted')
      qc.invalidateQueries({ queryKey: ['accounting'] })
      refetch()
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  })
  const reverse = useMutation({
    mutationFn: () => accountingApi.reverseJournal(id),
    onSuccess: () => {
      toast.success('Journal reversed')
      qc.invalidateQueries({ queryKey: ['accounting'] })
      refetch()
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  })
  if (!data) return <p className="text-sm text-slate-500">Loading…</p>
  return (
    <div className="space-y-6">
      <PageHeader
        title={data.entryNumber}
        subtitle={`${data.entryDate} · ${data.status} · ${data.source}`}
        actions={
          <>
            {data.status === 'DRAFT' ? (
              <Button onClick={() => post.mutate()} disabled={post.isPending}>
                Post
              </Button>
            ) : null}
            {data.status === 'POSTED' ? (
              <Button variant="outline" onClick={() => reverse.mutate()} disabled={reverse.isPending}>
                Reverse
              </Button>
            ) : null}
          </>
        }
      />
      <Card>
        <CardContent className="p-0">
          <Table>
            <thead>
              <tr className="text-left text-[0.7rem] uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3 font-semibold">Account</th>
                <th className="px-5 py-3 font-semibold">Description</th>
                <th className="px-5 py-3 text-right font-semibold">Debit</th>
                <th className="px-5 py-3 text-right font-semibold">Credit</th>
              </tr>
            </thead>
            <tbody>
              {(data.lines ?? []).map((line) => (
                <tr key={line.id} className="border-t border-slate-100 text-[0.875rem]">
                  <td className="px-5 py-3">
                    <span className="font-mono text-[0.75rem] text-slate-500">{line.accountCode}</span>{' '}
                    <span className="font-medium">{line.accountName}</span>
                  </td>
                  <td className="px-5 py-3 text-slate-600">{line.description ?? '—'}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{money(line.debitAmount)}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{money(line.creditAmount)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

export function JournalCreatePage() {
  const navigate = useNavigate()
  const { data: accounts = [] } = useQuery({
    queryKey: ['accounting', 'accounts'],
    queryFn: () => accountingApi.listAccounts() as Promise<AccountResponse[]>,
  })
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10))
  const [description, setDescription] = useState('')
  const [lines, setLines] = useState<JournalLineRequest[]>([
    { accountId: '', debitAmount: 0, creditAmount: 0, description: '' },
    { accountId: '', debitAmount: 0, creditAmount: 0, description: '' },
  ])
  const totalDebit = lines.reduce((s, l) => s + Number(l.debitAmount || 0), 0)
  const totalCredit = lines.reduce((s, l) => s + Number(l.creditAmount || 0), 0)
  const balanced = Math.abs(totalDebit - totalCredit) < 0.0001 && totalDebit > 0
  const save = useMutation({
    mutationFn: async () => {
      const created = (await accountingApi.createJournal({
        entryDate,
        description,
        voucherType: 'JOURNAL',
        lines: lines.filter((l) => l.accountId && (Number(l.debitAmount) > 0 || Number(l.creditAmount) > 0)),
      })) as JournalResponse
      await accountingApi.postJournal(created.id)
      return created
    },
    onSuccess: (created) => {
      toast.success('Journal posted')
      navigate(`/accounting/journals/${created.id}`)
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  })

  return (
    <div className="space-y-6">
      <PageHeader title="New journal" subtitle="Create a balanced manual voucher and post it to the ledger." />
      <Card>
        <CardContent className="grid gap-4 p-5 md:grid-cols-2">
          <div>
            <Label>Entry date</Label>
            <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
          </div>
          <div>
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-3 p-5">
          {lines.map((line, idx) => (
            <div key={idx} className="grid gap-2 md:grid-cols-4">
              <Select
                value={line.accountId || undefined}
                onValueChange={(v) =>
                  setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, accountId: v ?? '' } : l)))
                }
              >
                <SelectTrigger>
                  <span className="truncate text-sm">
                    {accounts.find((a) => a.id === line.accountId)?.accountName ?? 'Account'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.accountCode} · {a.accountName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Description"
                value={line.description ?? ''}
                onChange={(e) =>
                  setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, description: e.target.value } : l)))
                }
              />
              <Input
                type="number"
                placeholder="Debit"
                value={line.debitAmount ?? 0}
                onChange={(e) =>
                  setLines((prev) =>
                    prev.map((l, i) =>
                      i === idx ? { ...l, debitAmount: Number(e.target.value), creditAmount: 0 } : l,
                    ),
                  )
                }
              />
              <Input
                type="number"
                placeholder="Credit"
                value={line.creditAmount ?? 0}
                onChange={(e) =>
                  setLines((prev) =>
                    prev.map((l, i) =>
                      i === idx ? { ...l, creditAmount: Number(e.target.value), debitAmount: 0 } : l,
                    ),
                  )
                }
              />
            </div>
          ))}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <Button
              variant="outline"
              onClick={() => setLines((prev) => [...prev, { accountId: '', debitAmount: 0, creditAmount: 0 }])}
            >
              Add line
            </Button>
            <p className="text-sm text-slate-600">
              Debit <span className="font-semibold tabular-nums">{money(totalDebit)}</span>
              {' · '}
              Credit <span className="font-semibold tabular-nums">{money(totalCredit)}</span>
              {' · '}
              <span className={balanced ? 'font-semibold text-emerald-700' : 'font-semibold text-amber-700'}>
                {balanced ? 'Balanced' : 'Unbalanced'}
              </span>
            </p>
            <Button disabled={!balanced || save.isPending} onClick={() => save.mutate()}>
              Post journal
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function PartyLedgerPage({ party }: { party: 'customers' | 'suppliers' | 'accounts' }) {
  const { id = '' } = useParams()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const params = { ...(from ? { from } : {}), ...(to ? { to } : {}) }
  const { data = [], refetch, isFetching, isLoading, isError, error } = useQuery({
    queryKey: ['accounting', 'ledger', party, id, from, to],
    queryFn: async () => {
      if (party === 'customers') return accountingApi.customerLedger(id, params) as Promise<LedgerLineResponse[]>
      if (party === 'suppliers') return accountingApi.supplierLedger(id, params) as Promise<LedgerLineResponse[]>
      return accountingApi.accountLedger(id, params) as Promise<LedgerLineResponse[]>
    },
    enabled: !!id,
  })
  const title =
    party === 'customers' ? 'Customer ledger' : party === 'suppliers' ? 'Supplier ledger' : 'Account ledger'

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        subtitle="Only posted journal lines appear here. Confirm invoices or post journals to populate movements."
      />
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-5">
          <div>
            <Label>From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label>To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            Run
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          {isLoading ? <p className="p-5 text-sm text-slate-500">Loading ledger…</p> : null}
          {isError ? <p className="p-5 text-sm text-red-600">{getApiErrorMessage(error)}</p> : null}
          {!isLoading && !isError && data.length === 0 ? (
            <div className="space-y-2 p-6 text-sm text-slate-600">
              <p className="font-display text-base font-semibold text-slate-900">No posted movements yet</p>
              <p>Confirm a sales/purchase invoice or create a manual journal, then reopen this ledger.</p>
            </div>
          ) : null}
          {data.length > 0 ? (
            <Table>
              <thead>
                <tr className="text-left text-[0.7rem] uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 font-semibold">Entry</th>
                  <th className="px-5 py-3 font-semibold">Description</th>
                  <th className="px-5 py-3 text-right font-semibold">Debit</th>
                  <th className="px-5 py-3 text-right font-semibold">Credit</th>
                  <th className="px-5 py-3 text-right font-semibold">Balance</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <tr key={`${row.journalEntryId}-${i}`} className="border-t border-slate-100 text-[0.875rem]">
                    <td className="px-5 py-3 text-slate-600">{row.entryDate}</td>
                    <td className="px-5 py-3">
                      <Link className="font-semibold text-teal-700 hover:underline" to={`/accounting/journals/${row.journalEntryId}`}>
                        {row.entryNumber}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{row.description ?? '—'}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{money(row.debitAmount)}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{money(row.creditAmount)}</td>
                    <td className="px-5 py-3 text-right font-medium tabular-nums">{money(row.runningBalance)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

export function AccountingReportsPage() {
  const [from, setFrom] = useState(() => {
    // Previous FY start so a full ₹3 Cr seeded year is visible by default (plus current YTD).
    const d = new Date()
    const currentFyStartYear = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1
    return `${currentFyStartYear - 1}-04-01`
  })
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10))
  const [asOf, setAsOf] = useState(() => new Date().toISOString().slice(0, 10))
  const params = { ...(from ? { from } : {}), ...(to ? { to } : {}) }

  const tb = useQuery({
    queryKey: ['accounting', 'tb', from, to],
    queryFn: () => accountingApi.trialBalance(params) as Promise<TrialBalanceResponse>,
  })
  const pl = useQuery({
    queryKey: ['accounting', 'pl', from, to],
    queryFn: () => accountingApi.profitAndLoss(params) as Promise<ProfitAndLossResponse>,
  })
  const bs = useQuery({
    queryKey: ['accounting', 'bs', asOf],
    queryFn: () => accountingApi.balanceSheet({ asOf }) as Promise<BalanceSheetResponse>,
  })
  const gst = useQuery({
    queryKey: ['accounting', 'gst', from, to],
    queryFn: () => accountingApi.gstSummary(params) as Promise<GstSummaryResponse>,
  })

  const fySlices = useMemo(() => indianFySlices(from, to), [from, to])
  const yearlyPl = useQueries({
    queries: fySlices.map((slice) => ({
      queryKey: ['accounting', 'pl-fy', slice.from, slice.to],
      queryFn: () =>
        accountingApi.profitAndLoss({ from: slice.from, to: slice.to }) as Promise<ProfitAndLossResponse>,
    })),
  })

  const runAll = async () => {
    try {
      await Promise.all([
        tb.refetch(),
        pl.refetch(),
        bs.refetch(),
        gst.refetch(),
        ...yearlyPl.map((q) => q.refetch()),
      ])
      toast.success('Reports refreshed')
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    }
  }

  const salesByYear = fySlices.map((slice, i) => ({
    year: slice.label,
    amount: Number(yearlyPl[i]?.data?.totalIncome ?? 0),
  }))
  const expenseByYear = fySlices.map((slice, i) => ({
    year: slice.label,
    amount: Number(yearlyPl[i]?.data?.totalExpenses ?? 0),
  }))
  const plByYear = fySlices.map((slice, i) => ({
    year: slice.label,
    income: Number(yearlyPl[i]?.data?.totalIncome ?? 0),
    expenses: Number(yearlyPl[i]?.data?.totalExpenses ?? 0),
    profit: Number(yearlyPl[i]?.data?.netProfit ?? 0),
  }))
  const salesBars = (pl.data?.income ?? []).map((i) => ({ name: i.name, amount: Number(i.amount) }))
  const expenseBars = (pl.data?.expenses ?? []).map((i) => ({ name: i.name, amount: Number(i.amount) }))
  const plCompare = [
    { name: 'Income', amount: Number(pl.data?.totalIncome ?? 0), fill: CHART.teal },
    { name: 'Expenses', amount: Number(pl.data?.totalExpenses ?? 0), fill: CHART.rose },
    { name: 'Net profit', amount: Number(pl.data?.netProfit ?? 0), fill: CHART.emerald },
  ]
  const gstDetail = [
    { name: 'CGST', output: Number(gst.data?.outputCgst ?? 0), input: Number(gst.data?.inputCgst ?? 0) },
    { name: 'SGST', output: Number(gst.data?.outputSgst ?? 0), input: Number(gst.data?.inputSgst ?? 0) },
    { name: 'IGST', output: Number(gst.data?.outputIgst ?? 0), input: Number(gst.data?.inputIgst ?? 0) },
  ]
  const gstNet = [
    {
      name: 'Output tax',
      amount:
        Number(gst.data?.outputCgst ?? 0) + Number(gst.data?.outputSgst ?? 0) + Number(gst.data?.outputIgst ?? 0),
      fill: CHART.amber,
    },
    {
      name: 'Input tax',
      amount: Number(gst.data?.inputCgst ?? 0) + Number(gst.data?.inputSgst ?? 0) + Number(gst.data?.inputIgst ?? 0),
      fill: CHART.teal,
    },
    { name: 'Net payable', amount: Number(gst.data?.netPayable ?? 0), fill: CHART.indigo },
  ]
  const bsPie = bs.data
    ? [
        { name: 'Assets', value: Number(bs.data.totalAssets), fill: CHART.teal },
        { name: 'Liabilities', value: Number(bs.data.totalLiabilities), fill: CHART.rose },
        { name: 'Equity', value: Number(bs.data.totalEquity), fill: CHART.indigo },
      ]
    : []
  const tbByType = useMemo(() => {
    const map = new Map<string, { type: string; debit: number; credit: number }>()
    for (const row of tb.data?.rows ?? []) {
      const cur = map.get(row.accountType) ?? { type: row.accountType, debit: 0, credit: 0 }
      cur.debit += Number(row.closingDebit)
      cur.credit += Number(row.closingCredit)
      map.set(row.accountType, cur)
    }
    return [...map.values()]
  }, [tb.data])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounting reports"
        subtitle="Visual statements for sales, GST, profitability and financial position."
        actions={
          <Button onClick={runAll} disabled={tb.isFetching || pl.isFetching}>
            Refresh reports
          </Button>
        }
      />

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-5">
          <div>
            <Label>From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label>To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <Label>As of (balance sheet)</Label>
            <Input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* KPI strip */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Total sales / income', value: pl.data?.totalIncome, icon: IndianRupee },
          { label: 'Total expenses', value: pl.data?.totalExpenses, icon: TrendingUp },
          { label: 'Net profit', value: pl.data?.netProfit, icon: Scale },
          { label: 'Net GST payable', value: gst.data?.netPayable, icon: Receipt },
        ].map((m) => (
          <Card key={m.label} className="metric-card">
            <CardContent className="p-5">
              <div className="flex justify-between">
                <p className="text-[0.8rem] font-medium text-slate-500">{m.label}</p>
                <span className="grid size-8 place-items-center rounded-xl bg-teal-50 text-teal-700">
                  <m.icon className="size-4" />
                </span>
              </div>
              <p className="font-display mt-2 text-[1.35rem] font-semibold tracking-tight text-slate-900">
                {money(m.value as number)}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Year-by-year P&L */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="min-w-0">
          <CardHeader>
            <SectionTitle title="Income by financial year" detail="Taxable revenue / sales totals per Indian FY (Apr–Mar)" />
          </CardHeader>
          <CardContent>
            <div className="h-72 min-w-0">
              {salesByYear.some((r) => r.amount !== 0) ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart data={salesByYear} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      width={64}
                      tickFormatter={(v) => `${Math.round(Number(v) / 1e5) / 10}Cr`}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="amount" name="Income" fill={CHART.teal} radius={[8, 8, 0, 0]} barSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="grid h-full place-items-center text-sm text-slate-500">No sales posted in range</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <SectionTitle title="Expenses by financial year" detail="Purchase and operating costs per Indian FY" />
          </CardHeader>
          <CardContent>
            <div className="h-72 min-w-0">
              {expenseByYear.some((r) => r.amount !== 0) ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart data={expenseByYear} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      width={64}
                      tickFormatter={(v) => `${Math.round(Number(v) / 1e5) / 10}Cr`}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="amount" name="Expenses" fill={CHART.rose} radius={[8, 8, 0, 0]} barSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="grid h-full place-items-center text-sm text-slate-500">No expenses posted in range</p>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="min-w-0">
        <CardHeader>
          <SectionTitle title="Income vs expenses by year" detail="Side-by-side comparison across financial years in range" />
        </CardHeader>
        <CardContent>
          <div className="h-72 min-w-0">
            {plByYear.some((r) => r.income !== 0 || r.expenses !== 0) ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={plByYear} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    width={64}
                    tickFormatter={(v) => `${Math.round(Number(v) / 1e5) / 10}Cr`}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="income" name="Income" fill={CHART.teal} radius={[6, 6, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill={CHART.rose} radius={[6, 6, 0, 0]} />
                  <Bar dataKey="profit" name="Net profit" fill={CHART.emerald} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="grid h-full place-items-center text-sm text-slate-500">No P&L activity in range</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Account mix within selected range */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="min-w-0">
          <CardHeader>
            <SectionTitle title="Sales & income by account" detail="Account mix for the full selected date range" />
          </CardHeader>
          <CardContent>
            <MetricBars
              emptyLabel="No sales posted in range"
              rows={salesBars.map((r) => ({ name: r.name, amount: r.amount, color: CHART.teal }))}
            />
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <SectionTitle title="Expenses by account" detail="Account mix for the full selected date range" />
          </CardHeader>
          <CardContent>
            <MetricBars
              emptyLabel="No expenses posted in range"
              rows={expenseBars.map((r) => ({ name: r.name, amount: r.amount, color: CHART.rose }))}
            />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="min-w-0">
          <CardHeader>
            <SectionTitle title="P&L snapshot" detail="Income vs expense vs profit" />
          </CardHeader>
          <CardContent>
            <MetricBars
              emptyLabel="No P&L activity in this date range"
              rows={plCompare.map((r) => ({ name: r.name, amount: r.amount, color: r.fill }))}
            />
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <SectionTitle title="GST components" detail="Output vs input CGST / SGST / IGST" />
          </CardHeader>
          <CardContent>
            <SnapshotBars
              emptyLabel="No GST posted in this date range"
              rows={gstDetail.map((r) => ({
                name: r.name,
                values: [
                  { key: 'Output', amount: r.output, color: CHART.amber },
                  { key: 'Input', amount: r.input, color: CHART.teal },
                ],
              }))}
            />
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <SectionTitle title="GST payable" detail="Output tax − input credit" />
          </CardHeader>
          <CardContent>
            <MetricBars
              emptyLabel="No GST net position in this date range"
              rows={gstNet.map((r) => ({ name: r.name, amount: r.amount, color: r.fill }))}
            />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <SectionTitle
              title="Balance sheet composition"
              detail={bs.data?.balanced ? 'Assets = liabilities + equity' : 'Review balancing'}
            />
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={bsPie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={82} paddingAngle={3}>
                    {bsPie.map((r) => (
                      <Cell key={r.name} fill={r.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SectionTitle
              title="Trial balance by type"
              detail={tb.data?.balanced ? 'Debits equal credits' : 'Out of balance — investigate'}
            />
          </CardHeader>
          <CardContent>
            <div className="h-64 min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={tbByType} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="type" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    width={56}
                    tickFormatter={(v) => `${Math.round(Number(v) / 1e5) / 10}Cr`}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="debit" name="Debit" fill={CHART.teal} radius={[6, 6, 0, 0]} />
                  <Bar dataKey="credit" name="Credit" fill={CHART.cyan} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Detail tables */}
      {tb.data ? (
        <Card>
          <CardHeader>
            <SectionTitle title="Trial balance detail" detail={`Totals · Dr ${money(tb.data.totalDebit)} · Cr ${money(tb.data.totalCredit)}`} />
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <thead>
                <tr className="text-left text-[0.7rem] uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3 font-semibold">Account</th>
                  <th className="px-5 py-3 font-semibold">Type</th>
                  <th className="px-5 py-3 text-right font-semibold">Debit</th>
                  <th className="px-5 py-3 text-right font-semibold">Credit</th>
                </tr>
              </thead>
              <tbody>
                {tb.data.rows.map((r) => (
                  <tr key={r.accountId} className="border-t border-slate-100 text-[0.875rem]">
                    <td className="px-5 py-3">
                      <span className="font-mono text-[0.75rem] text-slate-500">{r.accountCode}</span>{' '}
                      <span className="font-medium">{r.accountName}</span>
                    </td>
                    <td className="px-5 py-3 text-slate-500">{r.accountType}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{money(r.closingDebit)}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{money(r.closingCredit)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
