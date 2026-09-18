import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'

export function Modal({ open, onClose, title, children, wide }) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[80] grid place-items-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button className="absolute inset-0 bg-black/65 backdrop-blur-sm" aria-label="Close dialog" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            initial={{ y: 24, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 16, opacity: 0 }}
            className={`glass-card relative w-full ${wide ? 'max-w-2xl' : 'max-w-md'} rounded-[28px] p-6`}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <h2 id="modal-title" className="font-heading text-xl font-semibold">
                {title}
              </h2>
              <button className="rounded-full p-1 text-white/60 hover:bg-white/10 hover:text-white" onClick={onClose} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
