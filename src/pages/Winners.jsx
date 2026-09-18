import { useEffect, useState } from 'react'
import { PageHeader } from '../components/common/PageHeader'
import { GlassCard } from '../components/common/GlassCard'
import { Avatar, Badge } from '../components/common/Badge'
import { EmptyState, PrizeSkeleton } from '../components/common/States'
import { WinnersTicker } from '../components/winners/WinnersTicker'
import { liveTicker } from '../data/mockData'
import { useGameStore } from '../store/gameStore'

const filters = [
  { id: 'all', label: 'All' },
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'big', label: 'Big Winners' },
]

export default function Winners() {
  const { winners, loadWinners } = useGameStore()
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    loadWinners(filter).finally(() => setLoading(false))
  }, [filter, loadWinners])

  const featured = winners[0]

  return (
    <div>
      <PageHeader eyebrow="Public board" title="Hall of Winners" subtitle="Celebrating verified Spin & Win and Lucky Draw results." />
      <WinnersTicker items={liveTicker} />
      <div className="mt-6 flex flex-wrap gap-2">
        {filters.map((item) => (
          <button
            key={item.id}
            onClick={() => setFilter(item.id)}
            className={`rounded-full px-4 py-2 text-sm ${filter === item.id ? 'cta-gradient' : 'bg-white/6'}`}
          >
            {item.label}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="mt-8">
          <PrizeSkeleton />
        </div>
      ) : !winners.length ? (
        <div className="mt-8">
          <EmptyState title="No winners in this view" body="Try another filter or check back after the next draw." />
        </div>
      ) : (
        <>
          {featured ? (
            <GlassCard className="mt-8 overflow-hidden p-6 sm:p-8">
              <p className="text-xs tracking-[0.24em] text-[#FFD166] uppercase">Featured winner</p>
              <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
                <Avatar name={featured.name} hue={featured.avatarHue} size={72} />
                <div>
                  <h2 className="font-heading text-3xl">{featured.name}</h2>
                  <p className="gold-text mt-1 font-numeric text-4xl font-bold">{featured.prize}</p>
                  <p className="mt-2 text-white/50">{featured.game} · {featured.date}</p>
                </div>
              </div>
            </GlassCard>
          ) : null}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {winners.slice(1).map((winner) => (
              <GlassCard key={winner.id} className="p-5">
                <div className="flex items-center gap-3">
                  <Avatar name={winner.name} hue={winner.avatarHue} />
                  <div>
                    <p className="font-heading">{winner.name}</p>
                    <p className="text-sm text-white/45">{winner.date}</p>
                  </div>
                </div>
                <p className="mt-4 font-numeric text-2xl font-semibold">{winner.prize}</p>
                <div className="mt-3">
                  <Badge tone="info">{winner.game}</Badge>
                </div>
              </GlassCard>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
