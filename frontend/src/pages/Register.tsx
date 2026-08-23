import { useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { UserPlus, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from '@/stores/toast-store'

interface RegisterResponse {
  token: string
  user: { id: string; name: string; email: string; brandId: string; role: 'owner' | 'admin' | 'editor' | 'viewer' }
}

type StrengthLevel = 'weak' | 'fair' | 'strong'

function getPasswordStrength(pw: string): { level: StrengthLevel; percent: number; label: string } {
  if (!pw) return { level: 'weak', percent: 0, label: '' }
  const hasNumber = /\d/.test(pw)
  const hasUpper = /[A-Z]/.test(pw)
  const hasLower = /[a-z]/.test(pw)
  const hasSpecial = /[^A-Za-z0-9]/.test(pw)

  if (pw.length >= 8 && hasNumber && (hasUpper || hasSpecial) && hasLower)
    return { level: 'strong', percent: 100, label: 'Strong' }
  if (pw.length >= 6 && (hasNumber || hasUpper || hasSpecial))
    return { level: 'fair', percent: 60, label: 'Fair' }
  return { level: 'weak', percent: 30, label: 'Weak' }
}

const strengthColors: Record<StrengthLevel, string> = {
  weak: 'bg-red-500',
  fair: 'bg-amber-500',
  strong: 'bg-green-500',
}

export default function Register() {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const update = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }))

  const strength = useMemo(() => getPasswordStrength(form.password), [form.password])

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
        brandName: form.name,
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
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">Create your account</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Get started with Brand OS for free</p>
      </div>

      <Input label="Full name" value={form.name} onChange={e => update('name', e.target.value)} placeholder="Your name" error={errors.name} />
      <Input label="Email" type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="you@example.com" error={errors.email} autoComplete="email" />

      {/* Password with visibility toggle and strength meter */}
      <div>
        <div className="relative">
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={form.password}
            onChange={e => update('password', e.target.value)}
            placeholder="Min 8 characters"
            error={errors.password}
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(v => !v)}
            className="absolute right-3 top-[34px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {/* Strength meter */}
        {form.password.length > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
              <div
                className={`strength-bar h-full ${strengthColors[strength.level]}`}
                style={{ width: `${strength.percent}%` }}
              />
            </div>
            <span className={`text-xs font-medium ${
              strength.level === 'weak' ? 'text-red-500' :
              strength.level === 'fair' ? 'text-amber-500' :
              'text-green-500'
            }`}>
              {strength.label}
            </span>
          </div>
        )}
      </div>

      {/* Confirm password with visibility toggle */}
      <div className="relative">
        <Input
          label="Confirm password"
          type={showConfirm ? 'text' : 'password'}
          value={form.confirmPassword}
          onChange={e => update('confirmPassword', e.target.value)}
          placeholder="Repeat password"
          error={errors.confirmPassword}
          autoComplete="new-password"
        />
        <button
          type="button"
          onClick={() => setShowConfirm(v => !v)}
          className="absolute right-3 top-[34px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          aria-label={showConfirm ? 'Hide password' : 'Show password'}
        >
          {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      <Button type="submit" loading={loading} className="w-full gap-2">
        <UserPlus size={16} />
        Create account
      </Button>

      <p className="text-center text-sm text-slate-500 dark:text-slate-400">
        Already have an account?{' '}
        <Link to="/login" className="text-[#2563EB] hover:underline font-medium">Sign in</Link>
      </p>
    </form>
  )
}
