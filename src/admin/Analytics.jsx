import { useEffect } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Line, LineChart } from 'recharts'
import { PageHeader } from '../components/common/PageHeader'
import { GlassCard, StatCard } from '../components/common/GlassCard'
import { useAdminStore } from '../store/adminStore'
import { TableSkeleton } from '../components/common/States'

export default function Analytics() {
  const { overview, loadOverview, loading } = useAdminStore()
  useEffect(() => {
    loadOverview()
  }, [loadOverview])
  if (loading || !overview) return <TableSkeleton />
  const { charts } = overview

  return (
    <div>
      <PageHeader title="Analytics" subtitle="Mock KPIs ready to bind to Laravel reporting endpoints." />
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Win percentage" value="41%" />
        <StatCard label="Claim percentage" value="68%" />
        <StatCard label="Most won prize" value="₹100" />
        <StatCard label="Draw participation" value="1,248" />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <GlassCard className="p-5">
          <h3 className="mb-4 font-heading">Spins per day</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={charts.spinsPerDay}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="day" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ background: '#10152B' }} />
                <Bar dataKey="spins" fill="#6C5CE7" radius={8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
        <GlassCard className="p-5">
          <h3 className="mb-4 font-heading">Players per day</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={charts.playersPerDay}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="day" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ background: '#10152B' }} />
                <Line dataKey="players" stroke="#00D4FF" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
