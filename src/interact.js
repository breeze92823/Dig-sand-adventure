// "Press E" prompt. Systems offer what is in reach each frame; the nearest one is shown and runs
// when E is pressed.
import './loot.css'
import { inputState } from './input.js'
import { playSfx } from './audio.js'

const el = document.createElement('div')
el.className = 'lt-prompt'
el.innerHTML = '<kbd>E</kbd><span></span>'
el.hidden = true
document.body.appendChild(el)
const text = el.querySelector('span')
el.addEventListener('pointerdown', (e) => {
  inputState.interact = true // the prompt is also clickable
  e.stopPropagation()
})

let best = null
let shown = null

export function offer(label, run, dist) {
  if (!best || dist < best.dist) best = { label, run, dist }
}

// Call once per frame after every system has offered.
export function resolveInteract() {
  const label = best ? best.label : null
  if (label !== shown) {
    shown = label
    if (label) text.textContent = label
    el.hidden = !label
  }
  if (best && inputState.interact) best.run()
  inputState.interact = false
  best = null
}

// A short message above the prompt ("Bag full!", "Sold for $120").
const toastEl = document.createElement('div')
toastEl.className = 'lt-toast'
document.body.appendChild(toastEl)
let toastTimer = 0
export function toast(msg) {
  toastEl.textContent = msg
  // "Need $X" / "Not enough ..." / "Bag full" read as errors -> red.
  const bad = /^(need|not enough|bag full|someone else)/i.test(msg)
  toastEl.classList.toggle('error', bad)
  if (bad) playSfx('error')
  else if (/^(collected|new loot|bought|claimed|.* equipped)/i.test(msg)) playSfx('good')
  else if (/^sold/i.test(msg)) playSfx('sell')
  toastEl.classList.remove('show')
  void toastEl.offsetWidth // restart the pop animation
  toastEl.classList.add('show')
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1800)
}
