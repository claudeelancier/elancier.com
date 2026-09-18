import { useEffect, useState } from 'react'
import { PageHeader } from '../components/common/PageHeader'
import { GlassCard } from '../components/common/GlassCard'
import { Badge } from '../components/common/Badge'
import { EmptyState, TableSkeleton } from '../components/common/States'
import { useAdminStore } from '../store/adminStore'

export default function WinnerManager() {
  const { winners, loadWinners } = useAdminStore()
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    loadWinners().finally(() => setLoading(false))
  }, [loadWinners])

  return (
    <div>
      <PageHeader title="Winners" subtitle="Public results mirrored from Spin & Win and Lucky Draw." />
      {loading ? (
        <TableSkeleton />
      ) : !winners.length ? (
        <EmptyState title="No winners yet" body="Published results will appear here." />
      ) : (
        <div className="grid gap-3">
          {winners.map((w) => (
            <GlassCard key={w.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-heading">{w.name}</p>
                <p className="text-sm text-white/50">{w.game} · {w.date}</p>
              </div>
              <div className="flex items-center gap-3">
                <p className="font-numeric text-xl">{w.prize}</p>
                <Badge tone="gold">Winner</Badge>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  )
}
