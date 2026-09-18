import { motion } from 'framer-motion'

const sizes = {
  sm: 'h-10 px-4 text-sm',
  md: 'h-12 px-5 text-sm',
  lg: 'min-h-[54px] px-6 text-base',
}

export function PrimaryButton({ children, className = '', size = 'lg', loading, disabled, type = 'button', onClick, ...props }) {
  return (
    <motion.button
      type={type}
      whileTap={disabled || loading ? undefined : { scale: 0.98 }}
      disabled={disabled || loading}
      onClick={onClick}
      className={`cta-gradient inline-flex items-center justify-center gap-2 rounded-[16px] font-semibold text-white shadow-[0_12px_30px_rgba(108,92,231,0.28)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 ${sizes[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden />
      ) : null}
      {children}
    </motion.button>
  )
}

export function SecondaryButton({ children, className = '', size = 'lg', type = 'button', ...props }) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-[16px] border border-white/12 bg-white/5 font-semibold text-white transition hover:bg-white/10 disabled:opacity-50 ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
