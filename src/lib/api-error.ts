import { isAxiosError } from 'axios'
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'

interface ProblemDetail {
  type?: string
  title?: string
  status?: number
  detail?: string
  instance?: string
  fieldErrors?: Record<string, string>
}

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code?: string }).code
    if (code === 'ERR_SESSION_EXPIRED' || code === 'ERR_CANCELED') {
      return 'Your session has expired. Please sign in again.'
    }
  }

  if (isAxiosError(error)) {
    if (!error.response) {
      if (error.code === 'ECONNABORTED') return 'The request timed out. Please try again.'
      return 'Unable to reach the server. Check your connection and try again.'
    }

    const data = error.response?.data as
      ProblemDetail | { message?: string; error?: string; errors?: string[] } | string | undefined

    if (typeof data === 'string' && data.trim()) return data.trim()

    if (data && typeof data === 'object') {
      if ('detail' in data && typeof data.detail === 'string' && data.detail.trim()) {
        return data.detail.trim()
      }
      if ('message' in data && typeof data.message === 'string' && data.message.trim()) {
        return data.message.trim()
      }
      if ('title' in data && typeof data.title === 'string' && data.title.trim() && data.title !== 'Conflict') {
        // Prefer detail-style titles over generic HTTP labels
        if (data.title !== 'Bad Request' && data.title !== 'Internal Server Error') {
          return data.title.trim()
        }
      }
      if ('error' in data && typeof data.error === 'string' && data.error.trim()) return data.error.trim()
    }

    if (error.response?.status === 401) return 'Your session has expired. Please sign in again.'
    if (error.response?.status === 403) return 'You do not have permission to perform this action.'
    if (error.response?.status === 404) return 'The requested resource was not found.'
    if (error.response?.status === 409) {
      return fallback === 'Something went wrong' ? 'This action conflicts with existing data.' : fallback
    }
    if (error.response?.status === 400) {
      return fallback === 'Something went wrong' ? 'Please check your input and try again.' : fallback
    }
    if (error.response?.status && error.response.status >= 500) {
      return fallback === 'Something went wrong' ? 'An unexpected server error occurred.' : fallback
    }
  }
  if (error instanceof Error && error.message) return error.message
  return fallback
}

export function getApiFieldErrors(error: unknown): Record<string, string> | null {
  if (!isAxiosError(error)) return null
  const data = error.response?.data as ProblemDetail | undefined
  if (data?.fieldErrors && typeof data.fieldErrors === 'object') return data.fieldErrors
  return null
}

export function applyApiFieldErrors<T extends FieldValues>(error: unknown, setError: UseFormSetError<T>): boolean {
  const fieldErrors = getApiFieldErrors(error)
  if (!fieldErrors) return false
  for (const [field, message] of Object.entries(fieldErrors)) {
    setError(field as Path<T>, { type: 'server', message })
  }
  return true
}
