// Procedural canvas textures. Nothing is imported: every surface is painted once at load,
// cached by its arguments, and wrapped as a three.js texture. Painters that feed a
// repeating surface are TILEABLE (anything drawn near an edge is redrawn at the wrapped
// offsets). Colour maps are sRGB; height maps are linear greyscale for bumpMap.
import { CanvasTexture, NearestFilter, RepeatWrapping, SRGBColorSpace } from 'three'
import { COLORS } from './config.js'

const cache = new Map()
function cached(key, make) {
  if (!cache.has(key)) cache.set(key, make())
  return cache.get(key)
}

export function canvas(w, h = w) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

// Deterministic PRNG so every texture looks the same every load.
export function mulberry32(seed) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Wraps a canvas as a texture. `srgb` for colour maps, false for data maps (bump/roughness).
// `repeat` is how many times the canvas tiles across the surface it is mapped to.
export function toTexture(c, { srgb = true, repeat = [1, 1], pixel = false } = {}) {
  const t = new CanvasTexture(c)
  t.wrapS = t.wrapT = RepeatWrapping
  t.repeat.set(repeat[0], repeat[1])
  t.anisotropy = 8
  if (srgb) t.colorSpace = SRGBColorSpace
  if (pixel) t.magFilter = NearestFilter
  return t
}

// Mix a hex colour toward white (amt > 0) or black (amt < 0).
export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16)
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) =>
    Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt)),
  )
  return `rgb(${ch[0]},${ch[1]},${ch[2]})`
}

// Runs `draw(x, y)` at (x, y) and at every wrapped offset that still touches the tile.
function wrapped(size, x, y, r, draw) {
  for (const ox of [-size, 0, size]) {
    for (const oy of [-size, 0, size]) {
      if (x + ox + r < 0 || x + ox - r > size || y + oy + r < 0 || y + oy - r > size) continue
      draw(x + ox, y + oy)
    }
  }
}

// Adds per-pixel luminance noise (sand grains) in place. Per-pixel noise is inherently tileable.
function grain(c, rand, amount) {
  const g = c.getContext('2d')
  const img = g.getImageData(0, 0, c.width, c.height)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const n = (rand() - 0.5) * amount
    d[i] += n
    d[i + 1] += n
    d[i + 2] += n * 1.1
  }
  g.putImageData(img, 0, 0)
}

// Tileable sand: mottled base, soft light/dark drifts, wind ripples, then grain. Returns the
// colour canvas and a greyscale height canvas (ripple crests are high) for the bump map.
export function sandTile(size = 512) {
  return cached(`sand${size}`, () => {
    const rand = mulberry32(2024)
    const color = canvas(size)
    const height = canvas(size)
    const c = color.getContext('2d')
    const h = height.getContext('2d')

    c.fillStyle = COLORS.sand
    c.fillRect(0, 0, size, size)
    h.fillStyle = '#808080'
    h.fillRect(0, 0, size, size)

    // Large soft drifts of lighter / darker sand.
    for (let i = 0; i < 70; i++) {
      const x = rand() * size
      const y = rand() * size
      const r = 40 + rand() * 90
      const dark = rand() < 0.5
      wrapped(size, x, y, r, (px, py) => {
        const g = c.createRadialGradient(px, py, 0, px, py, r)
        g.addColorStop(0, dark ? 'rgba(170,120,50,0.08)' : 'rgba(255,240,200,0.08)')
        g.addColorStop(1, 'rgba(0,0,0,0)')
        c.fillStyle = g
        c.fillRect(px - r, py - r, r * 2, r * 2)
      })
    }

    // Wind ripples: wavy bands running across the tile. An integer number of waves per tile keeps
    // the seam closed; each band is redrawn one tile up/down so it wraps vertically too.
    const bands = 16
    for (let b = 0; b < bands; b++) {
      const y0 = (b + 0.3 + rand() * 0.4) * (size / bands)
      const amp = 3 + rand() * 6
      const waves = 2 + Math.floor(rand() * 3)
      const phase = rand() * Math.PI * 2
      for (const oy of [-size, 0, size]) {
        const path = new Path2D()
        for (let x = 0; x <= size; x += 4) {
          const y = y0 + oy + Math.sin((x / size) * waves * Math.PI * 2 + phase) * amp
          x === 0 ? path.moveTo(x, y) : path.lineTo(x, y)
        }
        c.lineCap = h.lineCap = 'round'
        c.lineWidth = 5
        c.strokeStyle = 'rgba(150,105,45,0.22)' // shadowed lee side
        c.stroke(path)
        c.save()
        c.translate(0, -4)
        c.lineWidth = 3
        c.strokeStyle = 'rgba(255,240,205,0.3)' // sunlit crest
        c.stroke(path)
        c.restore()
        h.lineWidth = 8
        h.strokeStyle = 'rgba(210,210,210,0.55)'
        h.stroke(path)
      }
    }

    // Specks: a few darker pebbles / heavier grains.
    for (let i = 0; i < 260; i++) {
      const x = rand() * size
      const y = rand() * size
      const r = 0.6 + rand() * 1.4
      const dark = rand() < 0.65
      wrapped(size, x, y, r, (px, py) => {
        c.fillStyle = dark ? COLORS.sandDark : COLORS.sandLight
        c.beginPath()
        c.arc(px, py, r, 0, Math.PI * 2)
        c.fill()
        h.fillStyle = dark ? '#6a6a6a' : '#b0b0b0'
        h.beginPath()
        h.arc(px, py, r, 0, Math.PI * 2)
        h.fill()
      })
    }

    grain(color, rand, 26)
    grain(height, rand, 40)
    return { color, height }
  })
}

// Tileable rock / sandstone: strata bands plus speckle. Used on boulders.
export function rockTile(size = 256, base = '#9c7b54') {
  return cached(`rock${size}${base}`, () => {
    const rand = mulberry32(77)
    const color = canvas(size)
    const height = canvas(size)
    const c = color.getContext('2d')
    const h = height.getContext('2d')
    c.fillStyle = base
    c.fillRect(0, 0, size, size)
    h.fillStyle = '#808080'
    h.fillRect(0, 0, size, size)
    let y = 0
    while (y < size) {
      const th = 6 + rand() * 20
      const tone = rand() < 0.5 ? -0.14 + rand() * 0.1 : 0.04 + rand() * 0.14
      c.fillStyle = shade(base, tone)
      c.fillRect(0, y, size, th)
      const v = Math.round(128 + tone * 160)
      h.fillStyle = `rgb(${v},${v},${v})`
      h.fillRect(0, y, size, th)
      y += th
    }
    // Cracks.
    c.strokeStyle = 'rgba(60,40,20,0.35)'
    h.strokeStyle = 'rgba(40,40,40,0.8)'
    c.lineWidth = h.lineWidth = 1.2
    for (let i = 0; i < 14; i++) {
      const sx = rand() * size
      const sy = rand() * size
      const len = 16 + rand() * 40
      const ang = rand() * Math.PI
      wrapped(size, sx, sy, len, (px, py) => {
        for (const g of [c, h]) {
          g.beginPath()
          g.moveTo(px, py)
          g.lineTo(px + Math.cos(ang) * len, py + Math.sin(ang) * len)
          g.stroke()
        }
      })
    }
    grain(color, rand, 30)
    grain(height, rand, 30)
    return { color, height }
  })
}

// One big non-repeating canvas of soft light/dark patches with an alpha channel, stretched over
// the whole ground to break up the repeat of the sand tile. Not tileable by design.
export function sandMacro(size = 1024) {
  return cached(`macro${size}`, () => {
    const rand = mulberry32(5150)
    const c = canvas(size)
    const g = c.getContext('2d')
    for (let i = 0; i < 160; i++) {
      const x = rand() * size
      const y = rand() * size
      const r = 30 + rand() * 120
      const dark = rand() < 0.5
      const grad = g.createRadialGradient(x, y, 0, x, y, r)
      grad.addColorStop(0, dark ? 'rgba(150,100,40,0.28)' : 'rgba(255,238,190,0.28)')
      grad.addColorStop(1, 'rgba(0,0,0,0)')
      g.fillStyle = grad
      g.fillRect(x - r, y - r, r * 2, r * 2)
    }
    return c
  })
}
