export const AppErrorCodes = {
  NETWORK: 'NETWORK_ERROR',
  AUTH_EXPIRED: 'AUTHENTICATION_EXPIRED',
  NOT_ELIGIBLE: 'USER_NOT_ELIGIBLE',
  NO_SPINS: 'NO_SPINS_AVAILABLE',
  SPIN_PROCESSING: 'SPIN_ALREADY_PROCESSING',
  PRIZE_OOS: 'PRIZE_OUT_OF_STOCK',
  DRAW_CLOSED: 'DRAW_CLOSED',
  REWARD_EXPIRED: 'REWARD_EXPIRED',
  SERVER: 'SERVER_ERROR',
  VALIDATION: 'VALIDATION_ERROR',
}

export class AppError extends Error {
  constructor(code, message, details) {
    super(message)
    this.code = code
    this.details = details
    this.name = 'AppError'
  }
}

export function errorCopy(error) {
  const code = error?.code
  const map = {
    [AppErrorCodes.NETWORK]: {
      title: 'Connection issue',
      body: 'We could not reach Luckyverse. Check your connection and try again.',
    },
    [AppErrorCodes.AUTH_EXPIRED]: {
      title: 'Session expired',
      body: 'Please sign in again to continue playing.',
    },
    [AppErrorCodes.NOT_ELIGIBLE]: {
      title: 'Not eligible',
      body: 'Your account is not eligible for this action right now.',
    },
    [AppErrorCodes.NO_SPINS]: {
      title: 'No spins left',
      body: 'You have used all available spins. Come back after the daily reset.',
    },
    [AppErrorCodes.SPIN_PROCESSING]: {
      title: 'Spin already in progress',
      body: 'Please wait for the current spin to finish.',
    },
    [AppErrorCodes.PRIZE_OOS]: {
      title: 'Prize unavailable',
      body: 'This prize just went out of stock. We selected another eligible reward.',
    },
    [AppErrorCodes.DRAW_CLOSED]: {
      title: 'Draw closed',
      body: 'Entries for this lucky draw are no longer accepted.',
    },
    [AppErrorCodes.REWARD_EXPIRED]: {
      title: 'Reward expired',
      body: 'The claim window for this reward has closed.',
    },
    [AppErrorCodes.SERVER]: {
      title: 'Something went wrong',
      body: 'Our servers hit a snag. Please retry in a moment.',
    },
    [AppErrorCodes.VALIDATION]: {
      title: 'Check your details',
      body: error?.message || 'Some fields need your attention.',
    },
  }
  return map[code] || { title: 'Unable to continue', body: error?.message || 'Please try again.' }
}
