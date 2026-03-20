import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from '@/stores/toast-store'

interface RegisterResponse {
  token: string
  user: { id: string; name: string; email: string; brandId: string }
}

export default function Register() {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const update = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }))

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = 'Name is required'
    if (!form.email) errs.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Invalid email'
    if (!form.password) errs.password = 'Password is required'
    else if (form.password.length < 8) errs.password = 'Min 8 characters'
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const data = await api.post<RegisterResponse>('/auth/register', {
        name: form.name,
        email: form.email,
        password: form.password,
      })
      login(data.token, data.user)
      navigate('/onboarding')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-1">Create your account</h2>
        <p className="text-sm text-slate-500">Get started with Brand OS for free</p>
      </div>

      <Input label="Full name" value={form.name} onChange={e => update('name', e.target.value)} placeholder="Your name" error={errors.name} />
      <Input label="Email" type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="you@example.com" error={errors.email} autoComplete="email" />
      <Input label="Password" type="password" value={form.password} onChange={e => update('password', e.target.value)} placeholder="Min 8 characters" error={errors.password} autoComplete="new-password" />
      <Input label="Confirm password" type="password" value={form.confirmPassword} onChange={e => update('confirmPassword', e.target.value)} placeholder="Repeat password" error={errors.confirmPassword} autoComplete="new-password" />

      <Button type="submit" loading={loading} className="w-full gap-2">
        <UserPlus size={16} />
        Create account
      </Button>

      <p className="text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link to="/login" className="text-[#2563EB] hover:underline font-medium">Sign in</Link>
      </p>
    </form>
  )
}
