import { ArrowDown } from 'lucide-react'
import { asRecord } from '../audit-model'
import { JsonViewer } from './JsonViewer'

type DiffEntry = { key: string; before: unknown; after: unknown; kind: 'added' | 'removed' | 'changed' | 'same' }

export function DiffViewer({ before, after }: { before: unknown; after: unknown }) {
  const beforeObj = asRecord(before)
  const afterObj = asRecord(after)
  const entries = buildDiff(beforeObj, afterObj)

  if (!before && !after) return null

  if (!beforeObj || !afterObj || entries.length === 0) {
    return (
      <div className="space-y-3">
        <JsonViewer label="Before" value={before} defaultExpanded={false} />
        <div className="flex justify-center text-slate-400">
          <ArrowDown className="size-4" />
        </div>
        <JsonViewer label="After" value={after} />
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <div className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Change history
      </div>
      <ul className="divide-y divide-slate-100">
        {entries.map((entry) => (
          <li key={entry.key} className="grid gap-2 px-3 py-3 text-sm sm:grid-cols-[8rem_1fr]">
            <div>
              <p className="font-medium text-slate-800">{entry.key}</p>
              <p
                className={
                  entry.kind === 'added'
                    ? 'text-xs font-semibold text-emerald-700'
                    : entry.kind === 'removed'
                      ? 'text-xs font-semibold text-rose-700'
                      : entry.kind === 'changed'
                        ? 'text-xs font-semibold text-amber-700'
                        : 'text-xs text-slate-400'
                }
              >
                {entry.kind}
              </p>
            </div>
            <div className="space-y-1 font-mono text-xs">
              {entry.kind !== 'added' ? (
                <p className="rounded-md bg-rose-50 px-2 py-1 text-rose-800">- {stringify(entry.before)}</p>
              ) : null}
              {entry.kind !== 'removed' ? (
                <p className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-800">+ {stringify(entry.after)}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function buildDiff(before: Record<string, unknown> | null, after: Record<string, unknown> | null): DiffEntry[] {
  if (!before || !after) return []
  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)])).sort()
  return keys
    .map((key) => {
      const hasBefore = key in before
      const hasAfter = key in after
      if (!hasBefore && hasAfter) return { key, before: undefined, after: after[key], kind: 'added' as const }
      if (hasBefore && !hasAfter) return { key, before: before[key], after: undefined, kind: 'removed' as const }
      const left = stringify(before[key])
      const right = stringify(after[key])
      if (left === right) return { key, before: before[key], after: after[key], kind: 'same' as const }
      return { key, before: before[key], after: after[key], kind: 'changed' as const }
    })
    .filter((entry) => entry.kind !== 'same')
    .slice(0, 40)
}

function stringify(value: unknown) {
  if (value == null) return 'null'
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}
