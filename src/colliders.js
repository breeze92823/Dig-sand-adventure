import { GROUND_Y } from './config.js'

// Solid axis-aligned boxes the player stands on and bumps into. world builders call
// addBox(); player.js asks floorAt() for the surface under the feet and pushOut() to slide
// along walls. Anything up to STEP_UP above the feet is a step, not a wall.
export const STEP_UP = 0.65
const boxes = []

export function addBox(minX, maxX, minY, maxY, minZ, maxZ) {
  boxes.push({ minX, maxX, minY, maxY, minZ, maxZ })
}

// Invisible full-height wall: blocks the player at any height (no climbing or jumping on top)
// but is never a floor, so the camera still rides over it.
export function addWall(minX, maxX, minZ, maxZ) {
  boxes.push({ minX, maxX, minY: -1, maxY: 1000, minZ, maxZ, wall: true })
}

// Non-box floors (the diggable lane): fn(x, z) -> surface height, or -Infinity off the surface.
const samplers = []
export function addFloorSampler(fn) {
  samplers.push(fn)
}

// Highest surface under (x, z) that is no more than STEP_UP above `y`. With y = Infinity
// (the camera) every box counts, so the camera rides over cliffs instead of into them.
export function floorAt(x, z, y = Infinity) {
  let top = GROUND_Y
  for (const s of samplers) {
    const h = s(x, z, y)
    if (h > top && h <= y + STEP_UP) top = h
  }
  for (const b of boxes) {
    if (b.wall || x < b.minX || x > b.maxX || z < b.minZ || z > b.maxZ) continue
    if (b.maxY > top && b.maxY <= y + STEP_UP) top = b.maxY
  }
  return top
}

// Pushes a vertical capsule (feet at p.y, `height` tall, radius r) out of every box it
// overlaps that is too tall to step onto. Zeroes the velocity component into the wall.
const pushers = []
export function addPusher(fn) {
  pushers.push(fn)
}

export function pushOut(p, v, r, height) {
  // Two passes so a push out of one blocked cell can't leave the player inside its neighbour.
  for (let pass = 0; pass < 2; pass++) for (const fn of pushers) fn(p, v, r)
  for (const b of boxes) {
    if (b.maxY <= p.y + STEP_UP || b.minY >= p.y + height) continue
    const cx = Math.max(b.minX, Math.min(p.x, b.maxX))
    const cz = Math.max(b.minZ, Math.min(p.z, b.maxZ))
    const dx = p.x - cx
    const dz = p.z - cz
    const d2 = dx * dx + dz * dz
    if (d2 >= r * r) continue
    if (d2 > 1e-8) {
      const d = Math.sqrt(d2)
      p.x = cx + (dx / d) * r
      p.z = cz + (dz / d) * r
      const vn = (v.x * dx + v.z * dz) / d
      if (vn < 0) {
        v.x -= (vn * dx) / d
        v.z -= (vn * dz) / d
      }
    } else {
      // Centre inside the box: leave by the nearest face.
      const exits = [
        [p.x - b.minX, -1, 0],
        [b.maxX - p.x, 1, 0],
        [p.z - b.minZ, 0, -1],
        [b.maxZ - p.z, 0, 1],
      ].sort((a, c) => a[0] - c[0])
      const [depth, nx, nz] = exits[0]
      p.x += nx * (depth + r)
      p.z += nz * (depth + r)
    }
  }
}
