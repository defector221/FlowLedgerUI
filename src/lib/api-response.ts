import type { AxiosResponse } from 'axios'
import type { ApiResponse, PageResponse } from '@/types/api'

export function unwrapApi<T>(response: AxiosResponse<ApiResponse<T> | T>): T {
  const body = response.data
  if (body && typeof body === 'object' && 'data' in body) {
    return (body as ApiResponse<T>).data
  }
  return body as T
}

export function unwrapPage<T>(response: AxiosResponse<PageResponse<T> | ApiResponse<PageResponse<T>> | T[]>): T[] {
  const body = response.data
  if (Array.isArray(body)) return body
  if (body && typeof body === 'object') {
    if ('data' in body) {
      const wrapped = (body as ApiResponse<PageResponse<T> | T[]>).data
      if (Array.isArray(wrapped)) return wrapped
      if (wrapped && typeof wrapped === 'object' && 'content' in wrapped) {
        return (wrapped as PageResponse<T>).content
      }
    }
    if ('content' in body) return (body as PageResponse<T>).content
  }
  return []
}

export function unwrapList<T>(response: AxiosResponse<T[] | ApiResponse<T[]> | PageResponse<T>>): T[] {
  const body = response.data
  if (Array.isArray(body)) return body
  if (body && typeof body === 'object') {
    if ('data' in body) {
      const wrapped = (body as ApiResponse<T[] | PageResponse<T>>).data
      if (Array.isArray(wrapped)) return wrapped
      if (wrapped && typeof wrapped === 'object' && 'content' in wrapped) {
        return (wrapped as PageResponse<T>).content
      }
    }
    if ('content' in body) return (body as PageResponse<T>).content
  }
  return []
}
