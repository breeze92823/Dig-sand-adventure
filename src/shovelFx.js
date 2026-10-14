import {
  AdditiveBlending,
  BufferGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshStandardMaterial,
  OctahedronGeometry,
  Points,
  Shape,
  ShaderMaterial,
  Sprite,
  SpriteMaterial,
  TorusGeometry,
} from 'three'
import { HUB, MATERIAL_PBR } from './config.js'
import { addBox } from './colliders.js'
import { player } from './player.js'
import { SHOVELS_BY_ID, START_SHOVEL } from './data/shovels.js'
import { offer, toast } from './interact.js'
import { canvas, labelCanvas, mulberry32, toTexture } from './textures.js'

// "+300% Strength" galaxy shovel showcase: a dark nebula-textured shovel floating over a glowing
// cyan pedestal, wrapped by two counter-rotating ribbons (magenta + cyan), twinkling sparkles,
// an additive aura and a pulsing point light, with the price / bonus labels floating above.

const TAU = Math.PI * 2

// Quality tier, picked once: weak CPUs / low memory / touch phones get fewer particles, lower
// geometry detail, a smaller nebula texture and no shadow casting.
const LOW =
  typeof navigator !== 'undefined' &&
  ((navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4 || /Android|iPhone|iPad|Mobi/i.test(navigator.userAgent))
const Q = LOW
  ? { nebula: 128, curve: 8, bevel: 1, ribbonSeg: 36, sparkles: 36, torus: [6, 20], cyl: 10, shadow: false }
  : { nebula: 256, curve: 24, bevel: 3, ribbonSeg: 90, sparkles: 110, torus: [10, 36], cyl: 12, shadow: true }
const CULL_DIST = 75 // beyond this the showcase is hidden and not updated
const FAR_DIST = 35 // beyond this the animation runs at half rate
const CYAN = '#2fe6ff'
const MAGENTA = '#ff3fd0'
const PURPLE = '#6a3dff'

// --- Textures ----------------------------------------------------------------------------------
function nebulaTexture() {
  const size = Q.nebula
  const c = canvas(size, size)
  const x = c.getContext('2d')
  const rand = mulberry32(77)
  x.fillStyle = '#080a26'
  x.fillRect(0, 0, size, size)
  const blobs = [
    ['#3a2cff', 0.55],
    ['#ff3fd0', 0.45],
    ['#1fb8ff', 0.4],
    ['#8a3dff', 0.5],
  ]
  for (let i = 0; i < (LOW ? 8 : 14); i++) {
    const [col, a] = blobs[i % blobs.length]
    const bx = rand() * size
    const by = rand() * size
    const r = 40 + rand() * 70
    const g = x.createRadialGradient(bx, by, 0, bx, by, r)
    g.addColorStop(0, col + 'ff')
    g.addColorStop(1, col + '00')
    x.globalAlpha = a
    x.fillStyle = g
    x.fillRect(bx - r, by - r, r * 2, r * 2)
  }
  x.globalAlpha = 1
  for (let i = 0; i < size / 3; i++) {
    x.fillStyle = `rgba(255,255,255,${0.4 + rand() * 0.6})`
    const s = rand() < 0.1 ? 2.2 : 1.1
    x.fillRect(rand() * size, rand() * size, s, s)
  }
  return c
}

// One white glow texture shared by every aura; each sprite tints it via material.color.
let glowTex = null
function glowTexture() {
  if (glowTex) return glowTex
  const c = canvas(64, 64)
  const x = c.getContext('2d')
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, '#ffffffff')
  g.addColorStop(0.35, '#ffffff88')
  g.addColorStop(1, '#ffffff00')
  x.fillStyle = g
  x.fillRect(0, 0, 64, 64)
  glowTex = new CanvasTexture(c)
  return glowTex
}

// --- Model ---------------------------------------------------------------------------------------
function bladeGeometry() {
  const s = new Shape()
  s.moveTo(0, -1.2)
  s.bezierCurveTo(0.5, -1.05, 0.98, -0.5, 0.98, 0.1)
  s.lineTo(0.72, 0.72)
  s.lineTo(-0.72, 0.72)
  s.lineTo(-0.98, 0.1)
  s.bezierCurveTo(-0.98, -0.5, -0.5, -1.05, 0, -1.2)
  const g = new ExtrudeGeometry(s, { depth: 0.16, bevelEnabled: true, bevelSize: 0.07, bevelThickness: 0.07, bevelSegments: Q.bevel, curveSegments: Q.curve })
  g.translate(0, 0, -0.08)
  return g
}

function buildShovel() {
  const shovel = new Group()
  const nebula = toTexture(nebulaTexture(), { repeat: [0.5, 0.5] })
  const bladeMat = new MeshStandardMaterial({
    color: '#ffffff',
    map: nebula,
    emissive: '#ffffff',
    emissiveMap: nebula,
    emissiveIntensity: 0.55,
    roughness: 0.25,
    metalness: 0.4,
  })
  const blade = new Mesh(bladeGeometry(), bladeMat)
  blade.castShadow = Q.shadow

  // Cyan ring + star badge in the middle of the blade, on both faces.
  const ringMat = new MeshStandardMaterial({ color: CYAN, emissive: CYAN, emissiveIntensity: 1.2, ...MATERIAL_PBR.NEON })
  const starMat = new MeshStandardMaterial({ color: '#ffffff', emissive: '#bff6ff', emissiveIntensity: 1.4 })
  for (const side of [1, -1]) {
    const ring = new Mesh(new TorusGeometry(0.36, 0.06, Q.torus[0] - 2, Q.torus[1]), ringMat)
    ring.position.set(0, -0.2, side * 0.17)
    const star = new Mesh(new OctahedronGeometry(0.17), starMat)
    star.scale.set(1, 1, 0.25)
    star.position.set(0, -0.2, side * 0.18)
    shovel.add(ring, star)
  }

  // Shaft: purple with cyan + black bands near the top, then a D-grip.
  const shaftMat = new MeshStandardMaterial({ color: PURPLE, emissive: '#3a1fa0', emissiveIntensity: 0.6, roughness: 0.4 })
  const shaft = new Mesh(new CylinderGeometry(0.07, 0.07, 2.2, Q.cyl), shaftMat)
  shaft.position.y = 1.7
  const black = new MeshStandardMaterial({ color: '#0a0a14', roughness: 0.5 })
  const bandA = new Mesh(new CylinderGeometry(0.09, 0.09, 0.14, Q.cyl), ringMat)
  bandA.position.y = 2.3
  const bandB = new Mesh(new CylinderGeometry(0.09, 0.09, 0.22, Q.cyl), black)
  bandB.position.y = 2.55
  const grip = new Mesh(new TorusGeometry(0.2, 0.06, 8, 20, Math.PI * 1.5), shaftMat)
  grip.rotation.z = Math.PI * 0.75
  grip.position.y = 2.95
  shovel.add(blade, shaft, bandA, bandB, grip)
  return shovel
}

// --- Effects ---------------------------------------------------------------------------------------
const RIBBON_VERT = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`

const RIBBON_FRAG = `
  uniform float t; uniform vec3 color; uniform float phase;
  varying vec2 vUv;
  void main() {
    float u = vUv.x, v = vUv.y;
    float ends = smoothstep(0.0, 0.18, u) * smoothstep(1.0, 0.78, u);
    float edge = 1.0 - pow(abs(v * 2.0 - 1.0), 2.0);
    float streak = 0.25 + 0.75 * pow(fract(u * 1.5 - t * 0.45 + phase), 2.5);
    float a = ends * edge * streak;
    vec3 col = mix(color, vec3(1.0), pow(edge, 3.0) * streak * 0.7);
    gl_FragColor = vec4(col * 1.3, a);
  }`

// Spiral band around the shovel axis; `dir` flips the twist, `lift` offsets it vertically.
function ribbon(color, dir, phase, radius, turns, yMin, yMax, width) {
  const N = Q.ribbonSeg
  const pos = []
  const uv = []
  const idx = []
  for (let i = 0; i <= N; i++) {
    const u = i / N
    const a = dir * u * turns * TAU
    const r = radius * (0.55 + 0.45 * Math.sin(u * Math.PI))
    const y = yMin + (yMax - yMin) * u
    for (const v of [0, 1]) {
      pos.push(Math.cos(a) * r, y + (v - 0.5) * width, Math.sin(a) * r * 0.7)
      uv.push(u, v)
    }
    if (i < N) {
      const k = i * 2
      idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2)
    }
  }
  const geo = new BufferGeometry()
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3))
  geo.setAttribute('uv', new Float32BufferAttribute(uv, 2))
  geo.setIndex(idx)
  const mat = new ShaderMaterial({
    uniforms: { t: { value: 0 }, color: { value: new Color(color) }, phase: { value: phase } },
    vertexShader: RIBBON_VERT,
    fragmentShader: RIBBON_FRAG,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    blending: AdditiveBlending,
  })
  const mesh = new Mesh(geo, mat)
  mesh.frustumCulled = false
  return mesh
}

function sparkles(count) {
  const rand = mulberry32(2024)
  const pos = []
  const seed = []
  const col = []
  const palette = [[1, 1, 1], [1, 0.45, 0.85], [0.4, 0.95, 1], [1, 1, 1]]
  for (let i = 0; i < count; i++) {
    pos.push(0.7 + rand() * 1.3, -1.5 + rand() * 4.2, rand() * TAU) // radius, height, start angle
    seed.push(rand())
    col.push(...palette[i % palette.length])
  }
  const geo = new BufferGeometry()
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3))
  geo.setAttribute('aSeed', new Float32BufferAttribute(seed, 1))
  geo.setAttribute('aColor', new Float32BufferAttribute(col, 3))
  const mat = new ShaderMaterial({
    uniforms: { t: { value: 0 } },
    vertexShader: `
      uniform float t; attribute float aSeed; attribute vec3 aColor;
      varying float vTw; varying vec3 vCol;
      void main() {
        float dir = aSeed > 0.5 ? 1.0 : -1.0;
        float ang = position.z + t * (0.5 + aSeed) * dir;
        vec3 p = vec3(cos(ang) * position.x, position.y + sin(t * 1.7 + aSeed * 40.0) * 0.18, sin(ang) * position.x * 0.7);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = (0.14 + aSeed * 0.16) * 520.0 / -mv.z;
        vTw = 0.35 + 0.65 * pow(0.5 + 0.5 * sin(t * (2.0 + aSeed * 4.0) + aSeed * 60.0), 2.0);
        vCol = aColor;
      }`,
    fragmentShader: `
      varying float vTw; varying vec3 vCol;
      void main() {
        vec2 p = gl_PointCoord * 2.0 - 1.0;
        float d = length(p);
        float core = smoothstep(1.0, 0.0, d);
        float cross = max(0.0, 1.0 - abs(p.x) * 9.0) * (1.0 - abs(p.y)) + max(0.0, 1.0 - abs(p.y) * 9.0) * (1.0 - abs(p.x));
        float a = (core * core + cross * 0.8) * vTw;
        if (a < 0.01) discard;
        gl_FragColor = vec4(vCol, a);
      }`,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  })
  const pts = new Points(geo, mat)
  pts.frustumCulled = false
  return pts
}

function aura(color, size, opacity) {
  const s = new Sprite(new SpriteMaterial({ map: glowTexture(), color, transparent: true, opacity, depthWrite: false, blending: AdditiveBlending }))
  s.scale.set(size, size, 1)
  return s
}

// --- Buy with E ------------------------------------------------------------------------------------
// Makes a hub showcase sell shovel `item`: the price sprite is redrawn when the state changes
// ($ price / OWNED / EQUIPPED) and E within `radius` of (x, z) buys, then equips, it.
export function makeBuyable(item, priceSprite, x, z, radius) {
  let priceText = null
  const short = (n) => {
    const u = [[1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']].find(([v]) => n >= v)
    return '$' + (u ? +(n / u[0]).toFixed(2) + u[1] : n)
  }
  const owns = () => player.shovels?.has(item.id)
  function setPrice() {
    const text = player.shovel === item.id ? 'EQUIPPED' : owns() ? 'OWNED - E to equip' : short(item.cost)
    if (!priceSprite || text === priceText) return
    priceText = text
    const c = labelCanvas(text, { fill: '#b8a8ff', stroke: '#2a1a7a' })
    priceSprite.material.map?.dispose()
    priceSprite.material.map = toTexture(c)
    priceSprite.material.needsUpdate = true
    const h = priceSprite.scale.y
    priceSprite.scale.set((c.width / c.height) * h, h, 1)
  }
  function interact() {
    if (player.shovel === item.id) return
    player.shovels ??= new Set([START_SHOVEL])
    if (!owns()) {
      if (player.money < item.cost) return toast(`Need ${short(item.cost)}`)
      player.money -= item.cost
      player.shovels.add(item.id)
      toast(`Bought ${item.name}`)
    }
    player.shovel = item.id
    setPrice()
  }
  return {
    update() {
      const d = Math.hypot(player.position.x - x, player.position.z - z)
      if (d < radius && player.shovel !== item.id) offer(owns() ? `Equip ${item.name}` : `Buy ${item.name} ${short(item.cost)}`, interact, d)
      setPrice()
    },
  }
}

// --- Public ----------------------------------------------------------------------------------------
export function createShovelShowcase(x, z) {
  const g = new Group()
  g.name = 'shovelShowcase'
  g.position.set(x, 0, z)

  // Pedestal: dark indigo disc with a thick glowing cyan rim.
  const disc = new Mesh(new CylinderGeometry(1.9, 2.0, 0.5, LOW ? 24 : 48), new MeshStandardMaterial({ color: '#2a1a8a', ...MATERIAL_PBR.PLASTIC }))
  disc.position.y = 0.25
  disc.receiveShadow = true
  const rimMat = new MeshStandardMaterial({ color: CYAN, emissive: CYAN, emissiveIntensity: 1.0, ...MATERIAL_PBR.NEON })
  const rim = new Mesh(new TorusGeometry(1.95, 0.12, Q.torus[0], LOW ? 32 : 64), rimMat)
  rim.rotation.x = Math.PI / 2
  rim.position.y = 0.4
  const halo = new Mesh(new TorusGeometry(2.4, 0.04, 4, LOW ? 32 : 64), new MeshStandardMaterial({ color: CYAN, emissive: CYAN, emissiveIntensity: 0.8, transparent: true, opacity: 0.45 }))
  halo.rotation.x = Math.PI / 2
  halo.position.y = 0.1
  g.add(disc, rim, halo)
  addBox(x - 2, x + 2, 0, 0.5, z - 2, z + 2)

  // Floating shovel, tilted back like the reference, with the FX nested so they follow it.
  const float = new Group()
  float.position.y = 2.3
  const tilt = new Group()
  tilt.rotation.z = -0.28
  tilt.rotation.x = 0.1
  const shovel = buildShovel()
  const fx = new Group()
  const ribbonA = ribbon(MAGENTA, 1, 0, 1.45, 1.7, -1.5, 2.1, 0.9)
  const ribbonB = ribbon(CYAN, -1, 0.5, 1.3, 1.5, -1.3, 1.9, 0.75)
  const spark = sparkles(Q.sparkles)
  fx.add(ribbonA, ribbonB, spark)
  const blobMag = aura(MAGENTA, 4.2, 0.45)
  const blobCyan = aura(CYAN, 3.0, 0.35)
  blobMag.position.set(0.1, -0.2, -0.3)
  blobCyan.position.set(0, 0.1, -0.2)
  tilt.add(shovel, fx, blobMag, blobCyan)
  float.add(tilt)
  g.add(float)

  // Fake light pool: a flat additive glow on the pedestal instead of a real PointLight (a dynamic
  // light adds cost to every lit material in the scene).
  const pool = aura(MAGENTA, 7, 0.3)
  pool.position.y = 0.9
  g.add(pool)

  if (HUB.labels) {
    const add = (text, y, h, style) => {
      const c = labelCanvas(text, style)
      const s = new Sprite(new SpriteMaterial({ map: toTexture(c), depthWrite: false }))
      s.scale.set((c.width / c.height) * h, h, 1)
      s.position.set(0, y, 0)
      g.add(s)
    }
    add('', 6.9, 0.8, { fill: '#b8a8ff', stroke: '#2a1a7a' })
    add('+300% Strength', 6.0, 1.1, { fill: '#a98bff', stroke: '#1d1060' })
    add('4x your best regular shovel', 5.2, 0.55, { fill: '#ff9be8', stroke: '#5a1052' })
  }

  const baseY = float.position.y
  const labels = g.children.filter((c) => c.isSprite && c !== pool)

  const priceSprite = HUB.labels ? labels[0] : null
  const buy = makeBuyable(SHOVELS_BY_ID.galaxy, priceSprite, x, z, 4)

  let hidden = false
  let frame = 0

  function update(t) {
    // Distance cull: far away the whole animated part is hidden and skipped.
    const dx = player.position.x - x
    const dz = player.position.z - z
    const d2 = dx * dx + dz * dz
    buy.update()
    const cull = d2 > CULL_DIST * CULL_DIST
    if (cull !== hidden) {
      hidden = cull
      float.visible = pool.visible = !cull
      for (const l of labels) l.visible = !cull
    }
    if (cull) return
    if (d2 > FAR_DIST * FAR_DIST && (++frame & 1)) return // half rate when far
    float.position.y = baseY + Math.sin(t * 1.6) * 0.15
    float.rotation.y = t * 0.5
    fx.rotation.y = t * 1.3
    ribbonA.material.uniforms.t.value = t
    ribbonB.material.uniforms.t.value = t
    spark.material.uniforms.t.value = t
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.2)
    rimMat.emissiveIntensity = 0.8 + pulse * 0.6
    blobMag.material.opacity = 0.35 + pulse * 0.2
    blobCyan.material.opacity = 0.5 - pulse * 0.2
    pool.material.opacity = 0.2 + pulse * 0.2
    pool.material.color.setRGB(1 - pulse * 0.7, 0.25 + pulse * 0.6, 0.82 + pulse * 0.18)
  }

  return { group: g, update }
}
