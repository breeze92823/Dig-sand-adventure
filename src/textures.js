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

// Tileable value noise on a wrapped lattice (returns f(x, y) in 0..1 for x, y in 0..size).
function tileNoise(size, cells, rand) {
  const n = cells
  const g = new Float32Array(n * n)
  for (let i = 0; i < g.length; i++) g[i] = rand()
  const sm = (t) => t * t * (3 - 2 * t)
  return (x, y) => {
    const fx = (x / size) * n
    const fy = (y / size) * n
    const x0 = Math.floor(fx)
    const y0 = Math.floor(fy)
    const tx = sm(fx - x0)
    const ty = sm(fy - y0)
    const at = (i, j) => g[(((j % n) + n) % n) * n + (((i % n) + n) % n)]
    return (at(x0, y0) * (1 - tx) + at(x0 + 1, y0) * tx) * (1 - ty) + (at(x0, y0 + 1) * (1 - tx) + at(x0 + 1, y0 + 1) * tx) * ty
  }
}

// Tileable sand, per pixel: layered dune undulation, soft wind ripples that fade in and out and
// meander (never ruler-straight), then fine grains with the odd bright quartz speck and dark
// mineral grain. `color` is a near-white shading map meant to be multiplied by the band colour
// (never flat: tone drifts, ripple shadow, grain); `height` drives the bump map.
export function sandTile(size = 512) {
  return cached(`sand${size}`, () => {
    const rand = mulberry32(2024)
    const color = canvas(size)
    const height = canvas(size)
    const octs = [
      [tileNoise(size, 4, rand), 0.5],
      [tileNoise(size, 8, rand), 0.28],
      [tileNoise(size, 16, rand), 0.14],
      [tileNoise(size, 32, rand), 0.08],
    ]
    const warp = tileNoise(size, 4, rand)
    const fade = tileNoise(size, 3, rand)
    const cimg = color.getContext('2d').createImageData(size, size)
    const himg = height.getContext('2d').createImageData(size, size)
    const TAU = Math.PI * 2
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let f = 0
        for (const [fn, w] of octs) f += fn(x, y) * w
        // Ripples: a sharpened sine along a warped coordinate; strength varies across the tile.
        const ph = (y / size) * 22 * TAU + warp(x, y) * 7 + f * 3
        const rip = Math.sin(ph)
        const crest = Math.max(0, rip) ** 1.6
        const ripAmt = 0.2 + 0.8 * fade(x, y) ** 1.5
        const g1 = rand()
        const g2 = rand()
        const grainN = (g1 - 0.5) * 0.16 + (g2 - 0.5) * 0.08
        let hh = 0.5 + (f - 0.5) * 0.5 + crest * 0.2 * ripAmt + grainN
        // Rare coarse grains.
        let tone = 0.9 + (f - 0.5) * 0.28 - (1 - crest) * 0.045 * ripAmt + grainN * 0.8
        if (g2 > 0.992) tone += 0.14 // quartz glint
        else if (g1 < 0.006) tone -= 0.22 // dark mineral grain
        const v = Math.max(0, Math.min(255, tone * 255))
        const o = (y * size + x) * 4
        cimg.data[o] = v
        cimg.data[o + 1] = v * 0.985
        cimg.data[o + 2] = v * 0.95
        cimg.data[o + 3] = 255
        const hv = Math.max(0, Math.min(255, hh * 255))
        himg.data[o] = himg.data[o + 1] = himg.data[o + 2] = hv
        himg.data[o + 3] = 255
      }
    }
    color.getContext('2d').putImageData(cimg, 0, 0)
    height.getContext('2d').putImageData(himg, 0, 0)
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

// Tileable packed soil for the floor of a dug pit: damp mottled earth, clods, pebbles and fine cracks.
export function dirtTile(size = 256) {
  return cached(`dirt${size}`, () => {
    const rand = mulberry32(515)
    const color = canvas(size)
    const c = color.getContext('2d')
    c.fillStyle = '#7a5f46'
    c.fillRect(0, 0, size, size)
    for (let i = 0; i < 260; i++) {
      const x = rand() * size
      const y = rand() * size
      const r = 6 + rand() * 22
      const tone = (rand() - 0.5) * 0.4
      wrapped(size, x, y, r, (px, py) => {
        c.fillStyle = shade('#7a5f46', tone)
        c.globalAlpha = 0.35
        c.beginPath()
        c.ellipse(px, py, r, r * (0.6 + rand() * 0.4), rand() * 3, 0, Math.PI * 2)
        c.fill()
      })
    }
    c.globalAlpha = 1
    for (let i = 0; i < 90; i++) {
      const x = rand() * size
      const y = rand() * size
      const r = 1.5 + rand() * 3.5
      const lit = rand() < 0.5
      wrapped(size, x, y, r, (px, py) => {
        c.fillStyle = lit ? '#a89882' : '#3f3226'
        c.beginPath()
        c.arc(px, py, r, 0, Math.PI * 2)
        c.fill()
        c.fillStyle = 'rgba(0,0,0,0.3)'
        c.beginPath()
        c.arc(px + r * 0.3, py + r * 0.4, r * 0.8, 0, Math.PI * 2)
        c.fill()
      })
    }
    c.strokeStyle = 'rgba(40,28,18,0.4)'
    c.lineWidth = 1
    for (let i = 0; i < 18; i++) {
      const sx = rand() * size
      const sy = rand() * size
      const len = 10 + rand() * 30
      const ang = rand() * Math.PI
      wrapped(size, sx, sy, len, (px, py) => {
        c.beginPath()
        c.moveTo(px, py)
        c.lineTo(px + Math.cos(ang) * len, py + Math.sin(ang) * len)
        c.stroke()
      })
    }
    grain(color, rand, 36)
    return color
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

// Tileable Roblox-style block grid: `cols` x `rows` cells per tile, each a slightly varied
// tone of `base` with a lit top/left lip and a shaded bottom/right lip, plus fine grain.
// Plaza floor, cliffs, terraces, planks (rows < cols) all come from this.
// `checker` darkens/lightens alternate cells by that much (the south wall's chequer).
export function studTile(base, { size = 256, cols = 4, rows = cols, lip = 3, seed = 11, vary = 0.05, checker = 0 } = {}) {
  return cached(`stud${base}${size}${cols}${rows}${lip}${seed}${vary}${checker}`, () => {
    const rand = mulberry32(seed)
    const color = canvas(size)
    const height = canvas(size)
    const c = color.getContext('2d')
    const h = height.getContext('2d')
    const cw = size / cols
    const ch = size / rows
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const x = i * cw
        const y = j * ch
        c.fillStyle = shade(base, (rand() - 0.5) * 2 * vary + ((i + j) % 2 ? -checker : checker))
        c.fillRect(x, y, cw, ch)
        c.fillStyle = 'rgba(255,255,255,0.22)'
        c.fillRect(x, y, cw, lip)
        c.fillRect(x, y, lip, ch)
        c.fillStyle = 'rgba(0,0,0,0.16)'
        c.fillRect(x, y + ch - lip, cw, lip)
        c.fillRect(x + cw - lip, y, lip, ch)
        c.fillStyle = 'rgba(0,0,0,0.22)' // the seam between blocks
        c.fillRect(x, y, cw, 1)
        c.fillRect(x, y, 1, ch)
        h.fillStyle = '#9a9a9a'
        h.fillRect(x, y, cw, ch)
        h.fillStyle = '#505050'
        h.fillRect(x, y, cw, 1.5)
        h.fillRect(x, y, 1.5, ch)
      }
    }
    grain(color, rand, 10)
    return { color, height }
  })
}

// Vertical stripes alternating `a` and `b` (shop awnings). `count` stripes per tile.
export function stripes(a, b = '#ffffff', count = 6, size = 128) {
  return cached(`stripes${a}${b}${count}${size}`, () => {
    const c = canvas(size)
    const g = c.getContext('2d')
    const w = size / count
    for (let i = 0; i < count; i++) {
      g.fillStyle = i % 2 ? b : a
      g.fillRect(i * w, 0, w, size)
    }
    g.fillStyle = 'rgba(0,0,0,0.08)'
    for (let i = 0; i < count; i++) g.fillRect(i * w, 0, 1.5, size)
    grain(c, mulberry32(3), 8)
    return c
  })
}

// Chunky outlined game-sign text (the floating shop names). Canvas sized to the text.
export function labelCanvas(text, { fill = '#ffffff', stroke = '#1d1d1d', px = 96, font = '"Arial Black", "Arial Rounded MT Bold", sans-serif' } = {}) {
  return cached(`label${text}${fill}${stroke}${px}`, () => {
    const probe = canvas(4).getContext('2d')
    probe.font = `900 ${px}px ${font}`
    const pad = px * 0.25
    const c = canvas(Math.ceil(probe.measureText(text).width + pad * 2), Math.ceil(px * 1.35))
    const g = c.getContext('2d')
    g.font = `900 ${px}px ${font}`
    g.textBaseline = 'middle'
    g.lineJoin = 'round'
    g.lineWidth = px * 0.16
    g.strokeStyle = stroke
    g.strokeText(text, pad, c.height / 2)
    g.fillStyle = fill
    g.fillText(text, pad, c.height / 2)
    return c
  })
}
