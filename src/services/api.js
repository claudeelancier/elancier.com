import { getToken, setToken, request } from './httpClient'
import { mockApi, USE_LIVE } from './mockApi'

async function liveOrMock(live, mock) {
  if (USE_LIVE) return live()
  return mock()
}

export const api = {
  register: (payload) => liveOrMock(() => request('/api/register', { method: 'POST', body: payload, auth: false }), () => mockApi.register(payload)),
  login: (payload) => liveOrMock(() => request('/api/login', { method: 'POST', body: payload, auth: false }), () => mockApi.login(payload)),
  adminLogin: (payload) => liveOrMock(() => request('/api/admin/login', { method: 'POST', body: payload, auth: false }), () => mockApi.adminLogin(payload)),
  logout: () => liveOrMock(() => request('/api/logout', { method: 'POST' }), () => mockApi.logout(getToken())),
  verifyOtp: (payload) => liveOrMock(() => request('/api/verify-otp', { method: 'POST', body: payload, auth: false }), () => mockApi.verifyOtp(payload)),
  resendOtp: (mobile) => liveOrMock(() => request('/api/verify-otp/resend', { method: 'POST', body: { mobile }, auth: false }), () => mockApi.resendOtp(mobile)),
  profile: () => liveOrMock(() => request('/api/profile'), () => mockApi.profile(getToken())),
  updateProfile: (values) => liveOrMock(() => request('/api/profile', { method: 'PUT', body: values }), () => mockApi.updateProfile(getToken(), values)),
  dashboard: () => liveOrMock(() => request('/api/dashboard'), () => mockApi.dashboard(getToken())),
  prizes: () => liveOrMock(() => request('/api/prizes'), () => mockApi.prizes()),
  spin: () => liveOrMock(() => request('/api/spin', { method: 'POST' }), () => mockApi.spin(getToken())),
  spinHistory: () => liveOrMock(() => request('/api/spins/history'), () => mockApi.spinHistory(getToken())),
  rewards: () => liveOrMock(() => request('/api/rewards'), () => mockApi.rewards(getToken())),
  claimReward: (id) => liveOrMock(() => request(`/api/rewards/${id}/claim`, { method: 'POST' }), () => mockApi.claimReward(getToken(), id)),
  winners: (filter) => liveOrMock(() => request(`/api/winners?filter=${filter || 'all'}`), () => mockApi.winners(filter)),
  luckyDraws: () => liveOrMock(() => request('/api/lucky-draws'), () => mockApi.luckyDraws()),
  luckyDraw: (id) => liveOrMock(() => request(`/api/lucky-draws/${id}`), () => mockApi.luckyDraw(id)),
  startLuckyDraw: (id) => liveOrMock(() => request(`/api/admin/lucky-draws/${id}/start`, { method: 'POST' }), () => mockApi.startLuckyDraw(getToken(), id)),
  publishDrawWinner: (winner) => liveOrMock(() => request('/api/admin/winners', { method: 'POST', body: winner }), () => mockApi.publishDrawWinner(getToken(), winner)),
  adminDashboard: () => liveOrMock(() => request('/api/admin/dashboard'), () => mockApi.adminDashboard(getToken())),
  participants: (q) => liveOrMock(() => request(`/api/admin/participants?q=${encodeURIComponent(q || '')}`), () => mockApi.participants(getToken(), q)),
  updateParticipant: (id, patch) => liveOrMock(() => request(`/api/admin/participants/${id}`, { method: 'PUT', body: patch }), () => mockApi.updateParticipant(getToken(), id, patch)),
  adminPrizes: () => liveOrMock(() => request('/api/admin/prizes'), () => mockApi.adminPrizes(getToken())),
  savePrize: (prize) =>
    liveOrMock(
      () => request(prize.id ? `/api/admin/prizes/${prize.id}` : '/api/admin/prizes', { method: prize.id ? 'PUT' : 'POST', body: prize }),
      () => mockApi.savePrize(getToken(), prize),
    ),
  deletePrize: (id) => liveOrMock(() => request(`/api/admin/prizes/${id}`, { method: 'DELETE' }), () => mockApi.deletePrize(getToken(), id)),
  saveSpinSettings: (settings) => liveOrMock(() => request('/api/admin/spin-settings', { method: 'PUT', body: settings }), () => mockApi.saveSpinSettings(getToken(), settings)),
  saveDraw: (draw) => liveOrMock(() => request('/api/admin/lucky-draws', { method: 'POST', body: draw }), () => mockApi.saveDraw(getToken(), draw)),
  adminWinners: () => liveOrMock(() => request('/api/admin/winners'), () => mockApi.adminWinners(getToken())),
  adminRewards: () => liveOrMock(() => request('/api/admin/rewards'), () => mockApi.adminRewards(getToken())),
  updateReward: (id, status) => liveOrMock(() => request(`/api/admin/rewards/${id}`, { method: 'PUT', body: { status } }), () => mockApi.updateReward(getToken(), id, status)),
  settings: () => liveOrMock(() => request('/api/admin/settings'), () => mockApi.settings(getToken())),
  saveSettings: (settings) => liveOrMock(() => request('/api/admin/settings', { method: 'PUT', body: settings }), () => mockApi.saveSettings(getToken(), settings)),
}

export { getToken, setToken }
