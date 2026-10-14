// Minimal JSX -> three.js builder so the reference game's React Three Fiber loot models
// (lootModels.jsx) run unchanged in vanilla three. h() is the JSX factory (vite.config.js).
// Only the subset the models use: mesh/group/sprite, *Geometry, meshStandardMaterial,
// position/rotation/scale (+ "rotation-y" style axes), material, ref, and useRef/useFrame.
import * as THREE from 'three'
import { CanvasTexture, MeshStandardMaterial, Object3D, SRGBColorSpace } from 'three'

export const Fragment = Symbol('Fragment')

let frameCallbacks = null // collected by useFrame while a model is being built

export const useRef = (v = null) => ({ current: v })
export const useFrame = (fn) => frameCallbacks?.push(fn)

const flat = (list, out = []) => {
  for (const c of list) {
    if (Array.isArray(c)) flat(c, out)
    else if (c !== null && c !== undefined && c !== false && c !== true) out.push(c)
  }
  return out
}

function applyProp(obj, key, value) {
  if (key === 'children' || key === 'key' || key === 'args' || key === 'ref' || key === 'attach') return
  if (key === 'material') obj.material = value
  else if (key === 'quaternion') obj.quaternion.copy(value)
  else if (key.includes('-')) {
    const [a, b] = key.split('-')
    obj[a][b] = value
  } else if (key === 'scale' && typeof value === 'number') obj.scale.setScalar(value)
  else if (Array.isArray(value) && obj[key]?.set) obj[key].set(...value)
  else if (obj[key]?.set && typeof value === 'object') obj[key].set(value)
  else obj[key] = value
}

export function h(type, props, ...kids) {
  props = props ?? {}
  const children = flat(kids)
  if (type === Fragment) return children
  if (typeof type === 'function') return type({ ...props, children: children.length > 1 ? children : children[0] })

  const cap = type[0].toUpperCase() + type.slice(1)
  if (cap.endsWith('Geometry')) return new THREE[cap](...(props.args ?? []))
  if (cap.endsWith('Material')) {
    const { args, key, children: _c, ...params } = props
    const m = new THREE[cap](params)
    m.userData.own = true
    return m
  }
  const obj = new THREE[cap](...(props.args ?? []))
  for (const k in props) applyProp(obj, k, props[k])
  if (props.ref) props.ref.current = obj
  for (const c of children) {
    if (c.isBufferGeometry) obj.geometry = c
    else if (c.isMaterial) obj.material = c
    else if (c instanceof Object3D) obj.add(c)
  }
  return obj
}

// Builds a model component; tick(dt) runs its useFrame animations (spinning rings, ...).
export function buildModel(Component) {
  frameCallbacks = []
  const object = Component({})
  const cbs = frameCallbacks
  frameCallbacks = null
  return { object, tick: (dt) => cbs.forEach((f) => f({}, dt)) }
}

const matCache = new Map()
export function plastic(color, extra = {}) {
  const key = color + JSON.stringify(extra)
  if (!matCache.has(key)) matCache.set(key, new MeshStandardMaterial({ color, roughness: 0.75, metalness: 0, ...extra }))
  return matCache.get(key)
}

const texCache = new Map()
export function canvasTexture(key, w, hgt, draw) {
  if (!texCache.has(key)) {
    const c = document.createElement('canvas')
    c.width = w
    c.height = hgt
    draw(c.getContext('2d'), w, hgt)
    const t = new CanvasTexture(c)
    t.colorSpace = SRGBColorSpace
    t.anisotropy = 8
    texCache.set(key, t)
  }
  return texCache.get(key)
}
