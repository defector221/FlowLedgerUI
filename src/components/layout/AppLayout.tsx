import { useEffect, useState, type CSSProperties } from 'react'
import { Outlet } from 'react-router-dom'
import { AppSidebar } from './AppSidebar'
import { Header } from './Header'

const STORAGE_KEY = 'flowledger.sidebarCollapsed'
const LG_QUERY = '(min-width: 1024px)'

function readCollapsed(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === '1') return true
    if (stored === '0') return false
    return window.matchMedia('(max-width: 1279px)').matches
  } catch {
    return false
  }
}

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    setCollapsed(readCollapsed())
  }, [])

  useEffect(() => {
    const mq = window.matchMedia(LG_QUERY)
    const sync = () => setIsDesktop(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
      } catch {
        // ignore quota / private mode
      }
      return next
    })
  }

  const sidebarWidth = collapsed ? 72 : 280
  const contentPaddingLeft = isDesktop ? sidebarWidth : 0

  return (
    <div
      className="min-h-screen overflow-x-hidden bg-[var(--background)]"
      style={{ ['--app-sidebar-width' as string]: isDesktop ? `${sidebarWidth}px` : '0px' } as CSSProperties}
    >
      <AppSidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} collapsed={collapsed} />
      <div
        className="min-w-0 transition-[padding] duration-200 ease-out"
        style={{ paddingLeft: contentPaddingLeft }}
      >
        <Header onMenu={() => setMobileOpen(true)} collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
        <main className="app-shell-main mx-auto max-w-[1600px] px-3 py-4 sm:px-5 sm:py-5 lg:py-6 lg:pl-5 lg:pr-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
