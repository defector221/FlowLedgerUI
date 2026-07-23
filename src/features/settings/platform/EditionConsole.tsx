import {
  Building2,
  Check,
  Crown,
  Layers3,
  Shield,
  Sparkles,
  SlidersHorizontal,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Badge, Button, Card, CardContent, Skeleton } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { EditionResponse } from '@/platform'

const EDITION_META: Record<
  string,
  { icon: LucideIcon; accent: string; blurb: string; highlights: string[] }
> = {
  LITE: {
    icon: Zap,
    accent: 'from-slate-700 to-slate-900',
    blurb: 'Essential ERP for lean teams getting started.',
    highlights: ['Sales & purchasing', 'Basic inventory', 'Payments & invoices'],
  },
  STANDARD: {
    icon: Layers3,
    accent: 'from-sky-600 to-sky-800',
    blurb: 'Grow with accounting, CRM, and business reports.',
    highlights: ['Everything in Lite', 'Accounting & journals', 'CRM & reports'],
  },
  PROFESSIONAL: {
    icon: Building2,
    accent: 'from-teal-600 to-teal-800',
    blurb: 'Operations-ready with retail, transport, and warehouse.',
    highlights: ['Everything in Standard', 'Retail & POS', 'Transport & warehouse'],
  },
  ENTERPRISE: {
    icon: Crown,
    accent: 'from-violet-600 to-indigo-800',
    blurb: 'Full platform access for complex organizations.',
    highlights: ['All active modules', 'AI assistant suite', 'Advanced entitlements'],
  },
  CUSTOM: {
    icon: SlidersHorizontal,
    accent: 'from-amber-600 to-orange-700',
    blurb: 'Start from your current modules, then turn individual ones on or off.',
    highlights: ['Keeps current modules', 'Toggle freely on Modules', 'No preset bundle'],
  },
}

function metaFor(code: string) {
  return (
    EDITION_META[code] ?? {
      icon: Shield,
      accent: 'from-slate-600 to-slate-800',
      blurb: 'Organization edition package.',
      highlights: ['Module entitlements', 'Feature controls'],
    }
  )
}

export function EditionConsole({
  editions,
  currentCode,
  currentLabel,
  currentDescription,
  loading,
  switching,
  onSwitch,
  onGoCustom,
}: {
  editions: EditionResponse[]
  currentCode?: string
  currentLabel?: string
  currentDescription?: string | null
  loading?: boolean
  switching?: boolean
  onSwitch: (editionCode: string) => void
  onGoCustom: () => void
}) {
  const current = editions.find((e) => e.code === currentCode)
  const currentMeta = metaFor(currentCode ?? 'PROFESSIONAL')
  const CurrentIcon = currentMeta.icon

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-36 w-full rounded-2xl" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden border-slate-200/90 shadow-[var(--shadow-soft)]">
        <div className={cn('bg-gradient-to-br p-6 text-white sm:p-7', currentMeta.accent)}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/70">Current edition</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="grid size-11 place-items-center rounded-xl bg-white/15 backdrop-blur">
                  <CurrentIcon className="size-5" aria-hidden />
                </span>
                <h2 className="text-2xl font-semibold tracking-tight">{currentLabel ?? currentCode ?? '—'}</h2>
                <Badge className="border-0 bg-white/20 text-white">Active</Badge>
              </div>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/85">
                {currentDescription || currentMeta.blurb}
              </p>
            </div>
            <div className="rounded-xl bg-white/10 px-4 py-3 text-sm backdrop-blur">
              <p className="text-white/70">Included modules</p>
              <p className="text-2xl font-semibold tabular-nums">{current?.moduleCodes.length ?? 0}</p>
            </div>
          </div>
        </div>
      </Card>

      <div>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-slate-900">Choose an edition</h3>
            <p className="text-sm text-slate-500">
              Switching applies the edition’s module set. Custom lets you manage modules individually.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {editions.map((edition) => {
            const meta = metaFor(edition.code)
            const Icon = meta.icon
            const active = edition.code === currentCode
            const isCustom = edition.code === 'CUSTOM'
            const recommended = edition.code === 'PROFESSIONAL' && !active

            return (
              <Card
                key={edition.code}
                className={cn(
                  'group relative h-full overflow-hidden border-slate-200/90 shadow-[var(--shadow-soft)] transition-all duration-200',
                  'hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgb(15_23_42/0.08)]',
                  active && 'border-teal-300 ring-2 ring-teal-500/20',
                )}
              >
                {recommended ? (
                  <span className="absolute right-3 top-3 z-10">
                    <Badge variant="default" className="gap-1">
                      <Sparkles className="size-3" />
                      Popular
                    </Badge>
                  </span>
                ) : null}
                {active ? (
                  <span className="absolute right-3 top-3 z-10">
                    <Badge variant="success" className="gap-1">
                      <Check className="size-3" />
                      Active
                    </Badge>
                  </span>
                ) : null}

                <CardContent className="flex h-full flex-col gap-4 p-5 pt-6">
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        'grid size-11 place-items-center rounded-xl bg-gradient-to-br text-white shadow-sm',
                        meta.accent,
                      )}
                    >
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <div className="min-w-0 pr-16">
                      <h4 className="text-lg font-semibold tracking-tight text-slate-900">{edition.displayName}</h4>
                      <p className="mt-1 text-sm leading-relaxed text-slate-500">
                        {edition.description || meta.blurb}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {isCustom ? 'Flexible selection' : `${edition.moduleCodes.length} modules included`}
                  </p>

                  <ul className="space-y-2 text-sm text-slate-600">
                    {meta.highlights.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <Check className="mt-0.5 size-4 shrink-0 text-teal-600" aria-hidden />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>

                  {!isCustom && edition.moduleCodes.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {edition.moduleCodes.slice(0, 6).map((code) => (
                        <span
                          key={code}
                          className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600"
                        >
                          {code}
                        </span>
                      ))}
                      {edition.moduleCodes.length > 6 ? (
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                          +{edition.moduleCodes.length - 6}
                        </span>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="mt-auto pt-2">
                    {isCustom ? (
                      <Button
                        type="button"
                        className="w-full"
                        variant={active ? 'secondary' : 'outline'}
                        disabled={switching}
                        onClick={onGoCustom}
                      >
                        {switching ? 'Switching…' : active ? 'Manage modules' : 'Switch to Custom'}
                      </Button>
                    ) : active ? (
                      <Button type="button" className="w-full" variant="secondary" disabled>
                        Current plan
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        className="w-full"
                        disabled={switching}
                        onClick={() => onSwitch(edition.code)}
                        aria-label={`Switch to ${edition.displayName} edition`}
                      >
                        {switching ? 'Switching…' : `Switch to ${edition.displayName}`}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
