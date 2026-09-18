import { useEffect, useState } from 'react'
import { PageHeader } from '../components/common/PageHeader'
import { GlassCard } from '../components/common/GlassCard'
import { Badge } from '../components/common/Badge'
import { Modal } from '../components/common/Modal'
import { Field, TextInput } from '../components/common/Field'
import { PrimaryButton, SecondaryButton } from '../components/common/Buttons'
import { EmptyState, TableSkeleton } from '../components/common/States'
import { useAdminStore } from '../store/adminStore'
import { api } from '../services/api'
import { useUiStore } from '../store/uiStore'

const emptyPrize = {
  name: '',
  description: '',
  type: 'cash',
  value: 0,
  quantity: 100,
  weight: 10,
  wheelColor: '#3B3486',
  icon: 'gift',
  status: 'active',
}

export default function PrizeManager() {
  const { prizes, loadPrizes } = useAdminStore()
  const pushToast = useUiStore((s) => s.pushToast)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(null)

  useEffect(() => {
    loadPrizes().finally(() => setLoading(false))
  }, [loadPrizes])

  const save = async () => {
    await api.savePrize(form)
    pushToast({ title: form.id ? 'Prize updated' : 'Prize added' })
    setForm(null)
    loadPrizes()
  }

  return (
    <div>
      <PageHeader title="Prize management" actions={<PrimaryButton size="md" onClick={() => setForm({ ...emptyPrize })}>Add prize</PrimaryButton>} />
      {loading ? (
        <TableSkeleton />
      ) : !prizes.length ? (
        <EmptyState title="No prizes" body="Add your first wheel prize." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {prizes.map((prize) => (
            <GlassCard key={prize.id} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-heading text-lg">{prize.name}</h3>
                  <p className="text-sm text-white/50">{prize.description}</p>
                </div>
                <Badge tone={prize.status === 'active' ? 'success' : 'muted'}>{prize.status}</Badge>
              </div>
              <p className="mt-3 text-sm text-white/60">
                Qty {prize.remainingQuantity}/{prize.quantity} · Weight {prize.weight}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <SecondaryButton size="sm" onClick={() => setForm(prize)}>Edit</SecondaryButton>
                <SecondaryButton size="sm" onClick={async () => { await api.savePrize({ ...prize, status: prize.status === 'active' ? 'disabled' : 'active' }); loadPrizes() }}>
                  {prize.status === 'active' ? 'Disable' : 'Enable'}
                </SecondaryButton>
                <button className="text-sm text-[#FF4757]" onClick={async () => { await api.deletePrize(prize.id); loadPrizes() }}>
                  Delete
                </button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Edit prize' : 'Add prize'} wide>
        {form ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {['name', 'description', 'type', 'value', 'quantity', 'weight', 'wheelColor', 'icon'].map((key) => (
              <Field key={key} label={key}>
                <TextInput value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
              </Field>
            ))}
            <div className="sm:col-span-2">
              <PrimaryButton onClick={save}>Save prize</PrimaryButton>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
