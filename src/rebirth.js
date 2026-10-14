import { player } from './player.js'
import { TRAIN } from './config.js'

// Rebirth multipliers: each rebirth adds +1 to the strength multiplier and +0.4 to the cash multiplier.
// Level needed for the next rebirth: 25, 50, 100, 200, ... (no level cap).
export const REBIRTH = { level: 25, levelGrowth: 2 }
export const rebirthLevel = (n = player.rebirths) => Math.round(REBIRTH.level * REBIRTH.levelGrowth ** n)
export const strengthMult = (r) => 1 + r
export const cashMult = (r) => 1 + 0.4 * r
const fmt = (n) => String(+n.toFixed(2))

// Isometric stack of green bills with an orange band.
export const CASH = `<svg viewBox="0 0 120 120"><g stroke="#16301a" stroke-width="4" stroke-linejoin="round">
<path d="M8 46 60 72v42L8 88z" fill="#1f8a3c"/><path d="M60 72l53-27v42l-53 27z" fill="#2fae4c"/>
<path d="M8 46 63 18l50 27-53 27z" fill="#46cf62"/>
<path d="M29 56.5 84 29l9 5-54 27.5z" fill="#ffb02e"/><path d="M29 56.5l10 5V103l-10-5z" fill="#f08a1c"/></g>
<g stroke="#bff5c5" stroke-width="2.5" opacity="0.8"><path d="M12 62l11 5.5M44 78l12 6M12 76l11 5.5M44 92l12 6M64 88l45-23M64 102l45-23"/></g></svg>`

// Chevron with a white-to-cyan fill.
const ARROW = `<svg viewBox="0 0 60 60"><defs><linearGradient id="rbArrow" x1="0" y1="0" x2="0" y2="1"><stop offset="0.45" stop-color="#fff"/><stop offset="0.55" stop-color="#7fe0ff"/></linearGradient></defs>
<path d="M6 4 56 26v8L6 56V38l24-8L6 22z" fill="url(#rbArrow)" stroke="#141a33" stroke-width="6" stroke-linejoin="round"/></svg>`


const card = (cls, icon) => `<div class="rb-card"><i>${icon}</i><b class="${cls}"></b></div>`

const html = () => `
<div class="rb-panel">
  <div class="rb-head"><span class="rb-title">Rebirth</span><button class="rb-close"></button></div>
  <span class="rb-logo"><img src="${import.meta.env.BASE_URL}ui/rebirth.png" alt="" draggable="false"></span>
  <span class="rb-label rb-label-cur">Current</span><span class="rb-label rb-label-next">Next</span>
  <div class="rb-row rb-str">${card('rb-str-cur', '💪')}<span class="rb-arrow">${ARROW}</span>${card('rb-str-next', '💪')}</div>
  <div class="rb-row rb-cash">${card('rb-cash-cur', CASH)}<span class="rb-arrow">${ARROW}</span>${card('rb-cash-next', CASH)}</div>
  <div class="rb-resets">Resets Strength and Level</div>
  <div class="rb-keep">Keep your cash &amp; shovels!</div>
  <div class="rb-bar"><div class="rb-bar-fill"></div><span class="rb-bar-text"></span></div>
  <button class="rb-go"><span></span></button>
</div>`

export function createRebirthWindow() {
  player.rebirths ??= 0
  // The blur sits under the HUD (z 10) so the HUD stays crisp; the panel sits above it.
  const backdrop = document.createElement('div')
  backdrop.className = 'rb-backdrop'
  const root = document.createElement('div')
  root.className = 'rb-overlay'
  root.innerHTML = html()
  backdrop.hidden = root.hidden = true
  document.body.append(backdrop, root)
  const q = (s) => root.querySelector(s)

  function refresh() {
    const r = player.rebirths
    q('.rb-str-cur').textContent = 'x' + fmt(strengthMult(r))
    q('.rb-str-next').textContent = 'x' + fmt(strengthMult(r + 1))
    q('.rb-cash-cur').textContent = 'x' + fmt(cashMult(r))
    q('.rb-cash-next').textContent = 'x' + fmt(cashMult(r + 1))
    const need = rebirthLevel()
    const lvl = Math.min(player.level, need)
    q('.rb-bar-fill').style.width = (lvl / need) * 100 + '%'
    q('.rb-bar-text').textContent = `Level ${lvl} / ${need}`
    const ready = player.level >= need
    const go = q('.rb-go')
    go.firstChild.textContent = ready ? 'Rebirth' : `Reach Level ${need}`
    go.classList.toggle('ready', ready)
  }

  function doRebirth() {
    player.rebirths++
    player.strength = 1
    player.level = 1
    player.xp = 0
    player.xpNext = TRAIN.xpPerLevel
    refresh()
  }

  const isOpen = () => !root.hidden
  const open = () => {
    refresh()
    backdrop.hidden = root.hidden = false
  }
  const close = () => {
    backdrop.hidden = root.hidden = true
  }

  q('.rb-close').addEventListener('click', close)
  root.addEventListener('pointerdown', (e) => {
    if (e.target === root) close()
  })
  q('.rb-go').addEventListener('click', () => {
    if (player.level >= rebirthLevel()) doRebirth()
  })
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && isOpen()) close()
  })
  // The HUD Rebirth button opens the window.
  document.addEventListener('click', (e) => {
    if (e.target.closest('.hud-side[data-id="rebirth"]')) isOpen() ? close() : open()
  })
  return { open, close, refresh }
}
