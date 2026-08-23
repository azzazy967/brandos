import { Outlet } from 'react-router-dom'
import { ToastContainer } from '@/components/shared/ToastContainer'
import { BarChart3, Calculator, LineChart, Store } from 'lucide-react'

const features = [
  { icon: BarChart3, text: 'Real-time inventory tracking' },
  { icon: Calculator, text: 'BEROAS calculator' },
  { icon: LineChart, text: 'Multi-channel analytics' },
  { icon: Store, text: 'POS & Bazaar management' },
]

export function AuthLayout() {
  return (
    <div className="min-h-screen flex">
      {/* Left branded panel — hidden on mobile, shown on lg+ */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#2563EB] to-[#1E40AF] flex-col justify-center px-16 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/5 rounded-full" />
        <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-white/5 rounded-full" />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-white/5 rounded-full" />

        <div className="relative z-10">
          <h1 className="text-5xl font-bold text-white font-mono mb-3">Brand OS</h1>
          <p className="text-xl text-blue-100 mb-12">Your e-commerce command center</p>

          <ul className="space-y-5">
            {features.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-4">
                <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/15 backdrop-blur-sm">
                  <Icon size={20} className="text-white" />
                </span>
                <span className="text-white/90 text-lg">{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-[#F8FAFC] to-blue-50 dark:from-[#0B1120] dark:to-slate-900 p-4">
        <div className="w-full max-w-md">
          {/* Brand mark — only visible on mobile (hidden on lg+) */}
          <div className="text-center mb-8 lg:hidden">
            <h1 className="text-3xl font-bold text-[#2563EB] font-mono">Brand OS</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">Your e-commerce command center</p>
          </div>

          <div className="animate-auth-fade-in bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8">
            <Outlet />
          </div>
        </div>
      </div>

      <ToastContainer />
    </div>
  )
}
