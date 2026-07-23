import { useMemo, useState } from 'react'
import { ChevronsDownUp, ChevronsUpDown, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'

export function JsonViewer({
  value,
  label = 'JSON',
  defaultExpanded = true,
}: {
  value: unknown
  label?: string
  defaultExpanded?: boolean
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const text = useMemo(() => {
    try {
      return JSON.stringify(value ?? null, null, 2)
    } catch {
      return String(value)
    }
  }, [value])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('JSON copied')
    } catch {
      toast.error('Unable to copy JSON')
    }
  }

  if (value == null) return null

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-950 text-slate-100">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 text-slate-300 hover:bg-white/10 hover:text-white"
            onClick={() => setExpanded((open) => !open)}
          >
            {expanded ? <ChevronsDownUp className="size-3.5" /> : <ChevronsUpDown className="size-3.5" />}
            {expanded ? 'Collapse' : 'Expand'}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 text-slate-300 hover:bg-white/10 hover:text-white"
            onClick={() => void copy()}
          >
            <Copy className="size-3.5" />
            Copy
          </Button>
        </div>
      </div>
      {expanded ? (
        <pre className={cn('max-h-80 overflow-auto p-3 font-mono text-[11px] leading-5')}>
          {text.split('\n').map((line, index) => (
            <div key={index} className="whitespace-pre-wrap break-all">
              <span className="mr-3 inline-block w-6 select-none text-right text-slate-600">{index + 1}</span>
              <span className={lineClass(line)}>{line || ' '}</span>
            </div>
          ))}
        </pre>
      ) : null}
    </div>
  )
}

function lineClass(line: string) {
  if (/"[^"]+"\s*:/.test(line)) return 'text-sky-300'
  if (/:\s*".*"/.test(line)) return 'text-emerald-300'
  if (/:\s*\d+/.test(line)) return 'text-amber-300'
  if (/:\s*(true|false|null)/.test(line)) return 'text-violet-300'
  return 'text-slate-200'
}
