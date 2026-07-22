import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Bot, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { aiApi } from '@/services/api'
import { getApiErrorMessage } from '@/lib/api-error'
import { useAuth } from '@/features/auth/auth'
import { cn } from '@/lib/utils'
import { Button, Dialog, DialogContent, DialogDescription, DialogTitle, Textarea } from '@/components/ui'

/** Header-mounted Ask control (no floating FAB — avoids sidebar/composer overlap). */
export function GlobalAskButton() {
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

  // Full Assistant page already has a composer — skip header Ask there.
  const onAiChat = location.pathname === '/ai/chat' || location.pathname.startsWith('/ai/chat/')

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
        if (!canAccessModule('ai') || !aiOn || onAiChat) return
        e.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [aiOn, canAccessModule, onAiChat])

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

  if (!canAccessModule('ai') || !aiOn || onAiChat) return null

  const shortcut = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘J' : 'Ctrl J'

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="cursor-pointer gap-1.5 border-teal-200 bg-teal-50/80 text-teal-800 hover:bg-teal-100 hover:text-teal-900"
        onClick={() => setOpen(true)}
        aria-label="Ask FlowLedger AI"
      >
        <Sparkles className="size-3.5" />
        <span className="hidden sm:inline">Ask AI</span>
        <span className="hidden rounded bg-white/70 px-1 py-0.5 text-[10px] font-medium text-teal-700/80 lg:inline">
          {shortcut}
        </span>
      </Button>

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
                  to="/ai/chat"
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

/** @deprecated Use GlobalAskButton in Header — kept so old imports fail loudly if any remain. */
export const GlobalAskFab = GlobalAskButton
