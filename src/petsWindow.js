import './pets.css'
import { player } from './player.js'
import { RARITY_ROW_BG } from './data/loot.js'
import { PETS, equipBest, equippedPets, petInfo, petMultiplier, removePets, toggleEquip } from './pets.js'

// The Pets window (HUD Pets button): grid of owned pets, equip / delete, Equip Best, Multi Delete.

const fmt = (n) => String(+n.toFixed(2))

const html = () => `
<div class="pt-panel">
  <div class="pt-head">
    <span class="pt-title">Pets</span>
    <button class="pt-close"></button>
  </div>
  <span class="pt-logo">🐱</span>
  <div class="pt-body">
    <div class="pt-grid"></div>
    <div class="pt-detail"></div>
  </div>
  <div class="pt-foot">
    <div class="pt-counts"><div class="pt-storage"></div><div class="pt-equipped"></div></div>
    <div class="pt-total"></div>
    <button class="pt-best">Equip Best</button>
    <button class="pt-multi">Multi Delete</button>
  </div>
</div>`

export function createPetsWindow() {
  const root = document.createElement('div')
  const backdrop = document.createElement('div')
  backdrop.className = 'pt-backdrop'
  root.className = 'pt-overlay'
  root.innerHTML = html()
  backdrop.hidden = root.hidden = true
  document.body.append(backdrop, root)
  const q = (s) => root.querySelector(s)

  let selected = null // pet id in normal mode
  let multi = false
  const marked = new Set() // pet ids queued for multi delete

  function renderDetail() {
    const el = q('.pt-detail')
    const pet = player.pets.find((p) => p.id === selected)
    if (multi) {
      el.innerHTML = `<div class="pt-empty">Select pets to delete</div>${
        marked.size ? `<button class="pt-del-confirm">Delete ${marked.size}</button>` : ''
      }`
      return
    }
    if (!pet) {
      el.innerHTML = player.pets.length
        ? '<div class="pt-empty">Select a pet</div>'
        : '<div class="pt-empty">No pets yet! Hatch an egg by the portal.</div>'
      return
    }
    const k = petInfo(pet)
    el.innerHTML = `
      <div class="pt-big" style="--tint:${k.tint}">${k.emoji}</div>
      <div class="pt-name">${k.name}</div>
      <div class="pt-rarity" style="color:${RARITY_ROW_BG[k.rarity]}">${k.rarity}</div>
      <div class="pt-mult">+${fmt(k.power)} Strength &amp; Sell</div>
      <button class="pt-act ${pet.equipped ? 'off' : 'on'}" data-act="toggle">${pet.equipped ? 'Unequip' : 'Equip'}</button>
      <button class="pt-act del" data-act="delete">Delete</button>`
  }

  function refresh() {
    const pets = player.pets
    if (selected != null && !pets.some((p) => p.id === selected)) selected = null
    q('.pt-grid').innerHTML = pets
      .map((p) => {
        const k = petInfo(p)
        const cls = ['pt-card', p.equipped && 'equipped', p.id === selected && 'selected', marked.has(p.id) && 'marked']
        return `<button class="${cls.filter(Boolean).join(' ')}" data-id="${p.id}" style="border-color:${p.equipped || marked.has(p.id) ? '' : RARITY_ROW_BG[k.rarity]}">
          ${p.equipped ? '<span class="pt-check">✓</span>' : ''}<span class="pt-card-mult">+${fmt(k.power)}</span>
          <span class="pt-card-icon" style="--tint:${k.tint}">${k.emoji}</span><span class="pt-card-name">${k.name}</span></button>`
      })
      .join('')
    q('.pt-storage').textContent = `Storage ${pets.length}/${PETS.storage}`
    q('.pt-equipped').textContent = `Equipped ${equippedPets().length}/${PETS.equipSlots}`
    q('.pt-total').textContent = `x${fmt(petMultiplier())} Strength & Sell`
    q('.pt-multi').textContent = multi ? 'Cancel' : 'Multi Delete'
    q('.pt-multi').classList.toggle('active', multi)
    renderDetail()
  }

  q('.pt-grid').addEventListener('click', (e) => {
    const card = e.target.closest('.pt-card')
    if (!card) return
    const id = +card.dataset.id
    if (multi) marked.has(id) ? marked.delete(id) : marked.add(id)
    else selected = id
    refresh()
  })
  q('.pt-detail').addEventListener('click', (e) => {
    if (e.target.closest('.pt-del-confirm')) {
      removePets(marked)
      marked.clear()
      multi = false
      return refresh()
    }
    const act = e.target.closest('.pt-act')?.dataset.act
    const pet = player.pets.find((p) => p.id === selected)
    if (!act || !pet) return
    if (act === 'toggle') toggleEquip(pet)
    else removePets(new Set([pet.id]))
    refresh()
  })
  q('.pt-best').addEventListener('click', () => {
    equipBest()
    refresh()
  })
  q('.pt-multi').addEventListener('click', () => {
    multi = !multi
    marked.clear()
    refresh()
  })

  const open = () => {
    document.exitPointerLock?.() // the cursor is needed for the buttons
    refresh()
    backdrop.hidden = root.hidden = false
  }
  const close = () => {
    backdrop.hidden = root.hidden = true
    multi = false
    marked.clear()
  }
  q('.pt-close').addEventListener('click', close)
  root.addEventListener('pointerdown', (e) => {
    if (e.target === root) close()
  })
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && !root.hidden) close()
  })
  // The HUD Pets button toggles the window.
  document.addEventListener('click', (e) => {
    if (e.target.closest('.hud-side[data-id="pets"]')) root.hidden ? open() : close()
  })
  return { open, close, refresh }
}
