import { isAxiosError } from 'axios'

interface ProblemDetail {
  type?: string
  title?: string
  status?: number
  detail?: string
  instance?: string
}

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as ProblemDetail | { message?: string } | undefined
    if (data && typeof data === 'object') {
      if ('detail' in data && typeof data.detail === 'string' && data.detail) return data.detail
      if ('message' in data && typeof data.message === 'string' && data.message) return data.message
    }
    if (error.response?.status === 401) return 'Your session has expired. Please sign in again.'
    if (error.response?.status === 403) return 'You do not have permission to perform this action.'
    if (error.response?.status === 404) return 'The requested resource was not found.'
    if (error.response?.status === 409) return 'This action conflicts with existing data.'
  }
  if (error instanceof Error && error.message) return error.message
  return fallback
}
