import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/common/PageHeader'
import { StatCard, GlassCard } from '../components/common/GlassCard'
import { Badge } from '../components/common/Badge'
import { PrimaryButton, SecondaryButton } from '../components/common/Buttons'
import { EmptyState, PrizeSkeleton } from '../components/common/States'
import { useGameStore } from '../store/gameStore'
import { api } from '../services/api'
import { useUiStore } from '../store/uiStore'
import { formatCurrency } from '../utils/format'
import { errorCopy, AppErrorCodes } from '../utils/errors'

const toneMap = {
  available: 'gold',
  claimed: 'success',
  processing: 'info',
  expired: 'danger',
}

export default function Rewards() {
  const { rewards, loadRewards, history, loadHistory } = useGameStore()
  const pushToast = useUiStore((s) => s.pushToast)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([loadRewards(), loadHistory()]).finally(() => setLoading(false))
  }, [loadRewards, loadHistory])

  const summary = useMemo(() => {
    const total = rewards.reduce((sum, r) => sum + (r.value || 0), 0)
    return {
      total,
      available: rewards.filter((r) => r.status === 'available').length,
      claimed: rewards.filter((r) => r.status === 'claimed').length,
      expired: rewards.filter((r) => r.status === 'expired').length,
    }
  }, [rewards])

  const claim = async (id) => {
    try {
      await api.claimReward(id)
      pushToast({ title: 'Claim started', body: 'Your reward is now processing.' })
      loadRewards()
    } catch (error) {
      const copy = error.code === AppErrorCodes.REWARD_EXPIRED ? errorCopy(error) : errorCopy(error)
      pushToast({ title: copy.title, body: copy.body })
    }
  }

  if (loading) return <PrizeSkeleton />

  return (
    <div>
      <PageHeader title="My Rewards" subtitle="Track available, claimed, processing, and expired prizes." />
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total won" value={formatCurrency(summary.total)} gold />
        <StatCard label="Available" value={summary.available} />
        <StatCard label="Claimed" value={summary.claimed} />
        <StatCard label="Expired" value={summary.expired} />
      </div>

      <div className="mt-8">
        {!rewards.length ? (
          <EmptyState
            title="No Rewards Yet"
            body="Your rewards will appear here after you start winning."
            action={<PrimaryButton onClick={() => navigate('/spin')}>SPIN NOW</PrimaryButton>}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {rewards.map((reward) => (
              <GlassCard key={reward.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-heading text-lg">{reward.prizeName}</h3>
                    <p className="mt-1 text-sm text-white/50">Won {reward.wonDate} · Claim by {reward.claimDeadline}</p>
                  </div>
                  <Badge tone={toneMap[reward.status] || 'muted'}>{reward.status}</Badge>
                </div>
                {reward.status === 'available' ? (
                  <PrimaryButton className="mt-4" size="md" onClick={() => claim(reward.id)}>
                    Claim
                  </PrimaryButton>
                ) : null}
              </GlassCard>
            ))}
          </div>
        )}
      </div>

      <h2 className="mt-12 font-heading text-2xl">Game history</h2>
      {!history.length ? (
        <EmptyState className="mt-4" title="No history yet" body="Completed spins and draws will show here." />
      ) : (
        <>
          <div className="mt-4 hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="text-white/45">
                <tr>
                  {['Date', 'Game', 'Result', 'Prize', 'Status'].map((h) => (
                    <th key={h} className="border-b border-white/8 px-3 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((row) => (
                  <tr key={row.id} className="border-b border-white/6">
                    <td className="px-3 py-3">{row.date}</td>
                    <td className="px-3 py-3">{row.game}</td>
                    <td className="px-3 py-3">{row.result}</td>
                    <td className="px-3 py-3">{row.prize}</td>
                    <td className="px-3 py-3">{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 grid gap-3 md:hidden">
            {history.map((row) => (
              <GlassCard key={row.id} className="p-4">
                <p className="font-medium">{row.prize}</p>
                <p className="text-sm text-white/50">{row.date} · {row.game}</p>
                <p className="mt-1 text-sm">{row.result} · {row.status}</p>
              </GlassCard>
            ))}
          </div>
        </>
      )}
      <div className="mt-8">
        <SecondaryButton onClick={() => navigate('/spin')}>Back to Spin Arena</SecondaryButton>
      </div>
    </div>
  )
}
