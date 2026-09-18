import { create } from 'zustand'
import { api } from '../services/api'

export const useAdminStore = create((set) => ({
  overview: null,
  participants: [],
  prizes: [],
  winners: [],
  rewards: [],
  settings: null,
  loading: false,

  async loadOverview() {
    set({ loading: true })
    const overview = await api.adminDashboard()
    set({ overview, loading: false })
  },
  async loadParticipants(q) {
    const participants = await api.participants(q)
    set({ participants })
  },
  async loadPrizes() {
    const prizes = await api.adminPrizes()
    set({ prizes })
  },
  async loadWinners() {
    const winners = await api.adminWinners()
    set({ winners })
  },
  async loadRewards() {
    const rewards = await api.adminRewards()
    set({ rewards })
  },
  async loadSettings() {
    const settings = await api.settings()
    set({ settings })
  },
}))
