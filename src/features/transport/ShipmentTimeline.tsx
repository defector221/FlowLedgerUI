import type { ShipmentEvent } from '@/types/api'

export function ShipmentTimeline({ events = [] }: { events?: ShipmentEvent[] }) {
  if (!events.length) return <p className="py-8 text-center text-sm text-slate-500">No shipment events recorded yet.</p>
  return (
    <ol className="space-y-0">
      {[...events]
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
        .map((event, index) => (
          <li key={event.id} className="relative flex gap-4 pb-6">
            {index < events.length - 1 && <span className="absolute left-[7px] top-4 h-full w-px bg-slate-200" />}
            <span className="relative mt-1.5 size-3.5 shrink-0 rounded-full border-2 border-white bg-teal-600 ring-2 ring-teal-100" />
            <div>
              <p className="text-sm font-semibold text-slate-900">{event.eventType.replaceAll('_', ' ')}</p>
              <p className="text-xs text-slate-500">
                {new Date(event.occurredAt).toLocaleString()} · {event.actorType}
              </p>
              {event.remarks && <p className="mt-1 text-sm text-slate-600">{event.remarks}</p>}
            </div>
          </li>
        ))}
    </ol>
  )
}
