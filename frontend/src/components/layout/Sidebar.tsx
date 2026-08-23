import { useState, useCallback } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Package, DollarSign, Megaphone, Truck,
  ShoppingCart, Lightbulb, Settings, ChevronDown, ChevronRight,
  Menu, X, Store, History, Calendar, BarChart3, TrendingUp,
  ClipboardList, AlertTriangle, Calculator, Users, MapPin, CheckSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  path?: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  children?: NavItem[]
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  {
    label: 'Inventory', icon: Package, children: [
      { label: 'Stock Overview', path: '/inventory', icon: Package },
      { label: 'Restock Planner', path: '/inventory/restock-planner', icon: ClipboardList },
      { label: 'Size Intelligence', path: '/inventory/size-intelligence', icon: BarChart3 },
    ]
  },
  {
    label: 'Finance', icon: DollarSign, children: [
      { label: 'Dashboard', path: '/finance', icon: LayoutDashboard },
      { label: 'COD Tracking', path: '/finance/cod', icon: DollarSign },
      { label: 'Expenses', path: '/finance/expenses', icon: ClipboardList },
      { label: 'Profitability', path: '/finance/profitability', icon: TrendingUp },
      { label: 'Settings', path: '/finance/settings', icon: Settings },
    ]
  },
  {
    label: 'Marketing', icon: Megaphone, children: [
      { label: 'Dashboard', path: '/marketing', icon: LayoutDashboard },
      { label: 'Campaigns', path: '/marketing/campaigns', icon: Megaphone },
      { label: 'Creatives', path: '/marketing/creatives', icon: Users },
      { label: 'Attribution', path: '/marketing/attribution', icon: BarChart3 },
      { label: 'BEROAS Calc', path: '/marketing/beroas', icon: Calculator },
    ]
  },
  {
    label: 'Operations', icon: Truck, children: [
      { label: 'Overview', path: '/operations', icon: LayoutDashboard },
      { label: 'Orders', path: '/operations/orders', icon: ClipboardList },
      { label: 'Returns', path: '/operations/returns', icon: AlertTriangle },
      { label: 'Failed Deliveries', path: '/operations/failed-deliveries', icon: MapPin },
    ]
  },
  {
    label: 'POS / Bazaar', icon: Store, children: [
      { label: 'POS Interface', path: '/pos', icon: ShoppingCart },
      { label: 'Events', path: '/pos/events', icon: Calendar },
      { label: 'History', path: '/pos/history', icon: History },
    ]
  },
  { label: 'Insights', path: '/insights', icon: Lightbulb },
  { label: 'Tasks', path: '/tasks', icon: CheckSquare },
  {
    label: 'Settings', icon: Settings, children: [
      { label: 'Integrations', path: '/settings/integrations', icon: Settings },
      { label: 'Brand Settings', path: '/settings/brand', icon: Store },
      { label: 'Team', path: '/settings/team', icon: Users },
    ]
  },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  mobileOpen: boolean
  onMobileClose: () => void
}

function NavItemComponent({
  item,
  collapsed,
  onNavigate,
}: {
  item: NavItem
  collapsed: boolean
  onNavigate?: () => void
}) {
  const location = useLocation()
  const [open, setOpen] = useState(() => {
    if (!item.children) return false
    return item.children.some(c => c.path && location.pathname === c.path)
  })

  if (!item.children) {
    return (
      <NavLink
        to={item.path!}
        end={item.path === '/'}
        onClick={onNavigate}
        className={({ isActive }) => cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer',
          isActive
            ? 'bg-[#2563EB] text-white shadow-sm'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100'
        )}
      >
        <item.icon size={18} className="shrink-0" />
        {/* On mobile always show label; on desktop hide when collapsed */}
        <span className={collapsed ? 'md:hidden' : ''}>{item.label}</span>
      </NavLink>
    )
  }

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer',
          'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100'
        )}
      >
        <item.icon size={18} className="shrink-0" />
        {/* On mobile always show label+chevron; on desktop hide when collapsed */}
        <span className={cn('flex-1 text-left', collapsed && 'md:hidden')}>{item.label}</span>
        <span className={collapsed ? 'md:hidden' : ''}>
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
      </button>
      {/* On mobile always allow expand; on desktop hide when collapsed */}
      {open && (
        <div className={cn(
          'mt-1 ml-4 pl-3 border-l border-slate-200 dark:border-slate-600 space-y-0.5',
          collapsed && 'md:hidden'
        )}>
          {item.children.map(child => (
            <NavLink
              key={child.path}
              to={child.path!}
              onClick={onNavigate}
              className={({ isActive }) => cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 cursor-pointer',
                isActive
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-[#2563EB] dark:text-blue-400 font-semibold'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-200'
              )}
            >
              <child.icon size={15} className="shrink-0" />
              <span>{child.label}</span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const handleNavClick = useCallback(() => {
    // Auto-close sidebar on mobile when a nav item is clicked
    onMobileClose()
  }, [onMobileClose])

  return (
    <>
      {/* Backdrop overlay - mobile only */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed top-0 left-0 h-full bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col',
        // Mobile: always rendered, uses translate to slide in/out
        'w-60 z-50 transition-transform duration-300 ease-in-out',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
        // Desktop: always visible, no translate, uses width transition for collapse
        'md:translate-x-0 md:z-40 md:transition-all md:duration-300',
        collapsed ? 'md:w-16' : 'md:w-60',
      )}>
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
          {/* Always visible on mobile; hidden on desktop when collapsed */}
          <span className={cn(
            'font-bold text-[#2563EB] font-mono text-lg',
            collapsed && 'md:hidden'
          )}>Brand OS</span>
          {/* Desktop collapse toggle */}
          <button
            onClick={onToggle}
            className="hidden md:block p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-150 cursor-pointer"
          >
            {collapsed ? <Menu size={18} /> : <X size={18} />}
          </button>
          {/* Mobile close button */}
          <button
            onClick={onMobileClose}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-150 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {NAV_ITEMS.map(item => (
            <NavItemComponent
              key={item.label}
              item={item}
              collapsed={collapsed}
              onNavigate={handleNavClick}
            />
          ))}
        </nav>

        {/* Footer - always visible on mobile; hidden on desktop when collapsed */}
        <div className={cn(
          'px-4 py-3 border-t border-slate-200 dark:border-slate-700',
          collapsed && 'md:hidden'
        )}>
          <p className="text-xs text-slate-400 font-mono">Brand OS v1.0</p>
        </div>
      </aside>
    </>
  )
}
