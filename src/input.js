// WASD/arrows move (camera-relative, consumed by player.js), mouse look + wheel zoom
// (consumed by camera.js), edge-triggered jump (cleared by player.js).
export const inputState = {
  move: { x: 0, z: 0 }, // x = strafe (+ right), z = forward (+ forward)
  look: { dx: 0, dy: 0 }, // raw pixels since the camera last read them
  zoom: 0, // wheel notches since the camera last read them (+ = away)
  jump: false,
  dig: false, // hold left mouse or E
  mouse: false, // the left mouse button part of `dig`
  interact: false, // edge-triggered E press (cleared by interact.js); also what picks loot up
}
let mouseDig = false
// The touch DIG button holds this like the left mouse button.
export function setDigHeld(on) {
  mouseDig = on
  syncDig()
}
const syncDig = () => {
  inputState.mouse = mouseDig
  inputState.dig = mouseDig || held.has('KeyE')
}

// One wheel notch per WheelEvent.deltaMode (pixels, lines, pages), so a trackpad
// and a mouse zoom at the same rate.
const NOTCH_PER_DELTA = [1 / 100, 1 / 3, 1]

const held = new Set()
let orbiting = false // right-drag fallback where pointer lock is refused
let canvas = null
let lockEverGranted = false
let armed = false

const locked = () => !!canvas && document.pointerLockElement === canvas
// Pointer lock can reject (sandboxed frame, post-Escape cooldown); that is not a fault.
function requestLock() {
  if (!canvas || locked()) return
  const r = canvas.requestPointerLock?.()
  if (r instanceof Promise) r.catch(() => {})
}

function recomputeMove() {
  let x = 0
  let z = 0
  if (held.has('KeyW') || held.has('ArrowUp')) z += 1
  if (held.has('KeyS') || held.has('ArrowDown')) z -= 1
  if (held.has('KeyD') || held.has('ArrowRight')) x += 1
  if (held.has('KeyA') || held.has('ArrowLeft')) x -= 1
  inputState.move.x = x
  inputState.move.z = z
}

export function install(showMenu, canvasEl) {
  canvas = canvasEl
  document.addEventListener('pointerlockchange', () => {
    if (locked()) {
      lockEverGranted = true
      orbiting = false
    }
  })
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return
    if (e.code === 'Escape') showMenu()
    else if (!armed) {
      armed = true // the first keypress is a user gesture: take the mouse without a click
      requestLock()
    }
    held.add(e.code)
    if (e.code === 'Space') inputState.jump = true
    if (e.code === 'KeyE') inputState.interact = true
    recomputeMove()
    syncDig()
  })
  window.addEventListener('keyup', (e) => {
    held.delete(e.code)
    recomputeMove()
    syncDig()
  })
  window.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') return // touch.js owns touch (stick, look, buttons)
    if (e.button === 2 && !lockEverGranted) orbiting = true
    if (e.button === 0 && e.target.tagName === 'CANVAS') {
      armed = true
      requestLock()
      mouseDig = true
      syncDig()
    }
  })
  window.addEventListener('pointerup', (e) => {
    if (e.pointerType === 'touch') return
    if (e.button === 2) orbiting = false
    if (e.button === 0) {
      mouseDig = false
      syncDig()
    }
  })
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return
    if (!orbiting && !locked()) return
    inputState.look.dx += e.movementX || 0
    inputState.look.dy += e.movementY || 0
  })
  // Only the game world zooms.
  window.addEventListener(
    'wheel',
    (e) => {
      if (e.target.tagName !== 'CANVAS') return
      e.preventDefault()
      inputState.zoom += e.deltaY * (NOTCH_PER_DELTA[e.deltaMode] ?? NOTCH_PER_DELTA[0])
    },
    { passive: false },
  )
  window.addEventListener('contextmenu', (e) => e.preventDefault())
  window.addEventListener('blur', () => {
    held.clear()
    mouseDig = false
    syncDig()
    orbiting = false
    inputState.jump = false
    recomputeMove()
  })
}
