import './daily.css'
import { player } from './player.js'
import { CASH } from './rebirth.js'
import { TRAILS_BY_ID } from './data/trails.js'
import { SHOVELS_BY_ID, START_SHOVEL } from './data/shovels.js'
import { shovelIcon } from './shovelIcons.js'
import { svgIcon } from './shovels.js'
import { icon as trailIcon } from './trails.js'
import { addBoost, activeBoosts } from './boosts.js'
import { toast } from './interact.js'
import { serverNow } from './net.js'

// Daily Rewards (HUD "Daily" button): one reward per day (server UTC date), days 1-7 then the next week
// starts. Boost rewards are timed multipliers (boosts.js); the trail and the Eclipse shovel are added to
// the player's collection. Progress lives on `player.daily` and is saved through net.js.
player.daily ??= { day: 0, week: 1, last: '' } // day = rewards claimed this week, last = UTC date of the last claim
const state = () => player.daily // net.js hydrate may replace the object

export const REWARDS = [
  { boost: 'strength', mult: 2, min: 10 },
  { trail: 'goldensand' },
  { boost: 'cash', mult: 2, min: 10 },
  { boost: 'strength', mult: 2, min: 10 },
  { boost: 'strength', mult: 4, min: 15 },
  { boost: 'cash', mult: 4, min: 15 },
  { shovel: 'eclipse' },
]

const today = () => new Date(serverNow()).toISOString().slice(0, 10)
export const canClaim = () => state().last !== today()

const label = (r) =>
  r.boost
    ? `${r.mult}x ${r.boost === 'cash' ? 'Cash' : 'Strength'}`
    : r.trail
      ? TRAILS_BY_ID[r.trail].name
      : SHOVELS_BY_ID[r.shovel].name
const sub = (r) =>
  r.boost ? `${r.min} minutes` : r.trail ? `${TRAILS_BY_ID[r.trail].mult}x Strength` : SHOVELS_BY_ID[r.shovel].desc

const art = (r) => {
  if (r.boost === 'cash') return CASH
  if (r.boost) return '<em>💪</em>'
  if (r.trail) return trailIcon(TRAILS_BY_ID[r.trail], 'dl')
  const url = shovelIcon(r.shovel)
  return url ? `<img src="${url}" alt="">` : svgIcon(SHOVELS_BY_ID[r.shovel])
}

const CAL = `<svg viewBox="0 0 64 64"><rect x="4" y="9" width="56" height="51" rx="9" fill="#fff" stroke="#1b1f3b" stroke-width="4"/>
<path d="M4 18a9 9 0 0 1 9-9h38a9 9 0 0 1 9 9v7H4z" fill="#e5322d" stroke="#1b1f3b" stroke-width="4"/>
<rect x="17" y="2" width="6" height="14" rx="3" fill="#ddd" stroke="#1b1f3b" stroke-width="3"/><rect x="41" y="2" width="6" height="14" rx="3" fill="#ddd" stroke="#1b1f3b" stroke-width="3"/>
<text x="32" y="53" text-anchor="middle" font-family="Fredoka,sans-serif" font-weight="800" font-size="26" fill="#1b1f3b">${new Date().getDate()}</text></svg>`

export function createDaily() {
  const backdrop = document.createElement('div')
  backdrop.className = 'rb-backdrop'
  const root = document.createElement('div')
  root.className = 'dl-overlay'
  backdrop.hidden = root.hidden = true
  root.innerHTML = `
  <div class="dl-wrap">
    <div class="dl-panel">
      <div class="dl-head"><span class="dl-cal">${CAL}</span><span class="dl-title"></span><button class="dl-close"></button></div>
      <div class="dl-body"><div class="dl-grid"></div></div>
    </div>
    <button class="dl-claim"><span>Claim reward</span></button>
  </div>`
  document.body.append(backdrop, root)
  const q = (s) => root.querySelector(s)

  const boostBar = document.createElement('div')
  boostBar.className = 'dl-boosts'
  document.body.appendChild(boostBar)

  function refresh() {
    q('.dl-title').textContent = `Daily Rewards - Week ${state().week}`
    const ready = canClaim()
    q('.dl-grid').innerHTML = REWARDS.map((r, i) => {
      const st = i < state().day ? 'claimed' : i === state().day ? (ready ? 'ready' : 'next') : 'locked'
      const txt = { claimed: 'Claimed', ready: 'Claim', next: 'Tomorrow', locked: 'Locked' }[st]
      const art1 = `<span class="dl-art">${art(r)}</span>`
      return i === 6
        ? `<div class="dl-card dl-big ${st}"><b class="dl-day">Day 7</b>${art1}<b class="dl-name">${label(r)}</b><i class="dl-sub">${sub(r)}</i><b class="dl-state">${txt}</b></div>`
        : `<div class="dl-card ${st}"><b class="dl-day">Day ${i + 1}</b>${art1}<b class="dl-name">${label(r)}</b><i class="dl-sub">${sub(r)}</i><b class="dl-state">${txt}</b></div>`
    }).join('')
    const btn = q('.dl-claim')
    btn.classList.toggle('ready', ready)
    btn.firstChild.textContent = ready ? 'Claim reward' : 'Come back tomorrow'
    document.querySelector('.hud-side[data-id="daily"]')?.classList.toggle('has-reward', ready)
  }

  function claim() {
    if (!canClaim()) return
    const r = REWARDS[state().day]
    if (r.boost) addBoost(r.boost, r.mult, r.min)
    else if (r.trail) {
      player.trails ??= new Set()
      player.trails.add(r.trail)
    } else {
      player.shovels ??= new Set([START_SHOVEL])
      player.shovels.add(r.shovel)
    }
    toast(`Claimed ${label(r)}!`)
    const d = state()
    d.last = today()
    if (++d.day >= REWARDS.length) {
      d.day = 0
      d.week++
    }
    refresh()
  }

  const isOpen = () => !root.hidden
  const open = () => {
    document.exitPointerLock?.()
    refresh()
    backdrop.hidden = root.hidden = false
  }
  const close = () => {
    backdrop.hidden = root.hidden = true
  }

  q('.dl-close').addEventListener('click', close)
  q('.dl-claim').addEventListener('click', claim)
  root.addEventListener('pointerdown', (e) => {
    if (e.target === root || e.target === q('.dl-wrap')) close()
  })
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && isOpen()) close()
  })
  document.addEventListener('click', (e) => {
    if (e.target.closest('.hud-side[data-id="daily"]')) isOpen() ? close() : open()
  })

  // Active boost pills with a countdown; also keeps the Daily button badge current (day rollover).
  let shownReady = null
  setInterval(() => {
    const list = activeBoosts()
    boostBar.innerHTML = list
      .map((b) => {
        const s = Math.ceil(b.left / 1000)
        return `<div class="dl-pill ${b.kind}"><b>${b.mult}x ${b.kind === 'cash' ? 'Cash' : 'Strength'}</b><i>${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}</i></div>`
      })
      .join('')
    const ready = canClaim()
    if (ready !== shownReady) {
      shownReady = ready
      document.querySelector('.hud-side[data-id="daily"]')?.classList.toggle('has-reward', ready)
    }
  }, 500)

  return { open, close, refresh }
}
