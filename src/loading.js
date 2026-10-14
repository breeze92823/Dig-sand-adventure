// Full-screen loading overlay. Stays opaque until the scene has rendered AND Bloxity auth has
// settled AND the character has loaded (or given up), then fades out. VITE_DEV_MODE=true skips it.
// With the Bloxity SDK the portal's own loading overlay covers the game until loadingEnd(), so
// we skip ours and just feed the portal step text. Drop the game logo at public/ui/logo.png;
// the title text shows until it exists.
import { GAME_TITLE, DEV_MODE } from './config.js'
import * as bloxity from './bloxity.js'
import { subscribeAuth } from './bloxity.js'
import './loading.css'

const FADE_MS = 450
const GIVE_UP_MS = 20000 // never trap the player behind a stuck step
const LOGO_SRC = `${import.meta.env.BASE_URL}ui/logo.png`
const DRIFT = ['🌵', '🐚', '⛏️', '🪣', '🦀', '🌴', '💎', '🐚', '⛏️', '🌵', '🦀', '💎']
const GRAINS = 40

const STEPS = [
  ['scene', 'Shaping the dunes…'],
  ['auth', 'Signing in…'],
  ['avatar', 'Dressing your character…'],
  ['net', 'Joining the world…'],
]
const done = Object.fromEntries(STEPS.map(([k]) => [k, false]))

let root = null
let fill = null
let pctEl = null
let statusEl = null
let pct = 0
let finished = false

function target() {
  const n = STEPS.filter(([k]) => done[k]).length
  return n === STEPS.length ? 100 : Math.round((n / STEPS.length) * 90)
}

function paint() {
  if (!root) return
  fill.style.width = `${pct}%`
  pctEl.textContent = `${pct}%`
  const next = STEPS.find(([k]) => !done[k])
  statusEl.textContent = pct >= 100 ? 'Ready to dig!' : next ? next[1] : 'Almost there…'
}

function tick() {
  const t = target()
  if (pct < t) pct = Math.min(t, pct + Math.max(1, Math.ceil((t - pct) / 8)))
  paint()
  if (pct >= 100) return finish()
  setTimeout(tick, 30)
}

function finish() {
  if (finished) return
  finished = true
  root.classList.add('is-done')
  setTimeout(() => root.remove(), FADE_MS)
}

let portalMode = false

function portalUpdate() {
  if (finished) return
  const next = STEPS.find(([k]) => !done[k])
  if (next) return void bloxity.sdk()?.game?.loadingStep?.(next[1])
  finished = true
  bloxity.notifyFirstFrame()
}

// Marks a step complete ('scene' | 'auth' | 'avatar' | 'net'); safe to call repeatedly.
export function markLoaded(step) {
  if (step in done && !done[step]) {
    done[step] = true
    if (portalMode) portalUpdate()
  }
}

export function createLoading() {
  if (DEV_MODE) return
  if (bloxity.sdk()) {
    portalMode = true
    subscribeAuth((s) => {
      if (s.ready) markLoaded('auth')
    })
    setTimeout(() => {
      STEPS.forEach(([k]) => (done[k] = true))
      portalUpdate()
    }, GIVE_UP_MS)
    portalUpdate()
    return
  }
  root = document.createElement('div')
  root.className = 'loading'
  root.style.transitionDuration = `${FADE_MS}ms`
  root.innerHTML = `
    <div class="loading-dunes" aria-hidden="true"></div>
    <div class="loading-drift" aria-hidden="true"></div>
    <img class="loading-logo" alt="" draggable="false" />
    <h1 hidden></h1>
    <p></p>
    <div class="loading-track"><div class="loading-fill"></div><span class="loading-pct"></span></div>`
  const drift = root.querySelector('.loading-drift')
  // Wind-blown sand grains streaming across, then the emoji floating down.
  for (let i = 0; i < GRAINS; i++) {
    const g = document.createElement('i')
    g.style.cssText = `top:${(i * 37 + 11) % 100}%;width:${2 + (i % 3)}px;height:${2 + (i % 3)}px;animation-delay:${-((i * 1.3) % 9)}s;animation-duration:${3 + ((i * 7) % 5)}s`
    drift.appendChild(g)
  }
  DRIFT.forEach((ch, i) => {
    const s = document.createElement('span')
    s.textContent = ch
    s.style.cssText = `left:${(i * 83 + 7) % 100}%;font-size:${28 + ((i * 17) % 28)}px;animation-delay:${-((i * 1.7) % 14)}s;animation-duration:${9 + ((i * 5) % 7)}s`
    drift.appendChild(s)
  })
  const logo = root.querySelector('.loading-logo')
  const title = root.querySelector('h1')
  title.textContent = GAME_TITLE
  logo.alt = GAME_TITLE
  logo.onerror = () => {
    logo.remove()
    title.hidden = false
  }
  logo.src = LOGO_SRC
  fill = root.querySelector('.loading-fill')
  pctEl = root.querySelector('.loading-pct')
  statusEl = root.querySelector('p')
  document.body.appendChild(root)

  subscribeAuth((s) => {
    if (s.ready) markLoaded('auth')
  })
  setTimeout(() => STEPS.forEach(([k]) => markLoaded(k)), GIVE_UP_MS)
  tick()
}
