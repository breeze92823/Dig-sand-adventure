import './hatch.css'
import { player } from './player.js'
import { EGG_STANDS } from './config.js'
import { EGGS } from './data/pets.js'
import { RARITY_ROW_BG } from './data/loot.js'
import { offer, toast } from './interact.js'
import { tryHatch } from './pets.js'

// The egg stands' window: press E next to an egg (hub.js), see its pets + odds and hatch 1 or 3
// for $. A hatch closes the window and plays the animation (hatchOverlay.js). Walking away or Esc
// closes it.

const money = (n) => '$' + n.toLocaleString('en-US')

export function createEggWindow(overlay) {
  let eggKey = null
  let stand = null
  const backdrop = document.createElement('div')
  backdrop.className = 'eg-backdrop'
  const root = document.createElement('div')
  root.className = 'eg-overlay'
  backdrop.hidden = root.hidden = true
  document.body.append(backdrop, root)
  const q = (s) => root.querySelector(s)

  function render(egg) {
    root.innerHTML = `
  <div class="eg-panel">
    <div class="eg-head"><span class="eg-title">${egg.name}</span><button class="eg-close"></button></div>
    <div class="eg-body">
      <div class="eg-egg" style="--egg-a:${egg.colors[0]};--egg-b:${egg.colors[1]}"></div>
      <div class="eg-odds">${egg.pets
        .map(
          (p) => `<div class="eg-row" style="--bg:${RARITY_ROW_BG[p.rarity]}">
            <span class="eg-ico">${p.emoji}</span><span class="eg-name">${p.name}</span>
            <span class="eg-pct">${+p.chance.toFixed(2)}%</span></div>`,
        )
        .join('')}</div>
    </div>
    <div class="eg-btns">
      <button class="eg-btn one" data-n="1">Hatch x1<small>${money(egg.cost)}</small></button>
      <button class="eg-btn three" data-n="3">Hatch x3<small>${money(egg.cost * 3)}</small></button>
    </div>
    <div class="eg-money"></div>
  </div>`
  }

  const isOpen = () => !root.hidden
  function refresh() {
    const m = q('.eg-money')
    if (m) m.textContent = `You have ${money(player.money)}`
  }
  function open(s) {
    document.exitPointerLock?.() // the cursor is needed for the buttons
    stand = s
    eggKey = s.egg
    render(EGGS[eggKey])
    refresh()
    backdrop.hidden = root.hidden = false
  }
  function close() {
    backdrop.hidden = root.hidden = true
  }

  root.addEventListener('click', (e) => {
    if (e.target.closest('.eg-close')) return close()
    const btn = e.target.closest('.eg-btn')
    if (!btn) return
    const res = tryHatch(eggKey, +btn.dataset.n)
    if (res.error) return toast(res.error)
    close()
    overlay.play(res)
  })
  root.addEventListener('pointerdown', (e) => {
    if (e.target === root) close()
  })
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && isOpen()) close()
  })

  const dist = (s) => Math.hypot(player.position.x - s.x, player.position.z - s.z)

  return {
    // Per frame: offer the prompt next to an egg; an open window shuts when the player leaves.
    update() {
      if (overlay.isPlaying()) return
      if (isOpen()) {
        if (dist(stand) > stand.close) close()
        else refresh()
        return
      }
      let best = null
      let bestD = Infinity
      for (const s of EGG_STANDS) {
        const d = dist(s)
        if (d < s.open && d < bestD) [best, bestD] = [s, d]
      }
      if (best) offer(`Hatch ${EGGS[best.egg].name}`, () => open(best), bestD)
    },
  }
}
