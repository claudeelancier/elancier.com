import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { PrimaryButton, SecondaryButton } from '../common/Buttons'
import { Gift } from 'lucide-react'

export function PrizeReveal({ open, result, onClaim, onView, onClose }) {
  if (!result) return null
  const lose = result.prize_type === 'try_again'
  const mystery = result.prize_type === 'mystery' && !result.mysteryOpened
  const bonus = result.prize_type === 'bonus_spin'
  const jackpot = result.prize_type === 'jackpot'

  return (
    <AnimatePresence>
      {open ? (
        <motion.div className="fixed inset-0 z-[70] grid place-items-center px-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-[#080B1A]/78 backdrop-blur-sm" />
          <motion.div
            initial={{ scale: 0.86, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative w-full max-w-lg overflow-hidden rounded-[28px] border border-white/12 bg-[#10152B] p-8 text-center shadow-[0_30px_80px_rgba(0,0,0,0.45)]"
          >
            <div className={`absolute inset-x-12 top-0 h-32 blur-3xl ${lose ? 'bg-white/5' : jackpot ? 'bg-[#FFD166]/25' : 'bg-[#6C5CE7]/30'}`} />
            {mystery ? (
              <MysteryBox result={result} />
            ) : (
              <>
                <p className="text-xs font-semibold tracking-[0.24em] text-[#00D4FF] uppercase">
                  {lose ? 'Spin complete' : jackpot ? 'Jackpot unlocked' : 'Prize revealed'}
                </p>
                <h2 className="mt-3 font-heading text-3xl font-bold sm:text-4xl">
                  {lose ? 'BETTER LUCK NEXT TIME' : 'CONGRATULATIONS!'}
                </h2>
                {!lose ? (
                  <>
                    <p className="mt-3 text-white/55">YOU WON</p>
                    <p className={`mt-2 font-numeric text-5xl font-bold ${jackpot ? 'gold-text' : 'gradient-text'}`}>
                      {bonus ? '+1 BONUS SPIN' : result.mystery_reveal?.name || result.prize_name}
                    </p>
                  </>
                ) : (
                  <p className="mt-3 text-white/55">Keep your remaining spins ready. Fortune turns quickly.</p>
                )}
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  {!lose && !bonus ? (
                    <PrimaryButton className="flex-1" onClick={onClaim}>
                      CLAIM REWARD
                    </PrimaryButton>
                  ) : (
                    <PrimaryButton className="flex-1" onClick={onClose}>
                      CONTINUE
                    </PrimaryButton>
                  )}
                  <SecondaryButton className="flex-1" onClick={onView}>
                    VIEW MY REWARDS
                  </SecondaryButton>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

function MysteryBox({ result }) {
  const [opened, setOpened] = useState(false)
  const [shaking, setShaking] = useState(false)

  const open = () => {
    if (opened) return
    setShaking(true)
    setTimeout(() => {
      setShaking(false)
      setOpened(true)
      result.mysteryOpened = true
    }, 700)
  }

  return (
    <div>
      <p className="text-xs font-semibold tracking-[0.24em] text-[#F0ABFC] uppercase">Mystery gift</p>
      <h2 className="mt-3 font-heading text-3xl font-bold">{opened ? 'REVEALED' : 'TAP TO REVEAL'}</h2>
      <button
        className={`mx-auto mt-8 grid h-36 w-36 place-items-center rounded-[28px] border border-[#F0ABFC]/30 bg-[#3F2B66]/50 ${shaking ? 'animate-bounce' : ''}`}
        onClick={open}
        aria-label="Open mystery gift"
      >
        <Gift size={64} className="text-[#F0ABFC]" />
      </button>
      {opened ? (
        <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-6 font-numeric text-3xl font-bold gold-text">
          {result.mystery_reveal?.name}
        </motion.p>
      ) : (
        <p className="mt-6 text-white/50">The box holds a hidden reward. Tap to open the lid.</p>
      )}
    </div>
  )
}
