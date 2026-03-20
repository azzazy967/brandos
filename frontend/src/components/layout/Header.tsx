import { useState, useEffect } from 'react'
import { Bell, LogOut, User, ChevronDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth-store'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

interface HeaderProps {
  sidebarCollapsed: boolean
}

export function Header({ sidebarCollapsed }: HeaderProps) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [unreadCount, setUnreadCount] = useState(0)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  useEffect(() => {
    api.get<{ count: number }>('/insights/unread-count')
      .then(d => setUnreadCount(d.count))
      .catch(() => {})
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className={cn(
      'fixed top-0 right-0 h-16 bg-white border-b border-slate-200 z-30 flex items-center justify-between px-6 transition-all duration-300',
      sidebarCollapsed ? 'left-16' : 'left-60'
    )}>
      <div className="flex items-center gap-2">
        <h1 className="text-sm font-semibold text-slate-500 font-mono">
          {user?.name ? `Welcome back, ${user.name.split(' ')[0]}` : 'Brand OS'}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Notifications */}
        <button
          onClick={() => navigate('/insights')}
          className="relative p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all duration-150 cursor-pointer"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold px-1">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-all duration-150 cursor-pointer"
          >
            <div className="h-7 w-7 rounded-full bg-[#2563EB] flex items-center justify-center text-white text-xs font-bold">
              {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
            </div>
            <span className="text-sm font-medium text-slate-700 hidden sm:block">{user?.name}</span>
            <ChevronDown size={14} className="text-slate-400" />
          </button>

          {userMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-sm font-semibold text-slate-900">{user?.name}</p>
                  <p className="text-xs text-slate-500">{user?.email}</p>
                </div>
                <button
                  onClick={() => { setUserMenuOpen(false); navigate('/settings/brand') }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors duration-150"
                >
                  <User size={14} />
                  Brand Settings
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer transition-colors duration-150"
                >
                  <LogOut size={14} />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
