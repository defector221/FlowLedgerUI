import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowUp,
  Bot,
  MessageSquarePlus,
  Mic,
  MicOff,
  Package,
  Receipt,
  Scale,
  Sparkles,
  Wallet,
} from 'lucide-react'
import { toast } from 'sonner'
import { aiApi, type AiMessage } from '@/services/api'
import { getApiErrorMessage } from '@/lib/api-error'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/layout/PageChrome'
import { Button, Select, SelectContent, SelectItem, SelectTrigger, Skeleton, Textarea } from '@/components/ui'

const SUGGESTIONS = [
  {
    icon: Package,
    label: 'Low stock',
    prompt: 'Which products are low on stock and need reorder attention?',
  },
  {
    icon: Receipt,
    label: 'Receivables',
    prompt: 'Summarize outstanding receivables and overdue invoices.',
  },
  {
    icon: Wallet,
    label: 'Cash flow',
    prompt: 'Give a brief cash-flow risk overview for the business.',
  },
  {
    icon: Scale,
    label: 'GST guidance',
    prompt: 'What GST compliance checks should we review this month?',
  },
] as const

function isUserRole(role: string) {
  return role === 'USER' || role === 'user'
}

function formatWhen(iso?: string) {
  if (!iso) return ''
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return ''
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      const base64 = result.includes(',') ? result.split(',')[1] : result
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export function AiChatPage() {
  const queryClient = useQueryClient()
  const [conversationId, setConversationId] = useState<string | undefined>()
  const [draft, setDraft] = useState('')
  const [agent, setAgent] = useState('ASK')
  const [lastConsulted, setLastConsulted] = useState<string[]>([])
  const [recording, setRecording] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const health = useQuery({
    queryKey: ['ai-health'],
    queryFn: () => aiApi.health(),
    staleTime: 60_000,
    retry: false,
  })

  const agents = useQuery({
    queryKey: ['ai-agents'],
    queryFn: () => aiApi.agents(),
    staleTime: 120_000,
  })

  const conversations = useQuery({
    queryKey: ['ai-conversations'],
    queryFn: () => aiApi.conversations(),
  })

  const messages = useQuery({
    queryKey: ['ai-messages', conversationId],
    queryFn: () => aiApi.messages(conversationId!),
    enabled: !!conversationId,
  })

  const chat = useMutation({
    mutationFn: (message: string) =>
      aiApi.chat({ message, conversationId, agent: agent || 'ASK' }),
    onSuccess: (res) => {
      setConversationId(res.conversationId)
      setDraft('')
      setLastConsulted(res.consultedAgents ?? [])
      void queryClient.invalidateQueries({ queryKey: ['ai-conversations'] })
      void queryClient.invalidateQueries({ queryKey: ['ai-messages', res.conversationId] })
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.data, chat.isPending])

  const rows: AiMessage[] = messages.data ?? []
  const activeConversation = conversations.data?.find((c) => c.id === conversationId)
  const showEmpty = !conversationId && !chat.isPending && !rows.length
  const liveMode = health.data?.apiKeyConfigured
  const voiceOn = health.data?.voiceEnabled !== false

  const send = (text: string) => {
    const msg = text.trim()
    if (!msg || chat.isPending) return
    chat.mutate(msg)
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    setRecording(false)
  }

  const startRecording = async () => {
    if (!voiceOn) {
      toast.error('Voice is disabled')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        try {
          const audioBase64 = await blobToBase64(blob)
          const result = await aiApi.voiceTranscribe({
            contentType: blob.type || 'audio/webm',
            audioBase64,
          })
          if (result.transcript) {
            setDraft(result.transcript)
            toast.success('Transcript ready — review and send')
          } else {
            toast.error(result.message || 'Transcription failed')
          }
        } catch (err) {
          toast.error(getApiErrorMessage(err))
        }
      }
      mediaRecorderRef.current = recorder
      recorder.start()
      setRecording(true)
    } catch {
      toast.error('Microphone permission denied')
    }
  }

  return (
    <div className="flex h-[calc(100dvh-7.5rem)] min-h-[32rem] flex-col gap-5">
      <PageHeader
        title="AI Assistant"
        subtitle="Specialist agents with Global Ask multi-agent synthesis. Advisory only — never posts ERP transactions."
        actions={
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 font-medium text-slate-600 shadow-sm">
              <span className={cn('size-1.5 rounded-full', health.isSuccess ? 'bg-teal-500' : 'bg-slate-300')} />
              {health.data?.provider ?? 'AI'}
            </span>
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-medium',
                liveMode
                  ? 'border-teal-200 bg-teal-50 text-teal-800'
                  : 'border-amber-200 bg-amber-50 text-amber-800',
              )}
            >
              <Sparkles className="size-3" />
              {liveMode ? 'Live model' : 'Mock mode'}
            </span>
          </div>
        }
      />

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(15rem,17.5rem)_1fr]">
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[var(--shadow-soft)]">
          <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50/90 to-white px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Conversations</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2.5 w-full cursor-pointer justify-start gap-2 border-slate-200"
              onClick={() => {
                setConversationId(undefined)
                setDraft('')
                setLastConsulted([])
                textareaRef.current?.focus()
              }}
            >
              <MessageSquarePlus className="size-3.5" />
              New conversation
            </Button>
          </div>
          <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-2">
            {conversations.isLoading ? (
              <div className="space-y-2 p-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : null}
            {conversations.data?.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setConversationId(c.id)
                  if (c.agentType) setAgent(c.agentType)
                }}
                className={cn(
                  'group w-full cursor-pointer rounded-xl px-3 py-2.5 text-left transition-colors',
                  conversationId === c.id ? 'bg-teal-50/90 ring-1 ring-teal-200/80' : 'hover:bg-slate-50',
                )}
              >
                <p
                  className={cn(
                    'truncate text-sm font-medium',
                    conversationId === c.id ? 'text-teal-900' : 'text-slate-800',
                  )}
                >
                  {c.title || 'Untitled chat'}
                </p>
                <p className="mt-0.5 flex items-center justify-between gap-2 text-[11px] text-slate-400">
                  <span className="truncate">{(c.agentType || 'ASK').replace(/_/g, ' ')}</span>
                  <span className="shrink-0">{formatWhen(c.updatedAt)}</span>
                </p>
              </button>
            ))}
          </div>
        </aside>

        <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[var(--shadow-soft)]">
          <div className="flex flex-col gap-3 border-b border-slate-100 bg-gradient-to-r from-teal-50/60 via-white to-sky-50/40 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="font-[family-name:var(--font-display)] truncate text-base font-semibold tracking-tight text-slate-900">
                {activeConversation?.title || (showEmpty ? 'New conversation' : 'Assistant')}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Pick a specialist or use Global Ask for multi-agent collaboration.
              </p>
            </div>
            <Select value={agent} onValueChange={setAgent}>
              <SelectTrigger className="w-full cursor-pointer sm:w-56">
                {agents.data?.find((a) => a.code === agent)?.displayName ?? agent}
              </SelectTrigger>
              <SelectContent>
                {(agents.data ?? [{ code: 'ASK', displayName: 'Global Ask Agent' }]).map((a) => (
                  <SelectItem key={a.code} value={a.code}>
                    {a.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
            {showEmpty ? (
              <div className="mx-auto flex max-w-xl flex-col items-center px-2 py-8 text-center sm:py-12">
                <div className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-teal-600 to-cyan-700 text-white shadow-lg shadow-teal-900/15">
                  <Bot className="size-7" />
                </div>
                <h3 className="mt-5 font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-slate-900">
                  How can I help today?
                </h3>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500">
                  Ask operational questions. Specialists use read-only ERP tools; Ask can consult several agents before answering.
                </p>
                <div className="mt-8 grid w-full gap-2 sm:grid-cols-2">
                  {SUGGESTIONS.map(({ icon: Icon, label, prompt }) => (
                    <button
                      key={label}
                      type="button"
                      disabled={chat.isPending}
                      onClick={() => send(prompt)}
                      className="group flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200/90 bg-slate-50/50 px-3.5 py-3 text-left transition hover:border-teal-200 hover:bg-teal-50/40 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-white text-teal-700 shadow-sm ring-1 ring-slate-100">
                        <Icon className="size-3.5" />
                      </span>
                      <span>
                        <span className="block text-sm font-medium text-slate-800">{label}</span>
                        <span className="mt-0.5 line-clamp-2 text-xs leading-snug text-slate-500">{prompt}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {rows.map((m) => {
              const user = isUserRole(m.role)
              return (
                <div key={m.id} className={cn('flex', user ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      'max-w-[min(100%,36rem)] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm',
                      user
                        ? 'rounded-br-md bg-gradient-to-br from-teal-600 to-teal-700 text-white'
                        : 'rounded-bl-md border border-slate-200/80 bg-slate-50 text-slate-800',
                    )}
                  >
                    {!user ? (
                      <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-teal-700">
                        <Bot className="size-3" />
                        FlowLedger AI
                        {m.model ? (
                          <span className="font-normal normal-case tracking-normal text-slate-400">· {m.model}</span>
                        ) : null}
                      </div>
                    ) : null}
                    <p className="whitespace-pre-wrap">{m.content}</p>
                    {m.createdAt ? (
                      <p className={cn('mt-2 text-[10px]', user ? 'text-teal-100/80' : 'text-slate-400')}>
                        {formatWhen(m.createdAt)}
                      </p>
                    ) : null}
                  </div>
                </div>
              )
            })}

            {lastConsulted.length && !chat.isPending ? (
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Consulted</span>
                {lastConsulted.map((a) => (
                  <span
                    key={a}
                    className="rounded-full border border-teal-100 bg-teal-50 px-2 py-0.5 text-[10px] font-medium text-teal-800"
                  >
                    {a.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            ) : null}

            {chat.isPending ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span className="flex gap-1">
                  <span className="size-1.5 animate-pulse rounded-full bg-teal-500" />
                  <span className="size-1.5 animate-pulse rounded-full bg-teal-500 [animation-delay:120ms]" />
                  <span className="size-1.5 animate-pulse rounded-full bg-teal-500 [animation-delay:240ms]" />
                </span>
                Consulting specialists…
              </div>
            ) : null}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-slate-100 bg-slate-50/40 p-3 sm:p-4">
            <form
              className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm focus-within:border-teal-300 focus-within:ring-2 focus-within:ring-teal-100"
              onSubmit={(e) => {
                e.preventDefault()
                send(draft)
              }}
            >
              <Textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    send(draft)
                  }
                }}
                placeholder="Ask about stock, invoices, GST, or cash flow…"
                className="min-h-[3rem] resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
                rows={2}
              />
              <div className="flex items-center justify-between gap-2 px-1 pb-0.5 pt-1">
                <div className="flex items-center gap-1">
                  {voiceOn ? (
                    <Button
                      type="button"
                      size="sm"
                      variant={recording ? 'destructive' : 'outline'}
                      className="cursor-pointer gap-1.5"
                      onClick={() => (recording ? stopRecording() : void startRecording())}
                    >
                      {recording ? <MicOff className="size-3.5" /> : <Mic className="size-3.5" />}
                      {recording ? 'Stop' : 'Voice'}
                    </Button>
                  ) : null}
                  <p className="hidden text-[11px] text-slate-400 sm:block">Enter to send</p>
                </div>
                <Button
                  type="submit"
                  size="sm"
                  disabled={chat.isPending || !draft.trim()}
                  className="cursor-pointer gap-1.5"
                >
                  <ArrowUp className="size-3.5" />
                  Send
                </Button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </div>
  )
}
