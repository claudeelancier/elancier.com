import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { PageHeader } from '../components/common/PageHeader'
import { GlassCard } from '../components/common/GlassCard'
import { PrimaryButton, SecondaryButton } from '../components/common/Buttons'
import { Modal } from '../components/common/Modal'
import { useCountdown, useReducedMotion } from '../hooks/useUi'
import { useGameStore } from '../store/gameStore'
import { useAuthStore } from '../store/authStore'
import { fireDrawConfetti } from '../utils/confetti'
import { drawParticipants } from '../data/mockData'

export default function LuckyDraw() {
  const { draw, loadDraw } = useGameStore()
  const user = useAuthStore((s) => s.user)
  const [how, setHow] = useState(false)
  const [live, setLive] = useState(false)
  const [winner, setWinner] = useState(null)
  const count = useCountdown(draw?.startAt || new Date(Date.now() + 3600000).toISOString())

  useEffect(() => {
    loadDraw()
  }, [loadDraw])

  return (
    <div>
      <PageHeader title="Lucky Draw" subtitle="A scheduled, animated draw with verified participants." />
      <GlassCard className="p-6 sm:p-8">
        <p className="text-xs tracking-[0.24em] text-[#00D4FF] uppercase">Next Lucky Draw</p>
        <h2 className="mt-2 font-heading text-3xl sm:text-4xl">{draw?.name || 'Mega Friday Draw'}</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-sm text-white/45">Prize</p>
            <p className="gold-text font-numeric text-3xl">{draw?.prize}</p>
          </div>
          <div>
            <p className="text-sm text-white/45">Participants</p>
            <p className="font-numeric text-3xl">{draw?.participants?.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-white/45">Your entries</p>
            <p className="font-numeric text-3xl">{user ? draw?.userEntries ?? 0 : '—'}</p>
          </div>
        </div>
        <div className="mt-8 flex justify-center gap-3 font-numeric text-4xl sm:text-6xl">
          <TimeBox v={count.h} l="HRS" />
          <span className="text-white/30">:</span>
          <TimeBox v={count.m} l="MIN" />
          <span className="text-white/30">:</span>
          <TimeBox v={count.s} l="SEC" />
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <SecondaryButton onClick={() => setHow(true)}>HOW IT WORKS</SecondaryButton>
          {(user?.role === 'admin' || count.done) && (
            <PrimaryButton onClick={() => setLive(true)}>Watch live draw</PrimaryButton>
          )}
        </div>
        <p className="mt-4 text-sm text-white/40">
          {user ? `Entry status: ${draw?.userEntries ? `${draw.userEntries} tickets locked in` : 'No entries yet'}` : 'Login to see your entry status.'}
        </p>
      </GlassCard>

      {live ? (
        <LiveDraw
          participants={drawParticipants}
          onDone={(w) => {
            setWinner(w)
            setLive(false)
          }}
          onClose={() => setLive(false)}
        />
      ) : null}

      {winner ? (
        <GlassCard className="mt-6 p-8 text-center">
          <p className="text-4xl">🏆</p>
          <p className="mt-2 text-xs tracking-[0.24em] text-[#FFD166] uppercase">Winner</p>
          <h3 className="mt-2 font-heading text-4xl">{winner.name}</h3>
          <p className="mt-2 text-white/50">Participant ID: {winner.id}</p>
        </GlassCard>
      ) : null}

      <Modal open={how} onClose={() => setHow(false)} title="How Lucky Draw works">
        <ol className="space-y-3 text-sm text-white/70">
          <li>1. Verified players receive draw entries from gameplay and campaigns.</li>
          <li>2. The administrator starts the draw from the admin console.</li>
          <li>3. Eligible names cycle through a selector, then slow to a stop.</li>
          <li>4. The selected winner is stored, published, and shown on the public board.</li>
        </ol>
      </Modal>
    </div>
  )
}

function TimeBox({ v, l }) {
  return (
    <div className="min-w-[72px] rounded-2xl border border-white/10 bg-white/5 px-3 py-4 text-center">
      <div>{v}</div>
      <div className="mt-1 text-xs tracking-widest text-white/35">{l}</div>
    </div>
  )
}

function LiveDraw({ participants, onDone, onClose }) {
  const [name, setName] = useState(participants[0]?.name)
  const reduced = useReducedMotion()
  const idx = useRef({ i: 0 })
  const obj = useRef({ t: 0 })

  useEffect(() => {
    const winner = participants[0]
    if (reduced) {
      setName(winner.name)
      fireDrawConfetti()
      const t = setTimeout(() => onDone(winner), 600)
      return () => clearTimeout(t)
    }
    const state = obj.current
    state.t = 0
    const tween = gsap.to(state, {
      t: 1,
      duration: 4.8,
      ease: 'power4.out',
      onUpdate() {
        const speed = 1 - state.t
        const step = speed > 0.2 ? 1 : state.t * 10 % 1 < speed ? 1 : 0
        if (speed > 0.05) {
          idx.current.i = (idx.current.i + Math.max(1, Math.round(speed * 3))) % participants.length
          setName(participants[idx.current.i].name)
        } else {
          setName(winner.name)
        }
      },
      onComplete() {
        setName(winner.name)
        fireDrawConfetti()
        setTimeout(() => onDone(winner), 900)
      },
    })
    return () => tween.kill()
  }, [participants, onDone, reduced])

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-[#080B1A]/86 px-4">
      <button className="absolute inset-0" aria-label="Close live draw" onClick={onClose} />
      <div className="relative w-full max-w-xl rounded-[28px] border border-[#FFD166]/25 bg-[#10152B] p-8 text-center shadow-[0_0_80px_rgba(255,209,102,0.12)]">
        <div className="mx-auto mb-6 h-24 w-24 rounded-full bg-[#FFD166]/15 blur-0 ring-4 ring-[#FFD166]/30" />
        <p className="text-xs tracking-[0.24em] text-[#FFD166] uppercase">Selecting winner</p>
        <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/30 py-6">
          <p className="font-heading text-4xl">{name}</p>
        </div>
      </div>
    </div>
  )
}
