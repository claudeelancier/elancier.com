import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Mail, Lock } from 'lucide-react'
import { Field, PasswordInput, TextInput } from '../components/common/Field'
import { PrimaryButton } from '../components/common/Buttons'
import { GlassCard } from '../components/common/GlassCard'
import { validateLogin } from '../utils/validation'
import { useAuthStore } from '../store/authStore'
import { useUiStore } from '../store/uiStore'
import { errorCopy } from '../utils/errors'

export default function Login() {
  const login = useAuthStore((s) => s.login)
  const demoLogin = useAuthStore((s) => s.demoLogin)
  const loading = useAuthStore((s) => s.loading)
  const pushToast = useUiStore((s) => s.pushToast)
  const navigate = useNavigate()
  const location = useLocation()
  const [values, setValues] = useState({ identifier: '', password: '', remember: true })
  const [errors, setErrors] = useState({})

  const onSubmit = async (e) => {
    e.preventDefault()
    const next = validateLogin(values)
    setErrors(next)
    if (Object.keys(next).length) return
    try {
      await login(values)
      navigate(location.state?.from || '/dashboard', { replace: true })
    } catch (error) {
      const copy = errorCopy(error)
      setErrors({ password: copy.body })
    }
  }

  return (
    <div className="relative mx-auto grid min-h-[70vh] max-w-md place-items-center">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-10 left-10 h-40 w-40 rounded-full bg-[#6C5CE7]/20 blur-3xl" />
        <div className="absolute right-0 bottom-10 h-40 w-40 rounded-full bg-[#00D4FF]/10 blur-3xl" />
      </div>
      <GlassCard className="relative w-full p-6 sm:p-8">
        <p className="text-xs font-semibold tracking-[0.22em] text-[#00D4FF] uppercase">Welcome back</p>
        <h1 className="mt-2 font-heading text-3xl">Login</h1>
        <p className="mt-2 text-sm text-white/55">Use your mobile number or email to continue.</p>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <Field label="Mobile / Email" error={errors.identifier}>
            <TextInput icon={Mail} value={values.identifier} onChange={(e) => setValues({ ...values, identifier: e.target.value })} placeholder="hari@luckyverse.test" />
          </Field>
          <Field label="Password" error={errors.password}>
            <PasswordInput icon={Lock} value={values.password} onChange={(e) => setValues({ ...values, password: e.target.value })} placeholder="••••••••" />
          </Field>
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-white/70">
              <input type="checkbox" checked={values.remember} onChange={(e) => setValues({ ...values, remember: e.target.checked })} />
              Remember me
            </label>
            <button type="button" className="text-[#00D4FF]" onClick={() => pushToast({ title: 'Password reset', body: 'Contact support@luckyverse.com to reset your password.' })}>
              Forgot password
            </button>
          </div>
          <PrimaryButton type="submit" className="w-full" loading={loading}>
            Login
          </PrimaryButton>
        </form>
        <button
          className="mt-3 w-full rounded-2xl border border-white/10 py-3 text-sm text-white/70"
          onClick={() => {
            demoLogin()
            navigate('/dashboard')
          }}
        >
          Continue as Hari (demo)
        </button>
        <p className="mt-5 text-center text-sm text-white/50">
          New here? <Link to="/register" className="text-[#00D4FF]">Create account</Link>
        </p>
      </GlassCard>
    </div>
  )
}
