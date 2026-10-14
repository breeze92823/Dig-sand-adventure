import './loot.css'
import { player } from './player.js'
import { SELL } from './config.js'
import { ITEM_CATALOG, RARITY_ROW_BG } from './data/loot.js'
import { offer, toast } from './interact.js'
import { cashMult, CASH } from './rebirth.js'
import { petMultiplier } from './pets.js'
import { valueMult } from './upgrades.js'
import { boostMult } from './boosts.js'

// The Sell Loot stall: press E next to it to open the window, sell one kind of item or everything
// in the bag for its listed value x the rebirth cash multiplier x the pet multiplier. A locked item kind is skipped by Sell All and
// refused by its own Sell button. Walking away or Esc closes it.

const GLYPH = Object.fromEntries(ITEM_CATALOG.map(([name, , glyph]) => [name, glyph]))
// Face value of one item with the rebirth cash multiplier applied.
const worth = (it) => Math.round(it.value * cashMult(player.rebirths) * petMultiplier() * valueMult() * boostMult('cash'))
const money = (n) => '$' + n.toLocaleString('en-US')

// Bag items grouped by name: [{ name, rarity, count, value }] (value = total $ for the group).
function groupBag(bag) {
  const groups = new Map()
  for (const it of bag) {
    const g = groups.get(it.name) ?? { name: it.name, rarity: it.rarity, count: 0, value: 0 }
    g.count += 1
    g.value += worth(it)
    groups.set(it.name, g)
  }
  return [...groups.values()].sort((a, b) => b.value - a.value)
}

const html = () => `
<div class="lt-panel sl-panel">
  <div class="lt-head sl-head">
    <span class="sl-logo">${CASH}</span><span class="lt-title">Sell Loot</span><button class="lt-close"></button>
  </div>
  <div class="lt-body">
    <div class="sl-row sl-top">
      <span class="sl-icon">🎒</span>
      <span class="sl-name"><b class="sl-total"></b><u class="sl-sub"></u></span>
      <button class="sl-all">Sell All</button>
    </div>
    <div class="sl-list"></div>
  </div>
</div>`

export function createSell() {
  player.sellLocked ??= new Set() // item names the player locked
  const backdrop = document.createElement('div')
  backdrop.className = 'lt-backdrop'
  const root = document.createElement('div')
  root.className = 'lt-overlay'
  backdrop.hidden = root.hidden = true
  root.innerHTML = html()
  document.body.append(backdrop, root)
  const q = (s) => root.querySelector(s)

  const unlocked = () => player.bag.filter((it) => !player.sellLocked.has(it.name))

  function refresh() {
    const groups = groupBag(player.bag)
    q('.sl-sub').textContent = `Bag ${player.bag.length}/${player.bagSlots} - empty your backpack for cash`
    q('.sl-list').innerHTML = groups.length
      ? groups
          .map(
            (g) => `<div class="sl-row">
            <span class="sl-icon">${GLYPH[g.name] ?? '❓'}</span>
            <span class="sl-name">${g.name}${g.count > 1 ? ` x${g.count}` : ''}<i style="color:${RARITY_ROW_BG[g.rarity]}">${g.rarity}</i></span>
            <button class="sl-lock" data-name="${g.name}">${player.sellLocked.has(g.name) ? '🔒' : '🔓'}</button>
            <button class="sl-sell" data-name="${g.name}"${player.sellLocked.has(g.name) ? ' disabled' : ''}>${money(g.value)}</button></div>`,
          )
          .join('')
      : '<div class="sl-empty">Your bag is empty. Dig up some loot!</div>'
    const total = unlocked().reduce((n, it) => n + worth(it), 0)
    q('.sl-total').textContent = `Sell All (${money(total)})`
    q('.sl-all').disabled = !unlocked().length
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

  function sell(items) {
    if (!items.length) return
    const gain = items.reduce((n, it) => n + worth(it), 0)
    const sold = new Set(items)
    player.money += gain
    player.bag = player.bag.filter((it) => !sold.has(it))
    toast(`Sold for ${money(gain)}`)
    refresh()
  }

  root.addEventListener('click', (e) => {
    const lock = e.target.closest('.sl-lock')
    const b = e.target.closest('.sl-sell')
    if (lock) {
      const n = lock.dataset.name
      if (!player.sellLocked.delete(n)) player.sellLocked.add(n)
      refresh()
    } else if (b) sell(player.bag.filter((it) => it.name === b.dataset.name && !player.sellLocked.has(it.name)))
    else if (e.target.closest('.sl-all')) sell(unlocked())
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
      const d = Math.hypot(player.position.x - SELL.x, player.position.z - SELL.z)
      if (isOpen()) {
        if (d > SELL.close) close()
      } else if (d < SELL.open) offer('Sell Loot', open, d)
    },
  }
}
