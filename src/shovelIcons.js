import {
  Box3,
  DirectionalLight,
  HemisphereLight,
  OrthographicCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three'
import { buildHeldShovel, skinShovel } from './heldShovel.js'

// Shop icons: each shovel's real 3D model rendered once to a transparent PNG (data URL) with a
// small offscreen renderer, so the Digging Tools window shows the same detailed models as the hand.
const W = 200
const H = 300
const cache = new Map()
let kit // { renderer, scene, camera, model } or false once WebGL failed

function setup() {
  try {
    const canvas = document.createElement('canvas')
    const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true })
    renderer.setPixelRatio(1)
    renderer.setSize(W, H, false)
    renderer.setClearColor(0x000000, 0)
    const scene = new Scene()
    scene.add(new HemisphereLight('#ffffff', '#8a90a4', 1.7))
    const sun = new DirectionalLight('#ffffff', 2.6)
    sun.position.set(-3, 5, 8)
    scene.add(sun)
    const model = buildHeldShovel()
    model.rotation.set(0.05, 0.35, -0.38)
    scene.add(model)
    const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 50)
    camera.position.set(0, 0, 14)
    return { renderer, scene, camera, model }
  } catch {
    return false
  }
}

// PNG data URL of the shovel, or null when WebGL is unavailable.
export function shovelIcon(id) {
  if (cache.has(id)) return cache.get(id)
  kit ??= setup()
  if (!kit) return null
  const { renderer, scene, camera, model } = kit
  skinShovel(model, id)
  model.updateMatrixWorld(true)
  const box = new Box3().setFromObject(model)
  const c = box.getCenter(new Vector3())
  const size = box.getSize(new Vector3())
  const aspect = W / H
  const h = Math.max(size.y * 1.08, (size.x * 1.08) / aspect)
  camera.left = -h * aspect / 2
  camera.right = h * aspect / 2
  camera.top = h / 2
  camera.bottom = -h / 2
  camera.position.set(c.x, c.y, 14)
  camera.updateProjectionMatrix()
  renderer.render(scene, camera)
  const url = renderer.domElement.toDataURL('image/png')
  cache.set(id, url)
  return url
}
