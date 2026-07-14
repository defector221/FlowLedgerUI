import { Outlet } from 'react-router-dom'
import { useState } from 'react'
import { AppSidebar } from './AppSidebar'
import { Header } from './Header'

export function AppLayout() {
  const [open, setOpen] = useState(false)
  return (
    <div className="min-h-screen overflow-x-hidden">
      <AppSidebar mobileOpen={open} onMobileClose={() => setOpen(false)} />
      <div className="min-w-0 lg:pl-64">
        <Header onMenu={() => setOpen(true)} />
        <main className="app-shell-main mx-auto max-w-[1600px] px-3 py-4 sm:px-6 sm:py-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
