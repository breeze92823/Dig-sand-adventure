// Every tunable constant lives here; the rest of src/ holds no theme values.

// --- Identity -------------------------------------------------------------
export const GAME_SLUG = 'dig-sand-adventure' // slug registered on bloxity.io
export const GAME_TITLE = 'Dig Sand Adventure'

// Forces the Bloxity SDK and avatar CDN to be treated as unavailable (see .env.example).
export const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true'

// Colyseus server (../Dig-sand-adventure-backend), one URL per Bloxity Legion channel. `npm run dev` and
// `build:dev` use _DEV (npm run dev defaults to ws://localhost:2567), `npm run build` uses _MAIN. Left empty,
// the Bloxity SDK resolves the channel's endpoint at runtime; with neither the game runs offline.
const SERVER_URL_DEV = import.meta.env.VITE_SERVER_URL_DEV || (import.meta.env.DEV ? 'ws://localhost:2567' : '')
const SERVER_URL_MAIN = import.meta.env.VITE_SERVER_URL_MAIN || ''
export const SERVER_URL = import.meta.env.MODE === 'production' ? SERVER_URL_MAIN : SERVER_URL_DEV
export const NET = {
  poseHz: 15, // pose messages per second
  saveEvery: 2, // s between checks for changed progress (saved when it changed)
  remoteLerp: 12, // 1/s: how fast remote players ease toward their last reported pose
  remoteFade: 60, // m: remote players further away than this are hidden
  maxRemotes: 24, // drawn at once (nearest first)
}

// --- World (metres: +X east, +Z south, +Y up) -------------------------------
export const GROUND_Y = 0
const LANE_LUCK = [1, 2, 3, 5, 7, 10, 14, 19, 25, 32, 40, 50, 60] // same 13 zones as the reference
const LANE_ZONE_LEN = 3 * ((246 - 14) / LANE_LUCK.length) // m per zone (3x the original 17.85 m)
const BEACH_Z = -(14 + LANE_ZONE_LEN * LANE_LUCK.length) // mouth (z = -14) + 13 zones
export const WORLD_BOUNDS = { minX: -110, maxX: 110, minZ: BEACH_Z - 8, maxZ: 46 }
export const SPAWN = { x: 0, y: 0.3, z: 4 }
export const SPAWN_FACING = Math.PI // yaw the character faces on spawn (PI = toward -Z)

// --- Physics feel (player.js) -----------------------------------------------
export const PHYSICS = {
  moveSpeed: 10, // m/s on flat ground
  accel: 75, // m/s^2 toward the target velocity
  decel: 69, // m/s^2 when no key is held
  turnSpeed: 12, // rad/s the body turns toward its heading
  gravity: -22, // m/s^2
  jumpSpeed: 7.5, // m/s
  killY: -30, // fell this far below the ground: respawn
}
export const PLAYER_DIMS = { radius: 0.4, height: 1.8 }

// --- Look ------------------------------------------------------------------
export const COLORS = {
  horizon: '#cfeaff', // pale tropical horizon (also the fog colour)
  zenith: '#2f86e8',
  sand: '#e2c07a',
  sandDark: '#c9a35c',
  sandLight: '#f1d9a0',
}
export const FOG = { near: 60, far: 260, laneNear: 25, laneFar: 95 } // lane* = tighter view while in the dig zone
export const LIGHT = {
  sunColor: '#fff6e0',
  sunIntensity: 2.4,
  sunPosition: [-25, 70, 35], // high and behind-left: the hub faces read lit from the south
  shadowMapSize: 2048,
  shadowRange: 45, // half-width of the shadow frustum around the player
  hemiSky: '#eaf5ff',
  hemiGround: '#e6c77e', // warm bounce light off the plaza
  hemiIntensity: 1.7,
}

// Default (signed-out / fallback) character look.
export const CHARACTER_COLORS = { skin: '#f2c79a', suit: '#d9822b', hair: '#5a3a22' }

// Per-surface PBR defaults, spread into MeshStandardMaterial.
export const MATERIAL_PBR = {
  PLAYER: { roughness: 0.7, metalness: 0 },
  GROUND: { roughness: 1, metalness: 0 },
  PLASTIC: { roughness: 0.75, metalness: 0 }, // Roblox SmoothPlastic look for hub parts
  NEON: { roughness: 0.4, metalness: 0 },
  ROCK: { roughness: 0.9, metalness: 0 },
}

// --- North hub (hub.js) ------------------------------------------------------------
// The spawn plaza, its shops/portal/quest props, and the dig lane running north to the
// sea between terraced, grass-capped cliffs. Metres, same axes as above.
const LANE_ZONE_COLORS = [
  '#f6d680', '#f6cf6a', '#f8c23e', '#f6993a', '#e8463c', '#d9568f', '#b04ae8',
  '#5a7aff', '#3fb4ff', '#2fc7a0', '#8cd83a', '#e8e8f8', '#ffcf5a',
]
export const HUB = {
  colors: {
    plaza: '#fbd978', // Roblox stud-tile floor
    border: '#8d8a95', // grey outline strips on the plaza
    laneSand: '#f6d680',
    terraceTop: '#f2d796',
    terraceSide: '#e0b770',
    cliff: '#e8a055',
    grass: '#62c83a',
    grassDark: '#4aa82c',
    wood: '#c98a3e',
    woodDark: '#8f5a26',
    pink: '#f06ad0',
    pinkDark: '#c2459f',
    stairs: '#9a96a2',
    checker: '#c47a3c', // the south wall's chequered middle
    rug: '#e45cc9',
    navy: '#27357a',
    ocean: '#2f9fe0',
    trunk: '#b9875a',
    palm: '#3fae35',
    barricade: '#f07a2a',
    gold: '#f3c02f',
    portal: '#4b5cff',
  },
  // Dig-zone bands along the lane, near to far: [startZ, endZ, colour].
  // 13 equal zones like the reference (luck x1..x60); the last one runs on to the lane end.
  laneBands: LANE_ZONE_COLORS.map((c, i) => [
    -14 - i * LANE_ZONE_LEN,
    i === LANE_ZONE_COLORS.length - 1 ? BEACH_Z - 2 : -14 - (i + 1) * LANE_ZONE_LEN,
    c,
  ]),
  luck: LANE_LUCK, // Luck multiplier of each band
  zoneLen: LANE_ZONE_LEN, // m, length of one band along the lane
  plaza: { minX: -50, maxX: 50, minZ: -14, maxZ: 34 }, // walled on the east, west and south by cliffs
  island: { minX: -110, maxX: 110, maxZ: 46 }, // floor extent; open sea all around it
  lane: { halfWidth: 13, endZ: BEACH_Z - 2 }, // runs from the plaza's north edge to the beach
  terrace: { steps: 4, stepWidth: 6.6, stepHeight: 1.4 },
  cliffHeights: [9.5, 15], // inner and outer cliff tiers either side of the lane
  oceanZ: BEACH_Z, // beach line
  // In-world floating signs (Roblox billboard labels). Set false to hide them.
  labels: true,
}

// --- Digging (dig.js) -----------------------------------------------------------------
export const DIG = {
  cell: 0.5, // heightfield resolution, m
  block: 5, // blocking cell = block x block height cells (2.5 m: the lane is ~10 cells wide)
  reach: 1.3, // the cell this far in front of the player is the one dug, m
  rate: 0.6, // dug fraction per second for the cell being dug (before hardness)
  topHeight: 1.2, // undug sand height above the plaza, m (deeper pit to dig out)
  floor: 0.03, // height of a fully dug spot (just above the ground plane)
  safeZ: -14, // digging starts at the lane mouth
  lastHardness: 4.18e12, // hardness of the last band (x60); x1 = 1
  get hardness() {
    // Exponential: each band is the same factor harder than the one before (x1 = 1 ... x60 = lastHardness).
    const n = HUB.luck.length
    return HUB.luck.map((_, i) => this.lastHardness ** (i / (n - 1))) // per luck band, near to far
  },
  passDug: 1, // a sand cell blocks the player until this fraction of it is dug (0..1)
  resetMargin: 3, // m south of the lane mouth the player must be before the reset timer runs
  resetDelay: 10, // s back in the plaza before the dig lane refills and its loot re-rolls
  lootLostDelay: 3, // s back in the plaza before loot left lying in the lane is lost
  particles: 2400,
  dustRate: 80, // soft dust-cloud puffs per second while digging (spread over the whole cell)
  dustAlpha: 0.4, // peak opacity of a dust puff
  dustLife: 1.5, // s
  puffCount: 48, // grains per shovel hit / throw
  doneBurst: 200, // grains when a cell is dug through
  sandColor: '#e7c47a',
  floorTint: '#e0c8aa', // multiplier over the packed-soil texture (textures.js dirtTile), x1 band
  floorTintDeep: '#9fb0c4', // same, deepest band (cold slate)
  pitShade: 0.18, // extra darkening while a spot is mid-dig
  sprayRate: 320, // sand puffs per second while digging
  strengthExp: 0.5, // dig speed x= strength ^ this (0 = strength does not speed digging up, 1 = linear)
}

// --- Training pads (train.js, the Training Area in hub.js) ----------------------------------
// Standing on a pad every `interval` s adds strength = perTick x rebirth multiplier x pad `mult` and
// the same perTick x mult as XP. Reaching level N+1 needs xpPerLevel * N XP (25, 50, 75, ...).
// No level cap; rebirth needs level 25 x 2^rebirths (rebirth.js). Paid pads stay locked until `paidPads` is true.
export const TRAIN = { perTick: 1, interval: 1, xpPerLevel: 25, paidPads: false }

// --- New-player tutorial (tutorial.js, tutorialLogic.js) ------------------------------------------
// The step is saved with the account (player.tutorialStep, net.js); an account saved before the tutorial
// existed counts as finished (backend resolveTutorialStep). `steps` = the "finished" value and must match the
// backend constants.ts TUTORIAL_DONE_STEP.
export const DISABLE_TUTORIAL = import.meta.env.VITE_DISABLE_TUTORIAL === 'true'
export const TUTORIAL = {
  steps: 11,
  trainSecs: 8, // seconds standing on a training pad to finish the training step
  completeMs: 3500, // how long the "Tutorial Complete!" banner stays
}
export const LEVEL_UP_POPUP = { inMs: 420, holdMs: 900, outMs: 560 }

// --- Sell Loot stall (sell.js): the E prompt shows within `open` m of the pad, an open window closes past `close` m.
export const SELL = { x: -23, z: 3, open: 5.5, close: 9 }
export const TRAILS_STALL = { x: -23, z: 24, open: 5.5, close: 9 }

// --- Digging Tools stall (shovels.js): same prompt/close ranges as the Sell Loot stall, on the east side.
export const SHOVEL_SHOP = { x: 14.5, z: 3, open: 5.5, close: 9 }

// --- Upgrades stall (upgrades.js): permanent $ upgrades. Cost of level L = cost x growth^L; perLevel is the
// fractional bonus per level (range = dig reach, agility = dig speed); capacity adds one backpack slot per level.
export const UPGRADES = {
  stall: { x: 14.5, z: 24, open: 5.5, close: 9 },
  range: { name: 'Range', desc: '+0.5% Dig Radius', perLevel: 0.005, cost: 40, growth: 1.3 },
  agility: { name: 'Agility', desc: '+5% Dig Speed', perLevel: 0.05, cost: 50, growth: 1.3 },
  capacity: { name: 'Capacity', desc: '+1 Backpack Slot', cost: 300, growth: 3.6, max: 17 },
  mobility: { name: 'Mobility', desc: '+1 Walk Speed', perLevel: 1, cost: 100, growth: 1.3 },
  value: { name: 'Value', desc: '+5% Loot Value', perLevel: 0.05, cost: 10e6, growth: 1.5 },
  magnet: { name: 'Magnet', desc: '+6% Pickup Range', perLevel: 0.06, cost: 20e6, growth: 1.5 },
}

// --- Pets (pets.js, eggWindow.js, hatchOverlay.js, petFollowers.js) -----------------------------
// Egg stand in the plaza by the portal (hub.js), prompt range, and the hatch animation timing in ms.
export const EGG_STANDS = [
  { egg: 'starter', x: -11, z: 27, open: 3.6, close: 6 },
  { egg: 'forest', x: -5, z: 27, open: 3.6, close: 6 },
  { egg: 'galaxy', x: 1, z: 27, open: 3.6, close: 6 },
]
export const HATCH_MS = { shake: 1700, reveal: 1900 }
// Followers: equipped pets trail the player on an arc behind them.
export const PET_FOLLOW = { radius: 2.1, spread: 0.62, hz: 5, scale: 1.1 }

// --- Camera (camera.js) -------------------------------------------------------
export const CAMERA = {
  fov: 70,
  near: 0.1,
  far: 1400,
  startPitch: 0.34, // radians above the horizon
  minPitch: -0.1,
  maxPitch: 1.2,
  distance: 24, // resting boom length, m (high, wide hub view like the reference)
  minDistance: 3,
  maxDistance: 40,
  followLerp: 10, // 1/s: the ONE smoothing stage, on the point the camera follows
  targetHeight: 0.6, // look-at point as a fraction of player height
  lookSensitivity: 0.0026, // rad per pixel of right-drag
  zoomStep: 0.9, // m per wheel notch
  zoomEase: 12, // 1/s the zoom glides to its target
  speedDistance: 0.8, // m the boom pulls back at full speed
  speedFov: 4, // degrees the FOV widens at full speed
  speedEase: 3, // 1/s the speed framing eases in and out
}

// --- Bloxity (bloxity.js, avatar/) -------------------------------------------------
// SDK setting keys this game listens for; registering a listener makes the control
// appear in the portal's settings menu.
export const SETTINGS = {
  graphics_quality: { def: 'High', type: 'enum', values: ['Low', 'Medium', 'High', 'Ultra'] },
  camera_sensitivity: { def: '1', type: 'number', min: 0.1, max: 5 },
  fullscreen: { def: 'false', type: 'bool' },
}

// The base rig, measured from player.glb: origin at the feet, 6.4 units tall at bind pose.
export const RIG_HEIGHT = 6.4
// Bind-pose values of the rig nodes the SDK proportions drive.
export const RIG = { armOffsetX: 2, legOffsetX: 0.6, neckOffsetY: 0.6 }
// getProportions() ranges, straight from the SDK spec; clamped before they reach the scene graph.
export const PROPORTIONS = {
  height: { def: 1, min: 0.5, max: 1.6 },
  shoulderWidth: { def: 1, min: 0.5, max: 1.5 },
  armLength: { def: 1, min: 0.05, max: 3 },
  legOffsetX: { def: 1, min: -0.7, max: 5 },
  torsoScaleX: { def: 1, min: 0.3, max: 2 },
  neckHeight: { def: 1, min: 0.94, max: 1.2 },
  headScale: { def: 1, min: 0.3, max: 2.6 },
}

// Procedural animation (avatar/animator.js). Rotations are radians in CHARACTER space:
// +X swings a limb backward, +Y yaws, +Z rolls.
const deg = (d) => (d * Math.PI) / 180
export const ANIM = {
  airborneDelay: 0.07, // s off the ground before the air pose
  locomotion: {
    minFrequency: 0.7,
    maxFrequency: 3.6,
    strideDistance: 3.8, // m per cycle
    idleSpeed: 0.6,
    walkSpeed: 2.5,
    runSpeed: 8,
    sprintSpeed: 13,
    hipSwing: { walk: deg(22), run: deg(42), sprint: deg(56) },
    kneeBend: { walk: deg(30), run: deg(58), sprint: deg(72) },
    armSwing: { walk: deg(18), run: deg(36), sprint: deg(52) },
    elbowBend: { walk: deg(14), run: deg(44), sprint: deg(70) },
    torsoTwist: { walk: deg(4), run: deg(7), sprint: deg(9) },
    torsoLean: { walk: deg(3), run: deg(10), sprint: deg(18) },
    headCounterTwist: { walk: deg(2), run: deg(4), sprint: deg(5) },
    torsoRoll: { walk: deg(2), run: deg(3), sprint: deg(3) },
    bob: { walk: 0.03, run: 0.07, sprint: 0.09 }, // m, on the avatar root
    bankAngle: deg(9),
    bankRate: 8,
  },
  idle: {
    breathFrequency: 0.35,
    breathAmount: deg(1.8),
    breathBob: 0.007,
    basePose: {
      ArmL1: { x: deg(-8), z: deg(14) },
      ArmL2: { x: deg(38) },
      ArmR1: { x: deg(4), z: deg(-6) },
      ArmR2: { x: deg(12) },
      LegL1: { x: deg(-4) },
      LegR1: { x: deg(4) },
    },
  },
  airborne: {
    rise: {
      LegL1: { x: deg(-38) }, LegR1: { x: deg(8) }, LegL2: { x: deg(62) }, LegR2: { x: deg(40) },
      ArmL1: { x: deg(-40), z: deg(34) }, ArmR1: { x: deg(-30), z: deg(-34) },
      ArmL2: { x: deg(30) }, ArmR2: { x: deg(30) }, Spine1: { x: deg(6) },
    },
    fall: {
      LegL1: { x: deg(-14) }, LegR1: { x: deg(10) }, LegL2: { x: deg(22) }, LegR2: { x: deg(18) },
      ArmL1: { x: deg(-70), z: deg(40) }, ArmR1: { x: deg(-60), z: deg(-40) },
      ArmL2: { x: deg(20) }, ArmR2: { x: deg(20) }, Spine1: { x: deg(-4) },
    },
    velocityReference: 8, // m/s vertical speed that reads as fully rising / falling
  },
  landing: {
    duration: 0.16,
    pose: {
      LegL1: { x: deg(-34) }, LegR1: { x: deg(-34) }, LegL2: { x: deg(58) }, LegR2: { x: deg(58) },
      ArmL1: { x: deg(-18), z: deg(20) }, ArmR1: { x: deg(-18), z: deg(-20) }, Spine1: { x: deg(14) },
    },
    bobY: -0.2,
  },
  transitions: { toLocomotion: 0.14, toAirborne: 0.12, toLanding: 0.06 }, // s to blend a pose change
  // Two-handed digging stroke (avatar/digStroke.js). One loop: raise -> thrust -> hit -> scoop ->
  // throw. Per key: lean = spine pitch (+ forward), crouch = knee bend 0..1, dy / dz = right hand
  // below / in front of the mid-shoulder point (rig units), tilt = shovel pitch (negative: blade
  // forward), yaw = sideways sweep of the shovel. The hands are placed by IK (heldShovel.js).
  dig: {
    cycle: 0.85, // s per stroke at strength 1
    strengthLog: 0.08, // stroke speeds up by this x log10(strength)
    maxScale: 1.8, // fastest stroke = cycle / maxScale
    blendRate: 12, // 1/s blend into / out of the dig pose
    maxSpeed: 1.2, // m/s; moving faster than this plays the normal run instead
    impactU: 0.4, // cycle point where the blade hits the sand (sand burst)
    throwU: 0.84, // cycle point where the sand is flung (clod burst)
    gap: 0.9, // m-ish (shovel units) between the hands on the shaft
    keys: [
      { t: 0.0, lean: deg(-9), crouch: 0.0, dy: -0.1, dz: 0.4, tilt: -1.45, yaw: 0 }, // raise
      { t: 0.28, lean: deg(24), crouch: 0.55, dy: -0.9, dz: 0.9, tilt: -0.6, yaw: 0 }, // thrust
      { t: 0.4, lean: deg(30), crouch: 0.75, dy: -1.0, dz: 0.95, tilt: -0.5, yaw: 0 }, // hit
      { t: 0.66, lean: deg(9), crouch: 0.3, dy: -0.5, dz: 0.5, tilt: -1.05, yaw: 0 }, // scoop
      { t: 0.84, lean: deg(-4), crouch: 0.1, dy: -0.2, dz: 0.5, tilt: -1.6, yaw: 0.9 }, // throw
    ],
  },
}

export function clamp(n, min, max) {
  return n < min ? min : n > max ? max : n
}

// Coerce one raw SDK string against its SETTINGS entry.
export function coerceSetting(key, raw) {
  const spec = SETTINGS[key]
  if (!spec) return raw
  const value = raw === '' || raw == null ? spec.def : raw
  if (spec.type === 'bool') return value === 'true'
  if (spec.type === 'enum') return spec.values.includes(value) ? value : spec.def
  const n = Number(value)
  return clamp(Number.isFinite(n) ? n : Number(spec.def), spec.min, spec.max)
}
