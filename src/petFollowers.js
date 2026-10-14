import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three'
import { player, floorAt } from './player.js'
import { PET_FOLLOW } from './config.js'
import { PETS_BY_ID } from './data/pets.js'
import { equippedPets } from './pets.js'

// Equipped pets trail the player on an arc behind them, easing after them as they move. They live
// in world space (not parented to the player) so they lag and swing round. Models are procedural
// chibi boxes (cube head, small body, four feet) tinted by the pet; flyers (the dragon) hover.

const FLY = new Set(['dragon', 'phoenix', 'nebula', 'unicorn'])
const FLY_HEIGHT = 1.2
const boxGeo = new BoxGeometry(1, 1, 1)
const mats = new Map()
const mat = (color) => {
  if (!mats.has(color)) mats.set(color, new MeshStandardMaterial({ color, roughness: 0.8, metalness: 0 }))
  return mats.get(color)
}

function box(parent, c, sx, sy, sz, x, y, z, rot = [0, 0, 0]) {
  const m = new Mesh(boxGeo, mat(c))
  m.scale.set(sx, sy, sz)
  m.position.set(x, y, z)
  m.rotation.set(...rot)
  m.castShadow = true
  parent.add(m)
  return m
}

// ~1 unit long, faces +Z, stands on y = 0.
function buildPet(info) {
  const g = new Group()
  const c = info.tint
  for (const [fx, fz] of [[0.17, 0.18], [-0.17, 0.18], [0.17, -0.18], [-0.17, -0.18]]) box(g, '#2a2a2e', 0.16, 0.16, 0.19, fx, 0.08, fz)
  box(g, c, 0.5, 0.36, 0.6, 0, 0.34, -0.02) // body
  const head = new Group()
  head.position.set(0, 0.34 + 0.18 + 0.35 - 0.05, 0.12)
  g.add(head)
  box(head, c, 0.7, 0.64, 0.7, 0, 0, 0)
  for (const sx of [1, -1]) {
    box(head, '#101010', 0.1, 0.12, 0.03, sx * 0.19, 0.04, 0.36) // eye
    box(head, '#ffffff', 0.04, 0.04, 0.02, sx * 0.19 + 0.02, 0.09, 0.38) // glint
  }
  switch (info.id) {
    case 'piggy':
      for (const sx of [1, -1]) box(head, c, 0.18, 0.16, 0.1, sx * 0.24, 0.36, 0, [0, 0, -sx * 0.5])
      box(head, '#ff7aa8', 0.26, 0.18, 0.1, 0, -0.1, 0.38) // snout
      break
    case 'cat':
      for (const sx of [1, -1]) box(head, c, 0.14, 0.2, 0.1, sx * 0.27, 0.4, 0, [0, 0, sx * -0.2])
      box(g, c, 0.08, 0.08, 0.4, 0, 0.5, -0.5, [0.5, 0, 0]) // tail
      break
    case 'bunny':
      for (const sx of [1, -1]) box(head, c, 0.14, 0.5, 0.1, sx * 0.2, 0.55, 0)
      box(g, '#ffffff', 0.16, 0.16, 0.16, 0, 0.4, -0.38) // tail puff
      break
    case 'fox':
      for (const sx of [1, -1]) box(head, c, 0.16, 0.24, 0.1, sx * 0.26, 0.42, 0, [0, 0, sx * -0.15])
      box(head, '#ffffff', 0.3, 0.2, 0.1, 0, -0.14, 0.37) // muzzle
      box(g, c, 0.16, 0.16, 0.5, 0, 0.42, -0.5, [0.4, 0, 0])
      box(g, '#ffffff', 0.17, 0.17, 0.14, 0, 0.55, -0.72) // tail tip
      break
    case 'frog':
      for (const sx of [1, -1]) box(head, c, 0.2, 0.2, 0.2, sx * 0.24, 0.38, 0.08) // eye bumps
      break
    case 'panda':
    case 'koala':
      for (const sx of [1, -1]) box(head, info.id === 'panda' ? '#202020' : c, 0.22, 0.22, 0.1, sx * 0.3, 0.36, 0) // round ears
      break
    case 'wolf':
    case 'tiger':
    case 'lion':
      for (const sx of [1, -1]) box(head, c, 0.14, 0.26, 0.1, sx * 0.25, 0.42, 0, [0, 0, sx * -0.15])
      box(g, c, 0.1, 0.1, 0.5, 0, 0.4, -0.5, [0.4, 0, 0]) // tail
      if (info.id === 'lion') box(head, '#8a4a1a', 0.86, 0.8, 0.2, 0, 0, -0.2) // mane
      break
    case 'owl':
      for (const sx of [1, -1]) box(head, c, 0.12, 0.2, 0.1, sx * 0.26, 0.4, 0, [0, 0, sx * 0.3]) // ear tufts
      box(head, '#ffb020', 0.12, 0.12, 0.1, 0, -0.08, 0.38) // beak
      for (const sx of [1, -1]) box(g, '#7a4a22', 0.4, 0.05, 0.3, sx * 0.34, 0.45, -0.05, [0, 0, sx * 0.3]) // wings
      break
    case 'unicorn':
      box(head, '#fff3a0', 0.1, 0.4, 0.1, 0, 0.5, 0.1, [0.2, 0, 0]) // horn
      box(g, '#ff8ad8', 0.14, 0.2, 0.4, 0, 0.5, -0.5) // tail
      break
    case 'phoenix':
      for (const sx of [1, -1]) box(g, '#ffb020', 0.6, 0.05, 0.45, sx * 0.45, 0.55, -0.1, [0, 0, sx * 0.5]) // wings
      box(head, '#ffd84a', 0.14, 0.14, 0.12, 0, -0.08, 0.38) // beak
      box(g, '#ff8a2a', 0.2, 0.1, 0.6, 0, 0.4, -0.6)
      break
    case 'nebula':
      for (const sx of [1, -1]) {
        box(head, '#fff3a0', 0.1, 0.24, 0.1, sx * 0.2, 0.42, -0.1, [-0.3, 0, 0])
        box(g, '#c9a6ff', 0.55, 0.05, 0.45, sx * 0.42, 0.55, -0.1, [0, 0, sx * 0.5])
      }
      box(g, c, 0.12, 0.12, 0.5, 0, 0.36, -0.5)
      break
    case 'dragon':
      for (const sx of [1, -1]) {
        box(head, '#fff3a0', 0.1, 0.24, 0.1, sx * 0.2, 0.42, -0.1, [-0.3, 0, 0]) // horns
        box(g, '#2f9c4a', 0.5, 0.05, 0.4, sx * 0.4, 0.55, -0.1, [0, 0, sx * 0.5]) // wings
      }
      box(g, c, 0.12, 0.12, 0.5, 0, 0.36, -0.5) // tail
      break
  }
  return g
}

// A set of followers for one owner (the local player, or a nearby remote one). Models are built
// from shared geometry/materials, so a set costs only its meshes; remote sets skip shadows.
// `list` is [{ pid, key }]; the set rebuilds only when the keys change.
export function createPetSet({ shadows = true } = {}) {
  const group = new Group()
  let key = ''
  let pets = [] // { group, fly, placed }

  function sync(list) {
    const k = list.map((p) => p.key).join(',')
    if (k === key) return
    key = k
    group.clear()
    pets = list.map((p) => {
      const info = PETS_BY_ID[p.pid]
      const g = new Group()
      g.scale.setScalar(PET_FOLLOW.scale)
      const model = buildPet(info)
      if (!shadows) model.traverse((m) => (m.castShadow = false))
      g.add(model)
      group.add(g)
      return { group: g, fly: FLY.has(info.id), placed: false }
    })
  }

  // ground(tx, tz) -> floor height under a follower's target spot.
  function update(dt, t, ox, oy, oz, yaw, ground) {
    const follow = 1 - Math.exp(-PET_FOLLOW.hz * dt)
    pets.forEach((pet, slot) => {
      const g = pet.group
      const angle = yaw + Math.PI + (slot - (pets.length - 1) / 2) * PET_FOLLOW.spread
      const tx = ox + Math.sin(angle) * PET_FOLLOW.radius
      const tz = oz + Math.cos(angle) * PET_FOLLOW.radius
      const bob = Math.sin(t * 3 + slot * 1.7)
      const ty = ground(tx, tz) + (pet.fly ? FLY_HEIGHT + bob * 0.15 : Math.max(0, bob) * 0.08)
      if (!pet.placed) {
        g.position.set(tx, ty, tz)
        g.rotation.y = yaw
        pet.placed = true
        return
      }
      const dx = tx - g.position.x
      const dz = tz - g.position.z
      g.position.x += dx * follow
      g.position.y += (ty - g.position.y) * follow
      g.position.z += dz * follow
      // Face the way it is travelling; otherwise settle to the owner's heading.
      const want = dx * dx + dz * dz > 0.04 ? Math.atan2(dx, dz) : yaw
      const d = Math.atan2(Math.sin(want - g.rotation.y), Math.cos(want - g.rotation.y))
      g.rotation.y += d * (1 - Math.exp(-8 * dt))
    })
  }

  return { group, sync, update, clear: () => sync([]) }
}

export function createPetFollowers(scene) {
  const set = createPetSet()
  scene.add(set.group)
  return {
    update(dt, t) {
      set.sync(equippedPets().map((p) => ({ pid: p.pid, key: p.id })))
      const p = player.position
      set.update(dt, t, p.x, p.y, p.z, player.facing, (tx, tz) => Math.max(floorAt(tx, tz, p.y + 1), p.y - 1))
    },
  }
}
