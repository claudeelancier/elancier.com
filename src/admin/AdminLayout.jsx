import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, Gift, RotateCw, Ticket, Trophy, BarChart3, Settings, ScrollText, LogOut, Menu, X, Wallet } from 'lucide-react'
import { useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { ToastViewport } from '../components/common/Toast'

const nav = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/participants', label: 'Participants', icon: Users },
  { to: '/admin/prizes', label: 'Prizes', icon: Gift },
  { to: '/admin/spin-settings', label: 'Spin Manager', icon: RotateCw },
  { to: '/admin/lucky-draws', label: 'Lucky Draw', icon: Ticket },
  { to: '/admin/winners', label: 'Winners', icon: Trophy },
  { to: '/admin/rewards', label: 'Rewards', icon: Wallet },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/admin/logs', label: 'Activity Logs', icon: ScrollText },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
]

export function AdminLayout() {
  const [open, setOpen] = useState(false)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="px-5 py-6">
        <p className="font-heading text-sm tracking-[0.18em] text-white/40">LUCKYVERSE</p>
        <p className="font-heading text-lg font-bold">Admin Console</p>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${isActive ? 'bg-white/10 text-white' : 'text-white/55 hover:bg-white/5 hover:text-white'}`
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <button
        className="m-4 flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-[#FF4757] hover:bg-white/5"
        onClick={() => {
          logout()
          navigate('/admin/login')
        }}
      >
        <LogOut size={16} /> Logout
      </button>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#080B1A] text-white">
      <div className="flex">
        <aside className="hidden min-h-screen w-64 border-r border-white/8 bg-[#0C1022] lg:block">{sidebar}</aside>
        <div className="min-w-0 flex-1">
          <header className="flex h-16 items-center justify-between border-b border-white/8 px-4 lg:px-8">
            <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open admin menu">
              <Menu />
            </button>
            <p className="text-sm text-white/50">SaaS control centre</p>
          </header>
          <div className="p-4 lg:p-8">
            <Outlet />
          </div>
        </div>
      </div>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} aria-label="Close" />
          <aside className="absolute top-0 left-0 h-full w-72 bg-[#0C1022]">
            <button className="absolute top-4 right-4" onClick={() => setOpen(false)} aria-label="Close sidebar">
              <X />
            </button>
            {sidebar}
          </aside>
        </div>
      ) : null}
      <ToastViewport />
    </div>
  )
}
