import { cn } from '@/lib/utils'
import { partyParts, type PartyLike } from '@/lib/party-label'

export type { PartyLike }

/** Two-line professional party label for dropdowns and detail headers. */
export function PartySelectLabel({
  party,
  className,
}: {
  party: PartyLike
  className?: string
}) {
  const { primary, secondary, meta } = partyParts(party)
  return (
    <span className={cn('flex min-w-0 flex-col gap-0.5 text-left leading-tight', className)}>
      <span className="truncate text-sm font-semibold tracking-tight text-slate-900">{primary}</span>
      {(secondary || meta) && (
        <span className="truncate text-[11px] font-medium uppercase tracking-wide text-slate-500">
          {[secondary, meta].filter(Boolean).join('  ·  ')}
        </span>
      )}
    </span>
  )
}
