import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, NormalBlending, Points, ShaderMaterial } from 'three'
import { TRAILS } from './data/trails.js'

// Particle suite for the equipped trail. Every trail leaves a coloured wake behind the player; the
// further up the list (tier 0..14), the more layers join in: glitter stars (3+), rising embers (6),
// a landing/jump burst ring (4), orbiting stars (9+), hue-cycling rainbow sparks and light motes
// (12+), and for the top trail dark smoke plus lightning flashes. Two pooled Points: additive
// glow + a normal-blend one for smoke. Particles live in world space so the wake stays behind.

const TAU = Math.PI * 2
const rnd = (a, b) => a + Math.random() * (b - a)

const VERT = `
attribute vec3 aColor; attribute float aSize; attribute float aAlpha; attribute float aKind;
varying vec3 vColor; varying float vAlpha; varying float vKind; uniform float uScale;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uScale / max(0.1, -mv.z);
  vColor = aColor; vAlpha = aAlpha; vKind = aKind;
}`
const FRAG = `
varying vec3 vColor; varying float vAlpha; varying float vKind;
void main() {
  vec2 p = gl_PointCoord - 0.5;
  float d = length(p);
  if (d > 0.5 || vAlpha < 0.003) discard;
  float a;
  vec3 col = vColor;
  if (vKind < 0.5) { a = pow(1.0 - d * 2.0, 1.6); col = mix(col, vec3(1.0), smoothstep(0.2, 0.0, d) * 0.35); a = min(1.0, a * 1.6); }
  else if (vKind < 1.5) {
    float cross = max(exp(-abs(p.x) * 55.0) * exp(-abs(p.y) * 5.0), exp(-abs(p.y) * 55.0) * exp(-abs(p.x) * 5.0));
    a = clamp(cross + pow(1.0 - d * 2.0, 3.0) * 0.7, 0.0, 1.0) * (1.0 - d * 2.0);
    col = mix(col, vec3(1.0), smoothstep(0.2, 0.0, d));
  } else { a = smoothstep(0.5, 0.15, d); }
  gl_FragColor = vec4(col, a * vAlpha);
  #include <colorspace_fragment>
}`

class Pool {
  constructor(max, blending, reserved = 0) {
    this.max = max
    this.reserved = reserved
    this.next = reserved
    const f = (n) => new Float32Array(max * n)
    this.pos = f(3); this.vel = f(3); this.col = f(3); this.size = f(1); this.alpha = f(1); this.kind = f(1)
    this.life = f(1); this.maxLife = f(1); this.s0 = f(1); this.s1 = f(1)
    this.c0 = f(3); this.c1 = f(3); this.hue = f(1); this.twinkle = f(1); this.drag = f(1); this.grav = f(1)
    const g = (this.geo = new BufferGeometry())
    const attr = (name, arr, n) => g.setAttribute(name, new BufferAttribute(arr, n).setUsage(35048))
    attr('position', this.pos, 3); attr('aColor', this.col, 3); attr('aSize', this.size, 1); attr('aAlpha', this.alpha, 1); attr('aKind', this.kind, 1)
    this.mat = new ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, blending,
      uniforms: { uScale: { value: 600 } },
    })
    this.points = new Points(g, this.mat)
    this.points.frustumCulled = false
    this.points.renderOrder = 20
  }

  spawn(x, y, z, vx, vy, vz, life, s0, s1, c0, c1, kind, o = {}) {
    const i = this.next
    this.next = this.next + 1 >= this.max ? this.reserved : this.next + 1
    this.set(i, x, y, z, vx, vy, vz, life, s0, s1, c0, c1, kind, o)
  }

  set(i, x, y, z, vx, vy, vz, life, s0, s1, c0, c1, kind, o = {}) {
    this.pos.set([x, y, z], i * 3); this.vel.set([vx, vy, vz], i * 3)
    this.life[i] = 0; this.maxLife[i] = life; this.s0[i] = s0; this.s1[i] = s1
    this.c0.set([c0.r, c0.g, c0.b], i * 3); this.c1.set([c1.r, c1.g, c1.b], i * 3)
    this.kind[i] = kind; this.hue[i] = o.hue ?? -1; this.twinkle[i] = o.twinkle ?? 0
    this.drag[i] = o.drag ?? 1.5; this.grav[i] = o.grav ?? 0
  }

  update(dt) {
    const { pos, vel, col, size, alpha, life, maxLife } = this
    const tmp = this.tmp ?? (this.tmp = new Color())
    for (let i = 0; i < this.max; i++) {
      if (i < this.reserved) continue
      if (life[i] >= maxLife[i]) { size[i] = 0; alpha[i] = 0; continue }
      life[i] += dt
      const u = Math.min(1, life[i] / maxLife[i])
      const k = Math.exp(-this.drag[i] * dt)
      const i3 = i * 3
      vel[i3] *= k; vel[i3 + 1] = vel[i3 + 1] * k + this.grav[i] * dt; vel[i3 + 2] *= k
      pos[i3] += vel[i3] * dt; pos[i3 + 1] += vel[i3 + 1] * dt; pos[i3 + 2] += vel[i3 + 2] * dt
      size[i] = this.s0[i] + (this.s1[i] - this.s0[i]) * u
      let a = Math.min(1, u * 12) * Math.min(1, (1 - u) * 1.8)
      if (this.twinkle[i]) a *= 0.55 + 0.45 * Math.sin(life[i] * this.twinkle[i] + i)
      alpha[i] = a
      if (this.hue[i] >= 0) {
        tmp.setHSL((this.hue[i] + life[i] * 0.6) % 1, 1, 0.62)
        col[i3] = tmp.r; col[i3 + 1] = tmp.g; col[i3 + 2] = tmp.b
      } else {
        for (let c = 0; c < 3; c++) col[i3 + c] = this.c0[i3 + c] + (this.c1[i3 + c] - this.c0[i3 + c]) * u
      }
    }
    for (const n of ['position', 'aColor', 'aSize', 'aAlpha', 'aKind']) this.geo.attributes[n].needsUpdate = true
  }
}

const WHITE = new Color('#ffffff')
const lerpC = (a, b, t) => a.clone().lerp(b, t)

// Trail sources: the local player (slot 0) and up to REMOTE_TRAILS nearby remote players. A source is
// { trail (id), state (createTrailState()), slot, x, y, z, vx, vz, facing, grounded, lod }. `lod` (0..1) scales
// the emission rate; below FULL_LOD the costly extras (orbiting stars, smoke, flashes) are skipped.
export const REMOTE_TRAILS = 4
const FULL_LOD = 0.7
const ORBIT_MAX = 10
export const createTrailState = () => ({ acc: { stream: 0, glitter: 0, ember: 0, mote: 0, smoke: 0, flash: 0 }, wasGrounded: true })

export function createTrailFx(scene) {
  const SLOTS = 1 + REMOTE_TRAILS
  const glow = new Pool(1800, NormalBlending, ORBIT_MAX * SLOTS)
  const smoke = new Pool(160, NormalBlending)
  glow.kind.fill(0); for (let i = 0; i < ORBIT_MAX * SLOTS; i++) glow.kind[i] = -1
  smoke.life.fill(1); smoke.maxLife.fill(0.5)
  glow.life.fill(1); glow.maxLife.fill(0.5)
  scene.add(glow.points, smoke.points)

  const cache = {}
  const orbitOn = new Array(SLOTS).fill(false) // slot has visible orbit stars to clear
  let time = 0

  const palette = (t) => (cache[t.id] ??= { a: new Color(t.colors[0]), b: new Color(t.colors[1]) })

  function clearOrbit(slot) {
    for (let i = slot * ORBIT_MAX; i < (slot + 1) * ORBIT_MAX; i++) { glow.kind[i] = -1; glow.size[i] = 0; glow.alpha[i] = 0 }
    orbitOn[slot] = false
  }

  function emitFor(src, dt) {
    const tier = TRAILS.findIndex((t) => t.id === src.trail)
    const { state, lod } = src
    const { acc } = state
    const vx = src.vx, vz = src.vz
    const speed = Math.hypot(vx, vz)
    const moving = speed > 0.4
    const full = lod >= FULL_LOD
    const base = src.slot * ORBIT_MAX
    const p = src
    if (tier < 0) {
      if (orbitOn[src.slot]) clearOrbit(src.slot)
      state.wasGrounded = src.grounded
      return
    }
    const tr = TRAILS[tier]
    let { a, b } = palette(tr)
    // Onyx is black: its additive glow is violet/white instead (the dark part is the smoke).
    if (tr.id === 'onyx') { a = new Color('#e6c8ff'); b = new Color('#7a3dff') }
    const bx = moving ? -vx / speed : -Math.sin(src.facing)
    const bz = moving ? -vz / speed : -Math.cos(src.facing)
    const f = tier / (TRAILS.length - 1)
    const rainbow = tier >= 12
    const hueOf = () => (rainbow ? Math.random() : undefined)
    const emit = (key, rate) => {
      acc[key] += rate * lod * dt
      const n = Math.min(12, Math.floor(acc[key]))
      acc[key] -= n
      return n
    }

    // Wake: soft puffs behind the feet, denser and larger up the tiers.
    const spread = 0.3 + tier * 0.02
    for (let n = emit('stream', (moving ? 40 + tier * 12 : 8 + tier * 2.5)); n--; ) {
      const along = rnd(0.15, 0.5)
      glow.spawn(
        p.x + bx * along + rnd(-spread, spread), p.y + rnd(0.1, 0.5 + f * 0.5), p.z + bz * along + rnd(-spread, spread),
        bx * rnd(0.2, 1.2) * (moving ? 1 : 0.2) + rnd(-0.2, 0.2), rnd(0.1, 0.7), bz * rnd(0.2, 1.2) * (moving ? 1 : 0.2) + rnd(-0.2, 0.2),
        rnd(0.8, 1.1) + tier * 0.05, 0.5 + tier * 0.04, 0.15, a, b, 0, { hue: hueOf(), drag: 2 },
      )
    }
    // Glitter stars twinkling around the body.
    if (tier >= 3) {
      for (let n = emit('glitter', (moving ? 14 : 8) + tier * 3.5); n--; ) {
        const ang = rnd(0, TAU), r = rnd(0.2, 0.9)
        glow.spawn(
          p.x + Math.cos(ang) * r + bx * rnd(0, 0.6), p.y + rnd(0.1, 1.9), p.z + Math.sin(ang) * r + bz * rnd(0, 0.6),
          rnd(-0.2, 0.2), rnd(0.1, 0.6), rnd(-0.2, 0.2), rnd(0.9, 1.6), 0.4 + f * 0.4, 0.08, WHITE, lerpC(a, WHITE, 0.4), 1,
          { twinkle: rnd(14, 26), hue: rainbow && Math.random() < 0.6 ? Math.random() : undefined },
        )
      }
    }
    // Embers rising off the feet.
    if (tier >= 6) {
      for (let n = emit('ember', 16 + (tier - 6) * 6); n--; ) {
        const ang = rnd(0, TAU), r = rnd(0.1, 0.5)
        glow.spawn(
          p.x + Math.cos(ang) * r, p.y + 0.05, p.z + Math.sin(ang) * r,
          Math.cos(ang) * 0.3, rnd(1.2, 2.8), Math.sin(ang) * 0.3, rnd(1.1, 1.8), 0.28, 0.06, lerpC(a, WHITE, 0.5), b, 0,
          { drag: 0.6, hue: hueOf() },
        )
      }
    }
    // Vertical light motes streaming up around the player (rainbow tiers).
    if (tier >= 12) {
      for (let n = emit('mote', 28 + (tier - 12) * 14); n--; ) {
        const ang = rnd(0, TAU), r = rnd(0.5, 1.1)
        glow.spawn(
          p.x + Math.cos(ang) * r, p.y + rnd(0, 0.4), p.z + Math.sin(ang) * r,
          0, rnd(2.5, 4.5), 0, rnd(0.9, 1.4), 0.26, 0.05, WHITE, a, 1, { drag: 0.3, hue: Math.random(), twinkle: rnd(20, 30) },
        )
      }
    }
    // Orbiting stars (always alive while equipped; skipped for distant remote players).
    const orbit = full && tier >= 9 ? Math.min(ORBIT_MAX, 3 + (tier - 9) * 1.4) | 0 : 0
    if (orbit || orbitOn[src.slot]) {
      for (let k = 0; k < ORBIT_MAX; k++) {
        const i = base + k
        if (k >= orbit) { glow.kind[i] = -1; glow.size[i] = 0; glow.alpha[i] = 0; continue }
        const ang = time * (1.8 + f) + (k / orbit) * TAU
        const r = 0.95 + Math.sin(time * 2 + k) * 0.1
        glow.kind[i] = 1
        glow.pos.set([p.x + Math.cos(ang) * r, p.y + 0.95 + Math.sin(time * 2.4 + k * 1.7) * 0.5, p.z + Math.sin(ang) * r], i * 3)
        glow.size[i] = 0.8
        glow.alpha[i] = 0.9
        const c = k % 2 ? WHITE.clone() : lerpC(a, WHITE, 0.3)
        if (rainbow) c.setHSL((time * 0.5 + k / orbit) % 1, 1, 0.65)
        glow.col.set([c.r, c.g, c.b], i * 3)
        glow.life[i] = 0; glow.maxLife[i] = 1
        // each orbiter sheds a spark so it reads as a ring of light
        if (Math.random() < dt * 30) glow.spawn(glow.pos[i * 3], glow.pos[i * 3 + 1], glow.pos[i * 3 + 2], 0, 0.2, 0, 0.6, 0.4, 0.05, c, b, 0)
      }
      orbitOn[src.slot] = orbit > 0
    }
    // Burst ring on jump / landing.
    if (tier >= 4 && src.grounded !== state.wasGrounded) {
      const count = Math.round((18 + tier * 5) * (full ? 1 : 0.5))
      for (let i = 0; i < count; i++) {
        const ang = (i / count) * TAU
        const sp = rnd(2.2, 3.4) + f * 2
        glow.spawn(p.x, p.y + 0.1, p.z, Math.cos(ang) * sp, rnd(0.3, 1.4), Math.sin(ang) * sp, rnd(0.7, 1.0), 0.55, 0.08, WHITE, a, i % 3 ? 0 : 1, { drag: 2.5, hue: hueOf() })
      }
    }
    // Top trail: dark smoke and lightning flashes (not for distant remote players).
    if (tr.id === 'onyx' && full) {
      const dark = new Color('#2a2a36'), black = new Color('#08080c')
      for (let n = emit('smoke', moving ? 26 : 9); n--; ) {
        smoke.spawn(
          p.x + bx * rnd(0.1, 0.5) + rnd(-0.3, 0.3), p.y + rnd(0.1, 0.6), p.z + bz * rnd(0.1, 0.5) + rnd(-0.3, 0.3),
          rnd(-0.2, 0.2), rnd(0.4, 1.0), rnd(-0.2, 0.2), rnd(0.9, 1.4), 0.5, 1.6, dark, black, 2, { drag: 1 },
        )
      }
      for (let n = emit('flash', 5); n--; ) {
        const ang = rnd(0, TAU), r = rnd(0.4, 1.2)
        glow.spawn(p.x + Math.cos(ang) * r, p.y + rnd(0.2, 1.8), p.z + Math.sin(ang) * r, 0, 0, 0, 0.22, 1.8, 0.8, WHITE, a, 1, {})
      }
    }
    state.wasGrounded = src.grounded
  }

  // sources: the sources emitting this frame; a slot with none gets its orbit stars cleared.
  function update(dt, camera, viewH, sources) {
    time += dt
    const tan = Math.tan((camera.fov * Math.PI) / 360)
    glow.mat.uniforms.uScale.value = smoke.mat.uniforms.uScale.value = viewH / (2 * tan)
    let used = 0
    for (const src of sources) {
      used |= 1 << src.slot
      emitFor(src, dt)
    }
    for (let s = 0; s < SLOTS; s++) if (!(used & (1 << s)) && orbitOn[s]) clearOrbit(s)
    glow.update(dt)
    smoke.update(dt)
  }

  return { update }
}
