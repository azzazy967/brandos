import { Outlet } from 'react-router-dom'
import { ToastContainer } from '@/components/shared/ToastContainer'

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8FAFC] to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#2563EB] font-mono">Brand OS</h1>
          <p className="text-slate-500 mt-2 text-sm">Your Brand Operating System</p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <Outlet />
        </div>
      </div>
      <ToastContainer />
    </div>
  )
}
