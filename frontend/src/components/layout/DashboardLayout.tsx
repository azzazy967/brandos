import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { ToastContainer } from '@/components/shared/ToastContainer'
import { cn } from '@/lib/utils'

export function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <Header sidebarCollapsed={collapsed} />
      <main className={cn(
        'pt-16 min-h-screen transition-all duration-300',
        collapsed ? 'pl-16' : 'pl-60'
      )}>
        <div className="p-6 max-w-screen-2xl mx-auto">
          <Outlet />
        </div>
      </main>
      <ToastContainer />
    </div>
  )
}
