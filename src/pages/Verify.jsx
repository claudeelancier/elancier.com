import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GlassCard } from '../components/common/GlassCard'
import { PrimaryButton, SecondaryButton } from '../components/common/Buttons'
import { useAuthStore } from '../store/authStore'
import { api } from '../services/api'
import { validateOtp } from '../utils/validation'
import { useUiStore } from '../store/uiStore'

export default function Verify() {
  const pendingMobile = useAuthStore((s) => s.pendingMobile)
  const verifyOtp = useAuthStore((s) => s.verifyOtp)
  const loading = useAuthStore((s) => s.loading)
  const pushToast = useUiStore((s) => s.pushToast)
  const navigate = useNavigate()
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [seconds, setSeconds] = useState(30)
  const [error, setError] = useState('')
  const inputs = useRef([])

  useEffect(() => {
    if (!pendingMobile) navigate('/register')
  }, [pendingMobile, navigate])

  useEffect(() => {
    if (seconds <= 0) return
    const id = setTimeout(() => setSeconds((s) => s - 1), 1000)
    return () => clearTimeout(id)
  }, [seconds])

  const onChange = (index, value) => {
    if (!/^\d?$/.test(value)) return
    const next = [...digits]
    next[index] = value
    setDigits(next)
    if (value && index < 5) inputs.current[index + 1]?.focus()
  }

  const onKey = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) inputs.current[index - 1]?.focus()
  }

  const submit = async (e) => {
    e.preventDefault()
    const code = digits.join('')
    const message = validateOtp(code)
    if (message) {
      setError(message)
      return
    }
    try {
      await verifyOtp(code)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <GlassCard className="p-6 sm:p-8">
        <h1 className="font-heading text-3xl">Verify Your Account</h1>
        <p className="mt-2 text-white/55">
          Enter the 6-digit code sent to <span className="text-white">{pendingMobile}</span>
        </p>
        <p className="mt-2 text-xs text-white/35">Demo OTP: 123456</p>
        <form className="mt-6" onSubmit={submit}>
          <div className="flex justify-between gap-2">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => (inputs.current[i] = el)}
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => onChange(i, e.target.value)}
                onKeyDown={(e) => onKey(i, e)}
                aria-label={`Digit ${i + 1}`}
                className="h-14 w-12 rounded-2xl border border-white/10 bg-white/5 text-center font-numeric text-2xl"
              />
            ))}
          </div>
          {error ? <p className="mt-3 text-sm text-[#FF4757]">{error}</p> : null}
          <PrimaryButton type="submit" className="mt-6 w-full" loading={loading}>
            Verify OTP
          </PrimaryButton>
        </form>
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-white/45">{seconds > 0 ? `Resend in 00:${String(seconds).padStart(2, '0')}` : 'You can resend now'}</span>
          <SecondaryButton
            size="sm"
            disabled={seconds > 0}
            onClick={async () => {
              await api.resendOtp(pendingMobile)
              setSeconds(30)
              pushToast({ title: 'OTP sent', body: 'Use 123456 in this demo.' })
            }}
          >
            Resend OTP
          </SecondaryButton>
        </div>
      </GlassCard>
    </div>
  )
}
