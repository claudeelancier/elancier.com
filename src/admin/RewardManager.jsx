import { useEffect, useState } from 'react'
import { PageHeader } from '../components/common/PageHeader'
import { GlassCard } from '../components/common/GlassCard'
import { Badge } from '../components/common/Badge'
import { SecondaryButton } from '../components/common/Buttons'
import { EmptyState, TableSkeleton } from '../components/common/States'
import { useAdminStore } from '../store/adminStore'
import { api } from '../services/api'
import { useUiStore } from '../store/uiStore'

export default function RewardManager() {
  const { rewards, loadRewards } = useAdminStore()
  const pushToast = useUiStore((s) => s.pushToast)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    loadRewards().finally(() => setLoading(false))
  }, [loadRewards])

  const update = async (id, status) => {
    await api.updateReward(id, status)
    pushToast({ title: `Reward ${status}` })
    loadRewards()
  }

  return (
    <div>
      <PageHeader title="Reward claims" subtitle="Approve, mark claimed, or reject invalid claims." />
      {loading ? <TableSkeleton /> : !rewards.length ? <EmptyState title="No claims" body="Player rewards will list here." /> : (
        <div className="grid gap-3">
          {rewards.map((r) => (
            <GlassCard key={r.id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-heading">{r.prizeName}</p>
                  <p className="text-sm text-white/50">Won {r.wonDate} · Deadline {r.claimDeadline}</p>
                </div>
                <Badge tone={r.status === 'available' ? 'gold' : r.status === 'claimed' ? 'success' : r.status === 'expired' ? 'danger' : 'info'}>{r.status}</Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <SecondaryButton size="sm" onClick={() => update(r.id, 'processing')}>Approve</SecondaryButton>
                <SecondaryButton size="sm" onClick={() => update(r.id, 'claimed')}>Mark claimed</SecondaryButton>
                <button className="text-sm text-[#FF4757]" onClick={() => update(r.id, 'expired')}>Reject</button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  )
}
