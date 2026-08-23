import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { ToastContainer } from '@/components/shared/ToastContainer'
import { useSidebarStore } from '@/stores/sidebar-store'
import { cn } from '@/lib/utils'

export function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const { mobileOpen, setMobileOpen, toggleMobile } = useSidebarStore()
  const location = useLocation()

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1120]">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <Header
        sidebarCollapsed={collapsed}
        onMobileMenuToggle={toggleMobile}
      />
      <main className={cn(
        'pt-16 min-h-screen transition-all duration-300',
        // Mobile: full-width content (no left padding for sidebar)
        'pl-0',
        // Desktop: offset by sidebar width
        collapsed ? 'md:pl-16' : 'md:pl-60'
      )}>
        <div
          key={location.pathname}
          className="p-4 md:p-6 max-w-screen-2xl mx-auto animate-page-fade-in"
        >
          <Outlet />
        </div>
      </main>
      <ToastContainer />
    </div>
  )
}
