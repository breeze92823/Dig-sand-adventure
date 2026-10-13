import { inputState } from './input.js'
import { player, floorAt } from './player.js'
import { CAMERA } from './config.js'

// Third-person chase camera. It owns its own yaw/pitch (mouse look) and orbits the
// player, so the movement keys never steer the view. ONE smoothing stage, on the point
// it follows: position and look-at both derive from it, so they cannot disagree. The
// wheel sets a zoom target that glides; speed pulls the boom back and widens the FOV.
const state = { yaw: 0, pitch: CAMERA.startPitch }
const FLOOR_MARGIN = 0.3 // m the camera stays above the surface under it
const TELEPORT_DISTANCE = 15 // a same-frame jump bigger than this is a respawn: snap

// Driven by the Bloxity `camera_sensitivity` setting.
let sensitivity = 1
export function setCameraSensitivity(value) {
  sensitivity = value
}

const followed = { x: 0, y: 0, z: 0 } // smoothed feet position
const lastPlayerPos = { x: 0, y: 0, z: 0 }
const look = { x: 0, y: 0, z: 0 }
let initialised = false
let zoomTarget = CAMERA.distance // what the wheel asked for
let zoomEased = CAMERA.distance
let rush = 0 // eased 0..1 speed factor

export function getYaw() {
  return state.yaw
}

// Snaps the orbit to sit directly behind the player.
export function syncYawToPlayer() {
  state.yaw = player.facing + Math.PI
}

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v)

export function update(camera, dt) {
  state.yaw -= inputState.look.dx * CAMERA.lookSensitivity * sensitivity
  state.pitch += inputState.look.dy * CAMERA.lookSensitivity * sensitivity
  inputState.look.dx = 0
  inputState.look.dy = 0
  state.pitch = clamp(state.pitch, CAMERA.minPitch, CAMERA.maxPitch)

  zoomTarget = clamp(zoomTarget + inputState.zoom * CAMERA.zoomStep, CAMERA.minDistance, CAMERA.maxDistance)
  inputState.zoom = 0

  const p = player.position
  const jump = Math.hypot(p.x - lastPlayerPos.x, p.y - lastPlayerPos.y, p.z - lastPlayerPos.z)
  const teleported = initialised && jump > TELEPORT_DISTANCE
  lastPlayerPos.x = p.x
  lastPlayerPos.y = p.y
  lastPlayerPos.z = p.z
  if (teleported) {
    state.yaw = player.facing + Math.PI
    state.pitch = CAMERA.startPitch
  }

  if (!initialised || teleported) {
    followed.x = p.x
    followed.y = p.y
    followed.z = p.z
    initialised = true
  } else {
    const t = dt > 0 ? 1 - Math.exp(-CAMERA.followLerp * dt) : 1
    followed.x += (p.x - followed.x) * t
    followed.y += (p.y - followed.y) * t
    followed.z += (p.z - followed.z) * t
  }

  // Speed framing: pulling back has to lag the speed change or every stop punches the camera in.
  const speed = Math.hypot(player.velocity.x, player.velocity.z)
  const targetRush = clamp(speed / player.moveSpeed, 0, 1)
  rush += (targetRush - rush) * (1 - Math.exp(-CAMERA.speedEase * dt))
  zoomEased += (zoomTarget - zoomEased) * (1 - Math.exp(-CAMERA.zoomEase * dt))

  const distance = Math.max(1, zoomEased + CAMERA.speedDistance * rush)
  const fov = CAMERA.fov + CAMERA.speedFov * rush
  if (Math.abs(camera.fov - fov) > 0.01) {
    camera.fov = fov
    camera.updateProjectionMatrix()
  }

  look.x = followed.x
  look.y = followed.y + player.dims.height * CAMERA.targetHeight
  look.z = followed.z

  const cp = Math.cos(state.pitch)
  const px = look.x + Math.sin(state.yaw) * cp * distance
  const pz = look.z + Math.cos(state.yaw) * cp * distance
  const py = Math.max(look.y + Math.sin(state.pitch) * distance, floorAt(px, pz) + FLOOR_MARGIN)

  camera.position.set(px, py, pz)
  camera.lookAt(look.x, look.y, look.z)
}
