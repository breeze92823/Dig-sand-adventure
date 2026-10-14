// Sound effects (clips from the Kick-per-click reference, public/audio). One preloaded element per
// clip, restarted per play. Never throws; a blocked/missing clip is simply silent.
const SFX = {
  gain: { file: 'power_gain.mp3', volume: 0.3 }, // training tick (+Strength)
  levelUp: { file: 'level_up.mp3', volume: 0.4 },
  error: { file: 'error.mp3', volume: 0.25 }, // "Need $X", bag full ...
  good: { file: 'powerup.mp3', volume: 0.3 }, // collected / bought / claimed
  sell: { file: 'slot-machine-win.mp3', volume: 0.5 },
  hatch: { file: 'ball-kick.mp3', volume: 0.35 }, // egg cracks
}
const DIG_LOOP = { file: 'dig-2.mp3', volume: 0.22, fade: 0.08 }

const base = import.meta.env.BASE_URL
const make = ({ file, volume }) => {
  try {
    const a = new Audio(`${base}audio/${file}`)
    a.preload = 'auto'
    a.volume = volume
    return a
  } catch {
    return null
  }
}
const els = {}
for (const k in SFX) els[k] = make(SFX[k])

export function playSfx(name) {
  try {
    const a = els[name]
    if (!a) return
    a.currentTime = 0
    a.play()?.catch(() => {})
  } catch {}
}

// Digging loop (dig-2.mp3): decoded once and looped gaplessly through WebAudio (an <audio loop> leaves
// a gap on short clips); the gain fades in/out so releasing the button never clicks.
let actx = null
let digGain = null
let digBuf = null
let digSrc = null
let digOn = false
try {
  const AC = window.AudioContext || window.webkitAudioContext
  actx = new AC()
  digGain = actx.createGain()
  digGain.gain.value = 0
  digGain.connect(actx.destination)
  fetch(`${base}audio/${DIG_LOOP.file}`)
    .then((r) => r.arrayBuffer())
    .then((b) => actx.decodeAudioData(b))
    .then((buf) => {
      digBuf = buf
      if (digOn) startDig()
    })
    .catch(() => {})
} catch {}

// "New Index entry" sound: a struck-bell chime (inharmonic partials, soft attack, exponential decay)
// rising a fifth, then a short high sparkle. Synthesized, so no clip is needed.
export function playDiscover() {
  try {
    if (!actx) return
    actx.resume?.()
    const t0 = actx.currentTime + 0.01
    const out = actx.createGain()
    out.gain.value = 0.28
    out.connect(actx.destination)
    const bell = (freq, start, len, vol) => {
      for (const [ratio, amp] of [[1, 1], [2.76, 0.45], [5.4, 0.2], [8.93, 0.08]]) {
        const o = actx.createOscillator()
        const g = actx.createGain()
        o.type = 'sine'
        o.frequency.value = freq * ratio
        const t = t0 + start
        g.gain.setValueAtTime(0.0001, t)
        g.gain.exponentialRampToValueAtTime(vol * amp, t + 0.006)
        g.gain.exponentialRampToValueAtTime(0.0001, t + len / ratio ** 0.5)
        o.connect(g)
        g.connect(out)
        o.start(t)
        o.stop(t + len + 0.05)
      }
    }
    bell(880, 0, 1.1, 0.5) // A5
    bell(1318.5, 0.11, 1.4, 0.45) // E6
    bell(1760, 0.22, 1.7, 0.3) // A6
    for (let i = 0; i < 4; i++) bell(2637 + i * 520, 0.3 + i * 0.05, 0.5, 0.08) // sparkle
  } catch {}
}

function startDig() {
  try {
    if (!digBuf || digSrc) return
    actx.resume?.()
    digSrc = actx.createBufferSource()
    digSrc.buffer = digBuf
    digSrc.loop = true
    digSrc.connect(digGain)
    digSrc.start()
  } catch {}
}

function stopDig(src) {
  try {
    src.stop(actx.currentTime + DIG_LOOP.fade + 0.02)
  } catch {}
}

export function setDigSound(on) {
  if (on === digOn || !actx) return
  digOn = on
  try {
    const g = digGain.gain
    const t = actx.currentTime
    g.cancelScheduledValues(t)
    g.setValueAtTime(g.value, t)
    if (on) {
      startDig()
      g.linearRampToValueAtTime(DIG_LOOP.volume, t + DIG_LOOP.fade)
    } else {
      g.linearRampToValueAtTime(0, t + DIG_LOOP.fade)
      if (digSrc) stopDig(digSrc)
      digSrc = null
    }
  } catch {}
}
