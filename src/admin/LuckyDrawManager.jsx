import { useState } from 'react'
import { PageHeader } from '../components/common/PageHeader'
import { GlassCard } from '../components/common/GlassCard'
import { Field, TextInput } from '../components/common/Field'
import { PrimaryButton, SecondaryButton } from '../components/common/Buttons'
import { Modal } from '../components/common/Modal'
import { upcomingDraw, drawParticipants } from '../data/mockData'
import { api } from '../services/api'
import { useUiStore } from '../store/uiStore'
import { useAuthStore } from '../store/authStore'
import { fireDrawConfetti } from '../utils/confetti'

export default function LuckyDrawManager() {
  const [form, setForm] = useState({
    name: upcomingDraw.name,
    prize: upcomingDraw.prize,
    startDate: '2026-09-18',
    startTime: '21:00',
    eligibility: upcomingDraw.eligibility,
    winnerCount: 1,
    participantLimit: 5000,
    status: 'draft',
  })
  const [confirm, setConfirm] = useState(false)
  const [winner, setWinner] = useState(null)
  const pushToast = useUiStore((s) => s.pushToast)
  const role = useAuthStore((s) => s.role)

  const save = async (status) => {
    const draw = await api.saveDraw({ ...form, status })
    setForm({ ...form, status: draw.status })
    pushToast({ title: status === 'scheduled' ? 'Draw published' : 'Draft saved' })
  }

  const start = async () => {
    setConfirm(false)
    const result = await api.startLuckyDraw('draw-friday')
    setWinner(result.winner)
    fireDrawConfetti()
    pushToast({ title: 'Draw started', body: `${result.winner.name} selected.` })
  }

  return (
    <div>
      <PageHeader title="Lucky Draw manager" subtitle={`${drawParticipants.length} eligible participants in the current mock pool.`} />
      <GlassCard className="grid gap-4 p-6 sm:grid-cols-2">
        <Field label="Draw name">
          <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Prize">
          <TextInput value={form.prize} onChange={(e) => setForm({ ...form, prize: e.target.value })} />
        </Field>
        <Field label="Start date">
          <TextInput type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
        </Field>
        <Field label="Start time">
          <TextInput type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
        </Field>
        <Field label="Eligibility">
          <TextInput value={form.eligibility} onChange={(e) => setForm({ ...form, eligibility: e.target.value })} />
        </Field>
        <Field label="Number of winners">
          <TextInput type="number" value={form.winnerCount} onChange={(e) => setForm({ ...form, winnerCount: Number(e.target.value) })} />
        </Field>
        <Field label="Participant limit">
          <TextInput type="number" value={form.participantLimit} onChange={(e) => setForm({ ...form, participantLimit: Number(e.target.value) })} />
        </Field>
        <Field label="Status">
          <TextInput value={form.status} readOnly />
        </Field>
        <div className="flex flex-wrap gap-3 sm:col-span-2">
          <SecondaryButton onClick={() => save('draft')}>Save draft</SecondaryButton>
          <SecondaryButton onClick={() => save('scheduled')}>Publish</SecondaryButton>
          <PrimaryButton onClick={() => setConfirm(true)}>Start draw</PrimaryButton>
        </div>
      </GlassCard>
      {winner ? (
        <GlassCard className="mt-6 p-6">
          <p className="text-xs tracking-[0.2em] text-[#FFD166] uppercase">Winner</p>
          <h3 className="mt-2 font-heading text-3xl">{winner.name}</h3>
          <p className="text-white/50">{winner.id}</p>
          <PrimaryButton
            className="mt-4"
            size="md"
            onClick={async () => {
              await api.publishDrawWinner(winner)
              pushToast({ title: 'Winner published' })
            }}
          >
            Publish winner
          </PrimaryButton>
        </GlassCard>
      ) : null}
      <Modal open={confirm} onClose={() => setConfirm(false)} title="Start this draw?">
        <p className="text-white/65">This will lock entries and run the animated selection for {drawParticipants.length} eligible players.</p>
        <div className="mt-5 flex gap-3">
          <PrimaryButton onClick={start} disabled={role !== 'admin'}>Confirm start</PrimaryButton>
          <SecondaryButton onClick={() => setConfirm(false)}>Cancel</SecondaryButton>
        </div>
      </Modal>
    </div>
  )
}
