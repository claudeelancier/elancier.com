import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShieldCheck, Zap, Gift, Trophy, UserPlus, Coins, RotateCw, BadgeCheck } from 'lucide-react'
import { PrimaryButton, SecondaryButton } from '../components/common/Buttons'
import { GlassCard } from '../components/common/GlassCard'
import { SectionTitle } from '../components/common/PageHeader'
import { HeroWheelPreview } from '../components/dashboard/HeroVisual'
import { WinnersTicker } from '../components/winners/WinnersTicker'
import { prizes, liveTicker, publicWinners } from '../data/mockData'
import { useAuthStore } from '../store/authStore'

const steps = [
  { icon: UserPlus, title: 'Create Account', body: 'Register with your mobile number and verify in seconds.' },
  { icon: Coins, title: 'Get Your Spins', body: 'Verified players receive daily spins and lucky draw entries.' },
  { icon: RotateCw, title: 'Spin The Wheel', body: 'Results are selected on the server, then the wheel lands with precision.' },
  { icon: BadgeCheck, title: 'Claim Rewards', body: 'Winning prizes appear in My Rewards with a clear claim window.' },
]

const why = [
  { icon: ShieldCheck, title: 'Fair Draw', body: 'Weighted odds and inventory checks happen on the backend, never in the browser.' },
  { icon: Zap, title: 'Instant Results', body: 'Spin animation completes in five seconds with an exact prize landing.' },
  { icon: Gift, title: 'Real Rewards', body: 'Cash, vouchers, mystery gifts, and a limited daily jackpot.' },
  { icon: Trophy, title: 'Secure System', body: 'Sanctum-ready auth, rate limits, and duplicate-spin protection.' },
]

export default function Home() {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const start = () => navigate(user ? '/spin' : '/register')

  return (
    <div className="space-y-20">
      <section className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <p className="text-xs font-semibold tracking-[0.28em] text-[#00D4FF] uppercase">Luckyverse</p>
          <h1 className="mt-4 font-heading text-4xl leading-[1.05] font-extrabold sm:text-6xl">YOUR LUCK STARTS HERE</h1>
          <p className="mt-5 max-w-xl text-lg text-white/65">
            Spin the wheel, unlock exciting rewards, and discover what fortune has waiting for you.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <PrimaryButton onClick={start}>START SPINNING</PrimaryButton>
            <SecondaryButton onClick={() => navigate('/winners')}>VIEW WINNERS</SecondaryButton>
          </div>
          <div className="mt-10 grid grid-cols-3 gap-3">
            {[
              ['10,000+', 'Players'],
              ['750+', 'Winners'],
              ['Daily', 'Rewards'],
            ].map(([n, l]) => (
              <div key={l} className="rounded-2xl border border-white/10 bg-white/4 px-3 py-4">
                <p className="font-numeric text-xl font-semibold sm:text-2xl">{n}</p>
                <p className="text-xs text-white/45 sm:text-sm">{l}</p>
              </div>
            ))}
          </div>
        </div>
        <HeroWheelPreview />
      </section>

      <WinnersTicker items={liveTicker} />

      <section>
        <SectionTitle title="How it works" subtitle="Four steps from signup to a claimed reward." />
        <div className="grid gap-4 md:grid-cols-4">
          {steps.map((step, i) => (
            <GlassCard key={step.title} className="p-5">
              <span className="text-xs font-semibold tracking-widest text-[#00D4FF]">STEP {i + 1}</span>
              <step.icon className="mt-4 text-[#6C5CE7]" />
              <h3 className="mt-3 font-heading text-lg">{step.title}</h3>
              <p className="mt-2 text-sm text-white/55">{step.body}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle title="Featured rewards" subtitle="A curated prize mix with a limited jackpot." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {prizes.filter((p) => p.type !== 'try_again').slice(0, 4).map((prize) => (
            <GlassCard key={prize.id} className="p-5">
              <p className={`font-numeric text-2xl font-bold ${prize.type === 'jackpot' ? 'gold-text' : 'text-white'}`}>{prize.shortLabel}</p>
              <h3 className="mt-2 font-heading">{prize.name}</h3>
              <p className="mt-2 text-sm text-white/55">{prize.description}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle title="Live winners" subtitle="Recent verified results from Spin & Win and Lucky Draw." />
        <div className="grid gap-4 md:grid-cols-3">
          {publicWinners.slice(0, 3).map((w) => (
            <GlassCard key={w.id} className="p-5">
              <p className="font-heading text-lg">{w.name.split(' ')[0]} won {w.prize}</p>
              <p className="mt-1 text-sm text-white/45">{w.game} · {w.date}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle title="Why play" />
        <div className="grid gap-4 md:grid-cols-4">
          {why.map((item) => (
            <GlassCard key={item.title} className="p-5">
              <item.icon className="text-[#00D4FF]" />
              <h3 className="mt-3 font-heading text-lg">{item.title}</h3>
              <p className="mt-2 text-sm text-white/55">{item.body}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-[#6C5CE7]/25 to-[#00D4FF]/10 p-8 sm:p-12"
      >
        <h2 className="font-heading text-3xl font-bold sm:text-4xl">Ready for your next spin?</h2>
        <p className="mt-3 max-w-xl text-white/65">Create a verified account, collect daily spins, and join tonight’s Mega Friday Draw.</p>
        <div className="mt-6">
          <Link to={user ? '/dashboard' : '/register'}>
            <PrimaryButton>Play Luckyverse</PrimaryButton>
          </Link>
        </div>
      </motion.section>
    </div>
  )
}
