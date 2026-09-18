let ctx
let unlocked = false

function context() {
  if (ctx) return ctx
  const AudioCtx = window.AudioContext || window.webkitAudioContext
  if (!AudioCtx) return null
  ctx = new AudioCtx()
  return ctx
}

export function unlockAudio() {
  const audio = context()
  if (!audio) return
  if (audio.state === 'suspended') audio.resume()
  unlocked = true
}

function tone({ freq = 440, duration = 0.12, type = 'sine', gain = 0.04, slideTo }) {
  const audio = context()
  if (!audio || !unlocked) return
  const osc = audio.createOscillator()
  const amp = audio.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, audio.currentTime)
  if (slideTo) {
    osc.frequency.exponentialRampToValueAtTime(slideTo, audio.currentTime + duration)
  }
  amp.gain.setValueAtTime(gain, audio.currentTime)
  amp.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duration)
  osc.connect(amp)
  amp.connect(audio.destination)
  osc.start()
  osc.stop(audio.currentTime + duration)
}

export const sounds = {
  click() {
    tone({ freq: 520, duration: 0.06, type: 'triangle', gain: 0.03 })
  },
  tick() {
    tone({ freq: 680, duration: 0.03, type: 'square', gain: 0.018 })
  },
  spin() {
    tone({ freq: 180, duration: 0.35, type: 'sawtooth', gain: 0.03, slideTo: 420 })
  },
  win() {
    tone({ freq: 523, duration: 0.18, type: 'triangle', gain: 0.05 })
    setTimeout(() => tone({ freq: 659, duration: 0.18, type: 'triangle', gain: 0.05 }), 90)
    setTimeout(() => tone({ freq: 784, duration: 0.28, type: 'triangle', gain: 0.05 }), 180)
  },
  jackpot() {
    tone({ freq: 392, duration: 0.5, type: 'triangle', gain: 0.06, slideTo: 784 })
  },
  mystery() {
    tone({ freq: 240, duration: 0.4, type: 'sine', gain: 0.04, slideTo: 520 })
  },
  lose() {
    tone({ freq: 240, duration: 0.28, type: 'sine', gain: 0.03, slideTo: 140 })
  },
}
