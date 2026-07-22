import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'

function shouldSkipAuthRedirectError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  if ('code' in error && (error as { code?: string }).code === 'ERR_SESSION_EXPIRED') return true
  if (isAxiosError(error) && error.response?.status === 401) return true
  return false
}

function notifyApiError(error: unknown) {
  if (shouldSkipAuthRedirectError(error)) return
  toast.error(getApiErrorMessage(error))
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (query.meta?.skipErrorToast) return
      // Avoid toast spam when cached data is already shown and a background refetch fails
      if (query.state.data !== undefined) return
      notifyApiError(error)
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (mutation.meta?.skipErrorToast) return
      // Local onError handlers typically already toast
      if (mutation.options.onError) return
      notifyApiError(error)
    },
  }),
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
    mutations: { retry: 0 },
  },
})
