// The other players in the room (net.js -> server WorldState.players): each one is the game's
// character with their Bloxity cosmetics, held shovel and a name tag, eased toward the pose the
// server last relayed. Diffed against the roster every frame, so joins/leaves need no events.
import { Group, Sprite, SpriteMaterial } from 'three'
import { NET, PHYSICS } from './config.js'
import { net } from './net.js'
import { SHOVELS_BY_ID, START_SHOVEL } from './data/shovels.js'
import { labelCanvas, toTexture } from './textures.js'
import { buildDefaultCharacter, loadBaseCharacter } from './avatar/character.js'
import { applyProportions, attachEquippedAccessories } from './avatar/loader.js'
import { disposeAnimator, makeAnimator } from './avatar/animator.js'
import { attachHeldShovel } from './heldShovel.js'
import { createPetSet } from './petFollowers.js'
import { REMOTE_TRAILS, createTrailState } from './trailFx.js'

const angleDelta = (from, to) => Math.atan2(Math.sin(to - from), Math.cos(to - from))
const NAME_HEIGHT = 0.5 // m, text height of the name tag
const NAME_Y = 3.4 // m above the feet
// Level of detail: pets and trails are only simulated for the nearest few remote players in range.
const PET_RANGE = 30 // m
const PET_OWNERS = 8 // remote players whose pets are shown at once
const TRAIL_RANGE = 45 // m
const TRAIL_NEAR = 15 // m: closer than this a trail gets its full effect, beyond it a thinned one

class Remote {
  constructor(parent, petRoot) {
    this.group = new Group()
    this.group.visible = false
    parent.add(this.group)
    this.avatar = null
    this.held = null
    this.animator = null
    this.avatarJson = null // what the current rig was built from
    this.ready = false // hidden until the player's real look has loaded (or they have none)
    this.generation = 0
    this.shovel = START_SHOVEL
    this.nameText = null
    this.label = null
    this.placed = false
    this.vy = 0
    this.vx = 0
    this.vz = 0
    this.pets = createPetSet({ shadows: false })
    petRoot.add(this.pets.group)
    this.trailSrc = { trail: '', state: createTrailState(), slot: 0, x: 0, y: 0, z: 0, vx: 0, vz: 0, facing: 0, grounded: true, lod: 1 }
    this.setAvatar(buildDefaultCharacter())
  }

  setAvatar(next) {
    if (this.avatar) this.group.remove(this.avatar)
    disposeAnimator(this.animator)
    this.held?.dispose()
    this.avatar = next
    this.group.add(next)
    this.animator = makeAnimator(next)
    this.held = attachHeldShovel(next, () => this.shovel)
  }

  // A signed-in player's look arrives as JSON { equipped, proportions, skin }; "" = default.
  async syncAvatar(json) {
    if (json === this.avatarJson) return
    this.avatarJson = json
    if (!json) {
      this.setAvatar(buildDefaultCharacter())
      this.ready = true
      return
    }
    const mine = ++this.generation
    let look = null
    try {
      look = JSON.parse(json)
    } catch {
      this.ready = true // unreadable look: show the default character
      return
    }
    try {
      const group = await loadBaseCharacter()
      if (mine !== this.generation) return
      await attachEquippedAccessories(group, look?.equipped, { skinTextureUrl: look?.skin || undefined })
      if (mine !== this.generation) return
      applyProportions(group, look?.proportions)
      this.setAvatar(group)
      this.ready = true
    } catch (err) {
      this.ready = true // keep the default look rather than staying invisible
      console.warn('[remotePlayers] avatar load failed', err) // keep the current look, retry shortly
      setTimeout(() => {
        if (mine === this.generation) this.avatarJson = null
      }, 5000)
    }
  }

  syncName(name) {
    if (name === this.nameText) return
    this.nameText = name
    if (this.label) {
      this.group.remove(this.label)
      this.label.material.map.dispose()
      this.label.material.dispose()
    }
    const c = labelCanvas(name, { px: 64, fill: '#ffffff', stroke: '#1a1a1a' })
    this.label = new Sprite(new SpriteMaterial({ map: toTexture(c), depthWrite: false }))
    this.label.scale.set((c.width / c.height) * NAME_HEIGHT, NAME_HEIGHT, 1)
    this.label.position.y = NAME_Y
    this.group.add(this.label)
  }

  update(p, dt) {
    this.syncName(p.username || 'Player')
    this.syncAvatar(p.avatar)
    this.shovel = p.shovel

    const g = this.group
    const k = this.placed ? 1 - Math.exp(-NET.remoteLerp * dt) : 1
    const prevY = g.position.y
    const prevX = g.position.x
    const prevZ = g.position.z
    g.position.x += (p.x - g.position.x) * k
    g.position.y += (p.y - g.position.y) * k
    g.position.z += (p.z - g.position.z) * k
    g.rotation.y += angleDelta(g.rotation.y, p.yaw) * k
    this.vy = this.placed ? this.vy + ((g.position.y - prevY) / dt - this.vy) * Math.min(1, dt * 10) : 0
    if (this.placed) {
      const a = Math.min(1, dt * 10)
      this.vx += ((g.position.x - prevX) / dt - this.vx) * a
      this.vz += ((g.position.z - prevZ) / dt - this.vz) * a
    } else this.vx = this.vz = 0
    this.placed = true

    this.animator?.update(dt, {
      grounded: p.grounded,
      speed: p.speed01 * PHYSICS.moveSpeed,
      verticalVelocity: this.vy,
      turn: 0,
      digging: p.pose === 'dig',
      strength: (p.strength || 1) + (SHOVELS_BY_ID[p.shovel]?.bonus ?? 0), // stroke speed, like the local player
    })
    this.held?.update(dt, this.animator)
  }

  // Pets for the nearest owners only; everyone else's are dropped (their meshes are the cost).
  syncPets(p, dt, t, show) {
    if (!show || !p.pets) return this.pets.clear()
    this.pets.sync(p.pets.split(',').map((pid, i) => ({ pid, key: pid + i })))
    const g = this.group.position
    this.pets.update(dt, t, g.x, g.y, g.z, this.group.rotation.y, () => g.y)
  }

  // Fills this player's trail source (reused object); `lod` thins the effect with distance.
  trailSource(p, slot, lod) {
    const s = this.trailSrc
    const g = this.group.position
    s.trail = p.trail
    s.slot = slot
    s.x = g.x; s.y = g.y; s.z = g.z
    s.vx = this.vx; s.vz = this.vz
    s.facing = this.group.rotation.y
    s.grounded = p.grounded
    s.lod = lod
    return s
  }

  dispose(parent, petRoot) {
    parent.remove(this.group)
    petRoot.remove(this.pets.group)
    this.pets.clear()
    disposeAnimator(this.animator)
    this.held?.dispose()
    if (this.label) {
      this.label.material.map.dispose()
      this.label.material.dispose()
    }
  }
}

export function createRemotePlayers(scene) {
  const root = new Group()
  scene.add(root)
  const petRoot = new Group() // world space: followers lag behind their owner
  scene.add(petRoot)
  const remotes = new Map() // sessionId -> Remote

  return {
    // trailOut: array the nearest trail wearers' sources are pushed onto (cleared by the caller).
    update(dt, t, viewer, trailOut) {
      const players = net.players
      const mine = net.sessionId
      if (!players || !net.connected) {
        for (const r of remotes.values()) r.dispose(root, petRoot)
        remotes.clear()
        return
      }
      // Nearest first, capped, so a full room of 50 does not drown the frame rate.
      const near = []
      players.forEach((p, id) => {
        if (id === mine) return
        near.push({ id, p, d: Math.hypot(p.x - viewer.x, p.z - viewer.z) })
      })
      near.sort((a, b) => a.d - b.d)
      const keep = new Set()
      let petOwners = 0
      let trails = 0
      for (const { id, p, d } of near.slice(0, NET.maxRemotes)) {
        keep.add(id)
        let r = remotes.get(id)
        if (!r) remotes.set(id, (r = new Remote(root, petRoot)))
        const inRange = d < NET.remoteFade
        if (inRange) {
          r.update(p, dt)
          r.group.visible = r.ready
          r.syncPets(p, dt, t, r.ready && d < PET_RANGE && petOwners < PET_OWNERS && !!p.pets && ++petOwners > 0)
          if (r.ready && p.trail && d < TRAIL_RANGE && trails < REMOTE_TRAILS) trailOut.push(r.trailSource(p, ++trails, d < TRAIL_NEAR ? 0.8 : 0.35))
        } else {
          r.group.visible = false
          r.pets.clear()
          r.placed = false // out of range: skip the work, snap into place when it comes back
          r.group.position.set(p.x, p.y, p.z)
        }
      }
      for (const [id, r] of remotes) {
        if (keep.has(id)) continue
        r.dispose(root, petRoot)
        remotes.delete(id)
      }
    },
  }
}
