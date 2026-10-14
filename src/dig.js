import { BufferAttribute, BufferGeometry, Color, Group, Mesh, Points, ShaderMaterial } from 'three'
import { DIG, HUB } from './config.js'
import { addFloorSampler, addPusher } from './colliders.js'
import { dirtTile, toTexture } from './textures.js'
import { player } from './player.js'
import { shovelBonus } from './shovels.js'
import { boostMult } from './boosts.js'
import { digReachMult, digSpeedMult } from './upgrades.js'

// The diggable dig lane: a heightfield of sand. Every vertex carries a "dug" fraction (0 = full
// sand, 1 = dug out). Holding the dig button carves a soft bowl a little way in front of the
// player; the sand there drops to a dark, damp floor, harder zones (higher luck) dig slower.
// Heights live in one CPU array; only the few vertices around the dig spot are rewritten, so the
// cost is flat however long the lane is. Loot buried in the lane (lootDrops.js) rises once its cell is passable
// and the player picks it up with E.

const S = DIG.cell
const L = HUB.lane.halfWidth
const NORTH = HUB.plaza.minZ // lane mouth, row 0
const TOP = DIG.topHeight // undug sand height (the lane sits above the plaza)
const NX = Math.round((2 * L) / S)
const NZ = Math.round((NORTH - HUB.lane.endZ) / S)
const STRIDE = NX + 1
const SAFE_ROWS = Math.max(0, Math.round((NORTH - DIG.safeZ) / S))

// bands: [[z0, z1, material], ...] north-going, contiguous, covering the whole lane.
export function createDigField(bands, ledgeMat) {
  const dirtMapTex = toTexture(dirtTile(256))
  const group = new Group()
  group.name = 'digField'
  const dug = new Float32Array(STRIDE * (NZ + 1))
  const height = new Float32Array(dug.length).fill(TOP)
  const rowHard = new Float32Array(NZ + 1)

  // One mesh per luck band so each keeps its own material; vertices on a shared border row are
  // duplicated and kept in sync by writeVertex.
  const meshes = bands.map(([z0, z1, mat], b) => {
    const r0 = Math.round((NORTH - z0) / S)
    const r1 = Math.round((NORTH - z1) / S)
    const rows = r1 - r0 + 1
    const n = STRIDE * rows
    const pos = new Float32Array(n * 3)
    const nrm = new Float32Array(n * 3)
    const uv = new Float32Array(n * 2)
    const col = new Float32Array(n * 3).fill(1)
    const dugAmt = new Float32Array(n)
    for (let r = 0; r < rows; r++) {
      const j = r0 + r
      const hard = DIG.hardness[Math.min(b, DIG.hardness.length - 1)]
      rowHard[j] = j === r0 && b > 0 ? Math.max(rowHard[j], hard) : hard
      for (let i = 0; i < STRIDE; i++) {
        const v = r * STRIDE + i
        const x = -L + i * S
        const z = NORTH - j * S
        pos.set([x, TOP, z], v * 3)
        nrm.set([0, 1, 0], v * 3)
        uv.set([x, -z], v * 2) // metres, like the other lane boxes
      }
    }
    const idx = new Uint32Array(NX * (rows - 1) * 6)
    let k = 0
    for (let r = 0; r < rows - 1; r++) {
      for (let i = 0; i < NX; i++) {
        const a = r * STRIDE + i
        const c = a + STRIDE
        idx.set([a, a + 1, c, a + 1, c + 1, c], k)
        k += 6
      }
    }
    const geo = new BufferGeometry()
    geo.setAttribute('dugAmt', new BufferAttribute(dugAmt, 1))
    geo.setAttribute('position', new BufferAttribute(pos, 3))
    geo.setAttribute('normal', new BufferAttribute(nrm, 3))
    geo.setAttribute('uv', new BufferAttribute(uv, 2))
    geo.setAttribute('color', new BufferAttribute(col, 3))
    geo.setIndex(new BufferAttribute(idx, 1))
    // Fully dug floor: a real packed-soil texture blended in per vertex, cold slate in deeper bands.
    const tint = new Color(DIG.floorTint).lerp(new Color(DIG.floorTintDeep), b / Math.max(1, bands.length - 1))
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.dirtMap = { value: dirtMapTex }
      sh.uniforms.dirtTint = { value: tint }
      sh.vertexShader = sh.vertexShader
        .replace('void main() {', `attribute float dugAmt; varying float vDug; varying vec2 vDirtUv;
void main() {`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>
vDug = dugAmt; vDirtUv = position.xz * 0.3;`)
      sh.fragmentShader = sh.fragmentShader
        .replace('void main() {', `uniform sampler2D dirtMap; uniform vec3 dirtTint; varying float vDug; varying vec2 vDirtUv;
void main() {`)
        .replace('#include <color_fragment>', `diffuseColor.rgb = mix(diffuseColor.rgb, texture2D(dirtMap, vDirtUv).rgb * dirtTint, smoothstep(0.0, 1.0, vDug));
#include <color_fragment>`)
    }
    const mesh = new Mesh(geo, mat)
    mesh.receiveShadow = true
    mesh.frustumCulled = false
    group.add(mesh)
    const sand = mat.color ? mat.color.clone() : new Color(DIG.sandColor)
    return { mesh, r0, r1, pos, nrm, col, dugAmt, tint, sand }
  })

  // The step up from the plaza: a vertical strip along the mouth that follows the first row's
  // height, so digging at z = -14 lowers it instead of leaving a gap.
  const lpos = new Float32Array(STRIDE * 2 * 3)
  const lidx = []
  for (let i = 0; i < STRIDE; i++) {
    lpos.set([-L + i * S, 0, NORTH, -L + i * S, TOP, NORTH], i * 6)
    if (i < NX) lidx.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 2, i * 2 + 3, i * 2 + 1)
  }
  const lgeo = new BufferGeometry()
  lgeo.setAttribute('position', new BufferAttribute(lpos, 3))
  lgeo.setIndex(lidx)
  lgeo.computeVertexNormals()
  const ledge = new Mesh(lgeo, ledgeMat)
  ledge.receiveShadow = true
  ledge.frustumCulled = false
  group.add(ledge)

  const h = (i, j) => height[Math.min(NZ, Math.max(0, j)) * STRIDE + Math.min(NX, Math.max(0, i))]

  function writeVertex(i, j) {
    const x = -L + i * S
    const z = NORTH - j * S
    const y = height[j * STRIDE + i]
    const nx = (h(i - 1, j) - h(i + 1, j)) / (2 * S)
    const nz = (h(i, j + 1) - h(i, j - 1)) / (2 * S)
    const len = Math.hypot(nx, 1, nz)
    const d = dug[j * STRIDE + i]
    const t = d * d * (3 - 2 * d) // soft blend sand -> floor material
    const dark = 1 - DIG.pitShade * Math.sin(Math.PI * Math.min(1, d)) // deeper, shadowed mid-dig
    if (j === 0) {
      lpos[i * 6 + 4] = y
      lgeo.attributes.position.needsUpdate = true
    }
    for (const m of meshes) {
      if (j < m.r0 || j > m.r1) continue
      const v = ((j - m.r0) * STRIDE + i) * 3
      m.pos[v] = x
      m.pos[v + 1] = y
      m.pos[v + 2] = z
      m.nrm[v] = nx / len
      m.nrm[v + 1] = 1 / len
      m.nrm[v + 2] = nz / len
      m.col[v] = m.col[v + 1] = m.col[v + 2] = dark
      m.dugAmt[v / 3] = t
    }
  }

  // Surface height under (x, z), or -Infinity off the lane. Bilinear, like the rendered mesh.
  function heightAt(x, z) {
    const fx = (x + L) / S
    const fz = (NORTH - z) / S
    if (fx < 0 || fx > NX || fz < 0 || fz > NZ) return -Infinity
    const i = Math.min(NX - 1, Math.floor(fx))
    const j = Math.min(NZ - 1, Math.floor(fz))
    const tx = fx - i
    const tz = fz - j
    const a = height[j * STRIDE + i] * (1 - tx) + height[j * STRIDE + i + 1] * tx
    const b = height[(j + 1) * STRIDE + i] * (1 - tx) + height[(j + 1) * STRIDE + i + 1] * tx
    return a * (1 - tz) + b * tz
  }

  // --- Undug sand is a wall: a cell blocks the player until it has been dug through. ------
  // Blocking works on coarse cells of BLOCK x BLOCK height-grid cells (~2.5 m, so the lane is
  // about 10 cells wide) while the sand itself stays finely sculpted.
  const B = DIG.block
  const BS = B * S
  const blocked = (bi, bj) => {
    let sum = 0
    let n = 0
    // Only vertices that can actually be dug count (the lane's side columns and far row are fixed).
    for (let j = Math.max(SAFE_ROWS, bj * B); j <= Math.min(NZ - 1, (bj + 1) * B); j++) {
      for (let i = Math.max(1, bi * B); i <= Math.min(NX - 1, (bi + 1) * B); i++) {
        sum += dug[j * STRIDE + i]
        n++
      }
    }
    return n > 0 && sum / n < DIG.passDug
  }
  // Undug sand is never a floor for the player (finite y), so jumping can't land on it; the
  // camera (y = Infinity) still sees the sand surface.
  addFloorSampler((x, z, y) => {
    if (Number.isFinite(y)) {
      const bi = Math.floor((x + L) / BS)
      const bj = Math.floor((NORTH - z) / BS)
      if (bi >= 0 && bj >= 0 && x <= L && blocked(bi, bj)) return -Infinity
    }
    return heightAt(x, z)
  })
  addPusher((p, v, r) => {
    if (p.x < -L - r || p.x > L + r || p.z > NORTH + r || p.z < NORTH - NZ * S - r) return
    const i0 = Math.max(0, Math.floor((p.x - r + L) / BS))
    const i1 = Math.min(Math.ceil(NX / B) - 1, Math.floor((p.x + r + L) / BS))
    const j0 = Math.max(0, Math.floor((NORTH - p.z - r) / BS))
    const j1 = Math.min(Math.ceil(NZ / B) - 1, Math.floor((NORTH - p.z + r) / BS))
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        if (!blocked(i, j)) continue
        const minX = -L + i * BS
        const maxX = Math.min(L, minX + BS)
        const maxZ = NORTH - j * BS
        const minZ = Math.max(NORTH - NZ * S, maxZ - BS)
        const cx = Math.max(minX, Math.min(p.x, maxX))
        const cz = Math.max(minZ, Math.min(p.z, maxZ))
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
          // Centre inside the cell: leave toward the plaza (south) side.
          p.z = maxZ + r
        }
      }
    }
  })

  // --- Loot buried in the lane ----------------------------------------------------------
  const items = []

  // --- Sand spray -----------------------------------------------------------------------
  // Pooled points with per-particle colour / size / alpha: chunky grains that arc out, tumble down
  // and fade, tinted with the sand (or dug floor) of the band being dug.
  const N = DIG.particles
  const ppos = new Float32Array(N * 3).fill(-1000)
  const pvel = new Float32Array(N * 3)
  const pcol = new Float32Array(N * 3)
  const psize = new Float32Array(N)
  const palpha = new Float32Array(N)
  const plife = new Float32Array(N)
  const pgrav = new Float32Array(N).fill(14)
  const pa0 = new Float32Array(N).fill(1)
  const pmax = new Float32Array(N).fill(1)
  const pgeo = new BufferGeometry()
  pgeo.setAttribute('position', new BufferAttribute(ppos, 3))
  pgeo.setAttribute('pcolor', new BufferAttribute(pcol, 3))
  pgeo.setAttribute('psize', new BufferAttribute(psize, 1))
  pgeo.setAttribute('palpha', new BufferAttribute(palpha, 1))
  const spray = new Points(
    pgeo,
    new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      vertexShader: `attribute vec3 pcolor; attribute float psize; attribute float palpha;
        varying vec3 vC; varying float vA; varying float vS;
        void main() {
          vC = pcolor; vA = palpha; vS = step(0.5, psize);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = psize * 520.0 / max(0.1, -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `varying vec3 vC; varying float vA; varying float vS;
        void main() {
          float r = length(gl_PointCoord - 0.5) * 2.0;
          if (r > 1.0) discard;
          float soft = mix(1.0 - r * r * 0.4, (1.0 - r) * (1.0 - r), vS);
          gl_FragColor = vec4(vC * (1.0 - 0.3 * r), vA * soft);
          #include <colorspace_fragment>
        }`,
    }),
  )
  spray.frustumCulled = false
  group.add(spray)
  let nextP = 0
  let live = 0
  const tmp = new Color()
  // Band colour at (x, z): the band's sand, darkened toward its floor material by how dug the spot is.
  function grainColor(x, z) {
    const j = Math.min(NZ, Math.max(0, Math.round((NORTH - z) / S)))
    const m = meshes.find((mm) => j >= mm.r0 && j <= mm.r1) || meshes[0]
    const i = Math.min(NX, Math.max(0, Math.round((x + L) / S)))
    const t = dug[j * STRIDE + i]
    return tmp.copy(m.sand).lerp(m.tint, Math.min(1, t * 0.7 + Math.random() * 0.35))
  }
  function emit(x, y, z, power, color, big = 1) {
    const k = nextP++ % N
    const a = Math.random() * Math.PI * 2
    const sp = (0.8 + Math.random() * 1.6) * power
    ppos.set([x + (Math.random() - 0.5) * 0.6, y, z + (Math.random() - 0.5) * 0.6], k * 3)
    pvel.set([Math.cos(a) * sp, 2.2 + Math.random() * 2.4 * power, Math.sin(a) * sp], k * 3)
    const shade = 0.75 + Math.random() * 0.4
    pcol.set([color.r * shade, color.g * shade, color.b * shade], k * 3)
    psize[k] = (0.07 + Math.random() * 0.12) * big
    pgrav[k] = 14
    pa0[k] = 1
    palpha[k] = 1
    pmax[k] = plife[k] = 0.5 + Math.random() * 0.5
    live = N
  }
  // A big soft dust cloud puff: slow, drifting, billowing outward over the whole cell.
  function emitDust(cx, cz, y, color, spread, lift = 1) {
    const k = nextP++ % N
    const px = cx + (Math.random() - 0.5) * 2 * spread
    const pz = cz + (Math.random() - 0.5) * 2 * spread
    const dx = px - cx
    const dz = pz - cz
    const out = 0.5 + Math.random() * 0.9
    ppos.set([px, y + 0.1 + Math.random() * 0.3, pz], k * 3)
    pvel.set([dx * out + (Math.random() - 0.5) * 0.4, (0.7 + Math.random() * 1.1) * lift, dz * out + (Math.random() - 0.5) * 0.4], k * 3)
    const lt = 0.9 + Math.random() * 0.15
    pcol.set([color.r * lt + 0.08, color.g * lt + 0.07, color.b * lt + 0.05], k * 3)
    psize[k] = 0.9 + Math.random() * 1.1
    pgrav[k] = -0.2
    pa0[k] = DIG.dustAlpha
    palpha[k] = DIG.dustAlpha
    pmax[k] = plife[k] = DIG.dustLife * (0.7 + Math.random() * 0.5)
    live = N
  }
  function burst(x, z, n, power, big) {
    const y = heightAt(x, z)
    const c = grainColor(x, z)
    for (let q = 0; q < n; q++) emit(x, y + 0.15, z, power, c, big)
    for (let q = 0; q < Math.ceil(n / 3); q++) emitDust(x, z, y, c, BS * 0.5, 1.2)
  }
  const doneCells = new Set()
  let cellsDug = 0 // cells dug through since the page loaded (the tutorial counts them)
  let doneFlag = false
  let dirty = false // anything dug since the last reset

  let sprayAcc = 0
  let dustAcc = 0
  const target = { x: 0, z: 0 }

  // Where the shovel bites: a little way in front of the player.
  function digSpot(player) {
    target.x = player.position.x + Math.sin(player.facing) * DIG.reach * digReachMult()
    target.z = player.position.z + Math.cos(player.facing) * DIG.reach * digReachMult()
    return target
  }

  // Digs the whole coarse cell in front of the player (no aiming): every vertex of the cell sinks
  // together, so it opens up as one square pit.
  function dig(dt, tx, tz) {
    const bi = Math.floor((tx + L) / BS)
    const bj = Math.floor((NORTH - tz) / BS)
    if (bi < 0 || bj < 0 || bi >= Math.ceil(NX / B) || bj >= Math.ceil(NZ / B)) return
    const i0 = bi * B
    const i1 = Math.min(NX, (bi + 1) * B)
    const j0 = Math.max(SAFE_ROWS, bj * B)
    const j1 = Math.min(NZ - 1, (bj + 1) * B)
    const cellX = -L + (bi + 0.5) * BS
    const cellZ = NORTH - (bj + 0.5) * BS
    let changed = false
    const power = 1
    const wasDone = doneCells.has(bi * 1000 + bj)
    const speed = DIG.rate * ((player.strength + shovelBonus()) * boostMult('strength')) ** DIG.strengthExp * digSpeedMult()
    for (let j = j0; j <= j1; j++) {
      for (let i = Math.max(1, i0); i <= Math.min(NX - 1, i1); i++) {
        const k = j * STRIDE + i
        if (dug[k] >= 1) continue
        dug[k] = Math.min(1, dug[k] + (speed * dt) / rowHard[j])
        const t = dug[k]
        height[k] = TOP - (TOP - DIG.floor) * (t * t * (3 - 2 * t))
        changed = true
      }
    }
    if (!changed) return
    dirty = true
    // Normals depend on the neighbours, so rewrite one ring more than was dug.
    for (let j = Math.max(0, j0 - 1); j <= Math.min(NZ, j1 + 1); j++) {
      for (let i = Math.max(0, i0 - 1); i <= Math.min(NX, i1 + 1); i++) writeVertex(i, j)
    }
    for (const m of meshes) {
      if (j1 + 1 < m.r0 || j0 - 1 > m.r1) continue
      m.mesh.geometry.attributes.position.needsUpdate = true
      m.mesh.geometry.attributes.normal.needsUpdate = true
      m.mesh.geometry.attributes.color.needsUpdate = true
      m.mesh.geometry.attributes.dugAmt.needsUpdate = true
    }
    sprayAcc += dt * DIG.sprayRate
    const y = heightAt(cellX, cellZ)
    const c = grainColor(cellX, cellZ)
    while (sprayAcc >= 1) {
      sprayAcc -= 1
      emit(cellX + (Math.random() - 0.5) * BS, y + 0.1, cellZ + (Math.random() - 0.5) * BS, 0.6 + power, c)
    }
    dustAcc += dt * DIG.dustRate
    while (dustAcc >= 1) {
      dustAcc -= 1
      emitDust(cellX, cellZ, y, c, BS * 0.5)
    }
    // Cell finished: one big dust burst, flagged for the caller (camera / sound feedback).
    if (!wasDone && !blocked(bi, bj)) {
      doneCells.add(bi * 1000 + bj)
      cellsDug++
      doneFlag = true
      burst(cellX, cellZ, DIG.doneBurst, 2.2, 1.6)
    }
  }

  return {
    group,
    heightAt,
    // Registers a loot spot buried in the lane (lootDrops.js puts the item there).
    addItem(mesh, x, z, also = []) {
      items.push({ mesh, x, z, also })
    },
    get items() {
      return items
    },
    // True once the player can walk through the 2.5 m cell around (x, z): the same test that
    // stops them at undug sand, so buried loot rises exactly when its cell opens up.
    passable(x, z) {
      const bi = Math.floor((x + L) / BS)
      const bj = Math.floor((NORTH - z) / BS)
      if (bi < 0 || bj < 0 || bi >= Math.ceil(NX / B) || bj >= Math.ceil(NZ / B)) return false
      return !blocked(bi, bj)
    },
    get cellsDug() {
      return cellsDug
    },
    get dirty() {
      return dirty
    },
    // Fill every hole back in: the lane returns to full, undug sand.
    reset() {
      dug.fill(0)
      height.fill(TOP)
      doneCells.clear()
      doneFlag = false
      dirty = false
      for (let j = 0; j <= NZ; j++) for (let i = 0; i <= NX; i++) writeVertex(i, j)
      for (const m of meshes) {
        const a = m.mesh.geometry.attributes
        a.position.needsUpdate = a.normal.needsUpdate = a.color.needsUpdate = a.dugAmt.needsUpdate = true
      }
    },
    // A small sand puff at (x, z), e.g. when loot breaks free.
    puff(x, z) {
      burst(x, z, DIG.puffCount, 1.6, 1)
    },
    // True once after a cell has been dug through.
    takeDone() {
      const d = doneFlag
      doneFlag = false
      return d
    },
    update(dt, digging, player) {
      if (digging) {
        const t = digSpot(player)
        dig(dt, t.x, t.z)
      }
      if (live === 0) return
      let any = false
      for (let k = 0; k < N; k++) {
        if (plife[k] <= 0) continue
        plife[k] -= dt
        palpha[k] = pa0[k] * Math.min(1, plife[k] / (pmax[k] * 0.5))
        any = true
        pvel[k * 3 + 1] -= pgrav[k] * dt
        if (pgrav[k] < 0) {
          const dr = Math.max(0, 1 - 1.6 * dt)
          pvel[k * 3] *= dr
          pvel[k * 3 + 1] *= dr
          pvel[k * 3 + 2] *= dr
        }
        ppos[k * 3] += pvel[k * 3] * dt
        ppos[k * 3 + 1] += pvel[k * 3 + 1] * dt
        ppos[k * 3 + 2] += pvel[k * 3 + 2] * dt
        if (plife[k] <= 0) ppos[k * 3 + 1] = -1000
      }
      pgeo.attributes.position.needsUpdate = true
      pgeo.attributes.palpha.needsUpdate = true
      pgeo.attributes.pcolor.needsUpdate = true
      pgeo.attributes.psize.needsUpdate = true
      if (!any) live = 0
    },
  }
}
