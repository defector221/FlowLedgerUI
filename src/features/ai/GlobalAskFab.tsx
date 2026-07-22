import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Bot, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { aiApi } from '@/services/api'
import { getApiErrorMessage } from '@/lib/api-error'
import { useAuth } from '@/features/auth/auth'
import { cn } from '@/lib/utils'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Textarea,
} from '@/components/ui'

export function GlobalAskFab() {
  const location = useLocation()
  const { canAccessModule } = useAuth()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [answer, setAnswer] = useState<{
    content: string
    agent: string
    consultedAgents?: string[]
    conversationId: string
  } | null>(null)
  const [aiOn, setAiOn] = useState(false)

  // Full Assistant already has composer + agent picker — hide FAB to avoid covering Send.
  const onAiAssistant = location.pathname.startsWith('/ai/')

  useEffect(() => {
    if (!canAccessModule('ai')) return
    void aiApi
      .health()
      .then((h) => setAiOn(h.enabled !== false))
      .catch(() => setAiOn(false))
  }, [canAccessModule])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        if (!canAccessModule('ai') || !aiOn || onAiAssistant) return
        e.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [aiOn, canAccessModule, onAiAssistant])

  const ask = useMutation({
    mutationFn: (message: string) => aiApi.ask({ message }),
    onSuccess: (res) => {
      setAnswer({
        content: res.content,
        agent: res.agent,
        consultedAgents: res.consultedAgents,
        conversationId: res.conversationId,
      })
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  if (!canAccessModule('ai') || !aiOn || onAiAssistant) return null

  const shortcut = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘J' : 'Ctrl J'

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex cursor-pointer items-center gap-2 rounded-full bg-gradient-to-br from-teal-600 to-cyan-700 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-900/25 transition hover:scale-[1.02] hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500"
        aria-label="Ask FlowLedger AI"
      >
        <Sparkles className="size-4" />
        Ask AI
        <span className="hidden rounded-md bg-white/15 px-1.5 py-0.5 text-[10px] font-medium sm:inline">
          {shortcut}
        </span>
      </button>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v)
          if (!v) {
            setDraft('')
            setAnswer(null)
          }
        }}
      >
        <DialogContent className="max-w-lg gap-0 overflow-hidden p-0 sm:rounded-2xl">
          <div className="border-b border-slate-100 bg-gradient-to-r from-teal-50/80 via-white to-sky-50/50 px-5 py-4">
            <DialogTitle className="flex items-center gap-2 font-[family-name:var(--font-display)] text-lg font-semibold text-slate-900">
              <Bot className="size-5 text-teal-700" />
              Global Ask
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-slate-500">
              Multi-agent answers from live ERP tools. Advisory only.
            </DialogDescription>
          </div>

          <div className="space-y-3 p-5">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask about cash, stock, GST, collections…"
              rows={3}
              className="resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  const msg = draft.trim()
                  if (msg && !ask.isPending) ask.mutate(msg)
                }
              }}
            />
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] text-slate-400">Enter to ask · Shift+Enter for newline</p>
              <Button
                size="sm"
                className="cursor-pointer"
                disabled={!draft.trim() || ask.isPending}
                onClick={() => {
                  const msg = draft.trim()
                  if (msg) ask.mutate(msg)
                }}
              >
                {ask.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                Ask
              </Button>
            </div>

            {answer ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5">
                <div className="mb-2 flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-teal-800">
                    {answer.agent}
                  </span>
                  {(answer.consultedAgents ?? []).map((a) => (
                    <span
                      key={a}
                      className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-600"
                    >
                      {a.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
                <p className={cn('whitespace-pre-wrap text-sm leading-relaxed text-slate-800')}>{answer.content}</p>
                <Link
                  to={`/ai/chat`}
                  className="mt-3 inline-block text-xs font-semibold text-teal-700 hover:underline"
                  onClick={() => setOpen(false)}
                >
                  Open full Assistant →
                </Link>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
