import { useEffect } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell } from 'recharts'
import { PageHeader } from '../components/common/PageHeader'
import { StatCard, GlassCard } from '../components/common/GlassCard'
import { TableSkeleton } from '../components/common/States'
import { useAdminStore } from '../store/adminStore'

const COLORS = ['#6C5CE7', '#00D4FF', '#FFD166', '#2ED573', '#F0ABFC', '#94A3B8', '#FF4757']

export default function AdminDashboard() {
  const { overview, loadOverview, loading } = useAdminStore()
  useEffect(() => {
    loadOverview()
  }, [loadOverview])

  if (loading || !overview) return <TableSkeleton />
  const c = overview.cards
  const charts = overview.charts

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Live mock metrics for the promotional platform." />
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total participants" value={c.participants} />
        <StatCard label="Today's spins" value={c.todaySpins} />
        <StatCard label="Total winners" value={c.winners} gold />
        <StatCard label="Active prizes" value={c.activePrizes} />
        <StatCard label="Prize inventory" value={c.inventory} />
        <StatCard label="Pending claims" value={c.pendingClaims} />
      </div>
      <div className="mt-8 grid gap-4 xl:grid-cols-3">
        <GlassCard className="p-5 xl:col-span-2">
          <h3 className="mb-4 font-heading">Daily spins</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={charts.spinsPerDay}>
                <defs>
                  <linearGradient id="spins" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6C5CE7" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#6C5CE7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="day" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ background: '#10152B', border: '1px solid rgba(255,255,255,0.1)' }} />
                <Area dataKey="spins" stroke="#00D4FF" fill="url(#spins)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
        <GlassCard className="p-5">
          <h3 className="mb-4 font-heading">Prize distribution</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={charts.prizeDistribution} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                  {charts.prizeDistribution.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#10152B', border: '1px solid rgba(255,255,255,0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>
      <GlassCard className="mt-4 p-5">
        <h3 className="mb-4 font-heading">Participant growth</h3>
        <div className="h-56">
          <ResponsiveContainer>
            <AreaChart data={charts.playersPerDay}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="day" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ background: '#10152B', border: '1px solid rgba(255,255,255,0.1)' }} />
              <Area dataKey="players" stroke="#FFD166" fill="#FFD16633" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>
    </div>
  )
}
