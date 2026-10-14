// Touch controls (phones/tablets): a floating move stick on the left of the world, drag-to-look and
// pinch-to-zoom on the right, plus hold-to-DIG / JUMP / menu / fullscreen buttons; the "Press E" prompt is
// tappable (interact.js). Everything feeds inputState exactly like the keyboard and mouse.
import './touch.css'
import { inputState, setDigHeld } from './input.js'
import { isTouch } from './device.js'

const STICK_R = 56 // px of travel for full speed
const DEAD = 0.12
const LOOK_GAIN = 1.5 // finger travel is shorter than a mouse sweep
const PINCH_GAIN = 0.03 // zoom notches per px of pinch
const SPLIT = 0.45 // fraction of the width: left of it is the stick, right of it looks

export function createTouchControls({ showMenu }) {
  if (!isTouch) return
  document.documentElement.classList.add('touch')

  const root = document.createElement('div')
  root.className = 'tc'
  root.innerHTML = `
    <div class="tc-stick idle"><div class="tc-knob"></div></div>
    <button class="tc-btn tc-menu" aria-label="Menu"><svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg></button>
    <button class="tc-btn tc-full" aria-label="Fullscreen" hidden><svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
    <button class="tc-btn tc-jump" aria-label="Jump"><svg viewBox="0 0 24 24"><path d="M12 19V6M6 11l6-6 6 6" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
    <button class="tc-btn tc-dig" aria-label="Dig"><span>DIG</span></button>
    <div class="tc-rotate"><div>&#8635;</div><p>Rotate your phone</p><small>Dig Sand Adventure plays in landscape</small></div>`
  document.body.appendChild(root)
  const stick = root.querySelector('.tc-stick')
  const knob = root.querySelector('.tc-knob')

  const buzz = (ms) => navigator.vibrate?.(ms)
  // Any window (Index, Pets, shops, ...) is a shown `*-backdrop`; the egg hatch overlay is `.hatch`.
  const windowOpen = () => document.body.classList.contains('win-open')
  new MutationObserver(() => {
    const open = !!document.querySelector('[class$="-backdrop"]:not([hidden]), .hatch:not([hidden])')
    if (open !== windowOpen()) document.body.classList.toggle('win-open', open)
  }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden'] })

  // Fullscreen where the browser has it (not iPhone Safari), then try to pin landscape.
  const el = document.documentElement
  const reqFs = el.requestFullscreen ?? el.webkitRequestFullscreen
  if (reqFs) {
    const full = root.querySelector('.tc-full')
    full.hidden = false
    full.addEventListener('click', async () => {
      try {
        if (document.fullscreenElement ?? document.webkitFullscreenElement) await (document.exitFullscreen ?? document.webkitExitFullscreen).call(document)
        else {
          await reqFs.call(el)
          await screen.orientation?.lock?.('landscape')
        }
      } catch {
        // Refused (iframe / policy): the game plays fine windowed.
      }
    })
  }
  root.querySelector('.tc-menu').addEventListener('click', () => showMenu())

  // --- Buttons ----------------------------------------------------------------
  const hold = (btn, onDown, onUp) => {
    btn.addEventListener('pointerdown', (e) => {
      btn.setPointerCapture?.(e.pointerId)
      btn.classList.add('on')
      onDown()
      buzz(8)
      e.preventDefault()
      e.stopPropagation()
    })
    const end = () => {
      btn.classList.remove('on')
      onUp?.()
    }
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) btn.addEventListener(ev, end)
  }
  hold(root.querySelector('.tc-jump'), () => (inputState.jump = true))
  hold(
    root.querySelector('.tc-dig'),
    () => setDigHeld(true),
    () => setDigHeld(false),
  )

  // --- World touches: left = stick, right = look / pinch ---------------------------------
  let stickId = null
  const sc = { x: 0, y: 0 } // stick centre
  const looks = new Map() // pointerId -> { x, y, d } (d = last pinch distance)

  const showStick = (x, y) => {
    stick.classList.remove('idle')
    stick.style.setProperty('--x', `${x}px`)
    stick.style.setProperty('--y', `${y}px`)
  }
  const releaseStick = () => {
    stickId = null
    inputState.move.x = 0
    inputState.move.z = 0
    stick.classList.add('idle')
    stick.style.removeProperty('--x')
    stick.style.removeProperty('--y')
    knob.style.transform = ''
  }
  const pinchDist = () => {
    const [a, b] = [...looks.values()]
    return Math.hypot(a.x - b.x, a.y - b.y)
  }

  window.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch' || e.target.tagName !== 'CANVAS' || windowOpen()) return
    if (e.clientX < window.innerWidth * SPLIT) {
      if (stickId !== null) return
      stickId = e.pointerId
      sc.x = e.clientX
      sc.y = e.clientY
      knob.style.transform = ''
      showStick(sc.x, sc.y)
    } else if (looks.size < 2) {
      looks.set(e.pointerId, { x: e.clientX, y: e.clientY, d: 0 })
      if (looks.size === 2) {
        const d = pinchDist()
        looks.forEach((v) => (v.d = d))
      }
    }
  })
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'touch') return
    if (e.pointerId === stickId) {
      let dx = e.clientX - sc.x
      let dy = e.clientY - sc.y
      const len = Math.hypot(dx, dy)
      if (len > STICK_R) {
        // Drag the base along so a long swipe never leaves the stick behind the thumb.
        sc.x += (dx / len) * (len - STICK_R)
        sc.y += (dy / len) * (len - STICK_R)
        showStick(sc.x, sc.y)
        dx = (dx / len) * STICK_R
        dy = (dy / len) * STICK_R
      }
      knob.style.transform = `translate(${dx}px, ${dy}px)`
      const m = Math.min(1, Math.hypot(dx, dy) / STICK_R)
      const live = m < DEAD ? 0 : (m - DEAD) / (1 - DEAD)
      const a = Math.atan2(dy, dx)
      inputState.move.x = Math.cos(a) * live
      inputState.move.z = -Math.sin(a) * live
      return
    }
    const l = looks.get(e.pointerId)
    if (!l) return
    if (looks.size === 2) {
      l.x = e.clientX
      l.y = e.clientY
      const d = pinchDist()
      inputState.zoom += (l.d - d) * PINCH_GAIN
      looks.forEach((v) => (v.d = d))
    } else {
      inputState.look.dx += (e.clientX - l.x) * LOOK_GAIN
      inputState.look.dy += (e.clientY - l.y) * LOOK_GAIN
      l.x = e.clientX
      l.y = e.clientY
    }
  })
  const lift = (e) => {
    if (e.pointerType !== 'touch') return
    if (e.pointerId === stickId) releaseStick()
    looks.delete(e.pointerId)
  }
  window.addEventListener('pointerup', lift)
  window.addEventListener('pointercancel', lift)
  // A window opening mid-drag must not leave the character running or digging.
  setInterval(() => {
    if (!windowOpen()) return
    if (stickId !== null) releaseStick()
    setDigHeld(false)
  }, 250)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) return
    releaseStick()
    looks.clear()
    setDigHeld(false)
  })
  // iOS pinch/double-tap page zoom ignores the viewport lock.
  for (const ev of ['gesturestart', 'gesturechange']) document.addEventListener(ev, (e) => e.preventDefault())
}
