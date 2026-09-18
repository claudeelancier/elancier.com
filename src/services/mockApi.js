import { AppError, AppErrorCodes } from '../utils/errors'
import { pickWeighted } from '../utils/wheel'
import { sleep, uid } from '../utils/format'
import {
  adminUser,
  analyticsSeries,
  appSettings,
  drawParticipants,
  hariActivity,
  hariHistory,
  hariRewards,
  mysteryPool,
  prizes as seedPrizes,
  publicWinners,
  spinSettings as seedSpinSettings,
  upcomingDraw,
  users as seedUsers,
  activityLogs as seedLogs,
} from '../data/mockData'

const DB_KEY = 'lv.mock.db.v1'
const USE_LIVE = import.meta.env.VITE_USE_LIVE_API === 'true'

let processingSpin = false

function seedDb() {
  return {
    users: structuredClone(seedUsers),
    admin: structuredClone(adminUser),
    prizes: structuredClone(seedPrizes),
    rewards: structuredClone(hariRewards),
    history: structuredClone(hariHistory),
    winners: structuredClone(publicWinners),
    draw: structuredClone(upcomingDraw),
    drawParticipants: structuredClone(drawParticipants),
    settings: structuredClone(appSettings),
    spinSettings: structuredClone(seedSpinSettings),
    logs: structuredClone(seedLogs),
    sessions: {},
    pendingOtp: {},
  }
}

function loadDb() {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  const db = seedDb()
  saveDb(db)
  return db
}

function saveDb(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db))
}

function publicUser(user) {
  if (!user) return null
  const { password, ...rest } = user
  return rest
}

function findUser(db, identifier) {
  const value = identifier?.toLowerCase()
  return db.users.find(
    (user) => user.email.toLowerCase() === value || user.mobile === identifier || user.name.toLowerCase() === value,
  )
}

function requireAuth(token) {
  const db = loadDb()
  if (token === 'demo-hari') {
    const user = db.users.find((item) => item.id === 'user-hari')
    if (!user) throw new AppError(AppErrorCodes.AUTH_EXPIRED, 'Authentication expired.')
    return { db, user, role: 'player' }
  }
  const session = db.sessions[token]
  if (!session) throw new AppError(AppErrorCodes.AUTH_EXPIRED, 'Authentication expired.')
  if (session.role === 'admin') return { db, user: db.admin, role: 'admin' }
  const user = db.users.find((item) => item.id === session.userId)
  if (!user) throw new AppError(AppErrorCodes.AUTH_EXPIRED, 'Authentication expired.')
  if (user.status !== 'active') throw new AppError(AppErrorCodes.NOT_ELIGIBLE, 'Account is disabled.')
  return { db, user, role: 'player' }
}

function requireAdmin(token) {
  const ctx = requireAuth(token)
  if (ctx.role !== 'admin') throw new AppError(AppErrorCodes.NOT_ELIGIBLE, 'Admin access required.')
  return ctx
}

function log(db, action, entity, entityId, metadata = {}) {
  db.logs.unshift({
    id: uid('log'),
    admin: 'Platform Admin',
    action,
    entity,
    entityId,
    metadata,
    createdAt: new Date().toISOString(),
  })
}

export const mockApi = {
  async register(payload) {
    await sleep(500)
    const db = loadDb()
    if (db.users.some((user) => user.email === payload.email || user.mobile === payload.mobile)) {
      throw new AppError(AppErrorCodes.VALIDATION, 'An account with this mobile or email already exists.')
    }
    const user = {
      id: uid('user'),
      name: payload.fullName.split(' ')[0],
      fullName: payload.fullName,
      mobile: payload.mobile,
      email: payload.email,
      password: payload.password,
      status: 'active',
      verified: false,
      role: 'player',
      participantId: `LD-${String(200000 + db.users.length).slice(-6)}`,
      joinedAt: new Date().toISOString(),
      spins: db.settings.defaultSpinLimit,
      drawEntries: 1,
      totalWins: 0,
      totalRewardsValue: 0,
      totalSpins: 0,
      rewardsClaimed: 0,
      avatarHue: Math.floor(Math.random() * 360),
    }
    db.users.push(user)
    db.pendingOtp[user.mobile] = '123456'
    saveDb(db)
    return { user: publicUser(user), otpHint: '123456' }
  },

  async login({ identifier, password, remember }) {
    await sleep(420)
    const db = loadDb()
    if (identifier === db.admin.email && password === db.admin.password) {
      throw new AppError(AppErrorCodes.NOT_ELIGIBLE, 'Use the admin portal to sign in as an administrator.')
    }
    const user = findUser(db, identifier)
    if (!user || user.password !== password) {
      throw new AppError(AppErrorCodes.VALIDATION, 'Incorrect mobile/email or password.')
    }
    if (user.status !== 'active') {
      throw new AppError(AppErrorCodes.NOT_ELIGIBLE, 'This account has been disabled.')
    }
    const token = uid('tok')
    db.sessions[token] = { userId: user.id, role: 'player', remember: !!remember, createdAt: Date.now() }
    saveDb(db)
    return { token, user: publicUser(user) }
  },

  async adminLogin({ email, password }) {
    await sleep(400)
    const db = loadDb()
    if (email !== db.admin.email || password !== db.admin.password) {
      throw new AppError(AppErrorCodes.VALIDATION, 'Invalid admin credentials.')
    }
    const token = uid('adm')
    db.sessions[token] = { userId: db.admin.id, role: 'admin', createdAt: Date.now() }
    saveDb(db)
    return { token, user: publicUser(db.admin) }
  },

  async logout(token) {
    await sleep(120)
    const db = loadDb()
    delete db.sessions[token]
    saveDb(db)
    return { ok: true }
  },

  async verifyOtp({ mobile, code }) {
    await sleep(380)
    const db = loadDb()
    const expected = db.pendingOtp[mobile] || '123456'
    if (code !== expected) throw new AppError(AppErrorCodes.VALIDATION, 'Invalid verification code.')
    const user = db.users.find((item) => item.mobile === mobile)
    if (!user) throw new AppError(AppErrorCodes.VALIDATION, 'Account not found.')
    user.verified = true
    const token = uid('tok')
    db.sessions[token] = { userId: user.id, role: 'player', createdAt: Date.now() }
    delete db.pendingOtp[mobile]
    saveDb(db)
    return { token, user: publicUser(user) }
  },

  async resendOtp(mobile) {
    await sleep(300)
    const db = loadDb()
    db.pendingOtp[mobile] = '123456'
    saveDb(db)
    return { ok: true, otpHint: '123456' }
  },

  async profile(token) {
    await sleep(180)
    const { user } = requireAuth(token)
    return publicUser(user)
  },

  async updateProfile(token, values) {
    await sleep(280)
    const { db, user } = requireAuth(token)
    Object.assign(user, values)
    saveDb(db)
    return publicUser(user)
  },

  async dashboard(token) {
    await sleep(220)
    const { db, user } = requireAuth(token)
    return {
      user: publicUser(user),
      stats: {
        spins: user.spins,
        totalRewards: user.totalRewardsValue,
        totalWins: user.totalWins,
        drawEntries: user.drawEntries,
      },
      activity: hariActivity,
      latestRewards: db.rewards.slice(0, 3),
      upcomingDraw: db.draw,
      ticker: ['Hari won ₹500', 'Arun won Gift Voucher', 'Karthik won Bonus Spin', 'Meera won ₹1,000'],
    }
  },

  async prizes() {
    await sleep(120)
    return loadDb().prizes.filter((prize) => prize.status === 'active')
  },

  /**
   * Server-authoritative spin. The client never chooses the prize.
   * Weighted selection, inventory, eligibility, and duplicate-spin locks live here.
   */
  async spin(token) {
    if (processingSpin) {
      throw new AppError(AppErrorCodes.SPIN_PROCESSING, 'A spin is already being processed.')
    }
    processingSpin = true
    try {
      await sleep(320)
      const { db, user } = requireAuth(token)
      if (!db.settings.spinEnabled) throw new AppError(AppErrorCodes.NOT_ELIGIBLE, 'Spin & Win is currently paused.')
      if (!user.verified) throw new AppError(AppErrorCodes.NOT_ELIGIBLE, 'Verify your account before spinning.')
      if (user.spins <= 0) throw new AppError(AppErrorCodes.NO_SPINS, 'No spins available.')

      const eligible = db.prizes.filter((prize) => prize.status === 'active' && prize.remainingQuantity > 0)
      if (!eligible.length) throw new AppError(AppErrorCodes.PRIZE_OOS, 'All prizes are currently out of stock.')

      let prize = pickWeighted(eligible)
      if (prize.remainingQuantity <= 0) {
        prize = eligible.find((item) => item.remainingQuantity > 0)
      }
      if (!prize) throw new AppError(AppErrorCodes.PRIZE_OOS, 'Prize out of stock.')

      prize.remainingQuantity -= 1
      user.spins -= 1
      user.totalSpins += 1

      let mysteryReveal = null
      if (prize.type === 'mystery') {
        mysteryReveal = mysteryPool[Math.floor(Math.random() * mysteryPool.length)]
      }
      if (prize.type === 'bonus_spin') {
        user.spins += 1
      }

      const isWin = prize.type !== 'try_again'
      const spinId = uid('spin')
      if (isWin) {
        user.totalWins += 1
        user.totalRewardsValue += prize.value || mysteryReveal?.value || 0
        if (prize.type !== 'bonus_spin') {
          db.rewards.unshift({
            id: uid('rew'),
            prizeName: mysteryReveal?.name || prize.name,
            prizeId: prize.id,
            value: mysteryReveal?.value || prize.value,
            wonDate: new Date().toISOString().slice(0, 10),
            status: 'available',
            claimDeadline: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
            game: 'Spin & Win',
            spinId,
          })
        }
        db.winners.unshift({
          id: uid('w'),
          name: user.fullName || user.name,
          prize: mysteryReveal?.name || prize.shortLabel,
          prizeValue: mysteryReveal?.value || prize.value,
          game: 'Spin & Win',
          date: new Date().toISOString().slice(0, 10),
          avatarHue: user.avatarHue,
        })
      }

      db.history.unshift({
        id: uid('h'),
        date: new Date().toISOString().slice(0, 10),
        game: 'Spin & Win',
        result: isWin ? 'Winner' : 'No Prize',
        prize: mysteryReveal?.name || prize.shortLabel,
        status: prize.type === 'try_again' ? 'Completed' : prize.type === 'bonus_spin' ? 'Applied' : 'Available',
      })

      saveDb(db)
      return {
        spin_id: spinId,
        prize_id: prize.id,
        prize_name: prize.name,
        prize_type: prize.type,
        prize_value: prize.value,
        wheel_index: prize.wheelIndex,
        mystery_reveal: mysteryReveal,
        spins_remaining: user.spins,
        user: publicUser(user),
      }
    } finally {
      processingSpin = false
    }
  },

  async spinHistory(token) {
    await sleep(160)
    requireAuth(token)
    return loadDb().history
  },

  async rewards(token) {
    await sleep(160)
    requireAuth(token)
    return loadDb().rewards
  },

  async claimReward(token, rewardId) {
    await sleep(280)
    const { db, user } = requireAuth(token)
    const reward = db.rewards.find((item) => item.id === rewardId)
    if (!reward) throw new AppError(AppErrorCodes.VALIDATION, 'Reward not found.')
    if (reward.status === 'expired') throw new AppError(AppErrorCodes.REWARD_EXPIRED, 'Reward expired.')
    if (reward.status === 'claimed') throw new AppError(AppErrorCodes.VALIDATION, 'Already claimed.')
    reward.status = 'processing'
    user.rewardsClaimed += 1
    saveDb(db)
    return reward
  },

  async winners(filter = 'all') {
    await sleep(160)
    const list = loadDb().winners
    const today = new Date().toISOString().slice(0, 10)
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
    if (filter === 'today') return list.filter((item) => item.date === today)
    if (filter === 'week') return list.filter((item) => item.date >= weekAgo)
    if (filter === 'big') return list.filter((item) => (item.prizeValue || 0) >= 1000)
    return list
  },

  async luckyDraws() {
    await sleep(140)
    return [loadDb().draw]
  },

  async luckyDraw(id) {
    await sleep(140)
    const db = loadDb()
    return { ...db.draw, id: id || db.draw.id, participantsPreview: db.drawParticipants }
  },

  async startLuckyDraw(token, id) {
    await sleep(220)
    const { db } = requireAdmin(token)
    if (db.draw.status === 'closed') throw new AppError(AppErrorCodes.DRAW_CLOSED, 'This draw is closed.')
    const winner = db.drawParticipants[0]
    db.draw.status = 'live'
    db.draw.liveWinner = winner
    log(db, 'Started lucky draw', 'lucky_draws', id, { winner })
    saveDb(db)
    return { winner, participants: db.drawParticipants }
  },

  async publishDrawWinner(token, winner) {
    await sleep(200)
    const { db } = requireAdmin(token)
    db.draw.status = 'published'
    db.draw.publishedWinner = winner
    db.winners.unshift({
      id: uid('w'),
      name: winner.name,
      prize: db.draw.prize,
      prizeValue: db.draw.prizeValue,
      game: 'Lucky Draw',
      date: new Date().toISOString().slice(0, 10),
      avatarHue: 262,
    })
    log(db, 'Published winner', 'draw_winners', winner.id)
    saveDb(db)
    return db.draw
  },

  async adminDashboard(token) {
    await sleep(200)
    requireAdmin(token)
    const db = loadDb()
    return {
      cards: {
        participants: db.users.length,
        todaySpins: 710,
        winners: db.winners.length,
        activePrizes: db.prizes.filter((p) => p.status === 'active').length,
        inventory: db.prizes.reduce((sum, p) => sum + (p.remainingQuantity > 9000 ? 0 : p.remainingQuantity), 0),
        pendingClaims: db.rewards.filter((r) => r.status === 'available' || r.status === 'processing').length,
      },
      charts: analyticsSeries,
    }
  },

  async participants(token, query = '') {
    await sleep(180)
    requireAdmin(token)
    const q = query.toLowerCase()
    return loadDb().users.filter(
      (user) =>
        !q ||
        user.fullName.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q) ||
        user.mobile.includes(q),
    )
  },

  async updateParticipant(token, id, patch) {
    await sleep(180)
    const { db } = requireAdmin(token)
    const user = db.users.find((item) => item.id === id)
    if (!user) throw new AppError(AppErrorCodes.VALIDATION, 'Participant not found.')
    Object.assign(user, patch)
    log(db, 'Updated participant', 'users', id, patch)
    saveDb(db)
    return publicUser(user)
  },

  async adminPrizes(token) {
    await sleep(140)
    requireAdmin(token)
    return loadDb().prizes
  },

  async savePrize(token, prize) {
    await sleep(220)
    const { db } = requireAdmin(token)
    if (prize.id) {
      const idx = db.prizes.findIndex((item) => item.id === prize.id)
      db.prizes[idx] = { ...db.prizes[idx], ...prize }
      log(db, 'Updated prize', 'prizes', prize.id)
    } else {
      const created = {
        ...prize,
        id: uid('prize'),
        remainingQuantity: prize.quantity,
        wheelIndex: db.prizes.length,
        status: prize.status || 'active',
      }
      db.prizes.push(created)
      log(db, 'Created prize', 'prizes', created.id)
    }
    saveDb(db)
    return db.prizes
  },

  async deletePrize(token, id) {
    await sleep(180)
    const { db } = requireAdmin(token)
    db.prizes = db.prizes.filter((item) => item.id !== id)
    log(db, 'Deleted prize', 'prizes', id)
    saveDb(db)
    return db.prizes
  },

  async saveSpinSettings(token, settings) {
    await sleep(180)
    const { db } = requireAdmin(token)
    db.spinSettings = { ...db.spinSettings, ...settings }
    log(db, 'Updated spin settings', 'settings', 'spin')
    saveDb(db)
    return db.spinSettings
  },

  async saveDraw(token, draw) {
    await sleep(200)
    const { db } = requireAdmin(token)
    db.draw = { ...db.draw, ...draw }
    log(db, draw.status === 'scheduled' ? 'Published draw' : 'Saved draw draft', 'lucky_draws', db.draw.id)
    saveDb(db)
    return db.draw
  },

  async adminWinners(token) {
    await sleep(160)
    requireAdmin(token)
    return loadDb().winners
  },

  async adminRewards(token) {
    await sleep(160)
    requireAdmin(token)
    return loadDb().rewards
  },

  async updateReward(token, id, status) {
    await sleep(180)
    const { db } = requireAdmin(token)
    const reward = db.rewards.find((item) => item.id === id)
    if (!reward) throw new AppError(AppErrorCodes.VALIDATION, 'Reward not found.')
    reward.status = status
    if (status === 'claimed') reward.claimedAt = new Date().toISOString().slice(0, 10)
    log(db, `Marked reward ${status}`, 'rewards', id)
    saveDb(db)
    return reward
  },

  async settings(token) {
    await sleep(120)
    requireAdmin(token)
    const db = loadDb()
    return { app: db.settings, spin: db.spinSettings, logs: db.logs }
  },

  async saveSettings(token, settings) {
    await sleep(180)
    const { db } = requireAdmin(token)
    db.settings = { ...db.settings, ...settings }
    log(db, 'Updated application settings', 'settings', 'app')
    saveDb(db)
    return db.settings
  },
}

export { USE_LIVE, loadDb }
