import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PrizeWheel, shakeNode } from '../components/wheel/PrizeWheel'
import { PrimaryButton } from '../components/common/Buttons'
import { GlassCard, StatCard } from '../components/common/GlassCard'
import { PrizeReveal } from '../components/rewards/PrizeReveal'
import { WheelSkeleton, ErrorState } from '../components/common/States'
import { useAuthStore } from '../store/authStore'
import { useGameStore, SPIN_STATES } from '../store/gameStore'
import { useUiStore } from '../store/uiStore'
import { nextSpinRotation } from '../utils/wheel'
import { sounds, unlockAudio } from '../utils/sound'
import { fireJackpotConfetti, fireWinConfetti } from '../utils/confetti'
import { errorCopy } from '../utils/errors'

export default function SpinArena() {
  const user = useAuthStore((s) => s.user)
  const { prizes, loadPrizes, requestSpin, canSpin, spinState, result, markStopping, markRevealing, markCompleted, lastRotation, setLastRotation, resetSpin } =
    useGameStore()
  const soundEnabled = useUiStore((s) => s.soundEnabled)
  const pushToast = useUiStore((s) => s.pushToast)
  const [rotation, setRotation] = useState(lastRotation)
  const [spinning, setSpinning] = useState(false)
  const [reveal, setReveal] = useState(false)
  const [error, setError] = useState(null)
  const wrapRef = useRef(null)
  const busy = useRef(false)
  const navigate = useNavigate()

  useEffect(() => {
    loadPrizes().catch((err) => setError(err))
  }, [loadPrizes])

  const play = (name) => {
    if (!soundEnabled) return
    unlockAudio()
    sounds[name]?.()
  }

  const spin = async () => {
    if (busy.current || !canSpin()) return
    busy.current = true
    setError(null)
    play('click')
    await shakeNode(wrapRef.current)
    play('spin')
    try {
      const payload = await requestSpin()
      if (!payload) {
        busy.current = false
        return
      }
      const next = nextSpinRotation(rotation, payload.wheel_index, prizes.length || 8, 6)
      setSpinning(true)
      setRotation(next)
      setLastRotation(next)
      window.setTimeout(() => {
        markStopping()
        if (wrapRef.current && navigator.vibrate) navigator.vibrate(40)
        window.setTimeout(() => {
          setSpinning(false)
          markRevealing()
          setReveal(true)
          if (payload.prize_type === 'try_again') play('lose')
          else if (payload.prize_type === 'jackpot') {
            play('jackpot')
            fireJackpotConfetti()
          } else if (payload.prize_type === 'mystery') play('mystery')
          else {
            play('win')
            fireWinConfetti()
          }
          if (payload.prize_type === 'bonus_spin') {
            pushToast({ title: '+1 bonus spin', body: 'Your available spins just increased.' })
          }
          markCompleted()
          busy.current = false
        }, 280)
      }, 5000)
    } catch (err) {
      setError(err)
      busy.current = false
    }
  }

  const locked = !canSpin() || spinState === SPIN_STATES.requesting || spinning || !prizes.length
  const noSpins = (user?.spins ?? 0) <= 0

  return (
    <div>
      <div className="text-center">
        <p className="text-xs font-semibold tracking-[0.28em] text-[#FFD166] uppercase">Today's Jackpot</p>
        <p className="gold-text mt-2 font-numeric text-5xl font-bold">₹5,000</p>
      </div>

      {error ? (
        <div className="mx-auto mt-6 max-w-xl">
          <ErrorState title={errorCopy(error).title} body={errorCopy(error).body} onRetry={() => setError(null)} />
        </div>
      ) : null}

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[240px_1fr_240px]">
        <GlassCard className="order-2 p-5 lg:order-1">
          <h2 className="font-heading text-lg">Available prizes</h2>
          <ul className="mt-4 space-y-2">
            {prizes.map((prize) => (
              <li key={prize.id} className="flex items-center justify-between rounded-xl bg-white/4 px-3 py-2 text-sm">
                <span>{prize.shortLabel}</span>
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: prize.accent }} />
              </li>
            ))}
          </ul>
        </GlassCard>

        <div className="order-1 lg:order-2" ref={wrapRef}>
          {prizes.length ? (
            <PrizeWheel prizes={prizes} rotation={rotation} spinning={spinning} onTick={() => play('tick')} />
          ) : (
            <WheelSkeleton />
          )}
          <div className="mt-8 flex flex-col items-center">
            <PrimaryButton onClick={spin} disabled={locked} className="min-w-[220px]">
              {spinning || spinState === SPIN_STATES.requesting ? 'SPINNING...' : noSpins ? 'NO SPINS LEFT' : 'SPIN NOW'}
            </PrimaryButton>
            <p className="mt-3 text-sm text-white/55">Spins remaining: {user?.spins ?? 0}</p>
          </div>
        </div>

        <div className="order-3 grid gap-4">
          <StatCard label="Your spins" value={user?.spins ?? 0} />
          <StatCard label="Total wins" value={user?.totalWins ?? 0} gold />
          <StatCard label="Rewards value" value={`₹${(user?.totalRewardsValue ?? 0).toLocaleString('en-IN')}`} />
        </div>
      </div>

      <PrizeReveal
        open={reveal}
        result={result}
        onClose={() => {
          setReveal(false)
          resetSpin()
        }}
        onClaim={async () => {
          setReveal(false)
          pushToast({ title: 'Reward saved', body: 'Find it in My Rewards to complete your claim.' })
          navigate('/rewards')
        }}
        onView={() => {
          setReveal(false)
          navigate('/rewards')
        }}
      />
    </div>
  )
}
