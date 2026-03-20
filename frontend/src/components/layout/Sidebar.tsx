import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Package, DollarSign, Megaphone, Truck,
  ShoppingCart, Lightbulb, Settings, ChevronDown, ChevronRight,
  Menu, X, Store, History, Calendar, BarChart3, TrendingUp,
  ClipboardList, AlertTriangle, Calculator, Users, MapPin,
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
  {
    label: 'Settings', icon: Settings, children: [
      { label: 'Integrations', path: '/settings/integrations', icon: Settings },
      { label: 'Brand Settings', path: '/settings/brand', icon: Store },
    ]
  },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

function NavItemComponent({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
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
        className={({ isActive }) => cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer',
          isActive
            ? 'bg-[#2563EB] text-white shadow-sm'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        )}
      >
        <item.icon size={18} className="shrink-0" />
        {!collapsed && <span>{item.label}</span>}
      </NavLink>
    )
  }

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer',
          'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        )}
      >
        <item.icon size={18} className="shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1 text-left">{item.label}</span>
            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </>
        )}
      </button>
      {!collapsed && open && (
        <div className="mt-1 ml-4 pl-3 border-l border-slate-200 space-y-0.5">
          {item.children.map(child => (
            <NavLink
              key={child.path}
              to={child.path!}
              className={({ isActive }) => cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 cursor-pointer',
                isActive
                  ? 'bg-blue-50 text-[#2563EB] font-semibold'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
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

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  return (
    <aside className={cn(
      'fixed top-0 left-0 h-full bg-white border-r border-slate-200 transition-all duration-300 z-40 flex flex-col',
      collapsed ? 'w-16' : 'w-60'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200 shrink-0">
        {!collapsed && (
          <span className="font-bold text-[#2563EB] font-mono text-lg">Brand OS</span>
        )}
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all duration-150 cursor-pointer"
        >
          {collapsed ? <Menu size={18} /> : <X size={18} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {NAV_ITEMS.map(item => (
          <NavItemComponent key={item.label} item={item} collapsed={collapsed} />
        ))}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-slate-200">
          <p className="text-xs text-slate-400 font-mono">Brand OS v1.0</p>
        </div>
      )}
    </aside>
  )
}
