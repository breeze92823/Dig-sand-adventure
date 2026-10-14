import './loot.css'
import { player } from './player.js'
import { ITEM_CATALOG, RARITIES, RARITY } from './data/loot.js'
import { toast } from './interact.js'
import { playDiscover } from './audio.js'

// The Index window: every item in the catalog (data/loot.js) by rarity. Items the player has
// picked up at least once are discovered (player.found, a Set of names); the rest show as ???.

const TABS = [
  ['all', 'All'],
  ['found', 'Found'],
  ['missing', 'Missing'],
]

const html = () => `
<div class="lt-panel">
  <div class="lt-head">
    <span class="lt-title">Loot Index</span><button class="lt-close"></button>
  </div>
  <span class="lt-logo">📕</span>
  <div class="lt-body">
    <div class="lt-found"></div>
    <div class="lt-tabs">
      ${TABS.map(([id, label]) => `<button class="lt-tab" data-tab="${id}">${label}</button>`).join('')}
      <button class="lt-tab lt-rarity-btn"></button>
    </div>
    <div class="lt-grid"></div>
  </div>
</div>`

// "New loot" reveal: a rotating sunburst with the item, then it shrinks into the Index button.
function showNew(name) {
  const entry = ITEM_CATALOG.find((i) => i[0] === name)
  if (!entry) return toast(`New loot: ${name}!`)
  const [, r, glyph] = entry
  const el = document.createElement('div')
  el.className = 'lt-new'
  el.style.setProperty('--c', RARITY[r].fill)
  el.style.setProperty('--g', RARITY[r].glow)
  el.innerHTML = `<div class="lt-new-rays"></div><div class="lt-new-box"><span class="lt-new-tag">NEW!</span>
    <span class="lt-new-icon">${glyph}</span><span class="lt-new-name">${name}</span><span class="lt-new-rarity">${r}</span></div>`
  document.body.append(el)
  const box = el.querySelector('.lt-new-box')
  setTimeout(() => {
    const b = document.querySelector('.hud-side[data-id="index"]')?.getBoundingClientRect()
    const a = box.getBoundingClientRect()
    if (b) box.style.transform = `translate(${b.left + b.width / 2 - (a.left + a.width / 2)}px, ${b.top + b.height / 2 - (a.top + a.height / 2)}px) scale(0.08)`
    el.classList.add('out')
  }, 1900)
  setTimeout(() => el.remove(), 2600)
}

export function createLootWindow() {
  if (!player.found) player.found = new Set()
  // The blur sits under the HUD (z 10) so the HUD stays crisp; the panel sits above it (same as rebirth.js).
  const backdrop = document.createElement('div')
  backdrop.className = 'lt-backdrop'
  const root = document.createElement('div')
  root.className = 'lt-overlay'
  backdrop.hidden = root.hidden = true
  root.innerHTML = html()
  document.body.append(backdrop, root)
  const q = (s) => root.querySelector(s)

  let tab = 'all'
  let rarity = -1 // -1 = all rarities

  function refresh() {
    const found = player.found
    q('.lt-found').textContent = `Loot Found: ${found.size} / ${ITEM_CATALOG.length}`
    root.querySelectorAll('.lt-tab[data-tab]').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab))
    q('.lt-rarity-btn').textContent = rarity < 0 ? 'All Rarities' : RARITIES[rarity]
    q('.lt-grid').innerHTML = ITEM_CATALOG.filter(([name, r]) => {
      if (tab === 'found' && !found.has(name)) return false
      if (tab === 'missing' && found.has(name)) return false
      return rarity < 0 || r === RARITIES[rarity]
    })
      .map(([name, r, glyph]) => {
        const has = found.has(name)
        return `<div class="lt-card${has ? '' : ' locked'}" style="border-color:${RARITY[r].fill}">
          <span class="lt-card-rarity" style="color:${RARITY[r].fill}">${r}</span><span class="lt-card-icon">${glyph}</span>
          <span class="lt-card-name">${has ? name : '???'}</span></div>`
      })
      .join('')
  }

  const open = () => {
    refresh()
    backdrop.hidden = root.hidden = false
  }
  const close = () => {
    backdrop.hidden = root.hidden = true
  }

  root.addEventListener('click', (e) => {
    const t = e.target.closest('.lt-tab')
    if (!t) return
    if (t.dataset.tab) tab = t.dataset.tab
    else rarity = rarity + 1 >= RARITIES.length ? -1 : rarity + 1
    refresh()
  })
  q('.lt-close').addEventListener('click', close)
  root.addEventListener('pointerdown', (e) => {
    if (e.target === root) close()
  })
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && !root.hidden) close()
  })
  // The HUD Index button toggles the window.
  document.addEventListener('click', (e) => {
    if (e.target.closest('.hud-side[data-id="index"]')) root.hidden ? open() : close()
  })

  // Called when an item is picked up. Returns true (and toasts) the first time it is found.
  const discover = (name) => {
    if (player.found.has(name)) return false
    player.found.add(name)
    showNew(name)
    playDiscover()
    if (!root.hidden) refresh()
    return true
  }
  return { open, close, refresh, discover }
}
