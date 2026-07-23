import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { flattenNavLeaves, type NavLeaf } from './nav-config'

const FAVORITES_KEY = 'flowledger.nav.favorites'
const RECENT_KEY = 'flowledger.nav.recent'
const EXPANDED_KEY = 'flowledger.nav.expandedModule'
const MAX_RECENT = 8

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore
  }
}

export function useNavFavorites() {
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => readJson<string[]>(FAVORITES_KEY, []))

  useEffect(() => {
    writeJson(FAVORITES_KEY, favoriteIds)
  }, [favoriteIds])

  const toggleFavorite = useCallback((id: string) => {
    setFavoriteIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }, [])

  const isFavorite = useCallback((id: string) => favoriteIds.includes(id), [favoriteIds])

  const favoriteLeaves = useMemo(() => {
    const byId = new Map(flattenNavLeaves().map((leaf) => [leaf.id, leaf]))
    return favoriteIds.map((id) => byId.get(id)).filter(Boolean) as NavLeaf[]
  }, [favoriteIds])

  return { favoriteIds, favoriteLeaves, toggleFavorite, isFavorite }
}

export function useNavRecents() {
  const location = useLocation()
  const [recentIds, setRecentIds] = useState<string[]>(() => readJson<string[]>(RECENT_KEY, []))

  useEffect(() => {
    const leaf = flattenNavLeaves().find((item) => {
      if (item.to === '/') return location.pathname === '/'
      return location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
    })
    if (!leaf) return
    setRecentIds((prev) => {
      const next = [leaf.id, ...prev.filter((id) => id !== leaf.id)].slice(0, MAX_RECENT)
      writeJson(RECENT_KEY, next)
      return next
    })
  }, [location.pathname])

  const recentLeaves = useMemo(() => {
    const byId = new Map(flattenNavLeaves().map((leaf) => [leaf.id, leaf]))
    return recentIds.map((id) => byId.get(id)).filter(Boolean) as NavLeaf[]
  }, [recentIds])

  return { recentLeaves }
}

export function useExpandedModule(activeSectionId: string | null) {
  const [expandedId, setExpandedId] = useState<string | null>(() => readJson<string | null>(EXPANDED_KEY, null))

  useEffect(() => {
    if (activeSectionId) {
      setExpandedId(activeSectionId)
      writeJson(EXPANDED_KEY, activeSectionId)
    }
  }, [activeSectionId])

  const toggle = useCallback((id: string) => {
    setExpandedId((prev) => {
      const next = prev === id ? null : id
      writeJson(EXPANDED_KEY, next)
      return next
    })
  }, [])

  const setExpanded = useCallback((id: string | null) => {
    setExpandedId(id)
    writeJson(EXPANDED_KEY, id)
  }, [])

  return { expandedId, toggle, setExpandedId: setExpanded }
}
