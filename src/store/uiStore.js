import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useUiStore = create(
  persist(
    (set, get) => ({
      soundEnabled: true,
      toasts: [],
      notifications: [
        { id: 'n1', title: 'Mega Friday Draw starts soon', time: '1h' },
        { id: 'n2', title: 'Your ₹500 reward is ready to claim', time: '2h' },
      ],
      pushToast(toast) {
        const id = `${Date.now()}-${Math.random()}`
        set({ toasts: [...get().toasts, { id, ...toast }] })
        setTimeout(() => get().dismissToast(id), toast.ttl || 4200)
      },
      dismissToast(id) {
        set({ toasts: get().toasts.filter((item) => item.id !== id) })
      },
      toggleSound() {
        set({ soundEnabled: !get().soundEnabled })
      },
    }),
    { name: 'lv.ui', partialize: (state) => ({ soundEnabled: state.soundEnabled }) },
  ),
)
