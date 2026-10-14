import './loot.css'
import { player } from './player.js'
import { SHOVEL_SHOP } from './config.js'
import { SHOVELS, SHOVELS_BY_ID, SHOVEL_ROW_BG, START_SHOVEL } from './data/shovels.js'
import { shovelIcon } from './shovelIcons.js'
import { offer, toast } from './interact.js'

// The Digging Tools stall: press E next to it to open the window, buy shovels with $ and equip one.
// The equipped shovel's strength bonus is added to the player's strength when digging. Walking away
// or Esc closes it.

// Strength bonus of the equipped shovel (dig.js adds it to player.strength).
// Eclipse (Daily Rewards) is worth 2x the best regular shovel owned.
export const shovelBonus = () => {
  if (player.shovel === 'eclipse') {
    let best = 0
    for (const id of player.shovels ?? []) if (!SHOVELS_BY_ID[id]?.locked) best = Math.max(best, SHOVELS_BY_ID[id].bonus)
    return best * 2
  }
  return SHOVELS_BY_ID[player.shovel]?.bonus ?? 0
}

const money = (n) => '$' + n.toLocaleString('en-US')
const short = (n) => {
  const u = [[1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']].find(([v]) => n >= v)
  return u ? +(n / u[0]).toFixed(2) + u[1] : String(n)
}
const shortMoney = (n) => '$' + short(n)

// Flat SVG shovel: only the header logo uses it now (rows use the rendered 3D icon).
export const svgIcon = (s) => `<svg viewBox="0 0 60 120"><g stroke="#10131c" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round">
<path d="M30 6v66" stroke="${s.shaft}" stroke-width="7" fill="none"/><path d="M30 6v66" stroke="#10131c" stroke-width="12" fill="none" opacity="0.25"/>
<path d="M18 8c0-6 24-6 24 0v6c0 2-24 2-24 0z" fill="${s.grip}"/>
<path d="M22 66h16l8 12c4 12 2 30-16 38C12 108 10 90 14 78z" fill="${s.blade}"/>
<path d="M30 80v30" stroke="${s.trim}" stroke-width="4" fill="none"/></g></svg>`

const iconHtml = (s) => {
  const url = shovelIcon(s.id)
  return url ? `<img src="${url}" alt="${s.name}">` : svgIcon(s)
}

const html = () => `
<div class="lt-panel sv-panel">
  <div class="lt-head sv-head">
    <span class="sv-logo">${svgIcon(SHOVELS_BY_ID.steel)}</span><span class="lt-title">Digging Tools</span>
    <span class="sv-world">World 1 &#9654;</span><button class="lt-close"></button>
  </div>
  <div class="lt-body"><div class="sv-list"></div></div>
</div>`

export function createShovels() {
  player.shovels ??= new Set([START_SHOVEL]) // owned shovel ids
  player.shovel ??= START_SHOVEL // equipped shovel id
  const backdrop = document.createElement('div')
  backdrop.className = 'lt-backdrop'
  const root = document.createElement('div')
  root.className = 'lt-overlay'
  backdrop.hidden = root.hidden = true
  root.innerHTML = html()
  document.body.append(backdrop, root)
  const q = (s) => root.querySelector(s)

  function refresh() {
    // Fixed catalog order (cheapest first): buying / equipping never moves a row.
    const list = q('.sv-list')
    const scroll = list.scrollTop
    list.innerHTML = SHOVELS
      .map((s) => {
        const equipped = s.id === player.shovel
        const owned = player.shovels.has(s.id)
        const btn = s.locked && !owned
          ? `<button class="sv-btn locked" disabled>${s.locked}</button>`
          : equipped
          ? '<button class="sv-btn equipped" disabled>Equipped</button>'
          : owned
            ? `<button class="sv-btn equip" data-id="${s.id}">Equip</button>`
            : `<button class="sv-btn buy${player.money < s.cost ? ' poor' : ''}" data-id="${s.id}">${shortMoney(s.cost)}</button>`
        return `<div class="sv-row" style="--bg:${SHOVEL_ROW_BG[s.rarity]}">
          <span class="sv-icon">${iconHtml(s)}</span>
          <span class="sv-info"><b>${s.name}</b><i>${s.rarity}</i><u>&#128170; ${s.desc ?? `+${short(s.bonus)} Strength`}</u></span>${btn}</div>`
      })
      .join('')
    list.scrollTop = scroll
  }

  const isOpen = () => !root.hidden
  function open() {
    document.exitPointerLock?.() // the cursor is needed for the buttons
    refresh()
    backdrop.hidden = root.hidden = false
  }
  function close() {
    backdrop.hidden = root.hidden = true
  }

  root.addEventListener('click', (e) => {
    const b = e.target.closest('.sv-btn')
    if (!b || b.disabled) return
    const s = SHOVELS_BY_ID[b.dataset.id]
    if (s.locked && !player.shovels.has(s.id)) return
    if (!player.shovels.has(s.id)) {
      if (player.money < s.cost) return toast(`Need ${money(s.cost)}`)
      player.money -= s.cost
      player.shovels.add(s.id)
      toast(`Bought ${s.name}`)
    }
    player.shovel = s.id
    refresh()
  })
  q('.lt-close').addEventListener('click', close)
  root.addEventListener('pointerdown', (e) => {
    if (e.target === root) close()
  })
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && isOpen()) close()
  })

  return {
    // Per frame: offer the prompt next to the stall; an open window shuts when the player leaves.
    update() {
      const d = Math.hypot(player.position.x - SHOVEL_SHOP.x, player.position.z - SHOVEL_SHOP.z)
      if (isOpen()) {
        if (d > SHOVEL_SHOP.close) close()
      } else if (d < SHOVEL_SHOP.open) offer('Digging Tools', open, d)
    },
  }
}
