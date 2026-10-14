import './loot.css'
import { player } from './player.js'
import { TRAILS_STALL } from './config.js'
import { TRAILS, TRAILS_BY_ID } from './data/trails.js'
import { offer, toast } from './interact.js'

// The Trails stall: press E next to it to open the window. Buy trails with $ (the first is a free
// reward) and equip one; the equipped trail multiplies Training strength gains (train.js).
// Walking away or Esc closes it. Trails are saved through net.js.

const money = (n) =>
  '$' +
  (n >= 1e12 ? +(n / 1e12).toFixed(2) + 'T' : n >= 1e9 ? +(n / 1e9).toFixed(2) + 'B' : n >= 1e6 ? +(n / 1e6).toFixed(2) + 'M' : n >= 1e3 ? +(n / 1e3).toFixed(1) + 'K' : n)
const fmt = (n) => String(+n.toFixed(2))

export const trailMultiplier = () => TRAILS_BY_ID[player.trail]?.mult ?? 1

// Comet-with-eyes icon in a trail's colours.
export const icon = (t, i) => {
  const [a, b] = t.colors
  return `<svg viewBox="0 0 120 80"><defs><radialGradient id="tr${i}" cx="0.4" cy="0.35" r="0.8"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient></defs>
  <g stroke="#141414" stroke-width="3.5" stroke-linejoin="round">
  <path d="M4 66C26 64 36 50 52 40c8-6 14-4 20 2-4 12-14 24-30 28-12 3-26 0-38-4z" fill="url(#tr${i})"/>
  <path d="M10 30c18 0 28 4 40 12-10 2-22 0-40-12z" fill="url(#tr${i})"/>
  <circle cx="84" cy="42" r="26" fill="url(#tr${i})"/></g>
  <g stroke="#141414" stroke-width="2.5"><ellipse cx="80" cy="36" rx="7" ry="9" fill="#fff"/><ellipse cx="96" cy="38" rx="6.5" ry="8.5" fill="#fff"/></g>
  <ellipse cx="82" cy="38" rx="3.6" ry="5" fill="#141414"/><ellipse cx="97" cy="40" rx="3.4" ry="4.6" fill="#141414"/>
  <g fill="#fff" stroke="#141414" stroke-width="1.5"><path d="M24 20l3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/><path d="M52 62l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/></g></svg>`
}

export function createTrails() {
  player.trails ??= new Set() // owned trail ids
  player.trail ??= null // equipped trail id

  const backdrop = document.createElement('div')
  backdrop.className = 'lt-backdrop'
  const root = document.createElement('div')
  root.className = 'lt-overlay'
  backdrop.hidden = root.hidden = true
  root.innerHTML = `
  <div class="lt-panel">
    <div class="lt-head tr-head"><span class="lt-title tr-title">Trails</span><button class="lt-close"></button></div>
    <div class="lt-body tr-body"><div class="tr-list">${TRAILS.map(
      (t, i) => `<div class="tr-row" data-id="${t.id}" style="--a:${t.colors[2]};--b:${t.colors[3]}">
        <span class="tr-icon">${icon(t, i)}</span>
        <span class="tr-name">${t.name}<i>${fmt(t.mult)}x Strength</i></span>
        <button class="tr-btn" data-id="${t.id}"></button></div>`,
    ).join('')}</div></div>
  </div>`
  document.body.append(backdrop, root)

  function refresh() {
    for (const row of root.querySelectorAll('.tr-row')) {
      const t = TRAILS_BY_ID[row.dataset.id]
      const btn = row.querySelector('.tr-btn')
      const owned = player.trails.has(t.id)
      const on = player.trail === t.id
      btn.textContent = on ? 'Equipped' : owned ? 'Equip' : t.cost ? money(t.cost) : 'Free Reward'
      btn.classList.toggle('buy', !owned && t.cost > player.money)
      btn.classList.toggle('on', on)
    }
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
    if (e.target.closest('.lt-close')) return close()
    const btn = e.target.closest('.tr-btn')
    if (!btn) return
    const t = TRAILS_BY_ID[btn.dataset.id]
    if (player.trails.has(t.id)) {
      player.trail = player.trail === t.id ? null : t.id
    } else if (player.money < t.cost) {
      return toast('Not enough money!')
    } else {
      player.money -= t.cost
      player.trails.add(t.id)
      player.trail = t.id
      toast(`${t.name} equipped`)
    }
    refresh()
  })
  root.addEventListener('pointerdown', (e) => {
    if (e.target === root) close()
  })
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && isOpen()) close()
  })

  return {
    // Per frame: offer the prompt next to the stall; an open window shuts when the player leaves.
    update() {
      const d = Math.hypot(player.position.x - TRAILS_STALL.x, player.position.z - TRAILS_STALL.z)
      if (isOpen()) {
        if (d > TRAILS_STALL.close) close()
        else refresh()
      } else if (d < TRAILS_STALL.open) offer('Trails', open, d)
    },
  }
}
