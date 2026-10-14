// Timed multipliers earned from Daily Rewards ('strength' scales digging + Training gains, 'cash' scales
// Sell payouts). Stored on `player.boosts` as { kind: { mult, until } } with `until` in server epoch ms,
// so they keep running across reloads and are saved through net.js.
import { player } from './player.js'
import { serverNow } from './net.js'

player.boosts ??= {}

export function boostMult(kind) {
  const b = player.boosts[kind]
  if (!b) return 1
  if (b.until <= serverNow()) {
    delete player.boosts[kind]
    return 1
  }
  return b.mult
}

// Same multiplier -> time is added; a different one replaces the old boost if it is stronger.
export function addBoost(kind, mult, minutes) {
  const ms = minutes * 60000
  const b = player.boosts[kind] && player.boosts[kind].until > serverNow() ? player.boosts[kind] : null
  if (b && b.mult === mult) b.until += ms
  else if (!b || mult > b.mult) player.boosts[kind] = { mult, until: serverNow() + ms }
}

// [{ kind, mult, left (ms) }] for the HUD pills.
export const activeBoosts = () =>
  Object.keys(player.boosts)
    .filter((k) => boostMult(k) > 1)
    .map((k) => ({ kind: k, mult: player.boosts[k].mult, left: player.boosts[k].until - serverNow() }))
