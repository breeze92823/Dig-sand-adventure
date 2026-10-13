import {
  BackSide,
  Color,
  DirectionalLight,
  DodecahedronGeometry,
  Fog,
  Group,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
} from 'three'
import { COLORS, FOG, GROUND_SIZE, GROUND_Y, LIGHT, MATERIAL_PBR } from './config.js'
import { mulberry32, rockTile, sandMacro, sandTile, toTexture } from './textures.js'

// Everything is procedural: sand and rock are canvas-painted (textures.js), the sky is a
// gradient shader, the lights are plain three lights. No imported assets.

const TILE_M = 8 // metres of ground covered by one sand texture tile

// Big flat sand plane. Colour map + bump map from the same painted tile, so the ripples
// catch the low sun and read as relief without any extra geometry.
export function createGround() {
  const { color, height } = sandTile(512)
  const repeat = [GROUND_SIZE / TILE_M, GROUND_SIZE / TILE_M]
  const mesh = new Mesh(
    new PlaneGeometry(GROUND_SIZE, GROUND_SIZE),
    new MeshStandardMaterial({
      map: toTexture(color, { repeat }),
      bumpMap: toTexture(height, { srgb: false, repeat }),
      bumpScale: 1.6,
      ...MATERIAL_PBR.GROUND,
    }),
  )
  mesh.rotation.x = -Math.PI / 2
  mesh.position.y = GROUND_Y
  mesh.receiveShadow = true

  // Soft patches stretched once over the whole plane (no repeat) so the sand tile's period is not visible.
  const macro = new Mesh(
    new PlaneGeometry(GROUND_SIZE, GROUND_SIZE),
    new MeshStandardMaterial({
      map: toTexture(sandMacro(), { repeat: [1, 1] }),
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      ...MATERIAL_PBR.GROUND,
    }),
  )
  macro.receiveShadow = true
  mesh.add(macro)
  return mesh
}

// A scatter of sandstone boulders: gives the sand scale, and shows the shadow-casting sun
// and the rock material. Deterministic, kept clear of the spawn point.
export function createRocks(count = 40, spread = 120) {
  const rand = mulberry32(99)
  const { color, height } = rockTile(256)
  const material = new MeshStandardMaterial({
    map: toTexture(color, { repeat: [2, 2] }),
    bumpMap: toTexture(height, { srgb: false, repeat: [2, 2] }),
    bumpScale: 1.2,
    flatShading: true,
    ...MATERIAL_PBR.ROCK,
  })
  const group = new Group()
  for (let i = 0; i < count; i++) {
    const r = 0.6 + rand() * 1.8
    const geo = new DodecahedronGeometry(r, 1)
    // Jitter the vertices so no two boulders match.
    const p = geo.attributes.position
    for (let v = 0; v < p.count; v++) {
      const k = 0.82 + rand() * 0.36
      p.setXYZ(v, p.getX(v) * k, p.getY(v) * k * 0.75, p.getZ(v) * k)
    }
    geo.computeVertexNormals()
    const rock = new Mesh(geo, material)
    let x
    let z
    do {
      x = (rand() - 0.5) * 2 * spread
      z = (rand() - 0.5) * 2 * spread
    } while (Math.hypot(x, z) < 12)
    rock.position.set(x, GROUND_Y + r * 0.3, z)
    rock.rotation.y = rand() * Math.PI * 2
    rock.castShadow = true
    rock.receiveShadow = true
    group.add(rock)
  }
  return group
}

// Gradient dome with a soft sun glow toward the light direction. Recentre it on the camera
// each frame (`sky.position.copy(player)`) so the horizon never gets closer.
export function createSky() {
  const sunDir = new Vector3(...LIGHT.sunPosition).normalize()
  const mesh = new Mesh(
    new SphereGeometry(250, 32, 16),
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
          vec3 col = mix(bottom, top, smoothstep(0.0, 0.6, vDir.y));
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
