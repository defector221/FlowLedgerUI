import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { AppSidebar } from './AppSidebar'
import { Header } from './Header'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'flowledger.sidebarCollapsed'

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    setCollapsed(readCollapsed())
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

  return (
    <div className="min-h-screen overflow-x-hidden">
      <AppSidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
      />
      <div
        className={cn(
          'min-w-0 transition-[padding] duration-200 ease-out',
          collapsed ? 'lg:pl-[4.5rem]' : 'lg:pl-64',
        )}
      >
        <Header
          onMenu={() => setMobileOpen(true)}
          collapsed={collapsed}
          onToggleCollapsed={toggleCollapsed}
        />
        <main className="app-shell-main mx-auto max-w-[1600px] px-3 py-4 sm:px-6 sm:py-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
