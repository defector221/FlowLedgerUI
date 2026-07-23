import { Search } from 'lucide-react'
import { Input } from '@/components/ui'

export function FeatureSearch({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="relative min-w-0 flex-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search features and modules…"
        aria-label="Search features and modules"
        className="h-11 border-slate-200/90 bg-white pl-10 shadow-none"
      />
    </div>
  )
}
