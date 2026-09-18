import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/common/PageHeader'
import { GlassCard, StatCard } from '../components/common/GlassCard'
import { Avatar } from '../components/common/Badge'
import { PrimaryButton, SecondaryButton } from '../components/common/Buttons'
import { Field, PasswordInput, TextInput } from '../components/common/Field'
import { Modal } from '../components/common/Modal'
import { useAuthStore } from '../store/authStore'
import { api } from '../services/api'
import { validatePasswordChange, validateProfile } from '../utils/validation'
import { formatDate } from '../utils/format'
import { useUiStore } from '../store/uiStore'

export default function Profile() {
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const logout = useAuthStore((s) => s.logout)
  const pushToast = useUiStore((s) => s.pushToast)
  const navigate = useNavigate()
  const [edit, setEdit] = useState(false)
  const [pw, setPw] = useState(false)
  const [form, setForm] = useState({ fullName: user?.fullName, email: user?.email, mobile: user?.mobile })
  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [errors, setErrors] = useState({})

  const save = async () => {
    const next = validateProfile(form)
    setErrors(next)
    if (Object.keys(next).length) return
    const updated = await api.updateProfile(form)
    setUser(updated)
    setEdit(false)
    pushToast({ title: 'Profile updated' })
  }

  const changePw = () => {
    const next = validatePasswordChange(pwd)
    setErrors(next)
    if (Object.keys(next).length) return
    setPw(false)
    pushToast({ title: 'Password updated', body: 'Use your new password next time you sign in.' })
  }

  return (
    <div>
      <PageHeader title="Profile" subtitle="Manage your Luckyverse identity and security." />
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <GlassCard className="p-6">
          <div className="flex items-center gap-4">
            <Avatar name={user?.fullName} hue={user?.avatarHue} size={72} />
            <div>
              <h2 className="font-heading text-2xl">{user?.fullName}</h2>
              <p className="text-white/50">{user?.participantId}</p>
            </div>
          </div>
          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <Item label="Mobile" value={user?.mobile} />
            <Item label="Email" value={user?.email} />
            <Item label="Joined" value={formatDate(user?.joinedAt)} />
            <Item label="Status" value={user?.verified ? 'Verified' : 'Pending'} />
          </dl>
          <div className="mt-6 flex flex-wrap gap-3">
            <PrimaryButton size="md" onClick={() => setEdit(true)}>Edit Profile</PrimaryButton>
            <SecondaryButton size="md" onClick={() => setPw(true)}>Change Password</SecondaryButton>
            <SecondaryButton
              size="md"
              onClick={() => {
                logout()
                navigate('/')
              }}
            >
              Logout
            </SecondaryButton>
          </div>
        </GlassCard>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <StatCard label="Total spins" value={user?.totalSpins ?? 0} />
          <StatCard label="Total wins" value={user?.totalWins ?? 0} gold />
          <StatCard label="Rewards claimed" value={user?.rewardsClaimed ?? 0} />
        </div>
      </div>

      <Modal open={edit} onClose={() => setEdit(false)} title="Edit profile">
        <div className="space-y-4">
          <Field label="Full name" error={errors.fullName}>
            <TextInput value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </Field>
          <Field label="Email" error={errors.email}>
            <TextInput value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Mobile" error={errors.mobile}>
            <TextInput value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
          </Field>
          <PrimaryButton className="w-full" onClick={save}>Save</PrimaryButton>
        </div>
      </Modal>
      <Modal open={pw} onClose={() => setPw(false)} title="Change password">
        <div className="space-y-4">
          <Field label="Current password" error={errors.currentPassword}>
            <PasswordInput value={pwd.currentPassword} onChange={(e) => setPwd({ ...pwd, currentPassword: e.target.value })} />
          </Field>
          <Field label="New password" error={errors.newPassword}>
            <PasswordInput value={pwd.newPassword} onChange={(e) => setPwd({ ...pwd, newPassword: e.target.value })} />
          </Field>
          <Field label="Confirm" error={errors.confirmPassword}>
            <PasswordInput value={pwd.confirmPassword} onChange={(e) => setPwd({ ...pwd, confirmPassword: e.target.value })} />
          </Field>
          <PrimaryButton className="w-full" onClick={changePw}>Update password</PrimaryButton>
        </div>
      </Modal>
    </div>
  )
}

function Item({ label, value }) {
  return (
    <div>
      <dt className="text-sm text-white/45">{label}</dt>
      <dd className="mt-1">{value}</dd>
    </div>
  )
}
