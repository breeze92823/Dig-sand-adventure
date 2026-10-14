import { Clock, Group, PCFSoftShadowMap, PerspectiveCamera, Scene, SRGBColorSpace, WebGLRenderer } from 'three'
import { CAMERA, DIG, FOG, HUB, SPAWN, SPAWN_FACING } from './config.js'
import * as bloxity from './bloxity.js'
import { install as installInput, inputState } from './input.js'
import { installViewport, isTouch } from './device.js'
import { createTouchControls } from './touch.js'
import { player, resetPlayer, step as stepPlayer } from './player.js'
import { syncYawToPlayer, update as updateCamera } from './camera.js'
import { createFog, createGround, createLights, createSky } from './world.js'
import { createHub } from './hub.js'
import { buildDefaultCharacter, loadBaseCharacter } from './avatar/character.js'
import { applyProportions, attachEquippedAccessories } from './avatar/loader.js'
import { disposeAnimator, makeAnimator } from './avatar/animator.js'
import { createLoading, markLoaded } from './loading.js'
import { createHud } from './hud.js'
import { createLootDrops } from './lootDrops.js'
import { createSell } from './sell.js'
import { createShovels, shovelBonus } from './shovels.js'
import { attachHeldShovel } from './heldShovel.js'
import { createUpgrades } from './upgrades.js'
import { resolveInteract } from './interact.js'
import { createTraining } from './train.js'
import { createHatchOverlay } from './hatchOverlay.js'
import { createEggWindow } from './eggWindow.js'
import { createTrails } from './trails.js'
import { createPetFollowers } from './petFollowers.js'
import { createTrailFx, createTrailState } from './trailFx.js'
import { initNet, net, onLeaderboard, sendPose, syncAvatar, updateNet } from './net.js'
import { createRemotePlayers } from './remotePlayers.js'
import { createTutorial } from './tutorial.js'
import { setDigSound } from './audio.js'

installViewport() // html.compact / --W / --H before any HUD is built

// --- Bloxity + player state -----------------------------------------------
createLoading()
bloxity.init()
resetPlayer(SPAWN, SPAWN_FACING)
syncYawToPlayer()

// --- Renderer / scene -------------------------------------------------------
const GRAPHICS_PRESETS = {
  Low: { shadows: false, antialias: false, dpr: 1 },
  Medium: { shadows: true, antialias: false, dpr: 1.5 },
  High: { shadows: true, antialias: true, dpr: 2 },
  Ultra: { shadows: true, antialias: true, dpr: 2 },
}
const basePreset = GRAPHICS_PRESETS[bloxity.settings.graphics_quality] ?? GRAPHICS_PRESETS.High
const preset = isTouch ? { ...basePreset, antialias: false, dpr: Math.min(basePreset.dpr, 1.5) } : basePreset // phones: cheaper frames

const renderer = new WebGLRenderer({ antialias: preset.antialias, powerPreference: 'high-performance' })
renderer.outputColorSpace = SRGBColorSpace
renderer.shadowMap.enabled = preset.shadows
renderer.shadowMap.type = PCFSoftShadowMap
renderer.setPixelRatio(Math.min(window.devicePixelRatio, preset.dpr))
document.body.appendChild(renderer.domElement)
installInput(bloxity.showMenu, renderer.domElement)
createHud()
createTouchControls({ showMenu: bloxity.showMenu })

const scene = new Scene()
scene.fog = createFog()
const camera = new PerspectiveCamera(CAMERA.fov, 1, CAMERA.near, CAMERA.far)
camera.position.set(0, 12, 24)

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight)
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
}
window.addEventListener('resize', resize)
resize()

const sky = createSky()
const hub = createHub()
const lootDrops = createLootDrops(scene, hub.dig)
const sell = createSell()
const shovels = createShovels()
const upgrades = createUpgrades()
const training = createTraining(hub.trainPads)
const trails = createTrails()
const eggWindow = createEggWindow(createHatchOverlay())
const petFollowers = createPetFollowers(scene)
const trailFx = createTrailFx(scene)
const remotes = createRemotePlayers(scene)
const localTrail = { trail: '', state: createTrailState(), slot: 0, x: 0, y: 0, z: 0, vx: 0, vz: 0, facing: 0, grounded: true, lod: 1 }
const tutorial = createTutorial(scene, { dig: hub.dig, lootDrops, training, trainPads: hub.trainPads })
const trailSources = [localTrail] // the local player first, then the nearest remote trail wearers
scene.add(sky, createGround(), hub.group)
const lights = createLights()
scene.add(lights.hemi, lights.sun, lights.sun.target)

// --- Player avatar ----------------------------------------------------------
// Always the game's own character (player.glb, or the procedural fallback). A signed-in
// player's equipped Bloxity cosmetics are attached to it and the customizer's body
// proportions applied; it rebuilds on customizer edits and sign-in/out.
const playerGroup = new Group()
scene.add(playerGroup)

let avatar = null
let animator = null
let held = null
let generation = 0

function setAvatar(next) {
  if (avatar) playerGroup.remove(avatar)
  disposeAnimator(animator)
  held?.dispose()
  avatar = next
  playerGroup.add(avatar)
  animator = makeAnimator(avatar)
  held = attachHeldShovel(avatar)
}

setAvatar(buildDefaultCharacter()) // visible immediately; replaced once the rig loads

async function loadAvatar() {
  // The SDK fires twice per change (optimistic + confirmed); only the newest load may land.
  const mine = ++generation
  try {
    const group = await loadBaseCharacter()
    if (mine !== generation) return
    const equipped = bloxity.authState.user ? bloxity.getEquippedAvatar() : null
    await attachEquippedAccessories(group, equipped, { skinTextureUrl: bloxity.getSkinTextureUrl() })
    if (mine !== generation) return
    applyProportions(group, bloxity.getProportions())
    setAvatar(group)
  } finally {
    if (mine === generation) {
      markLoaded('avatar')
      syncAvatar() // tell the room how this player looks
    }
  }
}

let signedIn = null
bloxity.subscribeAuth((s) => {
  const now = !!s.user
  if (now !== signedIn) {
    signedIn = now
    loadAvatar() // also runs once at start to swap in the real rig
  }
})
bloxity.onAvatarChanged(loadAvatar)
bloxity.onProportionsChanged(() => applyProportions(avatar, bloxity.getProportions()))
bloxity.onSetting((key, value) => {
  if (key === 'graphics_quality') renderer.shadowMap.enabled = (GRAPHICS_PRESETS[value] ?? GRAPHICS_PRESETS.High).shadows
})

// Joins the shared room (saves/loads progress, other players, leaderboards); a no-op without a server.
initNet()
onLeaderboard((rows) => hub.boards.update(rows, net.sessionId))

// --- Loop -------------------------------------------------------------------
const clock = new Clock()

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.1) // clamp huge frames (tab switch, breakpoint)
  stepPlayer(dt)
  // E picks up a nearby drop, so keyboard digging pauses while one is in reach (the mouse still digs).
  const digging = inputState.dig && !(lootDrops.near && !inputState.mouse)

  playerGroup.position.set(player.position.x, player.position.y, player.position.z)
  playerGroup.rotation.y = player.facing
  animator?.update(dt, {
    grounded: player.grounded,
    speed: Math.hypot(player.velocity.x, player.velocity.z),
    verticalVelocity: player.velocity.y,
    turn: inputState.move.x,
    digging: digging || training.padActive, // training on a pad plays the dig stroke too
    strength: player.strength + shovelBonus(),
  })
  held?.update(dt, animator)
  // Sand bursts where the blade bites and where the load is flung.
  if ((animator?.dig.impact || animator?.dig.thrown) && player.position.z < DIG.safeZ + 2) {
    const reach = DIG.reach
    const tx = player.position.x + Math.sin(player.facing) * reach
    const tz = player.position.z + Math.cos(player.facing) * reach
    if (animator.dig.impact) hub.dig.puff(tx, tz)
    if (animator.dig.thrown) hub.dig.puff(tx + Math.cos(player.facing) * 0.9, tz - Math.sin(player.facing) * 0.9)
  }
  if (animator) animator.dig.impact = animator.dig.thrown = false

  hub.update(clock.elapsedTime)
  hub.dig.update(dt, digging, player)
  setDigSound(digging && !training.padActive)
  lootDrops.update(dt, clock.elapsedTime)
  sell.update()
  shovels.update()
  upgrades.update()
  eggWindow.update()
  trails.update()
  petFollowers.update(dt, clock.elapsedTime)
  Object.assign(localTrail, { trail: player.trail ?? '', x: player.position.x, y: player.position.y, z: player.position.z, vx: player.velocity.x, vz: player.velocity.z, facing: player.facing, grounded: player.grounded })
  trailFx.update(dt, camera, renderer.domElement.height, trailSources)
  training.update(digging)
  sendPose(player, Math.hypot(player.velocity.x, player.velocity.z), digging || training.padActive)
  updateNet(dt)
  trailSources.length = 1
  remotes.update(dt, clock.elapsedTime, player.position, trailSources)
  resolveInteract()
  tutorial.update(clock.elapsedTime, dt)
  updateCamera(camera, dt)
  sky.position.copy(camera.position)
  // In the dig zone pull the fog in (smoothly) so the far scenery fades out.
  const inLane = player.position.z < HUB.plaza.minZ
  scene.fog.near += ((inLane ? FOG.laneNear : FOG.near) - scene.fog.near) * Math.min(1, dt * 3)
  scene.fog.far += ((inLane ? FOG.laneFar : FOG.far) - scene.fog.far) * Math.min(1, dt * 3)
  lights.follow(player.position.x, player.position.z)
  renderer.render(scene, camera)
  markLoaded('scene')
})

window.addEventListener('beforeunload', bloxity.teardown)

// Dev-only console hook, e.g. __game.teleport(10, 0, -5)
if (import.meta.env.DEV) {
  window.__game = { player, teleport: (x, y, z, facing = player.facing) => { resetPlayer({ x, y, z }, facing); syncYawToPlayer() } }
}
