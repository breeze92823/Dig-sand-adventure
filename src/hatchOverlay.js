import './hatch.css'
import { EGGS, PETS_BY_ID } from './data/pets.js'
import { RARITY_ROW_BG } from './data/loot.js'
import { HATCH_MS } from './config.js'
import { playSfx } from './audio.js'

// The hatch animation: the egg (x1 or x3) wobbles harder and harder (`shake`), cracks in a white
// flash, and the pet cards pop out (`reveal`), with rays behind Rare and up. Click to skip a phase.

const RAYS_FROM = 2 // index in RARITIES: Rare

const RARITY_INDEX = { Common: 0, Uncommon: 1, Rare: 2, Epic: 3, Legendary: 4 }

export function createHatchOverlay() {
  const root = document.createElement('div')
  root.className = 'hatch'
  root.hidden = true
  document.body.append(root)

  let run = null // { hatch, phase, timers }

  const clear = () => run?.timers.forEach(clearTimeout)

  function finish() {
    clear()
    run = null
    root.hidden = true
    root.innerHTML = ''
  }

  function reveal() {
    if (!run || run.phase === 'reveal') return
    clear()
    run.phase = 'reveal'
    playSfx('hatch')
    playSfx('good')
    root.innerHTML =
      '<div class="hatch-flash"></div><div class="hatch-row">' +
      run.hatch.pets
        .map((p, i) => {
          const info = PETS_BY_ID[p.pid]
          const rank = RARITY_INDEX[info.rarity]
          const legendary = info.rarity === 'Legendary'
          return `<div class="hatch-slot reveal" style="--rarity:${RARITY_ROW_BG[info.rarity]};animation-delay:${i * 120}ms">
            ${rank >= RAYS_FROM ? `<div class="hatch-rays${legendary ? ' gold' : ''}"></div>` : ''}
            ${p.isNew ? '<div class="hatch-new">NEW!</div>' : ''}
            <div class="hatch-emoji">${info.emoji}</div>
            <div class="hatch-name">${info.name}</div>
            <div class="hatch-rar${legendary ? ' rainbow' : ''}" style="color:${RARITY_ROW_BG[info.rarity]}">${info.rarity}</div>
            <div class="hatch-pow">+${+info.power.toFixed(2)} Strength &amp; Sell</div>
          </div>`
        })
        .join('') +
      '</div><div class="hatch-skip">Click to continue</div>'
    run.timers = [setTimeout(finish, HATCH_MS.reveal)]
  }

  root.addEventListener('pointerdown', (e) => {
    e.stopPropagation()
    if (run?.phase === 'shake') reveal()
    else finish()
  })

  return {
    isPlaying: () => !!run,
    // hatch = tryHatch()'s result.
    play(hatch) {
      finish()
      document.exitPointerLock?.()
      const [a, b] = EGGS[hatch.egg].colors
      run = { hatch, phase: 'shake', timers: [] }
      root.innerHTML =
        '<div class="hatch-row">' +
        hatch.pets
          .map(
            (_, i) =>
              `<div class="hatch-slot"><span class="hatch-egg" style="--egg-a:${a};--egg-b:${b};animation-duration:${HATCH_MS.shake}ms,300ms;animation-delay:${i * -90}ms,0ms"></span></div>`,
          )
          .join('') +
        '</div><div class="hatch-skip">Click to skip</div>'
      root.hidden = false
      run.timers = [setTimeout(reveal, HATCH_MS.shake)]
    },
  }
}
