import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, User, Phone } from 'lucide-react'
import { Field, PasswordInput, TextInput } from '../components/common/Field'
import { PrimaryButton } from '../components/common/Buttons'
import { GlassCard } from '../components/common/GlassCard'
import { validateRegister } from '../utils/validation'
import { useAuthStore } from '../store/authStore'
import { errorCopy } from '../utils/errors'

export default function Register() {
  const register = useAuthStore((s) => s.register)
  const loading = useAuthStore((s) => s.loading)
  const navigate = useNavigate()
  const [values, setValues] = useState({
    fullName: '',
    mobile: '',
    email: '',
    password: '',
    confirmPassword: '',
    terms: false,
  })
  const [errors, setErrors] = useState({})

  const onSubmit = async (e) => {
    e.preventDefault()
    const next = validateRegister(values)
    setErrors(next)
    if (Object.keys(next).length) return
    try {
      await register(values)
      navigate('/verify')
    } catch (error) {
      setErrors({ email: errorCopy(error).body })
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <GlassCard className="p-6 sm:p-8">
        <p className="text-xs font-semibold tracking-[0.22em] text-[#00D4FF] uppercase">Join Luckyverse</p>
        <h1 className="mt-2 font-heading text-3xl">Create account</h1>
        <p className="mt-2 text-sm text-white/55">Verified players receive daily spins and lucky draw entries.</p>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <Field label="Full name" error={errors.fullName}>
            <TextInput icon={User} value={values.fullName} onChange={(e) => setValues({ ...values, fullName: e.target.value })} placeholder="Hariprasath" />
          </Field>
          <Field label="Mobile number" error={errors.mobile}>
            <TextInput icon={Phone} value={values.mobile} onChange={(e) => setValues({ ...values, mobile: e.target.value })} placeholder="9876543210" />
          </Field>
          <Field label="Email" error={errors.email}>
            <TextInput icon={Mail} value={values.email} onChange={(e) => setValues({ ...values, email: e.target.value })} placeholder="you@email.com" />
          </Field>
          <Field label="Password" error={errors.password}>
            <PasswordInput icon={Lock} value={values.password} onChange={(e) => setValues({ ...values, password: e.target.value })} />
          </Field>
          <Field label="Confirm password" error={errors.confirmPassword}>
            <PasswordInput icon={Lock} value={values.confirmPassword} onChange={(e) => setValues({ ...values, confirmPassword: e.target.value })} />
          </Field>
          <label className="flex items-start gap-2 text-sm text-white/70">
            <input type="checkbox" checked={values.terms} onChange={(e) => setValues({ ...values, terms: e.target.checked })} className="mt-1" />
            I agree to the Luckyverse terms, fair-play rules, and reward claim policy.
          </label>
          {errors.terms ? <p className="text-sm text-[#FF4757]">{errors.terms}</p> : null}
          <PrimaryButton type="submit" className="w-full" loading={loading}>
            Create Account
          </PrimaryButton>
        </form>
        <p className="mt-5 text-center text-sm text-white/50">
          Already have an account? <Link to="/login" className="text-[#00D4FF]">Login</Link>
        </p>
      </GlassCard>
    </div>
  )
}
