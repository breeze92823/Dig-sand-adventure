import { inputState } from './input.js'
import { getYaw, syncYawToPlayer } from './camera.js'
import { GROUND_Y, PHYSICS, PLAYER_DIMS, SPAWN, SPAWN_FACING, WORLD_BOUNDS } from './config.js'

// The local player singleton, mutated in place. Kinematic capsule stepped once
// per frame: input -> gravity -> integrate -> bounds -> floor.
export const player = {
  position: { x: 0, y: 0, z: 0 }, // capsule base (feet)
  velocity: { x: 0, y: 0, z: 0 },
  grounded: true,
  facing: Math.PI, // yaw the character model faces, radians
  moveSpeed: PHYSICS.moveSpeed,
  dims: { ...PLAYER_DIMS },
}

export function resetPlayer(spawn = SPAWN, facing = SPAWN_FACING) {
  player.position.x = spawn.x
  player.position.y = spawn.y
  player.position.z = spawn.z
  player.velocity.x = player.velocity.y = player.velocity.z = 0
  player.grounded = true
  player.facing = facing
}

export function respawn() {
  resetPlayer()
  syncYawToPlayer()
}

// The single floor lookup. The sand is flat for now; when dunes or holes are added,
// sample their height here and the player, camera and shadows all follow.
export const floorAt = (_x, _z) => GROUND_Y

const TAU = Math.PI * 2
// Turns angle `from` toward `to` by at most maxDelta, the short way round.
function rotateTowards(from, to, maxDelta) {
  const diff = Math.atan2(Math.sin(to - from), Math.cos(to - from))
  if (Math.abs(diff) <= maxDelta) return to
  return (from + Math.sign(diff) * maxDelta) % TAU
}

// Moves the (x, z) velocity toward the target as one 2D vector so it curves
// straight instead of warping axis-by-axis.
function approach2D(v, targetX, targetZ, maxDelta) {
  const dx = targetX - v.x
  const dz = targetZ - v.z
  const dist = Math.hypot(dx, dz)
  if (dist <= maxDelta || dist === 0) {
    v.x = targetX
    v.z = targetZ
  } else {
    v.x += (dx / dist) * maxDelta
    v.z += (dz / dist) * maxDelta
  }
}

export function step(dt) {
  if (dt <= 0) return

  // Camera-relative ground basis.
  const yaw = getYaw()
  const fwdX = -Math.sin(yaw)
  const fwdZ = -Math.cos(yaw)
  const rightX = Math.cos(yaw)
  const rightZ = -Math.sin(yaw)
  const mv = inputState.move
  const len = Math.hypot(mv.x, mv.z)
  const scale = len > 1 ? 1 / len : 1
  const wishX = (fwdX * mv.z + rightX * mv.x) * scale
  const wishZ = (fwdZ * mv.z + rightZ * mv.x) * scale

  const rate = len > 0.01 ? PHYSICS.accel : PHYSICS.decel
  approach2D(player.velocity, wishX * player.moveSpeed, wishZ * player.moveSpeed, rate * dt)

  if (inputState.jump) {
    if (player.grounded) player.velocity.y = PHYSICS.jumpSpeed
    inputState.jump = false
  }
  player.grounded = false

  const p = player.position
  player.velocity.y += PHYSICS.gravity * dt
  p.x += player.velocity.x * dt
  p.y += player.velocity.y * dt
  p.z += player.velocity.z * dt

  const r = player.dims.radius
  p.x = Math.max(WORLD_BOUNDS.minX + r, Math.min(WORLD_BOUNDS.maxX - r, p.x))
  p.z = Math.max(WORLD_BOUNDS.minZ + r, Math.min(WORLD_BOUNDS.maxZ - r, p.z))

  const groundY = floorAt(p.x, p.z)
  if (p.y <= groundY) {
    p.y = groundY
    if (player.velocity.y < 0) player.velocity.y = 0
    player.grounded = true
  }

  if (p.y < PHYSICS.killY) {
    respawn()
    return
  }

  // Turn at a fixed rate toward the heading.
  if (Math.hypot(wishX, wishZ) > 0.05) {
    player.facing = rotateTowards(player.facing, Math.atan2(wishX, wishZ), PHYSICS.turnSpeed * dt)
  }
}
