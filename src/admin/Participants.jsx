import { useEffect, useState } from 'react'
import { PageHeader } from '../components/common/PageHeader'
import { GlassCard } from '../components/common/GlassCard'
import { Badge } from '../components/common/Badge'
import { Modal } from '../components/common/Modal'
import { TextInput, Field } from '../components/common/Field'
import { PrimaryButton, SecondaryButton } from '../components/common/Buttons'
import { EmptyState, TableSkeleton } from '../components/common/States'
import { useAdminStore } from '../store/adminStore'
import { api } from '../services/api'
import { formatDate } from '../utils/format'
import { useUiStore } from '../store/uiStore'

export default function Participants() {
  const { participants, loadParticipants } = useAdminStore()
  const pushToast = useUiStore((s) => s.pushToast)
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [current, setCurrent] = useState(null)
  const [spins, setSpins] = useState(0)

  const refresh = () => loadParticipants(q).finally(() => setLoading(false))
  useEffect(() => {
    setLoading(true)
    refresh()
  }, [q])

  const act = async (id, patch, label) => {
    await api.updateParticipant(id, patch)
    pushToast({ title: label })
    refresh()
  }

  return (
    <div>
      <PageHeader title="Participants" subtitle="Search, disable, and adjust spins or draw entries." />
      <TextInput placeholder="Search name, email, or mobile" value={q} onChange={(e) => setQ(e.target.value)} />
      {loading ? (
        <div className="mt-6">
          <TableSkeleton />
        </div>
      ) : !participants.length ? (
        <div className="mt-6">
          <EmptyState title="No participants found" body="Try a different search query." />
        </div>
      ) : (
        <>
          <div className="mt-6 hidden overflow-x-auto lg:block">
            <table className="w-full text-left text-sm">
              <thead className="text-white/45">
                <tr>
                  {['Name', 'Mobile', 'Email', 'Spins', 'Entries', 'Wins', 'Status', 'Registered', 'Actions'].map((h) => (
                    <th key={h} className="px-3 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {participants.map((p) => (
                  <tr key={p.id} className="border-t border-white/6">
                    <td className="px-3 py-3">{p.fullName}</td>
                    <td className="px-3 py-3">{p.mobile}</td>
                    <td className="px-3 py-3">{p.email}</td>
                    <td className="px-3 py-3">{p.spins}</td>
                    <td className="px-3 py-3">{p.drawEntries}</td>
                    <td className="px-3 py-3">{p.totalWins}</td>
                    <td className="px-3 py-3">
                      <Badge tone={p.status === 'active' ? 'success' : 'danger'}>{p.status}</Badge>
                    </td>
                    <td className="px-3 py-3">{formatDate(p.joinedAt)}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button className="text-[#00D4FF]" onClick={() => { setCurrent(p); setSpins(p.spins) }}>View</button>
                        {p.status === 'active' ? (
                          <button onClick={() => act(p.id, { status: 'disabled' }, 'Participant disabled')}>Disable</button>
                        ) : (
                          <button onClick={() => act(p.id, { status: 'active' }, 'Participant enabled')}>Enable</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 grid gap-3 lg:hidden">
            {participants.map((p) => (
              <GlassCard key={p.id} className="p-4">
                <p className="font-heading">{p.fullName}</p>
                <p className="text-sm text-white/50">{p.mobile} · {p.email}</p>
                <p className="mt-2 text-sm">Spins {p.spins} · Entries {p.drawEntries} · Wins {p.totalWins}</p>
                <div className="mt-3 flex gap-2">
                  <SecondaryButton size="sm" onClick={() => { setCurrent(p); setSpins(p.spins) }}>View</SecondaryButton>
                </div>
              </GlassCard>
            ))}
          </div>
        </>
      )}
      <Modal open={!!current} onClose={() => setCurrent(null)} title={current?.fullName}>
        {current ? (
          <div className="space-y-4">
            <p className="text-sm text-white/55">{current.email} · {current.mobile}</p>
            <Field label="Adjust spins">
              <TextInput type="number" value={spins} onChange={(e) => setSpins(Number(e.target.value))} />
            </Field>
            <div className="flex flex-wrap gap-2">
              <PrimaryButton size="md" onClick={() => act(current.id, { spins }, 'Spins updated')}>Save spins</PrimaryButton>
              <SecondaryButton size="md" onClick={() => act(current.id, { drawEntries: current.drawEntries + 1 }, 'Draw entry added')}>
                Add draw entry
              </SecondaryButton>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
