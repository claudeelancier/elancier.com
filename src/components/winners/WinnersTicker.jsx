import { motion } from 'framer-motion'

export function WinnersTicker({ items = [] }) {
  const doubled = [...items, ...items]
  return (
    <div className="overflow-hidden rounded-full border border-white/10 bg-white/5 py-2">
      <motion.div
        className="flex w-max gap-8 px-4 text-sm text-white/70"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
      >
        {doubled.map((item, i) => (
          <span key={`${item}-${i}`} className="whitespace-nowrap">
            {item}
          </span>
        ))}
      </motion.div>
    </div>
  )
}
