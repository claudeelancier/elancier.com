import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export function Field({ label, error, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-white/75">{label}</span>
      {children}
      {error ? <span className="mt-1.5 block text-sm text-[#FF4757]">{error}</span> : null}
    </label>
  )
}

export function TextInput({ icon: Icon, type = 'text', className = '', ...props }) {
  return (
    <div className="relative">
      {Icon ? <Icon className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-white/35" size={18} /> : null}
      <input
        type={type}
        className={`h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none placeholder:text-white/30 focus:border-[#00D4FF]/50 ${Icon ? 'pl-10' : ''} ${className}`}
        {...props}
      />
    </div>
  )
}

export function PasswordInput({ icon: Icon, ...props }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      {Icon ? <Icon className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-white/35" size={18} /> : null}
      <input
        type={show ? 'text' : 'password'}
        className={`h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 pr-11 text-white outline-none placeholder:text-white/30 focus:border-[#00D4FF]/50 ${Icon ? 'pl-10' : ''}`}
        {...props}
      />
      <button
        type="button"
        className="absolute top-1/2 right-3 -translate-y-1/2 text-white/45 hover:text-white"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  )
}
