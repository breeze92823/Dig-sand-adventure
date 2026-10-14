import './hud.css'
import { player, respawn } from './player.js'
import { HUB, DIG } from './config.js'
import { rebirthLevel, createRebirthWindow } from './rebirth.js'
import { createDaily } from './daily.js'
import { createPetsWindow } from './petsWindow.js'
import { createLootWindow } from './loot.js'

// 1, 999, 1.5K, 26.2B ...
function formatNum(n) {
  const units = ['', 'K', 'M', 'B', 'T']
  let i = 0
  while (n >= 1000 && i < units.length - 1) {
    n /= 1000
    i++
  }
  return (i === 0 ? String(Math.floor(n)) : n.toFixed(1).replace(/\.0$/, '')) + units[i]
}

// Placeholder values until the digging gameplay exists; update through `hud.set`.
const state = {
  boosts: ['+780M', '+2.6B', '+7.8B'],
  luck: 1,
  dailyDay: new Date().getDate(),
}

const rebirthPct = () => Math.floor(Math.min(1, player.level / rebirthLevel()) * 100)
const levelFill = () => Math.min(100, (player.xp / player.xpNext) * 100) + '%'
const bagText = () => `${player.bag.length}/${player.bagSlots}`

const ROBUX = '<span class="hud-robux"></span>'
const FIST = '<span class="hud-fist">💪</span>'

const sideBtn = (id, icon, label, extra = '') =>
  `<button class="hud-side" data-id="${id}"><span class="hud-side-icon">${icon}${extra}</span><span class="hud-txt">${label}</span></button>`

// Lane depth bar: far band on top (flag), near band at the bottom, a marker for the player.
const trailHtml = () => `
<div class="hud-trail">
  <i class="hud-trail-flag">🏁</i>
  <div class="hud-trail-bar">
    ${HUB.laneBands
      .map(([, , c], i) => `<div class="hud-trail-seg" style="--c:${c}"><span class="hud-txt">${i + 1}</span></div>`)
      .reverse()
      .join('')}
    <div class="hud-trail-me"></div>
  </div>
</div>`

const html = () => `
<button class="hud-home"><span class="hud-txt">HOME</span></button>
${trailHtml()}
<div class="hud-top">
  <div class="hud-level"><div class="hud-level-fill" style="width:${levelFill()}"></div><span class="hud-txt hud-level-text">Level ${player.level} / ${rebirthLevel()}</span></div>
  <div class="hud-strength hud-txt"><span class="hud-strength-val">${formatNum(player.strength)}</span> Strength</div>
</div>

<div class="hud-left">
  <div class="hud-col hud-col-a">
    ${sideBtn('index', '📕', 'Index')}
    ${sideBtn('pets', '🐱', 'Pets')}
  </div>
  <div class="hud-col hud-col-b">
    ${sideBtn('rebirth', `<img class="hud-rebirth" src="${import.meta.env.BASE_URL}ui/rebirth.png" alt="" draggable="false">`, 'Rebirth', `<span class="hud-pct">${rebirthPct()}%</span>`)}
    ${sideBtn('daily', '<span class="hud-cal"><b></b><i>' + state.dailyDay + '</i></span>', 'Daily')}
  </div>
</div>

<div class="hud-stats">
  <div class="hud-stat"><span class="hud-stat-icon">⛰️</span><span class="hud-txt hud-stat-val hud-sand">${formatNum(player.sand)}</span></div>
  <div class="hud-stat"><span class="hud-stat-icon">🎒</span><span class="hud-txt hud-stat-val hud-backpack">${bagText()}</span></div>
  <div class="hud-stat"><span class="hud-txt hud-stat-val hud-cash">$${formatNum(player.money)}</span></div>
</div>
`

export let lootIndex = null

export function createHud() {
  const root = document.createElement('div')
  root.className = 'hud'
  root.innerHTML = html()
  document.body.appendChild(root)
  createRebirthWindow()
  createDaily()
  createPetsWindow()
  lootIndex = createLootWindow()
  // Strength lives on the player; refresh the label whenever it changes.
  const strengthEl = root.querySelector('.hud-strength-val')
  const cashEl = root.querySelector('.hud-cash')
  const levelEl = root.querySelector('.hud-level-text')
  const fillEl = root.querySelector('.hud-level-fill')
  const pctEl = root.querySelector('.hud-pct')
  let shown = player.strength
  let shownMoney = player.money
  let shownLevel = player.level
  let shownRebirths = player.rebirths
  const sandEl = root.querySelector('.hud-sand')
  let shownSand = player.sand
  const bagEl = root.querySelector('.hud-backpack')
  let shownBag = bagText()
  setInterval(() => {
    if (bagText() !== shownBag) {
      shownBag = bagText()
      bagEl.textContent = shownBag
    }
    if (player.sand !== shownSand) {
      shownSand = player.sand
      sandEl.textContent = formatNum(shownSand)
    }
    fillEl.style.width = levelFill()
    pctEl.textContent = rebirthPct() + '%'
    if (player.level !== shownLevel || player.rebirths !== shownRebirths) {
      shownLevel = player.level
      shownRebirths = player.rebirths
      levelEl.textContent = `Level ${shownLevel} / ${rebirthLevel()}`
    }
    if (player.strength !== shown) {
      shown = player.strength
      strengthEl.textContent = formatNum(shown)
    }
    if (player.money !== shownMoney) {
      shownMoney = player.money
      cashEl.textContent = '$' + formatNum(shownMoney)
    }
  }, 100)
  // Dig lane: menu + level bar give way to HOME and the depth bar (CSS does the animation).
  root.querySelector('.hud-home').addEventListener('click', respawn)
  const meEl = root.querySelector('.hud-trail-me')
  const laneSpan = DIG.safeZ - HUB.lane.endZ
  let wasInLane = false
  const laneLoop = () => {
    const p = player.position
    const t = Math.min(1, Math.max(0, (DIG.safeZ - p.z) / laneSpan))
    meEl.style.bottom = `calc(${t * 100}% - 1.2em)`
    const inLane = p.z < DIG.safeZ && Math.abs(p.x) < HUB.lane.halfWidth
    if (inLane !== wasInLane) root.classList.toggle('in-lane', (wasInLane = inLane))
    requestAnimationFrame(laneLoop)
  }
  laneLoop()
  // Releasing the pointer lock lets HUD buttons be clicked.
  root.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button') && document.pointerLockElement) document.exitPointerLock()
  })
  return root
}
