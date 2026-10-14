import {
  BoxGeometry,
  CanvasTexture,
  ConeGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  OctahedronGeometry,
  Quaternion,
  RepeatWrapping,
  Shape,
  SphereGeometry,
  SRGBColorSpace,
  TorusGeometry,
  Vector3,
} from 'three'
import { ANIM, CHARACTER_COLORS } from './config.js'
import { player } from './player.js'
import { SHOVELS_BY_ID, START_SHOVEL } from './data/shovels.js'

// The equipped shovel, held in the player's right hand. Built in rig units (the avatar root is
// scaled to metres), coloured from the shovel's `blade` / `trim` / `handle`, and re-skinned when
// `player.shovel` changes. Digging swings it down into the sand.

const SHOVEL_SCALE = 1.2 // held shovel size vs the model (about 0.8x the character's height)
const GRIP_ON_SHAFT = 0.8 // shaft height (shovel space) where the hand grips, just under the D-grip
const HOLD_TILT = -0.75 // blade forward / down (character space, +X pitch tips the top forward)
const ARM_LENGTH = 2.4 // procedural arm: pivot to hand
const HAND_FORWARD = 0.45 // hand offset in front of the arm, so the fist clears the arm's front face

// Skin-coloured fist wrapped round the shaft (plus a thumb knuckle) so the shovel reads as held.
function buildFist() {
  const skin = new MeshStandardMaterial({ color: CHARACTER_COLORS.skin, roughness: 0.7 })
  const fist = new Group()
  const palm = new Mesh(new SphereGeometry(0.36, 14, 10), skin)
  palm.scale.set(1, 0.85, 1)
  const thumb = new Mesh(new SphereGeometry(0.15, 10, 8), skin)
  thumb.position.set(0.05, 0.26, 0.3)
  fist.add(palm, thumb)
  fist.traverse((m) => (m.castShadow = true))
  return fist
}

const geo = { blades: {} }

// Blade outlines (hang down from y = 0, about 1.7 long, half-width about 0.6).
function polyShape(right) {
  const pts = [...right, ...right.map(([x, y]) => [-x, y]).reverse()]
  const s = new Shape()
  s.moveTo(pts[0][0], pts[0][1])
  for (const [x, y] of pts.slice(1)) s.lineTo(x, y)
  return s
}
function bladeShape(type) {
  const s = new Shape()
  switch (type) {
    case 'square':
      s.moveTo(-0.55, 0).lineTo(0.55, 0).lineTo(0.62, -1.0)
      s.quadraticCurveTo(0.62, -1.6, 0, -1.65).quadraticCurveTo(-0.62, -1.6, -0.62, -1.0).lineTo(-0.55, 0)
      return s
    case 'wide':
      s.moveTo(-0.55, 0).lineTo(0.55, 0).lineTo(0.72, -0.4)
      s.bezierCurveTo(0.85, -1.0, 0.6, -1.55, 0, -1.62).bezierCurveTo(-0.6, -1.55, -0.85, -1.0, -0.72, -0.4).lineTo(-0.55, 0)
      return s
    case 'flame':
      return polyShape([[0.5, 0], [0.66, -0.45], [0.52, -0.7], [0.74, -1.05], [0.45, -1.1], [0.4, -1.5], [0.18, -1.35], [0, -1.85]])
    case 'disc':
      s.moveTo(-0.3, 0).lineTo(0.3, 0)
      s.bezierCurveTo(0.95, -0.1, 0.95, -1.6, 0, -1.7).bezierCurveTo(-0.95, -1.6, -0.95, -0.1, -0.3, 0)
      return s
    case 'wave':
      s.moveTo(-0.5, 0).lineTo(0.5, 0).lineTo(0.68, -0.5).lineTo(0.7, -1.1)
      s.quadraticCurveTo(0.55, -1.55, 0.3, -1.4).quadraticCurveTo(0.15, -1.8, 0, -1.55)
      s.quadraticCurveTo(-0.15, -1.8, -0.3, -1.4).quadraticCurveTo(-0.55, -1.55, -0.7, -1.1).lineTo(-0.68, -0.5).lineTo(-0.5, 0)
      return s
    case 'leaf':
      s.moveTo(-0.3, 0).lineTo(0.3, 0)
      s.bezierCurveTo(0.9, -0.4, 0.7, -1.3, 0, -1.9).bezierCurveTo(-0.7, -1.3, -0.9, -0.4, -0.3, 0)
      return s
    case 'fang':
      s.moveTo(-0.5, 0).lineTo(0.5, 0).bezierCurveTo(0.8, -0.5, 0.7, -1.1, 0.55, -1.5)
      s.lineTo(0.25, -1.2).lineTo(0, -1.85).lineTo(-0.25, -1.2).lineTo(-0.55, -1.5).bezierCurveTo(-0.7, -1.1, -0.8, -0.5, -0.5, 0)
      return s
    default: // spade
      s.moveTo(-0.5, 0).lineTo(0.5, 0).lineTo(0.62, -0.35)
      s.bezierCurveTo(0.7, -0.9, 0.5, -1.3, 0, -1.7).bezierCurveTo(-0.5, -1.3, -0.7, -0.9, -0.62, -0.35).lineTo(-0.5, 0)
      return s
  }
}
function bladeGeos(type) {
  if (geo.blades[type]) return geo.blades[type]
  const ext = (scale, depth, bevel) => {
    const g = new ExtrudeGeometry(bladeShape(type), { depth, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 16 })
    g.translate(0, 0, -depth / 2)
    if (scale !== 1) g.scale(scale, scale, 1)
    return g
  }
  return (geo.blades[type] = { blade: ext(1, 0.06, 0.035), rim: ext(1.07, 0.03, 0.02) })
}
function geometries() {
  if (geo.shaft) return geo
  geo.shaft = new CylinderGeometry(0.085, 0.095, 2.4, 14)
  geo.collar = new CylinderGeometry(0.125, 0.125, 0.12, 14)
  geo.socket = new CylinderGeometry(0.13, 0.2, 0.55, 14)
  geo.grip = new TorusGeometry(0.26, 0.065, 8, 20, Math.PI)
  geo.gripBar = new CylinderGeometry(0.07, 0.07, 0.52, 10)
  geo.gripPost = new CylinderGeometry(0.07, 0.085, 0.2, 10)
  geo.rib = new BoxGeometry(0.1, 1.15, 0.05)
  geo.rivet = new SphereGeometry(0.05, 8, 6)
  geo.step = new BoxGeometry(0.28, 0.08, 0.2)
  geo.band = new CylinderGeometry(0.1, 0.1, 0.1, 12)
  geo.gem = new OctahedronGeometry(0.17)
  geo.drillBit = new ConeGeometry(0.42, 1.5, 16)
  geo.drillBody = new CylinderGeometry(0.34, 0.34, 0.8, 16)
  geo.drillRing = new TorusGeometry(0.4, 0.05, 6, 20)
  return geo
}

// Hammered-scale surface for the blade (colour map + bump); tinted by the blade colour.
let bladeTex
function bladeTexture() {
  if (bladeTex) return bladeTex
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')
  g.fillStyle = '#d8d8d8'
  g.fillRect(0, 0, 128, 128)
  const n = 4
  const cell = 128 / n
  for (let row = -1; row <= n * 2; row++) {
    for (let col = -1; col <= n; col++) {
      const cx = (col + (row & 1 ? 0.5 : 0)) * cell + cell / 2
      const cy = row * cell * 0.5 + cell / 2
      const grad = g.createRadialGradient(cx, cy - 3, 2, cx, cy, cell * 0.62)
      grad.addColorStop(0, '#ffffff')
      grad.addColorStop(0.75, '#d0d0d0')
      grad.addColorStop(1, '#8a8a8a')
      g.fillStyle = grad
      g.beginPath()
      g.arc(cx, cy, cell * 0.56, 0, Math.PI * 2)
      g.fill()
    }
  }
  bladeTex = new CanvasTexture(c)
  bladeTex.wrapS = bladeTex.wrapT = RepeatWrapping
  bladeTex.repeat.set(1.3, 1.3)
  bladeTex.colorSpace = SRGBColorSpace
  return bladeTex
}

export function buildHeldShovel() {
  const g = geometries()
  const tex = bladeTexture()
  const mats = {
    handle: new MeshStandardMaterial({ roughness: 0.6, metalness: 0.25 }),
    grip: new MeshStandardMaterial({ roughness: 0.7, metalness: 0.1 }),
    blade: new MeshStandardMaterial({ roughness: 0.38, metalness: 0.6, map: tex, bumpMap: tex, bumpScale: 1.5 }),
    trim: new MeshStandardMaterial({ roughness: 0.4, metalness: 0.55 }),
    rubber: new MeshStandardMaterial({ color: '#15171c', roughness: 0.9 }),
    gem: new MeshStandardMaterial({ roughness: 0.25, metalness: 0.1, emissiveIntensity: 1.1 }),
    drill: new MeshStandardMaterial({ roughness: 0.35, metalness: 0.8 }),
  }
  const root = new Group()
  root.name = 'heldShovel'
  const add = (geometry, mat, x, y, z, parent = root) => {
    const m = new Mesh(geometry, mat)
    m.position.set(x, y, z)
    m.castShadow = true
    parent.add(m)
    return m
  }

  // Shaft (origin of the group = the gripping hand), banded where the hand sits.
  add(g.shaft, mats.handle, 0, 0.3, 0)
  add(g.band, mats.trim, 0, -0.35, 0)
  add(g.band, mats.trim, 0, 0.25, 0)
  add(g.band, mats.trim, 0, 0.6, 0)

  // D-grip on top: arch, two posts and a rubber cross bar.
  const grip = add(g.grip, mats.grip, 0, 1.55, 0)
  grip.rotation.z = 0
  grip.rotation.y = Math.PI / 2
  add(g.gripPost, mats.grip, 0, 1.45, 0)
  add(g.gripBar, mats.rubber, 0, 1.55 + 0.26, 0).rotation.z = Math.PI / 2

  // Socket flaring into the blade.
  add(g.collar, mats.trim, 0, -1.0, 0)
  add(g.socket, mats.trim, 0, -1.35, 0)

  // Blade (hangs down from y = -1.55): rim plate behind, face, plus ridge / rivets / foot steps on
  // the plain shapes. The outline geometry is swapped per shovel in skinShovel().
  const blade = new Group()
  blade.position.set(0, -1.55, 0)
  root.add(blade)
  const rim = add(bladeGeos('spade').rim, mats.trim, 0, 0, -0.02, blade)
  const face = add(bladeGeos('spade').blade, mats.blade, 0, 0, 0, blade)
  const decor = new Group()
  blade.add(decor)
  for (const side of [1, -1]) {
    add(g.rib, mats.trim, 0, -0.62, side * 0.07, decor)
    for (const x of [-0.34, 0.34]) add(g.rivet, mats.trim, x, -0.1, side * 0.065, decor)
    add(g.rivet, mats.trim, 0, -0.28, side * 0.07, decor)
    add(g.step, mats.trim, side * 0.5, 0.02, 0, decor)
  }
  const gem = add(g.gem, mats.gem, 0, -0.5, 0.1, blade)

  // Construction drill (display only): bit + body in place of the blade.
  const drill = new Group()
  drill.position.set(0, -2.2, 0)
  root.add(drill)
  add(g.drillBit, mats.drill, 0, -0.75, 0, drill).rotation.x = Math.PI
  add(g.drillBody, mats.trim, 0, 0.1, 0, drill)
  for (const y of [-0.2, 0.1, 0.4]) add(g.drillRing, mats.drill, 0, y, 0, drill).rotation.x = Math.PI / 2

  root.userData.mats = mats
  root.userData.parts = { rim, face, decor, gem, blade, drill }
  return root
}

// Recolours / reshapes a built shovel group into shovel `id`.
export function skinShovel(shovelGroup, id) {
  const s = SHOVELS_BY_ID[id] ?? SHOVELS_BY_ID[START_SHOVEL]
  const { handle, grip, blade, trim, gem: gemMat, drill: drillMat } = shovelGroup.userData.mats
  const { rim, face, decor, gem, blade: bladeGroup, drill } = shovelGroup.userData.parts
  handle.color.set(s.shaft)
  grip.color.set(s.grip)
  blade.color.set(s.blade)
  trim.color.set(s.trim)
  drillMat.color.set(s.blade)
  trim.emissive.set(s.glow ? s.trim : '#000000')
  trim.emissiveIntensity = s.glow ? 0.9 : 0
  blade.emissive.set(s.glow ? s.blade : '#000000')
  blade.emissiveIntensity = s.glow ? 0.45 : 0
  const isDrill = s.shape === 'drill'
  bladeGroup.visible = !isDrill
  drill.visible = isDrill
  gem.visible = false
  if (!isDrill) {
    const g = bladeGeos(s.shape)
    face.geometry = g.blade
    rim.geometry = g.rim
    decor.visible = s.shape === 'spade' || s.shape === 'square' || s.shape === 'wide'
    if (s.gem) {
      gem.visible = true
      gem.position.y = s.shape === 'disc' ? -0.85 : -0.45
      gem.scale.setScalar(s.shape === 'disc' ? 1.8 : 1)
      gemMat.color.set(s.gem)
      gemMat.emissive.set(s.gem)
    }
  }
  shovelGroup.userData.id = s.id
}
const skin = skinShovel

// --- Arms ------------------------------------------------------------------------------------
// Everything below runs in the avatar's local (rig-unit) space. Each arm is a two-bone chain
// (upper arm ArmX1 -> forearm ArmX2 -> hand node ArmX2_leaf on player.glb; one 2.4-unit bone on
// the procedural character). Bind-pose limb directions and rotations are captured once; the IK
// then aims each bone from its bind direction at the wanted direction.
const lerp = (a, b, t) => a + (b - a) * t
const V = { a: new Vector3(), b: new Vector3(), c: new Vector3(), d: new Vector3(), e: new Vector3() }
const Q = { a: new Quaternion(), b: new Quaternion(), root: new Quaternion() }

function makeArm(avatar, side) {
  const n = avatar.nodes
  const upper = n?.[`Arm${side}1`]
  if (!upper) return null
  const fore = n[`Arm${side}2`] ?? null
  const leaf = n[`Arm${side}2_leaf`] ?? null
  avatar.updateMatrixWorld(true)
  const arm = { upper, fore, leaf, side }
  const local = (node, out) => avatar.worldToLocal(node.getWorldPosition(out))
  const s = local(upper, new Vector3())
  const e = fore ? local(fore, new Vector3()) : null
  const h = leaf ? local(leaf, new Vector3()) : avatar.worldToLocal(upper.localToWorld(new Vector3(0, -ARM_LENGTH, 0)))
  arm.hand = h.clone()
  arm.rest1 = (e ?? h).clone().sub(s).normalize()
  arm.rest2 = e ? h.clone().sub(e).normalize() : null
  const rootInv = avatar.getWorldQuaternion(new Quaternion()).invert()
  arm.q1 = rootInv.clone().multiply(upper.getWorldQuaternion(new Quaternion()))
  arm.q2 = fore ? rootInv.clone().multiply(fore.getWorldQuaternion(new Quaternion())) : null
  arm.pole = new Vector3(side === 'R' ? -0.5 : 0.5, -0.3, -1).normalize() // elbow: back, out, down

  // Holder at the hand, cancelling the bone's bind rotation so children are authored in avatar space.
  const anchor = leaf ?? upper
  const holder = new Group()
  holder.name = `hand${side}`
  holder.quaternion.copy(anchor.getWorldQuaternion(new Quaternion())).invert().multiply(avatar.getWorldQuaternion(new Quaternion()))
  if (!leaf) holder.position.set(0, -ARM_LENGTH, 0)
  anchor.add(holder)
  arm.holder = holder
  return arm
}

// Aims the arm so its hand reaches `target` (avatar space), blended by w with the animated pose.
function solveArm(avatar, arm, target, w, root) {
  const { upper, fore } = arm
  const S = avatar.worldToLocal(upper.getWorldPosition(V.a))
  let l1
  let l2 = 0
  if (fore) {
    l1 = avatar.worldToLocal(fore.getWorldPosition(V.b)).sub(S).length()
    l2 = (arm.leaf ? avatar.worldToLocal(arm.leaf.getWorldPosition(V.c)) : V.c.copy(arm.hand)).sub(avatar.worldToLocal(fore.getWorldPosition(V.d))).length()
  } else l1 = ARM_LENGTH
  const dir = V.e.copy(target).sub(S)
  const dist = Math.min(Math.max(dir.length(), 1e-3), (l1 + l2) * 0.995)
  dir.normalize()
  let u1 = dir
  let u2 = null
  if (fore) {
    const x = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist)
    const h = Math.sqrt(Math.max(0, l1 * l1 - x * x))
    const perp = V.b.copy(arm.pole)
    perp.addScaledVector(dir, -perp.dot(dir))
    if (perp.lengthSq() < 1e-6) perp.set(0, 0, -1)
    perp.normalize()
    const elbow = V.c.copy(S).addScaledVector(dir, x).addScaledVector(perp, h)
    u1 = V.d.copy(elbow).sub(S).normalize()
    u2 = V.a.copy(S).addScaledVector(dir, dist).sub(elbow).normalize()
    u1 = u1.clone()
  } else u1 = u1.clone()

  // Upper arm.
  root.copy(avatar.getWorldQuaternion(Q.root)).invert()
  const world1 = Q.a.setFromUnitVectors(arm.rest1, u1).multiply(arm.q1)
  const parent1 = Q.b.copy(root).multiply(upper.parent.getWorldQuaternion(new Quaternion()))
  upper.quaternion.slerp(parent1.invert().multiply(world1), w)
  if (!fore) return
  upper.updateMatrixWorld(true)
  const world2 = Q.a.setFromUnitVectors(arm.rest2, u2).multiply(arm.q2)
  const parent2 = Q.b.copy(root).multiply(upper.getWorldQuaternion(new Quaternion()))
  fore.quaternion.slerp(parent2.invert().multiply(world2), w)
  fore.updateMatrixWorld(true)
}

// Attaches the shovel to the right hand and, while digging, grips it with both hands. Returns
// { update(dt, animator), dispose() }.
export function attachHeldShovel(avatar, shovelId = () => player.shovel) {
  const right = avatar && makeArm(avatar, 'R')
  if (!right) return null
  const left = makeArm(avatar, 'L')

  const pivot = new Group() // origin = the gripping right hand; swings on digging
  pivot.rotation.order = 'YXZ' // tilt first, then sweep sideways
  pivot.rotation.x = HOLD_TILT
  const shovel = buildHeldShovel()
  shovel.scale.setScalar(SHOVEL_SCALE)
  shovel.position.y = -GRIP_ON_SHAFT * SHOVEL_SCALE // hand grips the shaft just below the D-grip
  pivot.add(shovel)
  pivot.add(buildFist())
  right.holder.position.z += HAND_FORWARD
  right.holder.add(pivot)
  skin(shovel, shovelId())

  let leftFist = null
  if (left) {
    leftFist = buildFist()
    leftFist.visible = false
    left.holder.add(leftFist)
  }

  const D = ANIM.dig
  const rootQ = new Quaternion()
  const mid = new Vector3()
  const target = new Vector3()
  const top = new Vector3()
  const p = new Vector3()
  const idleZ = right.holder.position.z
  return {
    update(dt, animator) {
      if (shovel.userData.id !== (shovelId() || START_SHOVEL)) skin(shovel, shovelId())
      const d = animator?.dig
      const w = d?.w ?? 0
      pivot.rotation.set(lerp(HOLD_TILT, d?.tilt ?? 0, w), (d?.yaw ?? 0) * w, 0)
      right.holder.position.z = lerp(idleZ, idleZ - HAND_FORWARD, w) // fist clears the arm only when hanging
      if (leftFist) leftFist.visible = w > 0.05
      if (w < 0.002 || !left) return

      // Both hands onto the shovel: right hand to the stroke position in front of the shoulders...
      avatar.updateMatrixWorld(true)
      const sr = avatar.worldToLocal(right.upper.getWorldPosition(new Vector3()))
      const sl = avatar.worldToLocal(left.upper.getWorldPosition(new Vector3()))
      mid.copy(sr).add(sl).multiplyScalar(0.5)
      target.set(mid.x, mid.y + d.dy, mid.z + d.dz)
      solveArm(avatar, right, target, w, rootQ)
      avatar.updateMatrixWorld(true)

      // ...left hand on the shaft below it (slid up the shaft until it is within reach).
      pivot.getWorldPosition(p)
      avatar.worldToLocal(p)
      top.set(0, 1, 0).applyQuaternion(pivot.quaternion)
      const reach = ((left.fore ? 2.4 : ARM_LENGTH) * 0.995)
      for (let k = 0; k <= 8; k++) {
        target.copy(p).addScaledVector(top, -D.gap * SHOVEL_SCALE * (1 - k / 8))
        if (target.distanceTo(sl) <= reach) break
      }
      solveArm(avatar, left, target, w, rootQ)
    },
    dispose() {
      right.holder.removeFromParent()
      left?.holder.removeFromParent()
    },
  }
}
