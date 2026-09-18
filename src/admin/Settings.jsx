import { useEffect, useState } from 'react'
import { PageHeader } from '../components/common/PageHeader'
import { GlassCard } from '../components/common/GlassCard'
import { Field, TextInput } from '../components/common/Field'
import { PrimaryButton } from '../components/common/Buttons'
import { TableSkeleton } from '../components/common/States'
import { useAdminStore } from '../store/adminStore'
import { api } from '../services/api'
import { useUiStore } from '../store/uiStore'
import { formatDateTime } from '../utils/format'

export default function Settings() {
  const { settings, loadSettings } = useAdminStore()
  const pushToast = useUiStore((s) => s.pushToast)
  const [form, setForm] = useState(null)

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  useEffect(() => {
    if (settings?.app) setForm(settings.app)
  }, [settings])

  if (!form) return <TableSkeleton />

  return (
    <div>
      <PageHeader title="Settings" />
      <GlassCard className="grid gap-4 p-6 sm:grid-cols-2">
        <Field label="Application name">
          <TextInput value={form.applicationName} onChange={(e) => setForm({ ...form, applicationName: e.target.value })} />
        </Field>
        <Field label="Logo text">
          <TextInput value={form.logoText} onChange={(e) => setForm({ ...form, logoText: e.target.value })} />
        </Field>
        <Field label="Theme">
          <TextInput value={form.theme} onChange={(e) => setForm({ ...form, theme: e.target.value })} />
        </Field>
        <Field label="Support email">
          <TextInput value={form.supportEmail} onChange={(e) => setForm({ ...form, supportEmail: e.target.value })} />
        </Field>
        <Field label="Default spin limit">
          <TextInput type="number" value={form.defaultSpinLimit} onChange={(e) => setForm({ ...form, defaultSpinLimit: Number(e.target.value) })} />
        </Field>
        {[
          ['spinEnabled', 'Enable Spin Game'],
          ['luckyDrawEnabled', 'Enable Lucky Draw'],
          ['maintenanceMode', 'Maintenance mode'],
          ['confettiEnabled', 'Confetti'],
          ['soundEnabled', 'Sound'],
        ].map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} />
            {label}
          </label>
        ))}
        <div className="sm:col-span-2">
          <PrimaryButton
            onClick={async () => {
              await api.saveSettings(form)
              pushToast({ title: 'Settings saved' })
            }}
          >
            Save settings
          </PrimaryButton>
        </div>
      </GlassCard>
    </div>
  )
}

export function ActivityLogs() {
  const { settings, loadSettings } = useAdminStore()
  useEffect(() => {
    loadSettings()
  }, [loadSettings])
  const logs = settings?.logs || []
  return (
    <div>
      <PageHeader title="Activity logs" subtitle="Admin actions stored for Laravel activity_logs." />
      <div className="space-y-2">
        {logs.map((log) => (
          <GlassCard key={log.id} className="p-4 text-sm">
            <p>{log.admin} · {log.action}</p>
            <p className="text-white/45">{log.entity} {log.entityId} · {formatDateTime(log.createdAt)}</p>
          </GlassCard>
        ))}
      </div>
    </div>
  )
}
