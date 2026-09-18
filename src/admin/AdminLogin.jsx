import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock } from 'lucide-react'
import { GlassCard } from '../components/common/GlassCard'
import { Field, PasswordInput, TextInput } from '../components/common/Field'
import { PrimaryButton } from '../components/common/Buttons'
import { useAuthStore } from '../store/authStore'
import { errorCopy } from '../utils/errors'

export default function AdminLogin() {
  const adminLogin = useAuthStore((s) => s.adminLogin)
  const loading = useAuthStore((s) => s.loading)
  const navigate = useNavigate()
  const [values, setValues] = useState({ email: 'admin@luckyverse.test', password: 'Admin@1234' })
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    try {
      await adminLogin(values)
      navigate('/admin/dashboard')
    } catch (err) {
      setError(errorCopy(err).body)
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[#080B1A] px-4">
      <GlassCard className="w-full max-w-md p-8">
        <p className="text-xs tracking-[0.22em] text-white/40 uppercase">Restricted</p>
        <h1 className="mt-2 font-heading text-3xl">Admin login</h1>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <Field label="Email">
            <TextInput icon={Mail} value={values.email} onChange={(e) => setValues({ ...values, email: e.target.value })} />
          </Field>
          <Field label="Password" error={error}>
            <PasswordInput icon={Lock} value={values.password} onChange={(e) => setValues({ ...values, password: e.target.value })} />
          </Field>
          <PrimaryButton type="submit" className="w-full" loading={loading}>
            Enter console
          </PrimaryButton>
        </form>
      </GlassCard>
    </div>
  )
}
