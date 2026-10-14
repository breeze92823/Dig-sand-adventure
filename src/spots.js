// Where the lane's loot is buried. Same scheme as the reference's leaf piles (piles.js): each luck
// band is tiled into piles ~PILE m across and a pile's centre is a possible loot spot. The x1 band
// drops a fixed plan spread evenly over it; every higher band drops with a chance that rises with
// the band (all of them from LUCK_LOOT.fullAt). Rolled once at build time; hub.js places a prop on
// each spot and lootDrops.js rolls the items.
import { HUB } from './config.js'
import { LUCK_LOOT, X1_DROPS } from './data/loot.js'
import { mulberry32 } from './textures.js'

const PILE = 6 // m, target width/depth of a pile
const NORTH = HUB.plaza.minZ // lane mouth
const L = HUB.lane.halfWidth
const LEN = HUB.zoneLen
export const ZONE_COUNT = HUB.laneBands.length

// Band index of a lane z.
export function zoneOf(z) {
  const i = Math.floor((NORTH - z) / LEN)
  return Math.max(0, Math.min(ZONE_COUNT - 1, i))
}

const nx = Math.max(1, Math.round((2 * L) / PILE)) // piles across the lane
const nz = Math.max(1, Math.round(LEN / PILE)) // piles along one band

// Pile centres of a band, ordered along the lane (near to far), then across.
function pilesOf(zone) {
  const list = []
  for (let pz = 0; pz < nz; pz++) {
    for (let px = 0; px < nx; px++) {
      list.push({ zone, x: -L + ((px + 0.5) * 2 * L) / nx, z: NORTH - zone * LEN - ((pz + 0.5) * LEN) / nz })
    }
  }
  return list
}

const zone0 = pilesOf(0)
const dropChance = (zone) => {
  const share = X1_DROPS.piles / zone0.length
  return Math.min(1, share + (1 - share) * (zone / LUCK_LOOT.fullAt))
}

// x1 plan: one pile from each of `count` equal slices of the band, so they spread over it.
function x1Plan() {
  const count = Math.min(X1_DROPS.piles, zone0.length)
  const rand = mulberry32(5)
  const uncommonAt = new Set(Array.from({ length: X1_DROPS.uncommon }, (_, u) => Math.floor(((u + 0.5) * count) / X1_DROPS.uncommon)))
  return Array.from({ length: count }, (_, k) => {
    const lo = Math.floor((k * zone0.length) / count)
    const hi = Math.floor(((k + 1) * zone0.length) / count)
    return { ...zone0[lo + Math.floor(rand() * (hi - lo))], rarity: uncommonAt.has(k) ? 'Uncommon' : 'Common' }
  })
}

// Every spot that holds loot: { x, z, zone, rarity? } (rarity is fixed only in the x1 plan).
export const spots = [...x1Plan()]
for (let zone = 1; zone < ZONE_COUNT; zone++) {
  for (const p of pilesOf(zone)) if (Math.random() < dropChance(zone)) spots.push(p)
}
