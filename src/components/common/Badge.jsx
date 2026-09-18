import { initials } from '../../utils/format'

const tones = {
  gold: 'bg-[#FFD166]/15 text-[#FFD166] border-[#FFD166]/25',
  success: 'bg-[#2ED573]/12 text-[#2ED573] border-[#2ED573]/25',
  danger: 'bg-[#FF4757]/12 text-[#FF4757] border-[#FF4757]/25',
  info: 'bg-[#00D4FF]/12 text-[#00D4FF] border-[#00D4FF]/25',
  muted: 'bg-white/8 text-white/70 border-white/10',
}

export function Badge({ children, tone = 'muted' }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  )
}

export function Avatar({ name, hue = 262, size = 40 }) {
  return (
    <span
      className="inline-grid place-items-center rounded-full font-semibold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.34,
        background: `linear-gradient(135deg, hsl(${hue} 70% 46%), hsl(${(hue + 40) % 360} 80% 42%))`,
      }}
      aria-hidden
    >
      {initials(name)}
    </span>
  )
}
