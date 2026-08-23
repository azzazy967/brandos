import { useState, useEffect } from 'react'
import { Bell, LogOut, User, ChevronDown, Sun, Moon, Monitor, Menu } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth-store'
import { useThemeStore } from '@/stores/theme-store'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

interface HeaderProps {
  sidebarCollapsed: boolean
  onMobileMenuToggle: () => void
}

export function Header({ sidebarCollapsed, onMobileMenuToggle }: HeaderProps) {
  const { user, logout } = useAuthStore()
  const { theme, setTheme } = useThemeStore()
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

  const cycleTheme = () => {
    const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
    setTheme(next)
  }

  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor

  return (
    <header className={cn(
      'fixed top-0 right-0 h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 z-30 flex items-center justify-between px-4 md:px-6 transition-all duration-300',
      // Mobile: full-width header (left-0)
      'left-0',
      // Desktop: offset by sidebar width
      sidebarCollapsed ? 'md:left-16' : 'md:left-60'
    )}>
      <div className="flex items-center gap-2">
        {/* Mobile hamburger menu button */}
        <button
          onClick={onMobileMenuToggle}
          className="md:hidden p-2 -ml-1 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-150 cursor-pointer"
          aria-label="Toggle navigation menu"
        >
          <Menu size={20} />
        </button>

        {/* Welcome message - hidden on mobile to save space */}
        <h1 className="hidden md:block text-sm font-semibold text-slate-500 dark:text-slate-400 font-mono">
          {user?.name ? `Welcome back, ${user.name.split(' ')[0]}` : 'Brand OS'}
        </h1>

        {/* Mobile: show Brand OS text */}
        <span className="md:hidden font-bold text-[#2563EB] font-mono text-base">Brand OS</span>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        {/* Theme toggle */}
        <button
          onClick={cycleTheme}
          className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-150 cursor-pointer"
          title={`Theme: ${theme}`}
        >
          <ThemeIcon size={18} />
        </button>

        {/* Notifications */}
        <button
          onClick={() => navigate('/insights')}
          className="relative p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-150 cursor-pointer"
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
            className="flex items-center gap-2 px-2 md:px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-150 cursor-pointer"
          >
            <div className="h-7 w-7 rounded-full bg-[#2563EB] flex items-center justify-center text-white text-xs font-bold">
              {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
            </div>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 hidden sm:block">{user?.name}</span>
            <ChevronDown size={14} className="text-slate-400 hidden sm:block" />
          </button>

          {userMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-50">
                <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{user?.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
                  {user?.role && (
                    <span className={cn(
                      'inline-block mt-1 text-xs font-medium capitalize px-1.5 py-0.5 rounded',
                      user.role === 'owner' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                      user.role === 'admin' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                      user.role === 'editor' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                    )}>{user.role}</span>
                  )}
                </div>
                <button
                  onClick={() => { setUserMenuOpen(false); navigate('/settings/brand') }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors duration-150"
                >
                  <User size={14} />
                  Brand Settings
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer transition-colors duration-150"
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
