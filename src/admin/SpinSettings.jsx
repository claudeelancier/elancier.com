import { useState } from 'react'
import { PageHeader } from '../components/common/PageHeader'
import { GlassCard } from '../components/common/GlassCard'
import { Field, TextInput } from '../components/common/Field'
import { PrimaryButton } from '../components/common/Buttons'
import { PrizeWheel } from '../components/wheel/PrizeWheel'
import { prizes } from '../data/mockData'
import { spinSettings as seed } from '../data/mockData'
import { api } from '../services/api'
import { useUiStore } from '../store/uiStore'

export default function SpinSettings() {
  const [form, setForm] = useState(seed)
  const pushToast = useUiStore((s) => s.pushToast)

  return (
    <div>
      <PageHeader title="Spin manager" subtitle="Controls that map to backend spin policy." />
      <div className="grid gap-6 lg:grid-cols-2">
        <GlassCard className="space-y-4 p-6">
          <Field label="Maximum spins per user">
            <TextInput type="number" value={form.maxSpinsPerUser} onChange={(e) => setForm({ ...form, maxSpinsPerUser: Number(e.target.value) })} />
          </Field>
          <Field label="Reset type">
            <select
              className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4"
              value={form.resetType}
              onChange={(e) => setForm({ ...form, resetType: e.target.value })}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="never">Never</option>
            </select>
          </Field>
          <Field label="Spin duration (seconds)">
            <TextInput type="number" value={form.spinDuration} onChange={(e) => setForm({ ...form, spinDuration: Number(e.target.value) })} />
          </Field>
          <Field label="Minimum eligibility">
            <TextInput value={form.minEligibility} onChange={(e) => setForm({ ...form, minEligibility: e.target.value })} />
          </Field>
          <Field label="Duplicate-prize rules">
            <select
              className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4"
              value={form.duplicatePrizeRule}
              onChange={(e) => setForm({ ...form, duplicatePrizeRule: e.target.value })}
            >
              <option value="allowed">Allowed</option>
              <option value="unique-daily">Unique daily</option>
            </select>
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.winnerAnimation} onChange={(e) => setForm({ ...form, winnerAnimation: e.target.checked })} />
            Winner animation
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.soundEffects} onChange={(e) => setForm({ ...form, soundEffects: e.target.checked })} />
            Sound effects
          </label>
          <PrimaryButton
            onClick={async () => {
              await api.saveSpinSettings(form)
              pushToast({ title: 'Spin settings saved' })
            }}
          >
            Save settings
          </PrimaryButton>
        </GlassCard>
        <GlassCard className="p-6">
          <h3 className="font-heading text-lg">Wheel preview</h3>
          <div className="mt-4 scale-90">
            <PrizeWheel prizes={prizes} rotation={12} spinning={false} />
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
