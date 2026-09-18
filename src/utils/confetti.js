import confetti from 'canvas-confetti'

export function fireWinConfetti() {
  const defaults = { disableForReducedMotion: true }
  confetti({
    ...defaults,
    particleCount: 80,
    spread: 70,
    origin: { y: 0.62 },
    colors: ['#6C5CE7', '#00D4FF', '#FFD166', '#ffffff'],
  })
}

export function fireJackpotConfetti() {
  const defaults = { disableForReducedMotion: true }
  const end = Date.now() + 900
  const frame = () => {
    confetti({
      ...defaults,
      particleCount: 4,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors: ['#FFD166', '#ffffff', '#6C5CE7'],
    })
    confetti({
      ...defaults,
      particleCount: 4,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors: ['#00D4FF', '#FFD166', '#ffffff'],
    })
    if (Date.now() < end) requestAnimationFrame(frame)
  }
  frame()
}

export function fireDrawConfetti() {
  fireWinConfetti()
}
