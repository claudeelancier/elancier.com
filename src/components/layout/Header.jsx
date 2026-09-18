import { NavLink, Link, useNavigate } from 'react-router-dom'
import { Bell, Menu, Volume2, VolumeX, X, LogOut, User, Gift } from 'lucide-react'
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuthStore } from '../../store/authStore'
import { useUiStore } from '../../store/uiStore'
import { Avatar } from '../common/Badge'
import { unlockAudio } from '../../utils/sound'
import { sounds } from '../../utils/sound'

const links = [
  { to: '/', label: 'Home' },
  { to: '/spin', label: 'Spin & Win' },
  { to: '/lucky-draw', label: 'Lucky Draw' },
  { to: '/winners', label: 'Winners' },
  { to: '/rewards', label: 'My Rewards', auth: true },
]

export function Header() {
  const user = useAuthStore((s) => s.user)
  const role = useAuthStore((s) => s.role)
  const logout = useAuthStore((s) => s.logout)
  const soundEnabled = useUiStore((s) => s.soundEnabled)
  const toggleSound = useUiStore((s) => s.toggleSound)
  const notifications = useUiStore((s) => s.notifications)
  const [open, setOpen] = useState(false)
  const [menu, setMenu] = useState(false)
  const [notes, setNotes] = useState(false)
  const navigate = useNavigate()

  const visible = links.filter((link) => !link.auth || user)

  const playClick = () => {
    if (soundEnabled) {
      unlockAudio()
      sounds.click()
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/8 bg-[#080B1A]/72 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2" onClick={playClick}>
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#6C5CE7] to-[#00D4FF] font-heading text-sm font-bold">
            LV
          </span>
          <span className="font-heading text-lg font-bold tracking-wide">LUCKYVERSE</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          {visible.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={playClick}
              className={({ isActive }) =>
                `rounded-full px-4 py-2 text-sm font-medium transition ${isActive ? 'bg-white/8 text-white' : 'text-white/60 hover:text-white'}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            className="grid h-10 w-10 place-items-center rounded-full text-white/70 hover:bg-white/8"
            aria-label={soundEnabled ? 'Disable sound' : 'Enable sound'}
            onClick={() => {
              unlockAudio()
              toggleSound()
            }}
          >
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>

          {user && role !== 'admin' ? (
            <>
              <div className="relative">
                <button
                  className="grid h-10 w-10 place-items-center rounded-full text-white/70 hover:bg-white/8"
                  aria-label="Notifications"
                  onClick={() => setNotes((v) => !v)}
                >
                  <Bell size={18} />
                </button>
                {notes ? (
                  <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-white/10 bg-[#10152B] p-3 shadow-2xl">
                    {notifications.map((item) => (
                      <p key={item.id} className="rounded-xl px-3 py-2 text-sm text-white/80 hover:bg-white/5">
                        {item.title}
                        <span className="ml-2 text-xs text-white/35">{item.time}</span>
                      </p>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="relative hidden sm:block">
                <button className="flex items-center gap-2 rounded-full py-1 pr-3 pl-1 hover:bg-white/6" onClick={() => setMenu((v) => !v)}>
                  <Avatar name={user.fullName || user.name} hue={user.avatarHue} size={32} />
                  <span className="text-sm font-medium">{user.name}</span>
                </button>
                {menu ? (
                  <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-white/10 bg-[#10152B] p-2 shadow-2xl">
                    <button className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-white/6" onClick={() => navigate('/profile')}>
                      <User size={16} /> Profile
                    </button>
                    <button className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-white/6" onClick={() => navigate('/rewards')}>
                      <Gift size={16} /> Rewards
                    </button>
                    <button
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-[#FF4757] hover:bg-white/6"
                      onClick={() => {
                        logout()
                        navigate('/')
                      }}
                    >
                      <LogOut size={16} /> Logout
                    </button>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link to="/login" className="rounded-full px-4 py-2 text-sm font-medium text-white/80 hover:text-white">
                Login
              </Link>
              <Link to="/register" className="cta-gradient rounded-full px-4 py-2 text-sm font-semibold">
                Create Account
              </Link>
            </div>
          )}

          <button className="grid h-10 w-10 place-items-center rounded-full lg:hidden" aria-label="Open menu" onClick={() => setOpen(true)}>
            <Menu size={20} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div className="fixed inset-0 z-50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} aria-label="Close menu" />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="absolute top-0 right-0 h-full w-[min(88vw,340px)] border-l border-white/10 bg-[#10152B] p-5"
            >
              <div className="mb-6 flex items-center justify-between">
                <span className="font-heading font-bold">Menu</span>
                <button onClick={() => setOpen(false)} aria-label="Close">
                  <X />
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {visible.map((link) => (
                  <NavLink key={link.to} to={link.to} onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 text-white/80 hover:bg-white/6">
                    {link.label}
                  </NavLink>
                ))}
                {user ? (
                  <>
                    <NavLink to="/dashboard" onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 hover:bg-white/6">
                      Dashboard
                    </NavLink>
                    <NavLink to="/profile" onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 hover:bg-white/6">
                      Profile
                    </NavLink>
                    <button
                      className="rounded-xl px-3 py-3 text-left text-[#FF4757]"
                      onClick={() => {
                        logout()
                        setOpen(false)
                        navigate('/')
                      }}
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <NavLink to="/login" onClick={() => setOpen(false)} className="rounded-xl px-3 py-3">
                      Login
                    </NavLink>
                    <NavLink to="/register" onClick={() => setOpen(false)} className="cta-gradient rounded-xl px-3 py-3 text-center font-semibold">
                      Create Account
                    </NavLink>
                  </>
                )}
              </div>
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  )
}
