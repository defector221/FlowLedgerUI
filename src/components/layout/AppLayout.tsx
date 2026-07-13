import { Outlet } from 'react-router-dom'
import { useState } from 'react'
import { Menu } from 'lucide-react'
import { AppSidebar } from './AppSidebar'
import { Header } from './Header'
import { Button } from '@/components/ui'

export function AppLayout() {
  const [open, setOpen] = useState(false)
  return (
    <div className="min-h-screen bg-slate-50">
      <AppSidebar mobileOpen={open} onMobileClose={() => setOpen(false)} />
      <div className="lg:pl-64">
        <Header onMenu={() => setOpen(true)} />
        <main className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
          <Button variant="ghost" size="icon" className="mb-3 lg:hidden" onClick={() => setOpen(true)}>
            <Menu className="size-5" />
          </Button>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
