import {
  BackSide,
  Color,
  DirectionalLight,
  Fog,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
} from 'three'
import { COLORS, FOG, GROUND_Y, HUB, LIGHT, MATERIAL_PBR } from './config.js'
import { studTile, toTexture } from './textures.js'

// Everything is procedural: the floor is canvas-painted (textures.js), the sky is a
// gradient shader, the lights are plain three lights. No imported assets. The hub's
// buildings, lane and cliffs live in hub.js.

const CELL_M = 1.25 // metres per plaza floor block

// The island floor: Roblox-style yellow stud grid from the beach to the south wall. The sea
// (hub.js) shows past its edges. Hub props, lane and cliffs sit on top.
export function createGround() {
  const { minX, maxX, maxZ } = HUB.island
  const w = maxX - minX
  const d = maxZ - HUB.oceanZ
  const { color, height } = studTile(HUB.colors.plaza, { cols: 4 })
  const tile = 4 * CELL_M
  const repeat = [w / tile, d / tile]
  const mesh = new Mesh(
    new PlaneGeometry(w, d),
    new MeshStandardMaterial({
      map: toTexture(color, { repeat }),
      bumpMap: toTexture(height, { srgb: false, repeat }),
      bumpScale: 0.6,
      ...MATERIAL_PBR.GROUND,
    }),
  )
  mesh.rotation.x = -Math.PI / 2
  mesh.position.set((minX + maxX) / 2, GROUND_Y, (maxZ + HUB.oceanZ) / 2)
  mesh.receiveShadow = true
  return mesh
}

// Gradient dome with a soft sun glow toward the light direction. Recentre it on the camera
// each frame (`sky.position.copy(player)`) so the horizon never gets closer.
export function createSky() {
  const sunDir = new Vector3(...LIGHT.sunPosition).normalize()
  const mesh = new Mesh(
    new SphereGeometry(900, 32, 16),
    new ShaderMaterial({
      side: BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        top: { value: new Color(COLORS.zenith) },
        bottom: { value: new Color(COLORS.horizon) },
        sunDir: { value: sunDir },
        sunColor: { value: new Color(LIGHT.sunColor) },
      },
      vertexShader: 'varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `
        uniform vec3 top; uniform vec3 bottom; uniform vec3 sunDir; uniform vec3 sunColor; varying vec3 vDir;
        void main() {
          vec3 col = mix(bottom, top, smoothstep(-0.02, 0.45, vDir.y));
          float s = max(dot(normalize(vDir), sunDir), 0.0);
          col += sunColor * (pow(s, 8.0) * 0.25 + pow(s, 600.0) * 1.2); // halo + disc
          gl_FragColor = vec4(col, 1.0);
        }`,
    }),
  )
  mesh.renderOrder = -1
  mesh.frustumCulled = false
  return mesh
}

// Warm sky/ground hemisphere fill + one shadow-casting sun. The sun's shadow box follows the
// player so a small map covers the whole play area at full resolution; the follow point is
// snapped to shadow-texel steps so shadows do not shimmer while the player walks.
export function createLights() {
  const hemi = new HemisphereLight(LIGHT.hemiSky, LIGHT.hemiGround, LIGHT.hemiIntensity)
  const sun = new DirectionalLight(LIGHT.sunColor, LIGHT.sunIntensity)
  const offset = { x: LIGHT.sunPosition[0], y: LIGHT.sunPosition[1], z: LIGHT.sunPosition[2] }
  sun.castShadow = true
  sun.shadow.mapSize.set(LIGHT.shadowMapSize, LIGHT.shadowMapSize)
  const r = LIGHT.shadowRange
  Object.assign(sun.shadow.camera, { left: -r, right: r, top: r, bottom: -r, near: 1, far: 150 })
  sun.shadow.bias = -0.0004
  sun.shadow.normalBias = 0.03

  const texel = (r * 2) / LIGHT.shadowMapSize
  const follow = (px, pz) => {
    const x = Math.round(px / texel) * texel
    const z = Math.round(pz / texel) * texel
    sun.position.set(x + offset.x, offset.y, z + offset.z)
    sun.target.position.set(x, 0, z)
    sun.target.updateMatrixWorld()
  }
  follow(0, 0)
  return { hemi, sun, follow }
}

export const createFog = () => new Fog(COLORS.horizon, FOG.near, FOG.far)
