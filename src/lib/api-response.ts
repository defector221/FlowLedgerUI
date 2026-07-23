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
  return unwrapPageResponse(response).content
}

/** Full Spring / PageResponse metadata (content + totals). */
export function unwrapPageResponse<T>(
  response: AxiosResponse<PageResponse<T> | ApiResponse<PageResponse<T>> | T[] | SpringPageLike<T>>,
): PageResponse<T> {
  const body = response.data
  if (Array.isArray(body)) {
    return { content: body, page: 0, size: body.length, totalElements: body.length, totalPages: 1 }
  }
  if (body && typeof body === 'object') {
    if ('data' in body) {
      const wrapped = (body as ApiResponse<PageResponse<T> | T[] | SpringPageLike<T>>).data
      if (Array.isArray(wrapped)) {
        return {
          content: wrapped,
          page: 0,
          size: wrapped.length,
          totalElements: wrapped.length,
          totalPages: 1,
        }
      }
      if (wrapped && typeof wrapped === 'object') {
        return normalizePage(wrapped)
      }
    }
    if ('content' in body) {
      return normalizePage(body as PageResponse<T> | SpringPageLike<T>)
    }
  }
  return { content: [], page: 0, size: 0, totalElements: 0, totalPages: 0 }
}

type SpringPageLike<T> = {
  content: T[]
  size?: number
  number?: number
  page?: number
  totalElements?: number
  totalPages?: number
}

function normalizePage<T>(page: PageResponse<T> | SpringPageLike<T>): PageResponse<T> {
  const content = Array.isArray(page.content) ? page.content : []
  const size = page.size ?? content.length
  const springNumber = 'number' in page && typeof page.number === 'number' ? page.number : undefined
  const pageNumber = typeof page.page === 'number' ? page.page : (springNumber ?? 0)
  const totalElements = page.totalElements ?? content.length
  const totalPages = page.totalPages ?? (size > 0 ? Math.max(1, Math.ceil(totalElements / size)) : 0)
  return { content, page: pageNumber, size, totalElements, totalPages }
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
