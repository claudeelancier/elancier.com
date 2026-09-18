import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Gift, RotateCw, Trophy, Ticket } from 'lucide-react'
import { PageHeader } from '../components/common/PageHeader'
import { StatCard, GlassCard } from '../components/common/GlassCard'
import { PrimaryButton } from '../components/common/Buttons'
import { DashboardSkeleton, ErrorState } from '../components/common/States'
import { WinnersTicker } from '../components/winners/WinnersTicker'
import { useAuthStore } from '../store/authStore'
import { useGameStore } from '../store/gameStore'
import { formatCurrency } from '../utils/format'
import { useCountdown } from '../hooks/useUi'
import { errorCopy } from '../utils/errors'

export default function Dashboard() {
  const user = useAuthStore((s) => s.user)
  const loadDashboard = useGameStore((s) => s.loadDashboard)
  const dashboard = useGameStore((s) => s.dashboard)
  const navigate = useNavigate()
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const count = useCountdown(dashboard?.upcomingDraw?.startAt)

  useEffect(() => {
    loadDashboard()
      .catch((err) => setError(err))
      .finally(() => setLoading(false))
  }, [loadDashboard])

  if (loading) return <DashboardSkeleton />
  if (error) {
    const copy = errorCopy(error)
    return <ErrorState title={copy.title} body={copy.body} onRetry={() => window.location.reload()} />
  }

  const stats = {
    spins: user?.spins ?? dashboard?.stats?.spins ?? 0,
    totalRewards: user?.totalRewardsValue ?? dashboard?.stats?.totalRewards ?? 0,
    totalWins: user?.totalWins ?? dashboard?.stats?.totalWins ?? 0,
    drawEntries: user?.drawEntries ?? dashboard?.stats?.drawEntries ?? 0,
  }

  return (
    <div>
      <PageHeader
        eyebrow="Player dashboard"
        title={`Welcome back, ${user?.name || 'Player'} 👋`}
        subtitle="Your spins, rewards, and upcoming lucky draw in one place."
        actions={<PrimaryButton onClick={() => navigate('/spin')}>PLAY NOW</PrimaryButton>}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Available Spins" value={stats.spins} icon={RotateCw} hint="Resets daily for verified players" />
        <StatCard label="Rewards Won" value={formatCurrency(stats.totalRewards)} icon={Gift} gold />
        <StatCard label="Winning Spins" value={stats.totalWins} icon={Trophy} />
        <StatCard label="Lucky Draw Entries" value={stats.drawEntries} icon={Ticket} />
      </div>

      <div className="mt-6">
        <WinnersTicker items={dashboard?.ticker || []} />
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <GlassCard className="p-6 lg:col-span-2">
          <h2 className="font-heading text-xl">Recent activity</h2>
          <ul className="mt-4 space-y-3">
            {(dashboard?.activity || []).map((item) => (
              <li key={item.id} className="flex items-center justify-between rounded-2xl bg-white/4 px-4 py-3">
                <span>{item.title}</span>
                <span className="text-sm text-white/40">{item.time}</span>
              </li>
            ))}
          </ul>
        </GlassCard>
        <GlassCard className="p-6">
          <h2 className="font-heading text-xl">Upcoming lucky draw</h2>
          <p className="mt-3 text-2xl font-semibold">{dashboard?.upcomingDraw?.name}</p>
          <p className="gold-text mt-1 font-numeric text-3xl">{dashboard?.upcomingDraw?.prize}</p>
          <p className="mt-4 font-numeric text-2xl">
            {count.h} : {count.m} : {count.s}
          </p>
          <p className="mt-2 text-sm text-white/45">{dashboard?.upcomingDraw?.participants} participants</p>
          <PrimaryButton className="mt-5 w-full" size="md" onClick={() => navigate('/lucky-draw')}>
            View draw
          </PrimaryButton>
        </GlassCard>
      </div>

      <GlassCard className="mt-4 p-6">
        <h2 className="font-heading text-xl">My latest rewards</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {(dashboard?.latestRewards || []).map((reward) => (
            <div key={reward.id} className="rounded-2xl border border-white/8 bg-white/4 p-4">
              <p className="font-medium">{reward.prizeName}</p>
              <p className="mt-1 text-sm text-white/45 capitalize">{reward.status} · {reward.wonDate}</p>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  )
}
