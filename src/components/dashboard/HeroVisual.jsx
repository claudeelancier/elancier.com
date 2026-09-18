import { Gift, Coins } from 'lucide-react'
import { motion } from 'framer-motion'
import { PrizeWheel } from '../wheel/PrizeWheel'
import { prizes } from '../../data/mockData'

export function HeroWheelPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[540px]">
      <motion.div
        className="absolute top-6 left-2 hidden rounded-2xl border border-white/10 bg-[#10152B]/90 px-3 py-2 text-sm sm:flex"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Gift className="mr-2 text-[#FFD166]" size={16} /> Jackpot live
      </motion.div>
      <motion.div
        className="absolute top-24 right-0 hidden items-center gap-2 rounded-2xl border border-white/10 bg-[#10152B]/90 px-3 py-2 text-sm sm:flex"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Coins className="text-[#00D4FF]" size={16} /> ₹500 unlocked
      </motion.div>
      <div className="scale-[0.92]">
        <PrizeWheel prizes={prizes} rotation={18} spinning={false} />
      </div>
    </div>
  )
}
