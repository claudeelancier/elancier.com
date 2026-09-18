import { create } from 'zustand'
import { api } from '../services/api'
import { useAuthStore } from './authStore'
import { prizes as seedPrizes } from '../data/mockData'
import { nextSpinRotation } from '../utils/wheel'

export const SPIN_STATES = {
  idle: 'idle',
  requesting: 'requesting',
  spinning: 'spinning',
  stopping: 'stopping',
  revealing: 'revealing',
  completed: 'completed',
  error: 'error',
}

export const useGameStore = create((set, get) => ({
  spinState: SPIN_STATES.idle,
  result: null,
  prizes: seedPrizes.filter((prize) => prize.status === 'active'),
  rewards: [],
  history: [],
  winners: [],
  dashboard: null,
  draw: null,
  error: null,
  lastRotation: nextSpinRotation(0, 0, 8, 0),

  resetSpin() {
    set({ spinState: SPIN_STATES.idle, result: null, error: null })
  },

  async loadPrizes() {
    const prizes = await api.prizes()
    set({ prizes })
    return prizes
  },

  async loadDashboard() {
    const dashboard = await api.dashboard()
    useAuthStore.getState().setUser(dashboard.user)
    set({ dashboard })
    return dashboard
  },

  async loadRewards() {
    const rewards = await api.rewards()
    set({ rewards })
    return rewards
  },

  async loadHistory() {
    const history = await api.spinHistory()
    set({ history })
    return history
  },

  async loadWinners(filter) {
    const winners = await api.winners(filter)
    set({ winners })
    return winners
  },

  async loadDraw(id = 'draw-friday') {
    const draw = await api.luckyDraw(id)
    set({ draw })
    return draw
  },

  canSpin() {
    const user = useAuthStore.getState().user
    const { spinState } = get()
    return (
      !!user &&
      user.verified &&
      user.spins > 0 &&
      (spinState === SPIN_STATES.idle || spinState === SPIN_STATES.completed || spinState === SPIN_STATES.error)
    )
  },

  async requestSpin() {
    if (!get().canSpin() || get().spinState === SPIN_STATES.requesting) {
      return null
    }
    set({ spinState: SPIN_STATES.requesting, error: null })
    try {
      const result = await api.spin()
      useAuthStore.getState().setUser(result.user)
      set({ result, spinState: SPIN_STATES.spinning })
      return result
    } catch (error) {
      set({ spinState: SPIN_STATES.error, error })
      throw error
    }
  },

  markStopping() {
    set({ spinState: SPIN_STATES.stopping })
  },

  markRevealing() {
    set({ spinState: SPIN_STATES.revealing })
  },

  markCompleted() {
    set({ spinState: SPIN_STATES.completed })
  },

  setLastRotation(value) {
    set({ lastRotation: value })
  },
}))
