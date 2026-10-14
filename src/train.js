import { player } from './player.js'
import { LEVEL_UP_POPUP, TRAIN } from './config.js'
import { strengthMult } from './rebirth.js'
import { toast } from './interact.js'
import { petMultiplier } from './pets.js'
import { trailMultiplier } from './trails.js'
import { boostMult } from './boosts.js'
import { playSfx } from './audio.js'

// Training Area pads (hub.js): standing on an unlocked pad trains with no click. Every TRAIN.interval s
// it adds strength (perTick x rebirth multiplier x pad mult x pet multiplier) and xp (perTick x pad mult). Reaching
// xpNext raises the level (xpNext = xpPerLevel x level). Rebirth pads
// need that many rebirths, paid pads stay locked until TRAIN.paidPads.

const PLAIN = { mult: 1 } // training by digging: no pad bonus
const round1 = (n) => Math.round(n * 10) / 10

export function createTraining(pads) {
  const gainEl = document.createElement('div')
  gainEl.className = 'tr-gain'
  const bannerEl = document.createElement('div')
  bannerEl.className = 'tr-levelup'
  bannerEl.innerHTML = '<b>LEVEL UP!</b><span></span>'
  gainEl.hidden = bannerEl.hidden = true
  document.body.append(gainEl, bannerEl)

  let last = -Infinity // ms of the last gain, so the first step on a pad gains at once
  let noticed = null
  let gainAnim = null
  let bannerAnim = null

  function padAt() {
    const { x, y, z } = player.position
    for (const p of pads) {
      if (Math.hypot(x - p.x, z - p.z) < p.radius && Math.abs(y - p.y) < 2) return p
    }
    return null
  }

  const lockReason = (p) => {
    if (p.paid) return TRAIN.paidPads ? null : 'This pad is not available yet!'
    if (player.rebirths < p.cost) return `Need ${p.cost} rebirth${p.cost === 1 ? '' : 's'} to use this pad!`
    return null
  }

  function showLevelUp() {
    bannerEl.querySelector('span').textContent = `Level ${player.level}`
    bannerEl.hidden = false
    const { inMs, holdMs, outMs } = LEVEL_UP_POPUP
    const total = inMs + holdMs + outMs
    bannerAnim?.cancel()
    bannerAnim = bannerEl.animate(
      [
        { opacity: 0, transform: 'translate(-50%, 0) scale(0.4)', offset: 0 },
        { opacity: 1, transform: 'translate(-50%, 0) scale(1.1)', offset: (inMs * 0.7) / total },
        { opacity: 1, transform: 'translate(-50%, 0) scale(1)', offset: inMs / total },
        { opacity: 1, transform: 'translate(-50%, 0) scale(1)', offset: (inMs + holdMs) / total },
        { opacity: 0, transform: 'translate(-50%, -3em) scale(1)', offset: 1 },
      ],
      { duration: total },
    )
    bannerAnim.onfinish = () => (bannerEl.hidden = true)
  }

  function showGain(n) {
    gainEl.textContent = `+${n} Strength 💪`
    gainEl.hidden = false
    gainAnim?.cancel()
    gainAnim = gainEl.animate(
      [
        { opacity: 1, transform: 'translate(-50%, 0)' },
        { opacity: 0, transform: 'translate(-50%, -2.5em)' },
      ],
      { duration: 900, easing: 'ease-out' },
    )
    gainAnim.onfinish = () => (gainEl.hidden = true)
  }

  function tick(p) {
    const gained = round1(TRAIN.perTick * strengthMult(player.rebirths) * p.mult * petMultiplier() * trailMultiplier() * boostMult('strength'))
    player.strength = round1(player.strength + gained)
    showGain(gained)
    playSfx('gain')
    player.xp += TRAIN.perTick * p.mult
    let up = false
    while (player.xp >= player.xpNext) {
      player.xp -= player.xpNext
      player.level += 1
      player.xpNext = TRAIN.xpPerLevel * player.level
      up = true
    }
    if (up) {
      showLevelUp()
      playSfx('levelUp')
    }
  }

  // One gain per TRAIN.interval, whichever source (pad or dig) asks.
  function trainAt(p) {
    const now = performance.now()
    if (now - last < TRAIN.interval * 1000) return
    last = now
    tick(p)
  }

  return {
    // True while standing on a pad that trains (main.js plays the dig animation then).
    padActive: false,
    // Call every frame. `digging` = the dig button is held: it trains at x1 (like holding the blow
    // button in the reference) and shares the pad cooldown. A usable pad under the player wins.
    update(digging = false) {
      const p = padAt()
      if (p !== noticed) {
        noticed = p
        const why = p && lockReason(p)
        if (why) toast(why)
      }
      this.padActive = !!p && !lockReason(p)
      if (this.padActive) trainAt(p)
      else if (digging) trainAt(PLAIN)
    },
  }
}
