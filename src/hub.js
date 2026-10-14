import {
  AdditiveBlending,
  BoxGeometry,
  BufferGeometry,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  MeshStandardMaterial,
  Object3D,
  OctahedronGeometry,
  PlaneGeometry,
  Points,
  PointsMaterial,
  RingGeometry,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  TorusGeometry,
  Vector2,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { DIG, EGG_STANDS, HUB, MATERIAL_PBR } from './config.js'
import { EGGS } from './data/pets.js'
import { addBox, addWall, addFloorSampler } from './colliders.js'
import { createShovelShowcase, makeBuyable } from './shovelFx.js'
import { SHOVELS_BY_ID } from './data/shovels.js'
import { createDigField } from './dig.js'
import { spots } from './spots.js'
import { player } from './player.js'

const LUCK_SIGN_RANGE = 45 // m along the lane within which a luck sign is shown
import { canvas, labelCanvas, mulberry32, rockTile, sandTile, stripes, studTile, toTexture } from './textures.js'

// The hub island, modelled on the Roblox reference (north and south views): a yellow
// stud-tile plaza walled by grass-capped orange cliffs (chequered on the south wall), with
// grey outline strips, striped market stalls on glowing pads (Sell Loot, Digging Tools,
// Upgrades, Trails), a fenced quest trophy, a swirl portal, the navy Training Area (east),
// the pink Leaderboards platform (west), a pink rug with picnic tables against the south
// wall, and the dig lane running north to the sea between stepped sand terraces. Open sea
// all round. Everything is boxes + canvas textures; big solids register with colliders.js.

const C = HUB.colors
const TAU = Math.PI * 2
const L = HUB.lane.halfWidth
const T = HUB.terrace
const TERRACE_OUT = L + T.steps * T.stepWidth // outer edge of the terraces
const NORTH = -14 // plaza's north edge = lane mouth
const LANE_Y = DIG.topHeight // undug lane sand height (config DIG.topHeight)

// --- Materials ----------------------------------------------------------------------
const matCache = new Map()
function memo(key, make) {
  if (!matCache.has(key)) matCache.set(key, make())
  return matCache.get(key)
}

// Stud-grid material. UVs are in metres (boxGeo), so `cell` is the block size in metres;
// cellH for rectangular blocks (planks).
function studMat(color, cell = 1.25, { cols = 4, rows = cols, cellH = cell, seed = 11, vary = 0.05, lip = 3, checker = 0 } = {}) {
  return memo(`stud${color}${cell}${cols}${rows}${cellH}${seed}${vary}${lip}${checker}`, () => {
    const { color: map, height } = studTile(color, { cols, rows, seed, vary, lip, checker })
    const repeat = [1 / (cols * cell), 1 / (rows * cellH)]
    return new MeshStandardMaterial({
      map: toTexture(map, { repeat }),
      bumpMap: toTexture(height, { srgb: false, repeat }),
      bumpScale: 0.6,
      ...MATERIAL_PBR.PLASTIC,
    })
  })
}

function plain(color, extra = {}) {
  return memo(`plain${color}${JSON.stringify(extra)}`, () => new MeshStandardMaterial({ color, ...MATERIAL_PBR.PLASTIC, ...extra }))
}

function glow(color, intensity = 0.6, extra = {}) {
  return plain(color, { emissive: color, emissiveIntensity: intensity, ...MATERIAL_PBR.NEON, ...extra })
}

// Sand for the dig lane: flat band colour with the rippled sand height as bump.
function laneMat(color) {
  return memo(`lane${color}`, () => {
    const { color: shadeMap, height } = sandTile(512)
    return new MeshStandardMaterial({
      color,
      map: toTexture(shadeMap, { repeat: [1 / 3, 1 / 3] }),
      bumpMap: toTexture(height, { srgb: false, repeat: [1 / 3, 1 / 3] }),
      bumpScale: 2.2,
      ...MATERIAL_PBR.GROUND,
    })
  })
}

const stripeMat = (a, b = '#ffffff', count = 8) =>
  memo(`stripe${a}${b}${count}`, () => new MeshStandardMaterial({ map: toTexture(stripes(a, b, count)), ...MATERIAL_PBR.PLASTIC }))

const sideTop = (side, top) => [side, side, top, side, side, side] // BoxGeometry group order

// --- Geometry helpers -----------------------------------------------------------------
// Box whose UVs are world/local metres projected per face, so stud grids stay square on
// any size of box and line up between neighbouring boxes.
function boxGeo(w, h, d, ox = 0, oy = 0, oz = 0) {
  const g = new BoxGeometry(w, h, d)
  const p = g.attributes.position
  const n = g.attributes.normal
  const uv = g.attributes.uv
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) + ox
    const y = p.getY(i) + oy
    const z = p.getZ(i) + oz
    if (Math.abs(n.getY(i)) > 0.5) uv.setXY(i, x, -z)
    else if (Math.abs(n.getX(i)) > 0.5) uv.setXY(i, z, y)
    else uv.setXY(i, x, y)
  }
  return g
}

// Axis-aligned box from its extents. `solid` registers it as a collider (world-space
// extents, so only for boxes added straight to the hub root).
function part(parent, mat, minX, maxX, minY, maxY, minZ, maxZ, { solid = true, cast = true } = {}) {
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const cz = (minZ + maxZ) / 2
  const m = new Mesh(boxGeo(maxX - minX, maxY - minY, maxZ - minZ, cx, cy, cz), mat)
  m.position.set(cx, cy, cz)
  m.castShadow = cast
  m.receiveShadow = true
  parent.add(m)
  if (solid) addBox(minX, maxX, minY, maxY, minZ, maxZ)
  return m
}

// Centred box for props inside a (possibly rotated) group; never a collider.
function block(parent, mat, w, h, d, x, y, z) {
  const m = new Mesh(boxGeo(w, h, d), mat)
  m.position.set(x, y, z)
  m.castShadow = true
  m.receiveShadow = true
  parent.add(m)
  return m
}

function flatDisc(parent, geo, mat, x, y, z) {
  const m = new Mesh(geo, mat)
  m.rotation.x = -Math.PI / 2
  m.position.set(x, y, z)
  m.receiveShadow = true
  parent.add(m)
  return m
}

// Floating billboard sign. `height` is the text height in metres.
function label(parent, text, x, y, z, height, style) {
  if (!HUB.labels) return null
  const c = labelCanvas(text, style)
  const s = new Sprite(new SpriteMaterial({ map: toTexture(c), depthWrite: false }))
  s.scale.set((c.width / c.height) * height, height, 1)
  s.position.set(x, y, z)
  parent.add(s)
  return s
}

// --- Static instancing: grass drips and clouds share one draw call each -----------------
const dummy = new Object3D()
function instanced(geo, mat, list, { cast = true } = {}) {
  const im = new InstancedMesh(geo, mat, list.length)
  list.forEach(([x, y, z, sx, sy, sz, ry = 0], i) => {
    dummy.position.set(x, y, z)
    dummy.scale.set(sx, sy, sz)
    dummy.rotation.set(0, ry, 0)
    dummy.updateMatrix()
    im.setMatrixAt(i, dummy.matrix)
  })
  im.castShadow = cast
  im.receiveShadow = true
  return im
}

// --- Plaza ------------------------------------------------------------------------------
function outline(g, minX, maxX, minZ, maxZ, w = 0.9) {
  const mat = studMat(C.border, 0.9, { vary: 0.03 })
  const y = 0.07
  part(g, mat, minX, maxX, 0, y, minZ, minZ + w, { solid: false, cast: false })
  part(g, mat, minX, maxX, 0, y, maxZ - w, maxZ, { solid: false, cast: false })
  part(g, mat, minX, minX + w, 0, y, minZ + w, maxZ - w, { solid: false, cast: false })
  part(g, mat, maxX - w, maxX, 0, y, minZ + w, maxZ - w, { solid: false, cast: false })
}

function plazaOutlines(g) {
  const P = HUB.plaza
  const border = studMat(C.border, 0.9, { vary: 0.03 })
  outline(g, -11, 11, NORTH, 22) // centre court, lane mouth back to the tables
  outline(g, -30, -11, -8, 32) // west court: Sell Loot, boards stairs, Trails
  outline(g, 11, 30, -8, 32) // east court: Digging Tools, Upgrades
  // A border strip running the width of the plaza along the lane mouth.
  part(g, border, P.minX, P.maxX, 0, 0.07, NORTH, NORTH + 1, { solid: false, cast: false })
}

// Glowing shop pad: translucent fill + bright rim. Returns the rim (pulsed in update).
function shopPad(g, x, z, r, color) {
  flatDisc(g, new CircleGeometry(r, 48), glow(color, 0.35, { transparent: true, opacity: 0.85 }), x, 0.08, z)
  return flatDisc(g, new RingGeometry(r - 0.45, r, 48), glow(color, 0.9), x, 0.1, z)
}

// Market stall: plank counter, posts, striped sloping awning with a scalloped valance,
// and a blocky shopkeeper. Front faces local +Z.
function stall(g, x, z, rotY, color) {
  const s = new Group()
  s.position.set(x, 0, z)
  s.rotation.y = rotY
  const plank = studMat(C.wood, 2.5, { cols: 1, rows: 4, cellH: 0.32, vary: 0.08, lip: 2 })
  const dark = studMat(C.woodDark, 2.5, { cols: 1, rows: 4, cellH: 0.32, vary: 0.08, lip: 2 })

  block(s, plank, 5, 1.25, 1.2, 0, 0.625, 0.9) // counter
  block(s, dark, 5.5, 0.18, 1.6, 0, 1.34, 0.95) // counter top
  block(s, plank, 5, 3.2, 0.3, 0, 1.6, -1.3) // back wall
  for (const sx of [-1, 1]) block(s, plank, 0.3, 1.25, 2.6, sx * 2.5, 0.625, -0.1) // side walls
  for (const sx of [-1, 1]) {
    block(s, dark, 0.3, 3.3, 0.3, sx * 2.55, 1.65, 1.45) // front posts
    block(s, dark, 0.3, 3.9, 0.3, sx * 2.55, 1.95, -1.3) // back posts
  }
  // Coloured side boards under the awning (the shop colour reads from the side too).
  for (const sx of [-1, 1]) block(s, stripeMat(color, '#ffffff', 2), 0.2, 1.2, 2.8, sx * 2.6, 3.05, 0.05)

  const awning = new Mesh(new BoxGeometry(6.2, 0.22, 3.6), stripeMat(color, '#ffffff', 8))
  awning.position.set(0, 3.85, 0.1)
  awning.rotation.x = 0.2
  awning.castShadow = true
  s.add(awning)
  for (let i = 0; i < 8; i++) {
    const v = block(awning, plain(i % 2 ? '#ffffff' : color), 6.2 / 8, 0.45, 0.12, -3.1 + (i + 0.5) * (6.2 / 8), -0.3, 1.8)
    v.castShadow = false
  }

  // Shopkeeper.
  const npc = new Group()
  npc.position.set(0, 0, -0.45)
  block(npc, plain('#2d3a66'), 0.35, 0.9, 0.35, -0.2, 0.45, 0)
  block(npc, plain('#2d3a66'), 0.35, 0.9, 0.35, 0.2, 0.45, 0)
  block(npc, plain(color), 0.8, 0.9, 0.45, 0, 1.35, 0)
  block(npc, plain('#f3c84a'), 0.5, 0.5, 0.5, 0, 2.05, 0)
  block(npc, plain('#3a2416'), 0.52, 0.16, 0.52, 0, 2.33, 0)
  s.add(npc)

  // Counter wares: crates and a coin stack.
  block(s, plain('#a8692e'), 0.6, 0.45, 0.6, -1.6, 1.66, 0.9)
  block(s, plain('#a8692e'), 0.5, 0.35, 0.5, -0.9, 1.61, 1.0)
  const coins = new Mesh(new CylinderGeometry(0.28, 0.28, 0.35, 16), plain(C.gold, { metalness: 0.5, roughness: 0.35 }))
  coins.position.set(1.4, 1.6, 0.95)
  s.add(coins)
  g.add(s)

  // Collider: the stall's footprint, rounded out to an axis-aligned square.
  const sideways = Math.abs(Math.sin(rotY)) > 0.7
  addBox(x - (sideways ? 2.0 : 2.6), x + (sideways ? 2.0 : 2.6), 0, 3.4, z - (sideways ? 2.6 : 2.0), z + (sideways ? 2.6 : 2.0))
}

// --- Drill showcase (was the limited-time quest): a hovering yellow drill inside an orange barricade pen ------------
const PEN_HALF = 3.3 // half side of the square pen
const PANEL_W = 2.2

function panelTexture() {
  return memo('panelTex', () => {
    const c = canvas(256, 256)
    const g = c.getContext('2d')
    g.fillStyle = C.barricade
    g.fillRect(0, 0, 256, 256)
    // Reflective red/white strip along the top
    const sw = 32
    for (let i = 0; i < 8; i++) {
      g.fillStyle = i % 2 ? '#ffffff' : '#e02020'
      g.fillRect(i * sw, 14, sw, 54)
    }
    g.fillStyle = 'rgba(0,0,0,0.25)'
    g.fillRect(0, 10, 256, 5)
    g.fillRect(0, 68, 256, 5)
    // Vertical slots
    g.fillStyle = 'rgba(80,25,0,0.55)'
    for (let i = 0; i < 9; i++) g.fillRect(14 + i * 27, 100, 14, 130)
    g.fillStyle = 'rgba(255,255,255,0.18)'
    for (let i = 0; i < 9; i++) g.fillRect(14 + i * 27, 100, 3, 130)
    return toTexture(c)
  })
}

function barricadePanel(g, x, z, rotY) {
  const b = new Group()
  b.position.set(x, 0, z)
  b.rotation.y = rotY
  const front = memo('panelFront', () => new MeshStandardMaterial({ map: panelTexture(), ...MATERIAL_PBR.PLASTIC }))
  const edge = plain(C.barricade)
  const body = block(b, edge, PANEL_W, 1.5, 0.14, 0, 0.95, 0)
  body.material = [edge, edge, edge, edge, front, front]
  for (const sx of [-1, 1]) {
    block(b, plain('#1a1a1a'), 0.22, 1.75, 0.2, sx * (PANEL_W / 2 - 0.05), 0.9, 0) // end posts
    block(b, plain('#1a1a1a'), 0.3, 0.14, 0.9, sx * 0.8, 0.07, 0) // feet
  }
  g.add(b)
}

function drillTextures() {
  return memo('drillTex', () => {
    const body = canvas(512, 256)
    const g = body.getContext('2d')
    g.fillStyle = '#ffd21a'
    g.fillRect(0, 0, 512, 256)
    const hazard = (y0, y1) => {
      g.save()
      g.beginPath()
      g.rect(0, y0, 512, y1 - y0)
      g.clip()
      g.fillStyle = '#17171a'
      for (let x = -256; x < 640; x += 36) {
        g.beginPath()
        g.moveTo(x, y1)
        g.lineTo(x + 18, y1)
        g.lineTo(x + 18 + (y1 - y0), y0)
        g.lineTo(x + (y1 - y0), y0)
        g.fill()
      }
      g.restore()
    }
    hazard(0, 44)
    hazard(212, 256)
    // Hexagon warning badge on the u = 0 seam (drawn at both edges so it wraps)
    for (const cx of [0, 512]) {
      g.save()
      g.translate(cx, 128)
      g.beginPath()
      for (let i = 0; i < 6; i++) g.lineTo(Math.cos((i * Math.PI) / 3) * 64, Math.sin((i * Math.PI) / 3) * 64)
      g.closePath()
      g.fillStyle = '#2a2a2e'
      g.fill()
      g.lineWidth = 8
      g.strokeStyle = '#f2b800'
      g.stroke()
      g.beginPath()
      g.moveTo(0, -34)
      g.lineTo(34, 26)
      g.lineTo(-34, 26)
      g.closePath()
      g.fillStyle = '#ffd21a'
      g.fill()
      g.fillStyle = '#17171a'
      g.fillRect(-3.5, -14, 7, 24)
      g.fillRect(-3.5, 14, 7, 7)
      g.restore()
    }
    // Silver drill bit: diagonal flutes read as a spiral once the cone spins
    const bit = canvas(128, 256)
    const b = bit.getContext('2d')
    const grd = b.createLinearGradient(0, 0, 128, 0)
    grd.addColorStop(0, '#9aa3ad')
    grd.addColorStop(0.5, '#f4f7fa')
    grd.addColorStop(1, '#9aa3ad')
    b.fillStyle = grd
    b.fillRect(0, 0, 128, 256)
    b.strokeStyle = '#5d6670'
    b.lineWidth = 14
    for (let y = -128; y < 400; y += 52) {
      b.beginPath()
      b.moveTo(0, y)
      b.lineTo(128, y + 90)
      b.stroke()
    }
    return { body: toTexture(body), bit: toTexture(bit) }
  })
}

function haloTexture() {
  return memo('questHalo', () => {
    const c = canvas(128)
    const g = c.getContext('2d')
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64)
    r.addColorStop(0, 'rgba(255,230,120,0.9)')
    r.addColorStop(0.4, 'rgba(255,200,40,0.28)')
    r.addColorStop(1, 'rgba(255,200,40,0)')
    g.fillStyle = r
    g.fillRect(0, 0, 128, 128)
    return toTexture(c)
  })
}

function questTrophy(g, cx, cz) {
  const half = PEN_HALF
  const perSide = Math.round((half * 2) / PANEL_W)
  const pw = (half * 2) / perSide
  for (let side = 0; side < 4; side++) {
    const a = side * (Math.PI / 2)
    for (let i = 0; i < perSide; i++) {
      const lx = -half + pw * (i + 0.5)
      const lz = half
      barricadePanel(g, cx + lx * Math.cos(a) + lz * Math.sin(a), cz - lx * Math.sin(a) + lz * Math.cos(a), a)
    }
  }
  addBox(cx - half, cx + half, 0, 1.4, cz - half, cz + half)

  // Yellow corner marks and a soft ground glow inside the pen
  const mark = plain('#ffe21a')
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      flatDisc(g, new CircleGeometry(0.28, 12), mark, cx + sx * (half + 0.15), 0.06, cz + sz * (half + 0.15))
    }
  }
  const ground = flatDisc(
    g,
    new CircleGeometry(half * 0.85, 40),
    new MeshBasicMaterial({ map: haloTexture(), transparent: true, opacity: 0.5, blending: AdditiveBlending, depthWrite: false }),
    cx, 0.07, cz,
  )

  const tex = drillTextures()
  const drill = new Group()
  drill.position.set(cx, 0, cz)
  const hover = new Group()
  drill.add(hover)

  const yellow = plain('#ffd21a', { emissive: '#7a5a00', emissiveIntensity: 0.35, roughness: 0.45 })
  const black = plain('#17171a', { roughness: 0.5 })
  const steel = plain('#ffffff', { metalness: 0.65, roughness: 0.3, map: tex.bit })

  const spinner = new Group() // slow turn of the body
  hover.add(spinner)
  const bodyMat = new MeshStandardMaterial({ map: tex.body, emissive: '#6a4d00', emissiveIntensity: 0.3, ...MATERIAL_PBR.PLASTIC })
  const body = new Mesh(new CylinderGeometry(0.85, 0.85, 1.7, 36, 1, false), [bodyMat, yellow, yellow])
  body.position.y = 3.45
  const cap = new Mesh(new CylinderGeometry(0.6, 0.8, 0.28, 28), black)
  cap.position.y = 4.44
  const knob = new Mesh(new CylinderGeometry(0.16, 0.16, 0.3, 14), black)
  knob.position.y = 4.7
  const collar = new Mesh(new CylinderGeometry(0.6, 0.8, 0.32, 28), black)
  collar.position.y = 2.46
  // Side handle, opposite the badge seam
  const handle = new Mesh(new TorusGeometry(0.42, 0.11, 12, 28), black)
  handle.position.set(0, 3.5, -0.98)
  for (const m of [body, cap, knob, collar, handle]) m.castShadow = true
  spinner.add(body, cap, knob, collar, handle)

  const bit = new Mesh(new ConeGeometry(0.52, 2.0, 24, 1, true), steel)
  bit.rotation.x = Math.PI
  bit.position.y = 1.3
  bit.castShadow = true
  hover.add(bit)

  const halo = new Sprite(
    new SpriteMaterial({ map: haloTexture(), blending: AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.55 }),
  )
  halo.scale.set(5.5, 5.5, 1)
  halo.position.y = 3.2
  hover.add(halo)

  // Sand motes churned up around the bit
  const N = 36
  const seeds = Array.from({ length: N }, (_, i) => ({
    a: (i / N) * TAU * 3.1,
    r: 0.3 + (((i * 37) % 11) / 11) * 0.9,
    s: 0.3 + (((i * 53) % 7) / 7) * 0.7,
    o: ((i * 13) % 17) / 17,
  }))
  const pos = new Float32BufferAttribute(new Float32Array(N * 3), 3)
  const geo = new BufferGeometry()
  geo.setAttribute('position', pos)
  const motes = new Points(
    geo,
    new PointsMaterial({ color: '#ffe9a0', size: 0.14, map: haloTexture(), transparent: true, depthWrite: false, blending: AdditiveBlending, opacity: 0.9 }),
  )
  motes.frustumCulled = false
  drill.add(motes)
  g.add(drill)

  // Sold for $ like the galaxy shovel: price label above the drill, E in the pen's reach buys it.
  let priceSprite = null
  if (HUB.labels) {
    priceSprite = label(g, '', cx, 6.4, cz, 0.95, { fill: '#ffd84a', stroke: '#5a3b00' })
  }
  const buy = makeBuyable(SHOVELS_BY_ID.drill, priceSprite, cx, cz, PEN_HALF + 2.5)

  function update(t) {
    spinner.rotation.y = t * 0.5
    bit.rotation.y = -t * 9
    hover.position.y = Math.sin(t * 1.6) * 0.14
    halo.material.opacity = 0.45 + Math.sin(t * 2.4) * 0.12
    ground.material.opacity = 0.4 + Math.sin(t * 2.4) * 0.12
    for (let i = 0; i < N; i++) {
      const p = seeds[i]
      const k = (t * 0.35 * p.s + p.o) % 1 // 0 at the ground, 1 at the top
      const ang = p.a + t * (0.8 + p.s)
      const rad = p.r * (0.5 + k)
      pos.setXYZ(i, Math.cos(ang) * rad, 0.2 + k * 3.2, Math.sin(ang) * rad)
    }
    pos.needsUpdate = true
    buy.update()
  }
  return { update }
}

// --- Egg stand ------------------------------------------------------------------------------
// A glowing pad by the portal with a spotted egg floating over a round plinth (eggWindow.js adds
// the E prompt). The egg bobs and spins.
function eggStand(g, x, z, eggKey) {
  const info = EGGS[eggKey]
  const [c1, c2] = info.colors
  const pad = shopPad(g, x, z, 2.4, c2)
  const plinth = new Mesh(new CylinderGeometry(0.8, 1.0, 0.7, 24), plain('#6b4a2b'))
  plinth.position.set(x, 0.35, z)
  plinth.castShadow = plinth.receiveShadow = true
  g.add(plinth)
  addBox(x - 0.9, x + 0.9, 0, 0.7, z - 0.9, z + 0.9)
  const profile = []
  for (let i = 0; i <= 16; i++) {
    const a = (i / 16) * Math.PI
    const squash = 1 + 0.18 * Math.cos(a) // narrower toward the top
    profile.push(new Vector2(Math.sin(a) * 0.7 * squash, -Math.cos(a) * 0.95))
  }
  const egg = new Group()
  egg.add(new Mesh(new LatheGeometry(profile, 28), plain(c1, { emissive: c1, emissiveIntensity: 0.18 })))
  const spot = plain(c2, { emissive: c2, emissiveIntensity: 0.25 })
  for (const [sx, sy, sz, r] of [[0.55, 0.1, 0.4, 0.2], [-0.5, 0.35, 0.45, 0.16], [0.1, -0.35, 0.68, 0.18], [-0.3, -0.5, -0.55, 0.2], [0.3, 0.55, -0.45, 0.14], [0.6, -0.3, -0.3, 0.15]]) {
    const s = new Mesh(new SphereGeometry(r, 10, 8), spot)
    s.position.set(sx, sy, sz)
    s.scale.setScalar(1)
    egg.add(s)
  }
  egg.castShadow = true
  g.add(egg)
  label(g, `${info.name} · $${info.cost.toLocaleString('en-US')}`, x, 3.6, z, 0.7, { fill: '#ffe08a', stroke: '#5a2a08' })
  function update(t) {
    egg.position.set(x, 1.95 + Math.sin(t * 2) * 0.12, z)
    egg.rotation.y = t * 0.9
    egg.rotation.z = Math.sin(t * 1.3) * 0.06
  }
  return { pad, update }
}

// --- Training Area (east) -------------------------------------------------------------------
// Blue paid-pad zone (north) and yellow rebirth zone (south) split by a grey strip, a raised
// purple stage for the 1000x pad, stepped navy blocks along the east cliff and the south
// wall, and the big light-blue "Training Area" board. Pads are glassy translucent pyramids
// on glowing plates with a floor halo, price + bonus labels and rising sparks.
const PAD_R = 1.9
const PAD_H = 0.9 // sand pile height
const PAD_S = 1.5 // pile scale: base radius = PAD_R * 0.95 * PAD_S
const padRadius = (p) => (p.big ? PAD_R * 1.1 : PAD_R) * 0.95 * PAD_S

// Icon + number price line (coin for paid pads, pink orb for rebirths).
const priceCache = new Map()
function priceCanvas(text, kind) {
  const key = kind + text
  if (priceCache.has(key)) return priceCache.get(key)
  const px = 80
  const font = `900 ${px}px "Arial Black", "Arial Rounded MT Bold", sans-serif`
  const probe = canvas(4).getContext('2d')
  probe.font = font
  const icon = px * 0.9
  const pad = px * 0.2
  const c = canvas(Math.ceil(icon + px * 0.25 + probe.measureText(text).width + pad * 2), Math.ceil(px * 1.35))
  const g = c.getContext('2d')
  const cx = pad + icon / 2
  const cy = c.height / 2
  g.lineJoin = 'round'
  g.beginPath()
  g.arc(cx, cy, icon / 2, 0, TAU)
  g.fillStyle = kind === 'coin' ? '#ffc21a' : '#ff5fa8'
  g.fill()
  g.lineWidth = px * 0.1
  g.strokeStyle = kind === 'coin' ? '#7a4a00' : '#5a0f3a'
  g.stroke()
  g.beginPath()
  g.arc(cx, cy, icon * 0.28, 0, TAU)
  g.lineWidth = px * 0.09
  g.strokeStyle = kind === 'coin' ? '#fff0a0' : '#ffffff'
  g.stroke()
  g.font = font
  g.textBaseline = 'middle'
  g.lineWidth = px * 0.16
  g.strokeStyle = '#2a1a00'
  g.strokeText(text, pad + icon + px * 0.25, cy)
  g.fillStyle = '#ffffff'
  g.fillText(text, pad + icon + px * 0.25, cy)
  priceCache.set(key, c)
  return c
}

function iconLabel(parent, text, kind, x, y, z, height) {
  if (!HUB.labels) return
  const c = priceCanvas(text, kind)
  const s = new Sprite(new SpriteMaterial({ map: toTexture(c), depthWrite: false }))
  s.scale.set((c.width / c.height) * height, height, 1)
  s.position.set(x, y, z)
  parent.add(s)
}

// Soft round dot used for halos and sparks.
let dotTex = null
function dotTexture() {
  if (!dotTex) {
    const c = canvas(128)
    const g = c.getContext('2d')
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
    grad.addColorStop(0, 'rgba(255,255,255,1)')
    grad.addColorStop(0.35, 'rgba(255,255,255,0.45)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = grad
    g.fillRect(0, 0, 128, 128)
    dotTex = toTexture(c)
  }
  return dotTex
}

// One Points object (one draw call) for every spark emitter in the area.
function sparkField(g, emitters) {
  const parts = []
  const rand = mulberry32(77)
  for (const e of emitters) {
    for (let i = 0; i < e.count; i++) {
      parts.push({
        e,
        a: rand() * TAU,
        r: Math.sqrt(rand()) * e.radius,
        speed: 0.12 + rand() * 0.18,
        phase: rand(),
        sway: rand() * TAU,
      })
    }
  }
  const pos = new Float32Array(parts.length * 3)
  const col = new Float32Array(parts.length * 3)
  parts.forEach((p, i) => {
    const c = new Color(p.e.color).lerp(new Color('#ffffff'), 0.35)
    col.set([c.r, c.g, c.b], i * 3)
  })
  const geo = new BufferGeometry()
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3))
  geo.setAttribute('color', new Float32BufferAttribute(col, 3))
  const pts = new Points(
    geo,
    new PointsMaterial({
      size: 0.4,
      map: dotTexture(),
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    }),
  )
  pts.frustumCulled = false
  g.add(pts)
  return (t) => {
    const p3 = geo.attributes.position
    parts.forEach((p, i) => {
      const k = (t * p.speed + p.phase) % 1
      p3.setXYZ(
        i,
        p.e.x + Math.cos(p.a) * p.r + Math.sin(t * 1.3 + p.sway) * 0.15,
        p.e.y + k * p.e.height,
        p.e.z + Math.sin(p.a) * p.r + Math.cos(t * 1.1 + p.sway) * 0.15,
      )
    })
    p3.needsUpdate = true
  }
}

// Pad = pile of coloured sand: shared ripple bump, per-colour material.
function padSandMat(color) {
  return memo(`padsand${color}`, () => {
    const { color: shadeMap, height } = sandTile(512)
    return new MeshStandardMaterial({
      color,
      map: toTexture(shadeMap, { repeat: [1 / 2, 1 / 2] }),
      emissive: color,
      emissiveIntensity: 0.12,
      bumpMap: toTexture(height, { srgb: false, repeat: [1 / 3, 1 / 3] }),
      bumpScale: 1.6,
      ...MATERIAL_PBR.GROUND,
    })
  })
}

// Lumpy dome of radius r and height h (deterministic per seed).
function moundGeo(r, h, seed) {
  const geo = new SphereGeometry(1, 36, 16, 0, TAU, 0, Math.PI / 2)
  const p = geo.attributes.position
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i)
    const z = p.getZ(i)
    const d = Math.min(1, Math.hypot(x, z))
    const n = Math.sin(x * 4.1 + seed) * Math.cos(z * 3.7 + seed * 0.7) + 0.5 * Math.sin((x + z) * 7.3 + seed * 1.3)
    const k = 1 + n * 0.05 * d
    p.setXYZ(i, x * r * k, h * Math.pow(Math.max(0, 1 - d * d), 1.15) * (1 + n * 0.06) , z * r * k)
  }
  geo.computeVertexNormals()
  return geo
}

function trainingArea(g) {
  const x0 = 21
  const x1 = HUB.plaza.maxX
  const z0 = -10
  const z1 = HUB.plaza.maxZ
  const ZSPLIT = 14
  const blue = studMat('#4a94e6', 1.25, { vary: 0.05, seed: 31 })
  const yellow = studMat('#f4cf74', 1.25, { vary: 0.05, seed: 33 })
  const navyBlock = studMat('#202c66', 1.6, { vary: 0.06, seed: 9 })
  part(g, blue, x0, x1, 0, 0.25, z0, ZSPLIT, { cast: false })
  part(g, yellow, x0, x1, 0, 0.25, ZSPLIT, z1, { cast: false })
  // Stepped blocks: east side and back (south) side.
  part(g, navyBlock, 45, x1, 0, 4, z0, z1)
  part(g, navyBlock, 42.5, 45, 0, 2, z0, z1 - 4)
  part(g, navyBlock, x0, 45, 0, 4, 30, z1)
  part(g, navyBlock, x0, 42.5, 0, 2, 27.5, 30)

  const border = studMat(C.border, 0.9, { vary: 0.03 })
  part(g, border, x0, 42.5, 0.25, 0.3, z0, z0 + 0.6, { solid: false, cast: false })
  part(g, border, x0, x0 + 0.6, 0.25, 0.3, z0, 27.5, { solid: false, cast: false })
  // Divider: layered stripes (grey base, gold, blue, white) like the reference.
  part(g, border, x0, 42.5, 0.25, 0.3, ZSPLIT - 0.5, ZSPLIT + 0.5, { solid: false, cast: false })
  part(g, glow('#f3c040', 0.3), x0, 42.5, 0.3, 0.33, ZSPLIT - 0.45, ZSPLIT - 0.25, { solid: false, cast: false })
  part(g, glow('#3b82dc', 0.3), x0, 42.5, 0.3, 0.33, ZSPLIT - 0.2, ZSPLIT, { solid: false, cast: false })
  part(g, glow('#ffffff', 0.3), x0, 42.5, 0.3, 0.33, ZSPLIT + 0.05, ZSPLIT + 0.25, { solid: false, cast: false })
  part(g, glow('#f3c040', 0.3), x0, 42.5, 0.3, 0.33, ZSPLIT + 0.3, ZSPLIT + 0.45, { solid: false, cast: false })

  // Raised purple stage for the 1000x pad.
  const stageMat = studMat('#6f3bd8', 1.25, { vary: 0.05, seed: 35 })
  part(g, studMat('#4a2a9a', 1.25, { vary: 0.05, seed: 36 }), 26.75, 36.75, 0.25, 0.45, 3.6, 12.8)
  part(g, stageMat, 27.75, 35.75, 0.45, 0.8, 4.4, 12)
  part(g, glow('#c9a0ff', 0.9), 27.75, 35.75, 0.8, 0.86, 4.4, 4.55, { solid: false, cast: false })
  // Layered stripes on the stage front (gold, pink, purple).
  part(g, glow('#f3c040', 0.35), 26.75, 36.75, 0.25, 0.33, 3.2, 3.6, { solid: false, cast: false })
  part(g, glow('#ff7ac8', 0.35), 26.75, 36.75, 0.25, 0.3, 2.85, 3.2, { solid: false, cast: false })
  part(g, glow('#8a4bff', 0.35), 26.75, 36.75, 0.25, 0.28, 2.55, 2.85, { solid: false, cast: false })

  const pads = [
    // Upper pads (blue floor), unlocked by rebirths.
    { x: 25.9, z: -6.4, y: 0.25, color: '#ff7a1f', kind: 'rebirth', price: '5 Rebirths', bonus: '10x Strength', mult: 10, cost: 5 },
    { x: 37.6, z: -6.4, y: 0.25, color: '#ffd92e', kind: 'rebirth', price: '6 Rebirths', bonus: '25x Strength', mult: 25, cost: 6 },
    { x: 25.9, z: 0, y: 0.25, color: '#ff2f6a', kind: 'rebirth', price: '7 Rebirths', bonus: '100x Strength', mult: 100, cost: 7 },
    { x: 37.6, z: 0, y: 0.25, color: '#35e0b0', kind: 'rebirth', price: '8 Rebirths', bonus: '300x Strength', mult: 300, cost: 8 },
    { x: 31.75, z: 8.2, y: 0.8, color: '#a66bff', kind: 'rebirth', price: '9 Rebirths', bonus: '1000x Strength', big: true, mult: 1000, cost: 9 },
    // Rebirth pads (yellow floor).
    { x: 24.9, z: 17.4, y: 0.25, color: '#f0d9a0', kind: 'free', price: 'FREE', bonus: '1.5x Strength', mult: 1.5, cost: 0 },
    { x: 31.75, z: 17.4, y: 0.25, color: '#f5a460', kind: 'rebirth', price: '1 Rebirth', bonus: '2x Strength', mult: 2, cost: 1 },
    { x: 38.6, z: 17.4, y: 0.25, color: '#cfe6f2', kind: 'rebirth', price: '2 Rebirths', bonus: '3x Strength', mult: 3, cost: 2 },
    { x: 28.3, z: 23.4, y: 0.25, color: '#4fe0b0', kind: 'rebirth', price: '3 Rebirths', bonus: '4x Strength', mult: 4, cost: 3 },
    { x: 35.2, z: 23.4, y: 0.25, color: '#c78cf0', kind: 'rebirth', price: '4 Rebirths', bonus: '5x Strength', mult: 5, cost: 4 },
  ]

  const haloMat = (color) =>
    memo(`halo${color}`, () => new MeshBasicMaterial({ map: dotTexture(), color, transparent: true, opacity: 0.55, depthWrite: false, blending: AdditiveBlending }))
  const live = []
  const emitters = []
  for (const p of pads) {
    const R = padRadius(p) // pile base radius
    // A pile of sand in the pad's colour: lumpy dome with the sand ripple bump, no frame.
    const mat = padSandMat(p.color)
    const pyr = new Mesh(moundGeo(R, PAD_H * (p.big ? 1.1 : 1), p.x * 13 + p.z * 7), mat)
    pyr.position.set(p.x, p.y, p.z)
    pyr.castShadow = true
    pyr.receiveShadow = true
    g.add(pyr)

    // Coloured light pooling on the floor around the pad.
    const halo = new Mesh(new PlaneGeometry(R * 2.4, R * 2.4), haloMat(p.color))
    halo.rotation.x = -Math.PI / 2
    halo.position.set(p.x, p.y + 0.02, p.z)
    g.add(halo)
    live.push({ mat, halo, phase: p.x * 0.7 + p.z * 0.3, base: p.big ? 0.75 : 0.55, y0: pyr.position.y, pyr })

    emitters.push({ x: p.x, z: p.z, y: p.y + 0.2, color: p.color, count: p.big ? 14 : 8, radius: R * 0.8, height: p.big ? 3.8 : 2.7 })

    if (p.kind === 'free') {
      label(g, p.price, p.x, p.y + 2.9, p.z, 0.75, { fill: '#ffffff', stroke: '#3a2a00', px: 90 })
    } else {
      iconLabel(g, p.price, p.kind, p.x, p.y + 2.95, p.z, 0.75)
    }
    label(g, p.bonus, p.x, p.y + 2.25, p.z, 0.9, { fill: '#ffd84a', stroke: '#6a3a00', px: 100 })
  }
  // Walk over the piles (same profile as moundGeo, a touch lower so feet never float).
  addFloorSampler((x, z) => {
    for (const p of pads) {
      const r = padRadius(p)
      const d = Math.hypot(x - p.x, z - p.z) / r
      if (d < 1) return p.y + PAD_H * (p.big ? 1.1 : 1) * 0.95 * Math.pow(1 - d * d, 1.15)
    }
    return -Infinity
  })
  // Violet motes drifting up over the stage.
  emitters.push({ x: 31.75, z: 8.2, y: 0.9, color: '#b98cff', count: 26, radius: 4.2, height: 5.5 })
  const sparks = sparkField(g, emitters)

  // Faint violet light column over the stage pad.
  const beam = new Mesh(
    new CylinderGeometry(2, 3, 6, 24, 1, true),
    new MeshBasicMaterial({ color: '#8a4bff', transparent: true, opacity: 0.12, depthWrite: false, blending: AdditiveBlending, side: DoubleSide }),
  )
  beam.position.set(31.75, 3.9, 8.2)
  g.add(beam)

  // The sign: light-blue stud board flat on the east wall, centred over the area.
  part(g, studMat('#38b4f0', 0.8, { vary: 0.05, seed: 13 }), x1 - 0.6, x1, 7.5, 11.5, 3, 23, { solid: false })
  if (HUB.labels) {
    const c = labelCanvas('Training Area', { fill: '#ffffff', stroke: '#14396b', px: 120 })
    const text = new Mesh(new PlaneGeometry((c.width / c.height) * 2.2, 2.2), new MeshBasicMaterial({ map: toTexture(c), transparent: true }))
    text.position.set(x1 - 0.65, 9.5, 13)
    text.rotation.y = -Math.PI / 2
    g.add(text)
  }
  // Purple-lit stair up the middle of the navy steps.
  part(g, glow('#8a4bff', 0.7), 42.5, 45, 2, 2.06, 10, 16, { solid: false, cast: false })
  part(g, glow('#8a4bff', 0.7), 45, 50, 4, 4.06, 10, 16, { solid: false, cast: false })
  // Pink strip with benches along the south wall, east of the picnic rug.
  part(g, studMat(C.rug, 1.25, { vary: 0.05, seed: 21 }), 13, 21, 0, 0.08, 29, 34, { cast: false })
  const bench = studMat(C.wood, 2.5, { cols: 1, rows: 4, cellH: 0.32, vary: 0.08, lip: 2 })
  for (const x of [15.5, 19]) {
    const m = block(g, bench, 3.2, 0.5, 0.9, x, 0.33, 31.5)
    m.rotation.y = 0.1
    addBox(x - 1.7, x + 1.7, 0, 0.6, 31, 32)
  }

  return {
    pads: pads.map((p) => ({ x: p.x, y: p.y, z: p.z, radius: padRadius(p), mult: p.mult, cost: p.cost, paid: !!p.paid })),
    update(t) {
      sparks(t)
      beam.material.opacity = 0.1 + Math.sin(t * 1.6) * 0.04
      for (const p of live) {
        const w = Math.sin(t * 2.2 + p.phase)
        p.mat.emissiveIntensity = 0.22 + w * 0.1
        p.halo.material.opacity = 0.5 + w * 0.12
      }
    },
  }
}

// The two wooden boards show the server's top players (net.js `leaderboard`): Loot Collection = money, Strength.
const BOARD_STATS = [
  { key: 'money', title: 'Loot Collection', color: '#3d7bd9', prefix: '$' },
  { key: 'strength', title: 'Strength', color: '#e06bc7', prefix: '' },
]
const boardNum = (n) => {
  const u = [[1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']].find(([v]) => n >= v)
  return u ? +(n / u[0]).toFixed(2) + u[1] : String(Math.floor(n))
}
// 8 rows of rank / name / value; with no data yet the rows show as grey placeholder bars.
function paintBoard(pc, n, stat, rows, me = null) {
  pc.fillStyle = '#f3f6ff'
  pc.fillRect(0, 0, 256, 160)
  pc.fillStyle = stat.color
  pc.fillRect(0, 0, 256, 26)
  pc.font = '900 18px "Arial Black", sans-serif'
  pc.textBaseline = 'middle'
  pc.fillStyle = '#ffffff'
  pc.textAlign = 'center'
  pc.fillText(stat.title, 128, 14)
  for (let i = 0; i < 8; i++) {
    pc.fillStyle = i % 2 ? '#dde6f7' : '#eef3fc'
    pc.fillRect(8, 32 + i * 15, 240, 13)
    const row = rows[i]
    if (!row) {
      pc.fillStyle = '#8b96b4'
      pc.fillRect(14, 36 + i * 15, 60 + ((i * 37 + n * 23) % 90), 5)
      continue
    }
    const mine = me !== null && row.id === me // the viewer's own row
    if (mine) {
      pc.fillStyle = '#ffe14a'
      pc.fillRect(8, 32 + i * 15, 240, 13)
    }
    pc.font = `${mine ? 900 : 700} 10px Arial, sans-serif`
    pc.fillStyle = mine ? '#5a2a00' : '#2a3350'
    pc.textAlign = 'left'
    pc.fillText(`${i + 1}. ${String(row.name).slice(0, 18)}`, 12, 39 + i * 15)
    pc.textAlign = 'right'
    pc.fillText(stat.prefix + boardNum(row.value), 244, 39 + i * 15)
  }
  pc.textAlign = 'left'
}

// --- Leaderboards (west) ------------------------------------------------------------------------
// Pink stud platform against the west cliff: the pink "Leaderboards" banner on the wall, two
// wooden leaderboards on blue pillars, grey stairs up between the Sell Loot and Trails
// stalls (which stand on the plaza in front), and the purple Worlds ring at the south end.
function leaderboardArea(g) {
  const pinkTop = studMat(C.pink, 1.25, { vary: 0.05 })
  const pinkSide = studMat(C.pinkDark, 1.25, { vary: 0.05 })
  const stairs = studMat(C.stairs, 1, { vary: 0.04 })
  const H = 1.6
  const x0 = HUB.plaza.minX
  const x1 = -31

  part(g, sideTop(pinkSide, pinkTop), x0, x1, 0, H, -2, HUB.plaza.maxZ) // platform
  for (let k = 0; k < 3; k++) {
    part(g, stairs, x1, x1 + (3 - k) * 1.3, 0, (k + 1) * 0.53, 9.5, 18.5) // stairs toward the plaza
  }
  // Pink apron laid on the plaza floor in front of the platform.
  part(g, pinkTop, x1, x1 + 1.2, 0, 0.06, -2, 9.5, { cast: false, solid: false })
  part(g, pinkTop, x1, x1 + 1.2, 0, 0.06, 18.5, HUB.plaza.maxZ, { cast: false, solid: false })

  // Banner on the west cliff face: light pink stud board with the title.
  const banner = studMat('#f58ad8', 0.9, { vary: 0.04, seed: 23 })
  part(g, banner, x0, x0 + 0.6, 8.2, 13.2, 3, 21, { solid: false })
  if (HUB.labels) {
    const c = labelCanvas('Leaderboards', { fill: '#ffffff', stroke: '#8a2a78', px: 128 })
    const text = new Mesh(new PlaneGeometry((c.width / c.height) * 3.0, 3.0), new MeshBasicMaterial({ map: toTexture(c), transparent: true }))
    text.position.set(x0 + 0.65, 10.7, 12)
    text.rotation.y = Math.PI / 2
    g.add(text)
  }

  const wood = studMat(C.wood, 2.5, { cols: 1, rows: 4, cellH: 0.32, vary: 0.08, lip: 2 })
  const pillar = studMat('#3d7bd9', 0.6, { vary: 0.05, seed: 17 })
  const boards = [
    [-44, 8.5],
    [-44, 15.5],
  ]
  const boardViews = [] // one repaint per board, fed the server's leaderboard rows (net.js)
  boards.forEach(([x, z], n) => {
    const board = new Group()
    board.position.set(x, H, z)
    board.rotation.y = Math.PI / 2
    for (const sx of [-3.0, 3.0]) block(board, pillar, 0.6, 6.4, 0.6, sx, 3.2, 0)
    block(board, wood, 6.8, 0.5, 0.6, 0, 6.3, 0)
    block(board, wood, 6.8, 0.45, 0.5, 0, 1.6, 0)
    const panel = canvas(256, 160)
    const tex = toTexture(panel)
    const stat = BOARD_STATS[n]
    paintBoard(panel.getContext('2d'), n, stat, [])
    const face = new Mesh(new PlaneGeometry(5.6, 4.1), new MeshStandardMaterial({ map: tex, roughness: 0.6 }))
    face.position.set(0, 3.95, 0.24)
    board.add(face)
    boardViews.push((rows, me) => {
      paintBoard(panel.getContext('2d'), n, stat, rows[stat.key] ?? [], me)
      tex.needsUpdate = true
    })
    block(board, plain('#d9dfee'), 5.6, 4.1, 0.15, 0, 3.95, 0.1)
    g.add(board)
  })
  return { ...worldsRing(g, -45, H, 31.5), boards: { update: (rows, me) => boardViews.forEach((fn) => fn(rows, me)) } }
}

// Purple octagon ring standing on a pink pad at the platform's south end, facing the plaza.
function worldsRing(g, x, y, z) {
  const w = new Group()
  w.position.set(x, y, z)
  w.rotation.y = Math.PI / 2
  w.scale.setScalar(1.25)
  const base = new Mesh(new CylinderGeometry(2.6, 2.8, 0.3, 8), plain('#3c1c86'))
  base.position.y = 0.15
  base.receiveShadow = true
  const ring = new Mesh(new TorusGeometry(2.3, 0.4, 8, 8), glow('#8a2be2', 0.9))
  ring.position.y = 3.0
  ring.rotation.z = Math.PI / 8
  ring.castShadow = true
  const core = new Mesh(new CircleGeometry(1.95, 8), new MeshBasicMaterial({ color: '#5a1fb0', transparent: true, opacity: 0.35, side: DoubleSide }))
  core.position.y = 3.0
  core.rotation.z = Math.PI / 8
  w.add(base, ring, core)
  g.add(w)
  label(g, 'Worlds', x + 1, 7.4, z, 0.9, { fill: '#ffffff', stroke: '#5a1fb0' })
  addBox(x - 3.2, x + 3.2, y, y + 0.3, z - 3.2, z + 3.2)
  return { ring }
}

// --- Picnic rug against the south wall ------------------------------------------------------------
// Translucent tan trapezoid mound marking a placement spot.
function sandPad(g, x, z, w = 5.6, d = 3.2) {
  const m = new Mesh(
    new CylinderGeometry(0.62, 0.8, 0.14, 4),
    plain('#c9a24a', { transparent: true, opacity: 0.55, depthWrite: false }),
  )
  m.rotation.y = Math.PI / 4
  m.scale.set(w, 1, d)
  m.position.set(x, 0.15, z)
  m.receiveShadow = true
  g.add(m)
}

// Rarity-tagged stall label: name, rarity, price.
function wareLabel(g, name, rarity, rarityFill, price, x, z, y = 3.4) {
  label(g, name, x, y, z, 0.62, { fill: '#ffffff', stroke: '#1d1d1d' })
  label(g, rarity, x, y - 0.6, z, 0.46, { fill: rarityFill, stroke: '#2a0a2a' })
  label(g, price, x, y - 1.1, z, 0.44, { fill: '#5be04a', stroke: '#0d3a0d' })
}

function picnicArea(g) {
  const x0 = -20
  const x1 = 10
  const z0 = 22.5
  const z1 = 32
  part(g, studMat(C.rug, 1.25, { vary: 0.03, seed: 21, checker: 0.07 }), x0, x1, 0, 0.08, z0, z1, { cast: false })
  part(g, studMat(C.navy, 1.25, { vary: 0.03, seed: 22 }), x0, x1, 0, 0.1, z0, z0 + 0.7, { solid: false, cast: false })

  // Plain long benches: one dark slab on four thin legs.
  const wood = studMat(C.woodDark, 2.5, { cols: 1, rows: 4, cellH: 0.32, vary: 0.06, lip: 2 })
  const leg = plain('#5c3716')
  const benches = [
    [-17, 30.6],
    [-9.5, 30.9],
    [-14.5, 26],
    [-7.5, 25.2],
    [2.5, 24.6],
  ]
  for (const [x, z] of benches) {
    const t = new Group()
    t.position.set(x, 0.08, z)
    block(t, wood, 3.4, 0.2, 0.95, 0, 0.82, 0)
    for (const sx of [-1.45, 1.45]) for (const sz of [-0.34, 0.34]) block(t, leg, 0.16, 0.72, 0.16, sx, 0.36, sz)
    g.add(t)
    addBox(x - 1.7, x + 1.7, 0, 0.95, z - 0.5, z + 0.5)
  }
  sandPad(g, -14.5, 26)
  sandPad(g, -9.5, 30.9)
  sandPad(g, 2.5, 24.6)

  // Stands in a row, each on a sand pad with a name / rarity / price sign.
  const stand = (x, z) => {
    sandPad(g, x, z, 3.6, 3.6)
    return x
  }
  const hiGlow = glow('#ffd84a', 0.9)

  // Shooting Star: a spiky gold star.
  {
    const x = stand(-3.5, 28.2)
    const star = new Mesh(new OctahedronGeometry(0.8), hiGlow)
    star.scale.set(1.3, 1.3, 0.45)
    star.position.set(x, 1.6, 28.2)
    star.rotation.z = 0.4
    g.add(star)
    const star2 = star.clone()
    star2.rotation.z = 0.4 + Math.PI / 4
    g.add(star2)
    wareLabel(g, 'Shooting Star', 'Mythic', '#ff4fa8', '$25K', x, 28.2)
  }
  // Dragon Egg: a cream egg with green spots.
  {
    const x = stand(0.8, 28.2)
    const egg = new Mesh(new SphereGeometry(0.75, 20, 16), plain('#f4ead2'))
    egg.scale.set(1, 1.3, 1)
    egg.position.set(x, 1.25, 28.2)
    egg.castShadow = true
    g.add(egg)
    for (const [dx, dy, dz, r] of [[0.5, 1.5, 0.45, 0.18], [-0.45, 1.1, 0.55, 0.22], [0.1, 0.8, 0.72, 0.16], [-0.2, 1.8, 0.4, 0.15]]) {
      const spot = new Mesh(new SphereGeometry(r, 10, 8), plain('#5bbf3a'))
      spot.scale.z = 0.35
      spot.position.set(x + dx, dy, 28.2 + dz)
      spot.lookAt(x, 1.25, 28.2)
      spot.rotateY(Math.PI)
      g.add(spot)
    }
    wareLabel(g, 'Dragon Egg', 'Mythic', '#ff4fa8', '$25K', x, 28.2)
  }
  // Royal Scepter: a gold staff topped with a gem.
  {
    const x = stand(5.2, 28.2)
    const staff = new Mesh(new CylinderGeometry(0.09, 0.12, 2.1, 10), plain(C.gold, { metalness: 0.5, roughness: 0.35 }))
    staff.position.set(x, 1.2, 28.2)
    staff.rotation.z = 0.25
    staff.castShadow = true
    g.add(staff)
    const gem = new Mesh(new OctahedronGeometry(0.34), glow('#ff3b6b', 0.8))
    gem.position.set(x - 0.27, 2.35, 28.2)
    g.add(gem)
    wareLabel(g, 'Royal Scepter', 'Legendary', '#ff9a2e', '$7.4K', x, 28.2)
  }
  // Worker Crate: golden chest with a cyan gem, on an orange pedestal.
  const cx = 9
  const cz = 28.2
  flatDisc(g, new CircleGeometry(2.2, 28), glow('#ff8a2e', 0.5), cx, 0.14, cz)
  const chest = new Group()
  chest.position.set(cx, 0.08, cz)
  chest.rotation.y = -0.4
  const body = plain('#f0b81e', { metalness: 0.35, roughness: 0.4 })
  const band = plain('#a8741a', { metalness: 0.5, roughness: 0.35 })
  block(chest, body, 1.8, 0.95, 1.1, 0, 0.48, 0)
  const lid = block(chest, body, 1.8, 0.45, 1.1, 0, 1.2, 0)
  lid.rotation.x = -0.06
  for (const sx of [-0.65, 0.65]) block(chest, band, 0.18, 1.5, 1.14, sx, 0.74, 0)
  block(chest, band, 0.4, 0.4, 0.12, 0, 0.9, 0.58)
  const gem = new Mesh(new OctahedronGeometry(0.3), glow('#29d6ff', 0.9))
  gem.position.set(0, 0.9, 0.7)
  gem.scale.z = 0.6
  chest.add(gem)
  g.add(chest)
  addBox(cx - 1, cx + 1, 0, 1.5, cz - 0.7, cz + 0.7)
  // Sparkles over the pedestal.
  for (const [dx, dy, dz] of [[-0.9, 2.2, 0.3], [0.8, 2.6, -0.2], [0.1, 3, 0.5], [-0.3, 1.9, -0.5]]) {
    const sp = new Mesh(new OctahedronGeometry(0.1), new MeshBasicMaterial({ color: '#fff3a0' }))
    sp.position.set(cx + dx, dy, cz + dz)
    g.add(sp)
  }
  wareLabel(g, 'Worker Crate', 'Legendary', '#ff9a2e', '$7.4K', cx, cz, 3.8)
}

// --- Dig lane, terraces, cliffs ---------------------------------------------------------------
function lane(g, rand) {
  // The sand itself is a diggable heightfield, one mesh per luck band (dig.js).
  const bands = HUB.laneBands // 13 luck zones covering the whole lane
  const field = createDigField(
    bands.map(([z0, z1, color]) => {
      const mat = laneMat(color).clone()
      mat.vertexColors = true // dug sand darkens
      return [z0, z1, mat]
    }),
    laneMat('#d9a85a'), // darker front face of the step up from the plaza
  )
  g.add(field.group)

  // Dig spots: rocks, small chests and gems scattered down the lane.
  const { color, height } = rockTile(256, '#8f8a84')
  const rockMat = new MeshStandardMaterial({ map: toTexture(color), bumpMap: toTexture(height, { srgb: false }), bumpScale: 1, flatShading: true, ...MATERIAL_PBR.ROCK })
  // One prop per loot spot (spots.js: pile centres of each luck band).
  for (const { x, z } of spots) {
    const kind = rand()
    let m
    if (kind < 0.55) {
      const r = 0.3 + rand() * 0.45
      m = new Mesh(new DodecahedronGeometry(r, 0), rockMat)
      m.position.set(x, LANE_Y + r * 0.5, z)
    } else if (kind < 0.85) {
      m = new Group()
      block(m, plain('#9a5a24'), 0.9, 0.55, 0.6, 0, 0.33, 0)
      block(m, plain(C.gold, { metalness: 0.4 }), 0.95, 0.12, 0.65, 0, 0.45, 0)
      m.position.set(x, LANE_Y, z)
    } else {
      const gc = ['#ff5aa5', '#56d8ff', '#a46bff', '#ff6b3d'][Math.floor(rand() * 4)]
      m = new Mesh(new OctahedronGeometry(0.35), glow(gc, 0.3, { roughness: 0.25 }))
      m.position.set(x, LANE_Y + 0.4, z)
    }
    m.rotation.y = rand() * TAU
    m.castShadow = true
    g.add(m)
    field.addItem(m, x, z)
  }
  // One luck sign per zone: its Luck and the zone's hardness number.
  // Hidden until the player is within LUCK_SIGN_RANGE (z) so far-away signs cost nothing.
  const signs = []
  bands.forEach(([z0], i) => {
    const h = DIG.hardness[i]
    const sp = luckSign(g, `x${HUB.luck[i]} Luck`, `Recommended: ${shortNum(h)} Strength`, '', z0 - 26, 7, 5.5)
    if (sp) {
      sp.visible = false
      signs.push(sp)
    }
  })
  field.updateSigns = () => {
    const pz = player.position.z
    for (const sp of signs) sp.visible = Math.abs(sp.position.z - pz) < LUCK_SIGN_RANGE
  }
  return field
}

// 1234 -> '1.2K', 4.18e12 -> '4.18T'
function shortNum(n) {
  const u = [[1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']].find(([v]) => n >= v)
  if (!u) return n < 10 ? String(+n.toFixed(1)) : String(Math.round(n))
  const v = n / u[0]
  return +(v < 10 ? v.toFixed(2) : v < 100 ? v.toFixed(1) : v.toFixed(0)) + u[1]
}

// World sign over a luck zone: clover + big white title, small recommendation, next zone below.
function luckSign(g, title, sub, next, z, y, height) {
  if (!HUB.labels) return
  const W = 1000
  const c = document.createElement('canvas')
  c.width = W
  c.height = 420
  const x = c.getContext('2d')
  const font = '"Arial Black", "Arial Rounded MT Bold", sans-serif'
  x.textBaseline = 'middle'
  x.lineJoin = 'round'
  const text = (str, px, cx, cy, align = 'left', lw = 0.16) => {
    x.font = `900 ${px}px ${font}`
    x.textAlign = align
    x.lineWidth = px * lw
    x.strokeStyle = '#111'
    x.strokeText(str, cx, cy)
    x.fillStyle = '#fff'
    x.fillText(str, cx, cy)
  }
  // Shrink the title (clover + text) and subtitle until they fit the canvas with room for the outline.
  let tp = 190
  const titleW = (px) => ((x.font = `900 ${px}px ${font}`), px + 20 + x.measureText(title).width)
  while (tp > 80 && titleW(tp) > W - 60) tp -= 5
  const left = (W - titleW(tp)) / 2
  x.font = `${tp}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`
  x.textAlign = 'left'
  x.fillText('\u{1F340}', left, 110)
  text(title, tp, left + tp + 20, 110)
  let sp2 = 60
  while (sp2 > 30 && ((x.font = `900 ${sp2}px ${font}`), x.measureText(sub).width) > W - 60) sp2 -= 2
  text(sub, sp2, W / 2, 245, 'center', 0.14)
  if (next) text(next, 52, W / 2, 330, 'center', 0.14)
  const sp = new Sprite(new SpriteMaterial({ map: toTexture(c), depthWrite: false, fog: false }))
  sp.scale.set((c.width / c.height) * height, height, 1)
  sp.position.set(0, y, z)
  g.add(sp)
  return sp
}

function terraces(g) {
  const top = studMat(C.terraceTop, 1.25, { vary: 0.04 })
  const side = studMat(C.terraceSide, 1.25, { vary: 0.05 })
  const mat = sideTop(side, top)
  for (const s of [-1, 1]) {
    for (let k = 0; k < T.steps; k++) {
      const inner = L + k * T.stepWidth
      const [a, b] = s > 0 ? [inner, TERRACE_OUT] : [-TERRACE_OUT, -inner]
      part(g, mat, a, b, 0, (k + 1) * T.stepHeight, HUB.lane.endZ, NORTH)
    }
    // Keep players off the terraces entirely (the boxes alone can be jumped onto).
    const [a, b] = s > 0 ? [L, TERRACE_OUT] : [-TERRACE_OUT, -L]
    addWall(a, b, HUB.lane.endZ, NORTH)
  }
}

// Orange stud cliff with a grass cap whose ragged drips hang down every face.
function cliff(g, drips, rand, minX, maxX, h, minZ, maxZ, side = studMat(C.cliff, 1.6, { vary: 0.07, seed: 31 })) {
  const grass = studMat(C.grass, 1.25, { vary: 0.06, seed: 5 })
  part(g, side, minX, maxX, 0, h, minZ, maxZ)
  const o = 0.3
  part(g, sideTop(plain(C.grass), grass), minX - o, maxX + o, h - 0.6, h + 0.35, minZ - o, maxZ + o)
  const capBottom = h - 0.6
  // One ragged drip; returns its width so the caller can walk along the edge.
  const drip = (x, z, onX) => {
    const w = 0.7 + rand() * 1.1
    const len = 0.25 + rand() * rand() * 1.8
    drips.push(onX ? [x, capBottom - len / 2, z + w / 2, 0.3, len, w] : [x + w / 2, capBottom - len / 2, z, w, len, 0.3])
    return w * 0.9
  }
  for (let t = 0; t < maxX - minX; ) t += drip(minX + t, minZ - o + 0.15, false)
  for (let t = 0; t < maxX - minX; ) t += drip(minX + t, maxZ + o - 0.15, false)
  for (let t = 0; t < maxZ - minZ; ) t += drip(minX - o + 0.15, minZ + t, true)
  for (let t = 0; t < maxZ - minZ; ) t += drip(maxX + o - 0.15, minZ + t, true)
  return h + 0.35
}

function cliffs(g, rand) {
  const drips = []
  const [h1, h2] = HUB.cliffHeights
  const P = HUB.plaza
  const back = HUB.island.maxZ
  const wallH = 12
  // [minX, maxX, height, minZ, maxZ, m² per palm]
  const tiers = []
  for (const s of [-1, 1]) {
    const span = (a, b) => (s > 0 ? [a, b] : [-b, -a])
    // Along the lane: two tiers stepping up away from the terraces.
    tiers.push([...span(TERRACE_OUT, 62), h1, HUB.lane.endZ, NORTH, 520])
    tiers.push([...span(62, 110), h2, HUB.lane.endZ, NORTH, 520])
    // East / west walls of the plaza.
    tiers.push([...span(P.maxX, 110), h2 - 2, NORTH, P.maxZ, 420])
    // South wall ends.
    tiers.push([...span(30, 110), wallH, P.maxZ, back, 160])
  }
  for (const t of tiers) cliff(g, drips, rand, t[0], t[1], t[2], t[3], t[4])
  // Full-height invisible walls so nobody can jump or squeeze onto / through the cliffs.
  for (const t of [...tiers, [-30, 30, 0, P.maxZ, back]]) addWall(t[0] - 0.3, t[1] + 0.3, t[3] - 0.3, t[4] + 0.3)
  // South wall middle, chequered, behind the plaza.
  const middle = [-30, 30, wallH, P.maxZ, back, 110]
  cliff(g, drips, rand, ...middle.slice(0, 5), studMat(C.checker, 2.4, { cols: 2, vary: 0.03, checker: 0.09, seed: 41 }))
  tiers.push(middle)
  g.add(instanced(new BoxGeometry(1, 1, 1), studMat(C.grass, 1.25, { vary: 0.06, seed: 5 }), drips, { cast: false }))
  return tiers
}

// --- Palms ------------------------------------------------------------------------------------
function colored(geo, color) {
  const c = new Color(color)
  const n = geo.attributes.position.count
  const arr = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) arr.set([c.r, c.g, c.b], i * 3)
  geo.setAttribute('color', new Float32BufferAttribute(arr, 3))
  return geo.index ? geo.toNonIndexed() : geo
}

// One palm variant as two merged geometries (trunk+coconuts, fronds), vertex coloured.
function palmVariant(rand) {
  const trunk = []
  const leaves = []
  const lean = 0.5 + rand() * 0.6 // the reference palms bend hard
  let x = 0
  let y = 0
  const segH = 1.05
  for (let i = 0; i < 7; i++) {
    const r = 0.34 - i * 0.02
    const seg = new CylinderGeometry(r * 0.88, r, segH, 8)
    seg.translate(x, y + segH / 2, 0)
    trunk.push(colored(seg, i % 2 ? C.trunk : '#a2744a'))
    y += segH * 0.97
    x += lean * (i / 7) * 0.45
  }
  for (let i = 0; i < 3; i++) {
    const nut = new SphereGeometry(0.22, 8, 6)
    const a = (i / 3) * TAU
    nut.translate(x + Math.cos(a) * 0.3, y - 0.25, Math.sin(a) * 0.3)
    trunk.push(colored(nut, '#6b4423'))
  }
  const fronds = 8
  for (let i = 0; i < fronds; i++) {
    const a = (i / fronds) * TAU + rand() * 0.3
    const len1 = 2.0 + rand() * 0.5
    const len2 = 1.8 + rand() * 0.6
    const col = i % 2 ? C.palm : '#52c43f'
    const seg1 = new BoxGeometry(len1, 0.08, 0.95)
    seg1.translate(len1 / 2, 0, 0)
    seg1.rotateZ(0.22)
    const seg2 = new BoxGeometry(len2, 0.08, 0.75)
    seg2.translate(len2 / 2, 0, 0)
    seg2.rotateZ(-0.55 - rand() * 0.3)
    seg2.translate(Math.cos(0.22) * len1, Math.sin(0.22) * len1, 0)
    for (const seg of [seg1, seg2]) {
      seg.rotateY(a)
      seg.translate(x, y, 0)
      leaves.push(colored(seg, col))
    }
  }
  return [mergeGeometries(trunk), mergeGeometries(leaves)]
}

function palms(g, rand, tiers) {
  const spots = []
  for (const [minX, maxX, h, minZ, maxZ, perPalm] of tiers) {
    const top = h + 0.35
    const area = (maxX - minX) * (maxZ - minZ)
    const count = Math.round(area / perPalm)
    for (let i = 0; i < count; i++) {
      spots.push([minX + 2 + rand() * (maxX - minX - 4), top, minZ + 2 + rand() * (maxZ - minZ - 4)])
    }
  }
  // A few on the upper terraces near the plaza and further down the lane.
  for (const s of [-1, 1]) {
    for (let z = -22; z > HUB.oceanZ + 30; z -= 48) {
      spots.push([s * (TERRACE_OUT - 1.6), T.steps * T.stepHeight, z + rand() * 8])
    }
  }
  const variants = [palmVariant(rand), palmVariant(rand), palmVariant(rand)]
  const mat = new MeshStandardMaterial({ vertexColors: true, ...MATERIAL_PBR.PLASTIC })
  variants.forEach(([trunk, leaves], v) => {
    const list = spots
      .filter((_, i) => i % 3 === v)
      .map(([x, y, z]) => {
        const sc = 1.4 + rand() * 0.6
        return [x, y, z, sc, sc, sc, rand() * TAU]
      })
    if (!list.length) return
    g.add(instanced(trunk, mat, list), instanced(leaves, mat, list))
  })
}

// --- Sea, beach, clouds, umbrellas -------------------------------------------------------------
function sea(g) {
  const z = HUB.oceanZ
  part(g, laneMat(C.laneSand), -110, 110, -1.2, LANE_Y, z - 10, z, { solid: false, cast: false })
  const foam = flatDisc(g, new PlaneGeometry(220, 1.2), plain('#ffffff', { transparent: true, opacity: 0.8 }), 0, -0.22, z - 10.4)
  foam.receiveShadow = false
  const water = new Mesh(new PlaneGeometry(4000, 4000), new MeshStandardMaterial({ color: C.ocean, roughness: 0.25, metalness: 0.15 }))
  water.rotation.x = -Math.PI / 2
  water.position.set(0, -0.3, 0) // under the island floor; open sea past every edge
  g.add(water)
}

function clouds(g, rand) {
  const puffs = []
  for (let i = 0; i < 34; i++) {
    const a = rand() * TAU
    const d = 300 + rand() * 320
    const cx = Math.cos(a) * d
    const cz = Math.sin(a) * d
    const cy = 70 + rand() * 90
    const n = 5 + Math.floor(rand() * 5)
    const size = 8 + rand() * 9
    for (let k = 0; k < n; k++) {
      const r = size * (0.6 + rand() * 0.6)
      puffs.push([cx + (rand() - 0.5) * size * 3.2, cy + rand() * size * 0.5, cz + (rand() - 0.5) * size * 1.6, r, r * 0.62, r])
    }
  }
  const mat = new MeshLambertMaterial({ color: '#ffffff', emissive: '#c9d9ea', emissiveIntensity: 0.45, fog: false })
  g.add(instanced(new IcosahedronGeometry(1, 2), mat, puffs, { cast: false }))
}

function umbrella(g, x, y, z, color) {
  const u = new Group()
  u.position.set(x, y, z)
  block(u, plain('#f2f2f2'), 0.12, 2.6, 0.12, 0, 1.3, 0)
  const canopy = new Mesh(new ConeGeometry(2.0, 0.8, 12, 1, true), new MeshStandardMaterial({ map: toTexture(stripes(color, '#ffffff', 12)), side: DoubleSide, ...MATERIAL_PBR.PLASTIC }))
  canopy.position.y = 2.7
  canopy.castShadow = true
  u.add(canopy)
  block(u, plain('#4fb6ff'), 1.0, 0.12, 2.0, 1.4, 0.35, 0.4) // towel/lounger
  g.add(u)
}

// --- Build --------------------------------------------------------------------------------------
export function createHub() {
  const g = new Group()
  g.name = 'hub'
  const rand = mulberry32(4242)

  plazaOutlines(g)
  const pads = [
    shopPad(g, -23, 3, 2.6, '#ffe23a'),
    shopPad(g, 14.5, 3, 2.6, '#4dff6a'),
    shopPad(g, -23, 24, 2.6, '#ff4fd8'),
    shopPad(g, 14.5, 24, 2.6, '#3fe6ff'),
  ]
  stall(g, -27.5, 3, Math.PI / 2, '#ffd21f') // Sell Loot
  stall(g, 19, 3, -Math.PI / 2, '#33d24a') // Digging Tools
  stall(g, -27.5, 24, Math.PI / 2, '#ff5fcf') // Trails
  stall(g, 19, 24, -Math.PI / 2, '#3cc8ff') // Upgrades
  label(g, 'Sell Loot', -27.5, 6.6, 3, 1.4, { fill: '#5cf03a', stroke: '#154a08' })
  label(g, 'Digging Tools', 19, 6.6, 3, 1.4, { fill: '#5cf03a', stroke: '#154a08' })
  label(g, 'Trails', -27.5, 6.6, 24, 1.4, { fill: '#ffffff', stroke: '#5a1a52' })
  label(g, 'Upgrades', 19, 6.6, 24, 1.4, { fill: '#8fe9ff', stroke: '#0f3a5a' })

  const quest = questTrophy(g, -24, -11)
  const eggs = EGG_STANDS.map((s) => eggStand(g, s.x, s.z, s.egg))
  for (const e of eggs) pads.push(e.pad)
  const training = trainingArea(g)
  const worlds = leaderboardArea(g)
  const shovelFx = createShovelShowcase(10, -10)
  g.add(shovelFx.group)

  const dig = lane(g, rand)
  terraces(g)
  const tiers = cliffs(g, rand)
  palms(g, rand, tiers)
  sea(g)
  clouds(g, rand)
  umbrella(g, -(TERRACE_OUT - 2.5), T.steps * T.stepHeight, -74, '#ff4a4a')
  umbrella(g, TERRACE_OUT - 2.5, T.steps * T.stepHeight, -118, '#ffb02e')
  umbrella(g, -(L + 2 * T.stepWidth - 1.6), 2 * T.stepHeight, -128, '#3fa2ff')

  // Idle animation: spinning trophy, pulsing shop rims and loot glows.
  function update(t) {
    shovelFx.update(t)
    for (const e of eggs) e.update(t)
    training.update(t)
    quest.update(t)
    dig.updateSigns()
    worlds.ring.rotation.x = Math.sin(t * 0.8) * 0.08
    const pulse = 0.7 + Math.sin(t * 3) * 0.3
    for (const rim of pads) rim.material.emissiveIntensity = pulse
  }
  return { group: g, update, dig, trainPads: training.pads, boards: worlds.boards }
}
