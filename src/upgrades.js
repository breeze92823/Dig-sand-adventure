import './upgrades.css'
import { player } from './player.js'
import { UPGRADES } from './config.js'
import { offer, toast } from './interact.js'

// The Upgrades stall: press E next to it to open the window and buy permanent upgrades with $.
// Range = longer dig reach, Agility = faster digging, Capacity = more backpack slots, Mobility = walk speed, Value = sell payouts, Magnet = loot pickup range.
// Walking away or Esc closes it.

const BASE_SLOTS = 3
const lv = (id) => player.upgrades?.[id] ?? 0
// Multipliers read by dig.js.
export const digSpeedMult = () => 1 + UPGRADES.agility.perLevel * lv('agility')
export const digReachMult = () => 1 + UPGRADES.range.perLevel * lv('range')

export const valueMult = () => 1 + UPGRADES.value.perLevel * lv('value')
export const pickupMult = () => 1 + UPGRADES.magnet.perLevel * lv('magnet')

const cost = (id) => Math.round(UPGRADES[id].cost * UPGRADES[id].growth ** lv(id))
const short = (n) => {
  const u = [[1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']].find(([v]) => n >= v)
  return u ? +(n / u[0]).toFixed(2) + u[1] : String(n)
}
const pct = (n) => +(n * 100).toFixed(2)

const SHOVEL = (extra) => `<svg viewBox="0 0 100 100">${extra}<g stroke="#12323a" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round">
<path d="M58 14 74 30" stroke="#e8631a" stroke-width="9" fill="none"/><path d="M52 10c4-6 20 0 24 6 2 6-4 10-10 8z" fill="#f07a24"/>
<path d="M62 30 72 40 52 70c-6 10-20 14-30 6 4-14 14-22 24-30z" fill="#37b7bf"/><path d="M62 30 72 40 52 70 40 60z" fill="#52d3d6"/></g></svg>`
const ICONS = {
  mobility: `<svg viewBox="0 0 100 100"><g stroke="#4a1a1a" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round">
<path d="M70 28c8-10 20-10 24-4-6 2-10 6-14 12z" fill="#fff"/><path d="M12 50c0-16 20-24 30-14l6 8 24 8c10 4 12 20 4 24H20c-8 0-8-14-8-26z" fill="#f0605a"/>
<path d="M10 70h74c2 8-4 14-10 14H22c-10 0-12-8-12-14z" fill="#f4e6c8"/><path d="M40 52l12-4M44 62l14-4" stroke="#fff"/></g></svg>`,
  value: `<svg viewBox="0 0 100 100"><g stroke="#123a14" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round">
<circle cx="36" cy="36" r="17" fill="#3c9a3a"/><circle cx="64" cy="36" r="17" fill="#3c9a3a"/><circle cx="36" cy="64" r="17" fill="#3c9a3a"/><circle cx="64" cy="64" r="17" fill="#3c9a3a"/>
<path d="M50 50 40 94" fill="none" stroke="#5a7a2a" stroke-width="6"/><path d="M50 50 30 30M50 50l20-20M50 50 30 70M50 50l20 20" fill="none" stroke="#2a7428"/></g></svg>`,
  magnet: `<svg viewBox="0 0 100 100"><g stroke="#2a0a0a" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round">
<path d="M16 80V46c0-40 68-40 68 0v34H64V46c0-16-28-16-28 0v34z" fill="#d8201e"/><path d="M16 80h20v-12H16zM64 80h20v-12H64z" fill="#9ac8f0"/></g></svg>`,
  range: SHOVEL('<ellipse cx="38" cy="82" rx="30" ry="9" fill="none" stroke="#2f8de0" stroke-width="5"/>'),
  agility: SHOVEL('<g stroke="#2f8de0" stroke-width="5" stroke-linecap="round" fill="none"><path d="M70 68c8 2 14 6 18 12M62 76c6 2 10 5 13 10"/></g>'),
  capacity: `<svg viewBox="0 0 100 100"><g stroke="#4a0f0a" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round">
<path d="M26 34c-10 4-12 30-6 38l10 4V38z" fill="#c4281d"/><path d="M74 34c10 4 12 30 6 38l-10 4V38z" fill="#c4281d"/>
<path d="M30 28c0-12 40-12 40 0l4 52c0 8-48 8-48 0z" fill="#e0382a"/><path d="M34 52h32v22c0 6-32 6-32 0z" fill="#c4281d"/>
<rect x="45" y="44" width="10" height="14" rx="2" fill="#f2a43a"/></g></svg>`,
}

const html = () => `
<div class="up-panel">
  <div class="up-head"><span class="up-logo"><svg viewBox="0 0 100 100"><g fill="none" stroke="#0e3b14" stroke-width="16" stroke-linejoin="round" stroke-linecap="round"><path d="M12 46 50 14l38 32"/><path d="M12 80 50 48l38 32"/></g>
<g fill="none" stroke="#3fd24a" stroke-width="9" stroke-linejoin="round" stroke-linecap="round"><path d="M12 46 50 14l38 32"/><path d="M12 80 50 48l38 32"/></g></svg></span>
  <span class="up-title">Upgrades</span><button class="up-close"></button></div>
  <div class="up-list"></div>
</div>`

export function createUpgrades() {
  player.upgrades ??= { range: 0, agility: 0, capacity: 0, mobility: 0, value: 0, magnet: 0 }
  const backdrop = document.createElement('div')
  backdrop.className = 'up-backdrop'
  const root = document.createElement('div')
  root.className = 'up-overlay'
  backdrop.hidden = root.hidden = true
  root.innerHTML = html()
  document.body.append(backdrop, root)
  const q = (s) => root.querySelector(s)

  let shown = ''
  function refresh() {
    const rows = ['range', 'agility', 'capacity', 'mobility', 'value', 'magnet']
      .map((id) => {
        const u = UPGRADES[id]
        const maxed = u.max != null && lv(id) >= u.max
        const c = cost(id)
        const afford = player.money >= c
        const bonus = pct(u.perLevel * lv(id))
        const current = {
          capacity: `Current: ${player.bagSlots} slots`,
          mobility: `Current: ${player.moveSpeed} walk speed`,
          range: `Current: +${bonus}% radius`,
          agility: `Current: +${bonus}% speed`,
          value: `Current: +${bonus}% sale value`,
          magnet: `Current: +${bonus}% pickup range`,
        }[id]
        return `<div class="up-row ${id}">
          <span class="up-icon">${ICONS[id]}</span>
          <span class="up-name">${u.name}</span><span class="up-lv">Lv.${lv(id)}</span>
          <span class="up-desc">${u.desc}</span><span class="up-cur">${current}</span>
          <button class="up-buy${afford && !maxed ? '' : ' off'}" data-id="${id}">${maxed ? 'MAX' : '$' + short(c)}</button>
        </div>`
      })
      .join('')
    if (rows !== shown) q('.up-list').innerHTML = shown = rows
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

  function buy(id) {
    const u = UPGRADES[id]
    if (u.max != null && lv(id) >= u.max) return
    const c = cost(id)
    if (player.money < c) return toast('Not enough cash!')
    player.money -= c
    player.upgrades[id]++
    if (id === 'capacity') player.bagSlots = BASE_SLOTS + lv(id)
    if (id === 'mobility') player.moveSpeed += u.perLevel
    refresh()
  }

  root.addEventListener('click', (e) => {
    const b = e.target.closest('.up-buy')
    if (b) buy(b.dataset.id)
  })
  q('.up-close').addEventListener('click', close)
  root.addEventListener('pointerdown', (e) => {
    if (e.target === root) close()
  })
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && isOpen()) close()
  })

  return {
    update() {
      const s = UPGRADES.stall
      const d = Math.hypot(player.position.x - s.x, player.position.z - s.z)
      if (isOpen()) {
        if (d > s.close) close()
        else refresh() // cash changes while open (affordability)
      } else if (d < s.open) offer('Upgrades', open, d)
    },
  }
}
