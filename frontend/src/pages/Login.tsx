import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from '@/stores/toast-store'

interface LoginResponse {
  token: string
  user: { id: string; name: string; email: string; brandId: string }
}

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!email) errs.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Invalid email'
    if (!password) errs.password = 'Password is required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const res = await api.post<{ success: boolean; data: LoginResponse }>('/auth/login', { email, password })
      login(res.data.token, res.data.user)
      navigate('/')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-1">Sign in</h2>
        <p className="text-sm text-slate-500">Enter your credentials to access your dashboard</p>
      </div>

      <Input
        label="Email"
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="you@example.com"
        error={errors.email}
        autoComplete="email"
      />

      <Input
        label="Password"
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        placeholder="••••••••"
        error={errors.password}
        autoComplete="current-password"
      />

      <Button type="submit" loading={loading} className="w-full gap-2">
        <LogIn size={16} />
        Sign in
      </Button>

      <p className="text-center text-sm text-slate-500">
        Don't have an account?{' '}
        <Link to="/register" className="text-[#2563EB] hover:underline font-medium">
          Create one
        </Link>
      </p>
    </form>
  )
}
