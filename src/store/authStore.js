import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api, setToken } from '../services/api'
import { users } from '../data/mockData'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      role: null,
      loading: false,
      pendingMobile: null,

      async bootstrap() {
        const { token, role } = get()
        if (!token) return
        setToken(token)
        try {
          const user = await api.profile()
          set({ user, role: user.role || role })
        } catch {
          set({ user: null, token: null, role: null })
          setToken(null)
        }
      },

      async register(payload) {
        set({ loading: true })
        try {
          const result = await api.register(payload)
          set({ pendingMobile: result.user.mobile, loading: false })
          return result
        } catch (error) {
          set({ loading: false })
          throw error
        }
      },

      async login(payload) {
        set({ loading: true })
        try {
          const result = await api.login(payload)
          setToken(result.token)
          set({ user: result.user, token: result.token, role: 'player', loading: false })
          return result.user
        } catch (error) {
          set({ loading: false })
          throw error
        }
      },

      async adminLogin(payload) {
        set({ loading: true })
        try {
          const result = await api.adminLogin(payload)
          setToken(result.token)
          set({ user: result.user, token: result.token, role: 'admin', loading: false })
          return result.user
        } catch (error) {
          set({ loading: false })
          throw error
        }
      },

      async verifyOtp(code) {
        set({ loading: true })
        try {
          const result = await api.verifyOtp({ mobile: get().pendingMobile, code })
          setToken(result.token)
          set({ user: result.user, token: result.token, role: 'player', loading: false, pendingMobile: null })
          return result.user
        } catch (error) {
          set({ loading: false })
          throw error
        }
      },

      async logout() {
        try {
          await api.logout()
        } catch {
          /* ignore */
        }
        setToken(null)
        set({ user: null, token: null, role: null })
      },

      setUser(user) {
        set({ user })
      },

      demoLogin() {
        const hari = users[0]
        const { password, ...safe } = hari
        const token = 'demo-hari'
        setToken(token)
        set({ user: safe, token, role: 'player' })
      },
    }),
    {
      name: 'lv.auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        role: state.role,
        pendingMobile: state.pendingMobile,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) setToken(state.token)
      },
    },
  ),
)
