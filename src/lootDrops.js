// Loot dug out of the lane. When dig.js reveals a buried spot, items roll for its luck band (the
// further down the lane, the more items and the higher their rarity; the first band only ever
// drops Common + Uncommon) and float where it was. They are NOT auto-collected: stand next to one
// and press E to put it in the bag (player.bagSlots), then sell the bag at the Sell Loot stall.
// Online the loot is the server's (net.js `net.loot`): the same items for every player, first claim wins,
// a dug-free item disappears after a while and its spot respawns; offline it is rolled locally.
import {
  AdditiveBlending,
  CanvasTexture,
  Group,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
} from 'three'
import { DIG, HUB } from './config.js'
import { ITEM_INFO, LOOT_PICKUP_RANGE, LUCK_LOOT, RARITIES, RARITY } from './data/loot.js'
import { offer, toast } from './interact.js'
import { lootIndex } from './hud.js'
import { pickupMult } from './upgrades.js'
import { player } from './player.js'
import { claimLoot, net, onLootClaim, reportLootFreed, serverNow } from './net.js'
import { spots, ZONE_COUNT } from './spots.js'
import { buildModel } from './r3f.js'
import { GenericItem, MODELS } from './lootModels.jsx'

const POOLS = {}
for (const [name, { rarity }] of Object.entries(ITEM_INFO)) (POOLS[rarity] ??= []).push(name)
// Rarity tiers that actually have items (Secret has none), lowest to highest.
const TIERS = RARITIES.filter((r) => POOLS[r]?.length)
const LAST_ZONE = ZONE_COUNT - 1
const FLOAT_Y = 1.1
const MODEL_SCALE = 1.5 // the models are ~1 m across and rest on y = 0
const VIEW_DIST = 75 // drops farther than this are not drawn or animated (dig-lane lag)
const BURIED_SHOW_RANGE = 12 // buried loot shows its label + halo only when the player is this close
const SYNC_EVERY = 0.2 // s between diffs of the server's shared loot against the drops here
const FREE_MARGIN = 20 // m past VIEW_DIST before a far drop's meshes are freed (hysteresis)
const BLINK_SECS = 8 // shared loot blinks for this long before it disappears
const PEEK = 0.3 // fraction of a buried model's height that shows above the sand
const RING = 1.6 // m, radius multi-item spots fan out on (same as the reference; items may lie in neighbouring dig cells)

const dropCount = (zone) => 1 + Math.floor(((LUCK_LOOT.maxItems - 1) * zone) / LAST_ZONE)
function rollTier(zone) {
  const pos = (zone / LAST_ZONE) * (TIERS.length - 1)
  let k = Math.floor(pos)
  if (Math.random() < pos - k) k++
  if (Math.random() < LUCK_LOOT.bonus) k++
  return TIERS[Math.min(k, TIERS.length - 1)]
}

// White starburst (soft core + thin rays), tinted per rarity through the material colour.
function starburstTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')
  g.translate(128, 128)
  const core = g.createRadialGradient(0, 0, 0, 0, 0, 128)
  core.addColorStop(0, 'rgba(255,255,255,0.95)')
  core.addColorStop(0.25, 'rgba(255,255,255,0.45)')
  core.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = core
  g.fillRect(-128, -128, 256, 256)
  const rays = 14
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2 + (i % 2) * 0.1
    const len = 128 - (i % 2 ? 22 : 4)
    const grad = g.createLinearGradient(0, 0, Math.cos(a) * len, Math.sin(a) * len)
    grad.addColorStop(0, 'rgba(255,255,255,0.85)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = grad
    g.save()
    g.rotate(a)
    g.beginPath()
    g.moveTo(0, -3)
    g.lineTo(len, 0)
    g.lineTo(0, 3)
    g.closePath()
    g.fill()
    g.restore()
  }
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  return t
}

const short = (n) => {
  const units = ['', 'K', 'M', 'B', 'T']
  let i = 0
  while (n >= 1000 && i < units.length - 1) {
    n /= 1000
    i++
  }
  return `${i ? +n.toFixed(n < 100 ? 1 : 0) : n}${units[i]}`
}

// Three stacked lines ($value, name, rarity) on a transparent canvas, shown as a sprite.
function labelSprite(value, name, rarity, fill) {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 256
  const g = c.getContext('2d')
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.lineJoin = 'round'
  const font = '"Arial Black", "Arial Rounded MT Bold", sans-serif'
  const line = (text, px, y, color) => {
    g.font = `900 ${px}px ${font}`
    g.lineWidth = px * 0.2
    g.strokeStyle = '#111'
    g.strokeText(text, 256, y)
    g.fillStyle = color
    g.fillText(text, 256, y)
  }
  line(`$${short(value)}`, 64, 50, '#7dff8a')
  line(name, 64, 128, '#ffffff')
  line(rarity, 48, 205, fill)
  const map = new CanvasTexture(c)
  map.colorSpace = SRGBColorSpace
  const sprite = new Sprite(new SpriteMaterial({ map, transparent: true, depthWrite: false, toneMapped: false }))
  sprite.scale.set(2.6, 1.3, 1)
  return sprite
}

export function createLootDrops(scene, dig) {
  const root = new Group()
  scene.add(root)
  const burst = starburstTexture()
  const drops = new Map() // id -> drop data; `view` (meshes) exists only while the player is within VIEW_DIST
  let nextId = 1
  let near = false
  let away = 0 // s the player has spent back in the plaza
  let resetAway = 0 // same, but only counting well clear of the lane mouth
  let shared = false // true while the loot comes from the server (net.js), false = rolled locally (offline)
  let syncClock = 0

  // A drop is plain data until the player comes close; its meshes are built then and freed again when
  // far away, so the ~1000 items of the lane cost nothing while out of sight.
  // Items start buried: the model is sunk into the sand so only its top pokes out (the sand mesh
  // hides the rest); halo + label show when the player is near. Once its spot is dug free it rises and can be picked up.
  function buildView(d) {
    const { fill, glow } = RARITY[d.rarity]
    const sandY = dig.heightAt(d.x, d.z)
    d.buriedY = sandY - MODEL_SCALE * (0.5 - PEEK) // model base this far under the surface
    const group = new Group()
    group.position.set(d.x, 0, d.z)

    const halo = new Sprite(new SpriteMaterial({ map: burst, color: glow, transparent: true, opacity: 0.6, blending: AdditiveBlending, depthWrite: false, toneMapped: false }))
    halo.scale.set(3.4, 3.4, 1)
    halo.renderOrder = 2
    halo.visible = false

    // The item's own 3D model, spinning on a bobbing pivot once free.
    const model = buildModel(MODELS[d.name] ?? GenericItem)
    const icon = new Group()
    model.object.scale.setScalar(MODEL_SCALE)
    model.object.position.y = -0.5 * MODEL_SCALE
    icon.add(model.object)
    icon.position.y = d.buriedY
    icon.rotation.set((Math.random() - 0.5) * 0.5, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.5) // lies at an angle

    const label = labelSprite(d.value, d.name, d.rarity, fill)
    label.renderOrder = 4
    label.visible = false

    group.add(halo, icon, label)
    root.add(group)
    d.view = { group, icon, model, halo, label }
  }

  function disposeView(d) {
    const v = d.view
    if (!v) return
    root.remove(v.group)
    v.icon.traverse((o) => {
      o.geometry?.dispose()
      if (o.material?.userData.own) o.material.dispose() // shared plastic() materials stay
    })
    v.halo.material.dispose()
    v.label.material.map.dispose()
    v.label.material.dispose()
    d.view = null
  }

  const makeDrop = (id, name, rarity, value, x, z) => ({
    id, name, rarity, value, x, z, view: null, buriedY: 0, floorY: 0, freedAt: null, phase: Math.random() * 6.28,
    pending: false, reported: false, expiresAt: 0,
  })

  // Local (offline) drop: rolls its item now.
  function addLocal(rarity, x, z) {
    const pool = POOLS[rarity]
    const name = pool[Math.floor(Math.random() * pool.length)]
    const id = `l${nextId++}`
    drops.set(id, makeDrop(id, name, rarity, ITEM_INFO[name].value, x, z))
  }

  // Every buried spot (spots.js) gets its items now (rolled for the luck band it lies in); the plain
  // prop that marked it is replaced by the item itself. The x1 plan fixes its single item's rarity.
  for (const it of dig.items) {
    it.mesh.visible = false
    for (const o of it.also) o.visible = false
  }
  function populate() {
    for (const s of spots) {
      const n = s.rarity ? 1 : dropCount(s.zone)
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + Math.PI / 4
        const r = n > 1 ? RING : 0
        addLocal(s.rarity ?? rollTier(s.zone), s.x + Math.cos(a) * r, s.z + Math.sin(a) * r)
      }
    }
  }
  populate()

  function remove(d) {
    disposeView(d)
    drops.delete(d.id)
  }
  const clearAll = () => {
    for (const d of drops.values()) disposeView(d)
    drops.clear()
  }

  // Shared loot: mirror the server's room state (net.loot). Items appear / vanish as the server spawns,
  // expires or hands them out; `expiresAt` (server clock) drives the blink before one disappears.
  function syncShared() {
    const seen = new Set()
    net.loot.forEach((it, id) => {
      seen.add(id)
      const d = drops.get(id)
      if (d) d.expiresAt = it.expiresAt
      else {
        const n = makeDrop(id, it.name, it.rarity, it.value, it.x, it.z)
        n.expiresAt = it.expiresAt
        drops.set(id, n)
      }
    })
    for (const d of [...drops.values()]) if (!seen.has(d.id)) remove(d)
  }

  function addToBag(item) {
    player.bag.push({ name: item.name, rarity: item.rarity, value: item.value })
    if (!lootIndex?.discover(item.name)) toast(`Collected ${item.name}`)
  }

  function collect(d) {
    if (player.bag.length >= player.bagSlots) {
      toast('Bag full! Sell your loot')
      return
    }
    if (!shared) {
      addToBag(d)
      remove(d)
      return
    }
    d.pending = true
    claimLoot(d.id)
  }

  // The server's answer to a claim: the first player to ask gets the item, everyone else a miss.
  onLootClaim((msg) => {
    const d = drops.get(msg.id)
    if (d) d.pending = false
    if (msg.ok) {
      addToBag(msg.item)
      if (d) remove(d)
    } else toast('Someone else got it first!')
  })

  return {
    // True while a drop is within reach: E collects it, so keyboard digging pauses (main.js).
    get near() {
      return near
    },
    // The closest drop already dug free and waiting to be collected ({ x, z }), or null (tutorial guide).
    nearestFree(x, z) {
      let best = null
      let bestD = Infinity
      for (const d of drops.values()) {
        if (d.freedAt === null || d.pending) continue
        const dd = Math.hypot(x - d.x, z - d.z)
        if (dd < bestD) [best, bestD] = [d, dd]
      }
      return best && { x: best.x, z: best.z }
    },
    update(dt, t) {
      near = false
      const px = player.position.x
      const pz = player.position.z

      // Online: the server's loot; offline (or disconnected): rolled locally, as before.
      const online = !!net.loot && net.loot.size > 0 && net.connected
      if (online !== shared) {
        shared = online
        clearAll()
        if (!shared) populate()
      }
      if (shared) {
        syncClock += dt
        if (syncClock > SYNC_EVERY || drops.size === 0) {
          syncClock = 0
          syncShared()
        }
      }

      // Local mode only: back in the plaza for a few seconds and whatever was dug up but left lying is lost.
      away = player.position.z > HUB.plaza.minZ ? away + dt : 0
      if (!shared && away > DIG.lootLostDelay) {
        const lost = [...drops.values()].filter((d) => d.freedAt !== null)
        for (const d of lost) remove(d)
        if (lost.length) toast('Uncollected loot was lost')
      }
      // The whole dig zone resets: sand refilled. Local loot is re-rolled; shared loot belongs to the
      // server, so it just goes back under the (refilled) sand for this player.
      // Standing on the border (within resetMargin of the lane mouth) doesn't count as being back.
      resetAway = pz > HUB.plaza.minZ + DIG.resetMargin ? resetAway + dt : 0
      if (resetAway > DIG.resetDelay && dig.dirty) {
        dig.reset()
        if (shared) {
          for (const d of drops.values()) {
            d.freedAt = null
            if (d.view) d.view.icon.position.y = d.buriedY
          }
        } else {
          clearAll()
          populate()
        }
        toast('Dig zone reset')
      }

      for (const d of drops.values()) {
        const dx = Math.abs(px - d.x)
        const dz = Math.abs(pz - d.z)
        if (dx > VIEW_DIST || dz > VIEW_DIST) {
          if (d.view) {
            if (dx > VIEW_DIST + FREE_MARGIN || dz > VIEW_DIST + FREE_MARGIN) disposeView(d)
            else d.view.group.visible = false
          }
          continue
        }
        if (!d.view) buildView(d)
        const v = d.view
        v.group.visible = true
        if (d.freedAt === null) {
          // Still buried (only its top shows): it comes up once the player can walk through its cell.
          if (dx < 14 && dz < 14 && dig.passable(d.x, d.z)) {
            d.freedAt = t
            d.floorY = dig.heightAt(d.x, d.z)
            dig.puff(d.x, d.z)
            if (shared && !d.reported) {
              d.reported = true
              reportLootFreed(d.id) // starts the item's disappear countdown for everyone
            }
          }
          if (d.freedAt === null) {
            // Buried: label only (no glow) when near; the halo, spin and rise wait until it is freed.
            const show = Math.hypot(px - d.x, pz - d.z) < BURIED_SHOW_RANGE
            v.halo.visible = false
            v.label.visible = show
            if (!show) continue
            v.label.position.y = dig.heightAt(d.x, d.z) + FLOAT_Y + 2.1
            v.label.scale.set(2.6, 1.3, 1)
            v.model.tick(dt)
            continue
          }
        }
        const k = Math.min(1, (t - d.freedAt) * 2) // 0 -> 1 while it rises out of the sand
        const ease = k * k * (3 - 2 * k)
        const floatY = d.floorY + FLOAT_Y + Math.sin(t * 1.8 + d.phase) * 0.18 * k
        v.icon.position.y = d.buriedY + (floatY - d.buriedY) * ease
        v.icon.rotation.x *= 1 - k * 0.2
        v.icon.rotation.z *= 1 - k * 0.2
        v.icon.rotation.y += dt * 0.9 * ease
        v.halo.visible = v.label.visible = true
        v.halo.position.y = d.floorY + FLOAT_Y + 0.2
        v.label.position.y = d.floorY + FLOAT_Y + 2.1
        v.halo.scale.setScalar(3.4 * ease)
        v.label.scale.set(2.6 * ease, 1.3 * ease, 1)
        v.model.tick(dt)
        v.halo.material.opacity = (d.rarity === 'Common' ? 0.5 : 0.75) + Math.sin(t * 2.4 + d.phase) * 0.12
        // About to disappear (shared loot): blink for the last few seconds.
        if (d.expiresAt > 0 && (d.expiresAt - serverNow()) / 1000 < BLINK_SECS) v.group.visible = Math.floor(t * 5) % 2 === 0
        const dist = Math.hypot(px - d.x, pz - d.z)
        if (k >= 1 && !d.pending && dist < LOOT_PICKUP_RANGE * pickupMult() && Math.abs(player.position.y - d.floorY) < 3) {
          near = true
          offer(`Collect ${d.name}`, () => collect(d), dist)
        }
      }
    },
  }
}
