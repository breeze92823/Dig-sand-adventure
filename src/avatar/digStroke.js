import { ANIM } from '../config.js'

// Samples the digging stroke (ANIM.dig.keys) at cycle position u in 0..1 with a periodic
// Catmull-Rom spline, so the loop has no stops at the keys. Writes lean / crouch / dy / dz /
// tilt / yaw into `out` and returns it.
const FIELDS = ['lean', 'crouch', 'dy', 'dz', 'tilt', 'yaw']

export function strokeAt(u, out = {}) {
  const keys = ANIM.dig.keys
  const n = keys.length
  let i = 0
  for (let k = 0; k < n; k++) if (u >= keys[k].t) i = k
  const t0 = keys[i].t
  const t1 = i + 1 < n ? keys[i + 1].t : 1
  const s = (u - t0) / (t1 - t0 || 1)
  const s2 = s * s
  const s3 = s2 * s
  const p0 = keys[(i - 1 + n) % n]
  const p1 = keys[i]
  const p2 = keys[(i + 1) % n]
  const p3 = keys[(i + 2) % n]
  for (const f of FIELDS) {
    out[f] =
      0.5 *
      (2 * p1[f] + (-p0[f] + p2[f]) * s + (2 * p0[f] - 5 * p1[f] + 4 * p2[f] - p3[f]) * s2 + (-p0[f] + 3 * p1[f] - 3 * p2[f] + p3[f]) * s3)
  }
  return out
}

// True when the cycle position moved past `at` between prev and next (handles the wrap at 1).
export function crossed(prev, next, at) {
  return prev <= next ? prev < at && next >= at : prev < at || next >= at
}
