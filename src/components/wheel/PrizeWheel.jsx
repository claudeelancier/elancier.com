import { useEffect, useId, useMemo, useRef } from 'react'
import gsap from 'gsap'
import { Banknote, Gift, Meh, Package, RotateCw, Sparkles, Trophy, Wallet } from 'lucide-react'
import { describeArc, segmentLabelPoint } from '../../utils/wheel'
import { useReducedMotion } from '../../hooks/useUi'

const ICONS = {
  banknote: Banknote,
  wallet: Wallet,
  sparkles: Sparkles,
  gift: Gift,
  package: Package,
  'rotate-cw': RotateCw,
  meh: Meh,
  trophy: Trophy,
}

export function PrizeWheel({ prizes, rotation, spinning, onTick, duration = 5 }) {
  const wheelRef = useRef(null)
  const pointerRef = useRef(null)
  const lastSeg = useRef(0)
  const reduced = useReducedMotion()
  const uid = useId().replace(/:/g, '')
  const ringId = `ring-${uid}`
  const count = prizes.length || 1
  const slice = 360 / count
  const cx = 250
  const cy = 250

  const segments = useMemo(
    () =>
      prizes.map((prize, index) => {
        const start = index * slice
        const end = (index + 1) * slice
        return {
          prize,
          path: describeArc(cx, cy, 228, start, end),
          label: segmentLabelPoint(cx, cy, 148, start, end),
          iconPt: segmentLabelPoint(cx, cy, 188, start, end),
        }
      }),
    [prizes, slice],
  )

  useEffect(() => {
    const el = wheelRef.current
    if (!el) return
    if (reduced) {
      gsap.set(el, { rotate: rotation })
      return
    }
    const tween = gsap.to(el, {
      rotate: rotation,
      duration: spinning ? duration : 0.45,
      ease: spinning ? 'power4.out' : 'power2.out',
      overwrite: 'auto',
      onUpdate() {
        const current = parseFloat(gsap.getProperty(el, 'rotate')) || 0
        const normalized = ((current % 360) + 360) % 360
        const underPointer = Math.floor(((360 - normalized) % 360) / slice) % count
        if (underPointer !== lastSeg.current) {
          lastSeg.current = underPointer
          onTick?.()
          if (pointerRef.current) {
            gsap.fromTo(pointerRef.current, { rotate: -14 }, { rotate: 0, duration: 0.14, ease: 'back.out(3)' })
          }
        }
      },
    })
    return () => tween.kill()
  }, [rotation, spinning, reduced, slice, count, onTick, duration])

  return (
    <div className="relative mx-auto w-[min(78vw,520px)] select-none" style={{ aspectRatio: '1' }}>
      <div className="absolute inset-[-10%] rounded-full bg-[#6C5CE7]/16 blur-3xl" aria-hidden />
      <div ref={wheelRef} className="absolute inset-0 will-change-transform">
        <svg viewBox="0 0 500 500" className="h-full w-full drop-shadow-2xl" role="img" aria-label="Prize wheel">
          <defs>
            <linearGradient id={ringId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#F4F7FF" />
              <stop offset="35%" stopColor="#8E97AD" />
              <stop offset="70%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#6A7287" />
            </linearGradient>
          </defs>
          <circle cx="250" cy="250" r="248" fill={`url(#${ringId})`} />
          <circle cx="250" cy="250" r="236" fill="#0B1024" />
          {segments.map((seg) => {
            const Icon = ICONS[seg.prize.icon] || Sparkles
            return (
              <g key={seg.prize.id}>
                <path d={seg.path} fill={seg.prize.wheelColor} stroke="rgba(255,255,255,0.14)" strokeWidth="1.4" />
                <g transform={`translate(${seg.iconPt.x - 9} ${seg.iconPt.y - 9})`}>
                  <Icon width={18} height={18} color={seg.prize.accent} />
                </g>
                <text
                  x={seg.label.x}
                  y={seg.label.y}
                  fill="white"
                  fontSize="15"
                  fontFamily="Space Grotesk, Inter, sans-serif"
                  fontWeight="700"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {seg.prize.shortLabel}
                </text>
              </g>
            )
          })}
          <circle cx="250" cy="250" r="56" fill="#121833" stroke="#FFD166" strokeWidth="3" />
          <circle cx="250" cy="250" r="40" fill={`url(#${ringId})`} />
          <text x="250" y="246" textAnchor="middle" fill="#080B1A" fontSize="12" fontWeight="800" fontFamily="Sora">
            SPIN
          </text>
          <text x="250" y="262" textAnchor="middle" fill="#080B1A" fontSize="9" fontWeight="700">
            WIN
          </text>
        </svg>
      </div>
      <div ref={pointerRef} className="absolute top-[-8px] left-1/2 z-10 -translate-x-1/2" style={{ transformOrigin: '50% 10px' }}>
        <svg width="36" height="50" viewBox="0 0 36 50" aria-hidden>
          <path d="M18 48 L3 8 Q18 -1 33 8 Z" fill="#FFD166" stroke="#fff4c8" strokeWidth="1.6" />
          <circle cx="18" cy="12" r="4.2" fill="#080B1A" />
        </svg>
      </div>
    </div>
  )
}

export function shakeNode(node) {
  if (!node) return Promise.resolve()
  return gsap
    .timeline()
    .to(node, { x: -6, duration: 0.05 })
    .to(node, { x: 6, duration: 0.07 })
    .to(node, { x: -4, duration: 0.06 })
    .to(node, { x: 0, duration: 0.05 })
}
