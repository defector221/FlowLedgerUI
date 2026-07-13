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
