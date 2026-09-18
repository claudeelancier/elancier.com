import { AnimatePresence, motion } from 'framer-motion'
import { useUiStore } from '../../store/uiStore'

export function ToastViewport() {
  const toasts = useUiStore((s) => s.toasts)
  const dismissToast = useUiStore((s) => s.dismissToast)

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-[90] flex w-[min(92vw,360px)] flex-col gap-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="pointer-events-auto rounded-2xl border border-white/10 bg-[#10152B]/95 p-4 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-white">{toast.title}</p>
                {toast.body ? <p className="mt-1 text-sm text-white/60">{toast.body}</p> : null}
              </div>
              <button className="text-xs text-white/50 hover:text-white" onClick={() => dismissToast(toast.id)}>
                Close
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
