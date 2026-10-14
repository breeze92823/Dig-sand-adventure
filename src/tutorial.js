// New-player tutorial: a banner under the top bar (with SKIP), a 3D guide (trail of arrowheads + bobbing
// beacon) toward where to go, and a bobbing UI arrow on the button to press. The step lives in
// player.tutorialStep, which net.js saves with the account (an account saved before the tutorial existed
// is finished, see backend resolveTutorialStep); player.tutorialReady gates it until the save was read.
// Phones get touch wording and arrows on the DIG / interact buttons. The step machine is tutorialLogic.js.
import { ExtrudeGeometry, Group, InstancedMesh, Mesh, MeshStandardMaterial, Object3D, Shape } from 'three'
import './tutorial.css'
import { DIG, DISABLE_TUTORIAL, HUB, SELL, SHOVEL_SHOP, TUTORIAL } from './config.js'
import { floorAt, player } from './player.js'
import { isTouch } from './device.js'
import { finishTutorialLocal, saveNow } from './net.js'
import { SHOVELS, START_SHOVEL } from './data/shovels.js'
import { nextStep } from './tutorialLogic.js'

const SPACING = 1.1 // m between trail arrows
const SPEED = 1.8 // m/s the trail crawls toward the target
const MAX_ARROWS = 140
const HIDE_WITHIN = 2.5 // m from the target where the trail disappears
const BEACON_HEIGHT = 4.5 // m above the ground the big arrow floats

const LANE = { x: 0, z: DIG.safeZ - 0.5 } // just inside the lane mouth, where the first cell is dug
const IN_LANE_Z = DIG.safeZ + 0.5 // standing north of this is "in the lane"

const money = (n) => '$' + Math.round(n).toLocaleString('en-US')

export function createTutorial(scene, { dig, lootDrops, training, trainPads }) {
  const press = isTouch ? 'Tap' : 'Press'

  // --- Banner ----------------------------------------------------------------
  const banner = document.createElement('div')
  banner.className = 'tut-banner'
  banner.innerHTML = '<div class="tutorial" hidden><div class="tut-tag"></div><div class="tut-text"></div><div class="tut-sub"></div></div>'
  document.body.appendChild(banner)
  const box = banner.firstChild
  const skip = document.createElement('button')
  skip.className = 'tut-skip'
  skip.type = 'button'
  skip.textContent = 'SKIP'
  skip.hidden = true
  skip.addEventListener('click', (e) => {
    e.stopPropagation()
    finish() // update() then clears the guide and arrow
  })
  for (const ev of ['pointerdown', 'pointerup']) skip.addEventListener(ev, (e) => e.stopPropagation()) // don't dig / look underneath
  banner.appendChild(skip)
  const tag = box.querySelector('.tut-tag')
  const text = box.querySelector('.tut-text')
  const sub = box.querySelector('.tut-sub')
  let shownKey = ''
  function paintBanner(key, t, s, complete = false) {
    if (key === shownKey) return
    const fresh = key.split('|')[0] !== shownKey.split('|')[0]
    shownKey = key
    box.hidden = !t
    skip.hidden = !t || complete
    box.classList.toggle('complete', complete)
    tag.textContent = complete ? 'DONE' : 'TUTORIAL'
    text.textContent = t ?? ''
    sub.textContent = s ?? ''
    sub.hidden = !s
    if (fresh) {
      box.style.animation = 'none'
      void box.offsetWidth // restart the pop-in
      box.style.animation = ''
    }
  }

  function setStep(n) {
    player.tutorialStep = n
    if (n >= TUTORIAL.steps) {
      finishTutorialLocal()
      saveNow() // finished for good: send it to the backend now instead of waiting out the save interval
    }
  }
  function finish() {
    setStep(TUTORIAL.steps)
  }

  // --- UI arrow --------------------------------------------------------------
  const arrow = document.createElement('div')
  arrow.className = 'tut-arrow'
  arrow.innerHTML = '<svg viewBox="0 0 60 80"><path d="M18 4h24v34h14L30 76 4 38h14z" fill="#ffd23a" stroke="#121212" stroke-width="6" stroke-linejoin="round"/></svg>'
  arrow.hidden = true
  document.body.appendChild(arrow)
  let hl = null // the element currently glowing
  function clearUi() {
    arrow.hidden = true
    hl?.classList.remove('tut-hl')
    hl = null
  }
  function pointAt(selector) {
    const el = document.querySelector(selector)
    const r = el?.getBoundingClientRect()
    if (!el || !r || r.width === 0 || r.height === 0) return clearUi() // not on screen
    if (hl !== el) {
      hl?.classList.remove('tut-hl')
      el.classList.add('tut-hl')
      hl = el
      el.scrollIntoView?.({ block: 'nearest' }) // a shop row can sit below the fold
    }
    arrow.hidden = false
    // Keep the arrow on screen: if the element hugs the top edge it points up from underneath instead.
    const below = r.top < 80
    arrow.dataset.side = below ? 'bottom' : 'top'
    arrow.style.left = `${Math.min(window.innerWidth - 30, Math.max(30, r.left + r.width / 2))}px`
    arrow.style.top = `${below ? r.bottom + 6 : r.top - 6}px`
  }

  // --- 3D guide --------------------------------------------------------------
  const shape = new Shape()
  shape.moveTo(0, 0.42)
  shape.lineTo(0.34, -0.2)
  shape.lineTo(0, -0.05)
  shape.lineTo(-0.34, -0.2)
  shape.closePath()
  const geometry = new ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 1 })
  geometry.center()
  // Drawn over everything so walls and landmarks never hide the way.
  const trailMat = new MeshStandardMaterial({ color: '#eef1f6', roughness: 0.5, depthTest: false, transparent: true })
  const beaconMat = new MeshStandardMaterial({ color: '#ffd23a', emissive: '#ff9a1f', emissiveIntensity: 0.6, roughness: 0.4, fog: false, depthTest: false, transparent: true })
  const guide = new Group()
  const trail = new InstancedMesh(geometry, trailMat, MAX_ARROWS)
  trail.frustumCulled = false
  trail.renderOrder = 20
  trail.count = 0
  const beacon = new Mesh(geometry, beaconMat)
  beacon.scale.setScalar(3.2)
  beacon.frustumCulled = false
  beacon.renderOrder = 21
  beacon.visible = false
  guide.add(trail, beacon)
  scene.add(guide)
  const dummy = new Object3D()

  function drawGuide(to, t) {
    trail.count = 0
    beacon.visible = false
    if (!to) return
    const dx = to.x - player.position.x
    const dz = to.z - player.position.z
    const dist = Math.hypot(dx, dz)
    const ux = dx / (dist || 1)
    const uz = dz / (dist || 1)
    const heading = Math.atan2(ux, uz)
    const phase = (t * SPEED) % SPACING
    let n = 0
    if (dist > HIDE_WITHIN) {
      for (let d = 1.4 + phase; d < dist - 0.6 && n < MAX_ARROWS; d += SPACING) {
        const x = player.position.x + ux * d
        const z = player.position.z + uz * d
        dummy.position.set(x, floorAt(x, z) + 0.3, z)
        dummy.rotation.set(Math.PI / 2 - 0.35, heading, 0, 'YXZ') // lie flat, tip toward the target
        dummy.updateMatrix()
        trail.setMatrixAt(n++, dummy.matrix)
      }
    }
    trail.count = n
    trail.instanceMatrix.needsUpdate = true
    beacon.visible = true
    beacon.position.set(to.x, floorAt(to.x, to.z) + BEACON_HEIGHT + Math.sin(t * 4) * 0.35, to.z)
    beacon.rotation.set(0, t * 2, Math.PI, 'YXZ') // point down, spin about the vertical
  }

  // --- Progress counters (polled, reset when the step they belong to begins) ----
  const visible = (sel) => !!document.querySelector(sel)
  const padTarget = trainPads.find((p) => !p.paid && p.cost === 0) ?? trainPads[0] // the free pad
  const nextShovel = () => SHOVELS.find((s) => !s.locked && !player.shovels?.has(s.id))
  let digBase = 0 // dig.cellsDug when the digging step began
  let sold = false // the bag was sold during steps 4-5
  let lastMoney = player.money
  let trainTime = 0 // s spent on a training pad
  let prevStep = -1
  let completeUntil = 0
  let prevPhase = false

  // --- Per frame -------------------------------------------------------------
  function update(t, dt) {
    if (DISABLE_TUTORIAL || !player.tutorialReady) return
    const step = player.tutorialStep
    if (prevPhase && step >= TUTORIAL.steps && prevStep < TUTORIAL.steps) completeUntil = performance.now() + TUTORIAL.completeMs
    prevPhase = true

    if (step >= TUTORIAL.steps) {
      prevStep = step
      drawGuide(null, t)
      clearUi()
      if (performance.now() < completeUntil) paintBanner('done', 'Tutorial Complete!', 'Now dig for rarer loot', true)
      else paintBanner('', null)
      return
    }

    const p = player.position
    const inLane = p.z < IN_LANE_Z && Math.abs(p.x) < HUB.lane.halfWidth
    const atSell = Math.hypot(p.x - SELL.x, p.z - SELL.z) < SELL.open
    const atShop = Math.hypot(p.x - SHOVEL_SHOP.x, p.z - SHOVEL_SHOP.z) < SHOVEL_SHOP.open
    const sellOpen = visible('.lt-overlay:not([hidden]) .sl-all')
    const shopOpen = visible('.lt-overlay:not([hidden]) .sv-list')

    if (player.money > lastMoney && (step === 4 || step === 5)) sold = true
    lastMoney = player.money
    if (step === 2 || step === 3) sold = false
    if ((step === 6 || step === 7) && training.padActive) trainTime += dt
    if (step !== prevStep && (step === 1 || step === 10)) digBase = dig.cellsDug
    prevStep = step

    const free = lootDrops.nearestFree(p.x, p.z)
    const cost = nextShovel()?.cost ?? 0
    const canBuy = player.money >= cost
    const next = nextStep(step, {
      inLane,
      dugNew: dig.cellsDug > digBase,
      bag: player.bag.length,
      hasLoot: !!free,
      sold,
      atSell,
      sellOpen,
      padOn: training.padActive,
      trained: trainTime >= TUTORIAL.trainSecs,
      shopOpen,
      canBuy,
      hasNew: player.shovel !== START_SHOVEL && !!player.shovels?.has(player.shovel),
      done: TUTORIAL.steps,
    })
    if (next !== step) {
      setStep(next) // saved by net.js
      return
    }

    // Where the 3D guide points and which button the UI arrow sits on, per step.
    const broke = step === 8 && !canBuy
    let to = null // 3D guide target
    let ui = null // selector of the element the UI arrow sits on
    const prompt = '.lt-prompt:not([hidden])' // the "Press E" / tappable interact button
    switch (step) {
      case 0:
        to = LANE
        break
      case 1:
        ui = isTouch && '.tc-dig'
        break
      case 2:
        to = inLane ? null : LANE
        break
      case 3:
        to = free
        ui = prompt
        break
      case 4:
        to = SELL
        ui = atSell && prompt
        break
      case 5:
        to = sellOpen ? null : SELL
        ui = sellOpen ? '.lt-overlay:not([hidden]) .sl-all:not([disabled])' : atSell && prompt
        break
      case 6:
        to = padTarget
        break
      case 8:
        if (broke) to = player.bag.length ? SELL : free ?? (inLane ? null : LANE)
        else {
          to = SHOVEL_SHOP
          ui = atShop && prompt
        }
        break
      case 9:
        ui = '.lt-overlay:not([hidden]) .sv-btn.buy:not(.poor), .lt-overlay:not([hidden]) .sv-btn.equip'
        break
      case 10:
        to = inLane ? null : LANE
        ui = isTouch && inLane && '.tc-dig'
        break
    }
    drawGuide(to, t)
    if (ui) pointAt(ui)
    else clearUi()

    const dig1 = isTouch ? 'Hold the DIG button to dig the sand' : 'Hold left mouse (or E) to dig the sand'
    const [title, hint] = [
      ['Head to the Dig Lane', 'Follow the arrows to the sand lane'],
      [dig1, 'Keep holding until the hole opens up'],
      ['Dig the surface to uncover loot', 'Dig forward along the lane until an item pops out'],
      ['Collect the loot!', isTouch ? 'Stand next to it and tap Collect' : 'Stand next to it and press E'],
      ['Take your loot to the Sell Loot pad', 'Follow the arrows'],
      ['Sell your loot', `${press} Sell Loot, then Sell All`],
      ['Go to the Training Area', 'Follow the arrows to the glowing sand pile'],
      [`Train to get stronger (${Math.min(TUTORIAL.trainSecs, Math.floor(trainTime))}/${TUTORIAL.trainSecs})`, 'Stay on the pad - you gain Strength automatically'],
      broke
        ? [`Earn ${money(cost)} for a new shovel (${money(Math.min(player.money, cost))}/${money(cost)})`, 'Dig loot and sell it, then visit Digging Tools']
        : ['Visit Digging Tools', `Walk to the stall and ${isTouch ? 'tap' : 'press'} the button to open the shop`],
      ['Buy a better shovel', 'It equips itself and digs faster'],
      ['Dig again with your new shovel', inLane ? 'Dig one more cell - see how much faster it is' : 'Head back to the Dig Lane'],
    ][step]
    paintBanner(`${step}|${title}|${hint}`, title, hint)
  }

  return { update }
}
