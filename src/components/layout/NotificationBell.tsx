import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { toast } from 'sonner'
import { notificationApi } from '@/services/api'
import { getApiErrorMessage } from '@/lib/api-error'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui'

export function NotificationBell() {
  const queryClient = useQueryClient()
  const unreadQuery = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: notificationApi.unreadCount,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  })
  const listQuery = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: () => notificationApi.list({ size: 12 }),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  })

  const unread = Number(unreadQuery.data?.count ?? 0)
  const items = listQuery.data ?? []

  const markRead = async (id: string, link?: string | null) => {
    try {
      await notificationApi.markRead(id)
      await queryClient.invalidateQueries({ queryKey: ['notifications'] })
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Unable to mark notification as read'))
    }
  }

  const markAllRead = async () => {
    try {
      await notificationApi.markAllRead()
      await queryClient.invalidateQueries({ queryKey: ['notifications'] })
      toast.success('All notifications marked as read')
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Unable to mark notifications as read'))
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="relative inline-flex size-10 items-center justify-center rounded-xl text-slate-600 outline-none transition hover:bg-slate-100 hover:text-slate-900"
        aria-label="Notifications"
      >
        <Bell className="size-5" />
        {unread > 0 ? (
          <span className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-4 text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0 sm:w-96">
        <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5">
          <p className="text-sm font-semibold text-slate-900">Notifications</p>
          {unread > 0 ? (
            <button
              type="button"
              className="text-xs font-medium text-teal-700 hover:underline"
              onClick={(e) => {
                e.preventDefault()
                void markAllRead()
              }}
            >
              Mark all read
            </button>
          ) : null}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {listQuery.isLoading ? (
            <p className="px-3 py-8 text-center text-sm text-slate-500">Loading…</p>
          ) : items.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-slate-500">No notifications yet.</p>
          ) : (
            items.map((item) => {
              const content = (
                <div className="min-w-0">
                  <p className={`text-sm ${item.read ? 'font-medium text-slate-700' : 'font-semibold text-slate-900'}`}>
                    {item.title}
                  </p>
                  {item.body ? <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{item.body}</p> : null}
                  <p className="mt-1 text-[11px] text-slate-400">{new Date(item.createdAt).toLocaleString()}</p>
                </div>
              )
              return (
                <div
                  key={item.id}
                  className={`border-b border-slate-50 px-3 py-2.5 last:border-0 ${item.read ? 'bg-white' : 'bg-teal-50/40'}`}
                >
                  {item.link ? (
                    <Link
                      to={item.link}
                      className="block hover:opacity-90"
                      onClick={() => {
                        if (!item.read) void markRead(item.id)
                      }}
                    >
                      {content}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className="w-full text-left"
                      onClick={() => {
                        if (!item.read) void markRead(item.id)
                      }}
                    >
                      {content}
                    </button>
                  )}
                </div>
              )
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
