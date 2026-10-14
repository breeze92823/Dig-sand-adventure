// Colyseus link to Dig-sand-adventure-backend (room "world"): loads/saves the persisted half of
// `player`, relays this player's pose / shovel / trail / pets / avatar, exposes the other players
// and the leaderboards. Never throws and never blocks play: with no server (or an unreachable one)
// the game simply runs offline on local state.
import { Client } from '@colyseus/sdk'
import { GAME_SLUG, NET, PHYSICS, SERVER_URL, TUTORIAL, UPGRADES } from './config.js'
import { authState, sdk, getEquippedAvatar, getProportions, getSkinTextureUrl, subscribeAuth } from './bloxity.js'
import { player } from './player.js'
import { markLoaded } from './loading.js'

const AVATAR_MAX = 3000 // backend AVATAR_MAX_LEN
const BASE_SLOTS = 3 // upgrades.js: backpack slots before Capacity upgrades
const SETS = ['sellLocked', 'found', 'shovels', 'trails', 'discovered'] // Set-valued player fields, saved as arrays
const SAVED = ['money', 'strength', 'level', 'xp', 'xpNext', 'rebirths', 'sand', 'bag', 'sellLocked', 'found', 'shovels', 'shovel', 'trails', 'trail', 'upgrades', 'pets', 'nextPetId', 'discovered', 'daily', 'boosts', 'tutorialStep'] // backend src/sanitize.ts

export const net = {
  room: null,
  connected: false,
  hydrated: false, // a progress/noProgress answer arrived: saving is allowed
  leaderboard: { strength: [], rebirths: [], level: [], money: [] }, // rows { id, name, value, avatar? }
  get sessionId() {
    return this.room?.sessionId ?? null
  },
  get players() {
    return this.room?.state?.players ?? null
  },
  get loot() {
    return this.room?.state?.loot ?? null // the shared dig-lane loot, keyed by item id
  },
  clockOffset: 0, // server epoch ms minus ours, from the last progress / noProgress
}

const boardListeners = new Set()
export function onLeaderboard(fn) {
  boardListeners.add(fn)
  fn(net.leaderboard)
  return () => boardListeners.delete(fn)
}

// --- Identity ----------------------------------------------------------------
// Signed-in players use their Bloxity id; everyone else a per-browser guest id (never saved).
function guestId() {
  const make = () => `guest-${Math.random().toString(36).slice(2, 10)}`
  try {
    let id = localStorage.getItem('dsa-guest')
    if (!id) localStorage.setItem('dsa-guest', (id = make()))
    return id
  } catch {
    return make()
  }
}
const GUEST = guestId()

function identity() {
  const u = authState.user
  const id = u && (u._id || u.id || u.userId || u.uid)
  if (!id) return { userId: GUEST, username: authState.guest?.displayName || authState.guest?.username || 'Guest' }
  return { userId: String(id), username: String(u.displayName || u.username || u.name || 'Player') }
}

// Bloxity avatar as the server relays it: JSON { equipped, proportions, skin }, length-capped.
// The skin URL is the first thing dropped when it does not fit.
function avatarJson() {
  if (!authState.user) return ''
  const equipped = getEquippedAvatar()
  if (!equipped) return ''
  for (const skin of [getSkinTextureUrl(), null]) {
    try {
      const json = JSON.stringify({ equipped, proportions: getProportions(), skin })
      if (json.length <= AVATAR_MAX) return json
    } catch {
      return ''
    }
  }
  return ''
}

// --- Tutorial -------------------------------------------------------------------
// The server is the truth for a signed-in player (a save without a step is a returning player = finished).
// This browser also remembers a finished tutorial per id, so guests and offline play never see it twice.
const tutorialKey = () => `dsa-tutorial-done:${identity().userId}`
export function finishTutorialLocal() {
  try {
    localStorage.setItem(tutorialKey(), '1')
  } catch {
    // Private mode: the server copy (or the next visit) covers it.
  }
}
// The save has been read (or there is none): the tutorial may start from `player.tutorialStep`.
function tutorialReady(finished = false) {
  let done = finished
  try {
    done ||= localStorage.getItem(tutorialKey()) === '1'
  } catch {
    // Treated as not finished.
  }
  if (done) player.tutorialStep = TUTORIAL.steps
  player.tutorialReady = true
}

// --- Saving ------------------------------------------------------------------
let lastSaved = ''
let sentId = '' // identity the server currently attributes saves to

const plain = (k) => (SETS.includes(k) ? [...(player[k] ?? [])] : player[k] ?? null)
const snapshot = () => JSON.stringify(Object.fromEntries(SAVED.filter((k) => player[k] !== undefined).map((k) => [k, plain(k)])))
const isGuest = () => sentId.startsWith('guest-')

// Server time (epoch ms), for the loot expiry countdowns.
export const serverNow = () => Date.now() + net.clockOffset

// Shared loot: ask the server for an item, tell it an item was dug free (starts its disappear timer).
export const claimLoot = (id) => send('claimLoot', { id })
export const reportLootFreed = (id) => send('lootFreed', { id })
const lootClaimListeners = new Set()
export function onLootClaim(fn) {
  lootClaimListeners.add(fn)
  return () => lootClaimListeners.delete(fn)
}

export function saveNow() {
  if (!net.connected || !net.hydrated) return
  const snap = snapshot()
  if (snap === lastSaved) return
  lastSaved = snap
  send('saveProgress', JSON.parse(snap))
}

// Puts a saved document into `player` (Sets back from arrays, derived stats re-applied).
function hydrate(doc) {
  for (const k of SAVED) {
    if (doc[k] === undefined) continue
    player[k] = SETS.includes(k) ? new Set(doc[k]) : doc[k]
  }
  player.upgrades = { range: 0, agility: 0, capacity: 0, mobility: 0, value: 0, magnet: 0, ...player.upgrades }
  player.bagSlots = BASE_SLOTS + (player.upgrades.capacity ?? 0)
  player.moveSpeed = PHYSICS.moveSpeed + UPGRADES.mobility.perLevel * (player.upgrades.mobility ?? 0)
  player.shovel ||= 'wooden'
  player.daily = { day: 0, week: 1, last: '', ...player.daily }
  player.boosts ??= {}
  lastSaved = snapshot() // what the server holds: don't echo it straight back
}

// --- Messages out ------------------------------------------------------------
function send(type, payload) {
  try {
    net.room?.send(type, payload)
  } catch (err) {
    console.warn('[net] send failed', type, err)
  }
}

let lastPose = ''
let lastPoseAt = 0
// Throttled to NET.poseHz; skips repeats while standing still.
export function sendPose(p, speed, digging) {
  if (!net.connected) return
  const now = performance.now()
  if (now - lastPoseAt < 1000 / NET.poseHz) return
  lastPoseAt = now
  const r = (n) => Math.round(n * 100) / 100
  const msg = { x: r(p.position.x), y: r(p.position.y), z: r(p.position.z), yaw: r(p.facing), speed01: r(Math.min(1, speed / p.moveSpeed)), grounded: p.grounded, pose: digging ? 'dig' : null }
  const key = JSON.stringify(msg)
  if (key === lastPose) return
  lastPose = key
  send('pose', msg)
}

let sentShovel = null
let sentTrail = null
let sentPets = null
function syncEquipment() {
  if (!net.connected) return
  const shovel = player.shovel ?? 'wooden'
  const trail = player.trail ?? ''
  const pets = (player.pets ?? []).filter((p) => p.equipped).map((p) => p.pid)
  if (shovel !== sentShovel) send('setShovel', { shovel: (sentShovel = shovel) })
  if (trail !== sentTrail) send('setTrail', { trail: (sentTrail = trail) })
  const petKey = pets.join(',')
  if (petKey === sentPets) return
  sentPets = petKey
  send('setPets', { pets })
}

let sentAvatar = null
export function syncAvatar() {
  if (!net.connected) return
  const avatar = avatarJson()
  if (avatar === sentAvatar) return
  sentAvatar = avatar
  send('setAvatar', { avatar })
}

// Per frame: equipment changes go out at once, progress is saved when it changed (checked every
// NET.saveEvery seconds, so a stream of training gains costs one save per interval).
let saveClock = 0
export function updateNet(dt) {
  if (!net.connected) return
  syncEquipment()
  saveClock += dt
  if (saveClock < NET.saveEvery) return
  saveClock = 0
  saveNow()
}

// --- Connection --------------------------------------------------------------
function attach(room) {
  net.room = room
  net.connected = true
  room.onMessage('progress', (doc) => {
    net.hydrated = true
    if (doc?.serverTime) net.clockOffset = doc.serverTime - Date.now()
    hydrate(doc ?? {})
    tutorialReady(typeof doc?.tutorialStep !== 'number') // an older server that never sends a step: nothing to teach
    markLoaded('net')
  })
  room.onMessage('noProgress', (msg) => {
    if (msg?.serverTime) net.clockOffset = msg.serverTime - Date.now()
    // New account, guest or no database: keep what we have and push it as the first save.
    net.hydrated = true
    tutorialReady() // a new account or guest: the tutorial starts from the local step
    markLoaded('net')
    lastSaved = ''
    if (!isGuest()) saveNow()
  })
  room.onMessage('lootClaim', (msg) => {
    for (const fn of lootClaimListeners) fn(msg)
  })
  room.onMessage('serverError', () => {
    // The save exists but could not be read: never overwrite it.
    net.hydrated = false
    tutorialReady(true) // can't tell a new player from a returning one: stay out of the way
    markLoaded('net')
    console.warn('[net] server could not read the saved progress; saving is off for this session')
  })
  room.onMessage('leaderboard', (rows) => {
    net.leaderboard = { strength: rows?.strength ?? [], rebirths: rows?.rebirths ?? [], level: rows?.level ?? [], money: rows?.money ?? [] }
    for (const fn of boardListeners) fn(net.leaderboard)
  })
  room.onLeave(() => {
    if (net.room !== room) return
    net.room = null
    net.connected = false
    net.hydrated = false
    setTimeout(connect, 3000) // keep trying; local play is unaffected meanwhile
  })
  sentShovel = sentTrail = sentPets = sentAvatar = null
  syncEquipment()
  syncAvatar()
}

// Bloxity hosting has no fixed socket URL: the SDK resolves the endpoint of this game's server
// (a dev-channel page reaches the dev backend, prod the prod one) on every connect, and each
// resolve needs its own Client. A configured SERVER_URL (config.js, per channel) wins.
const canResolve = () => typeof sdk()?.net?.resolveEndpoint === 'function'
async function serverUrl() {
  if (SERVER_URL) return SERVER_URL
  const { endpoint } = await sdk().net.resolveEndpoint(GAME_SLUG)
  return endpoint
}

let connecting = false
async function connect() {
  if (!(SERVER_URL || canResolve()) || connecting || net.connected) return
  connecting = true
  try {
    const id = identity()
    sentId = id.userId
    const client = new Client(await serverUrl())
    attach(await client.joinOrCreate('world', { ...id, avatar: avatarJson() }))
  } catch (err) {
    console.warn('[net] could not reach the server; playing offline', err?.message ?? err)
    if (!player.tutorialReady) tutorialReady()
    markLoaded('net')
    setTimeout(connect, 10000)
  } finally {
    connecting = false
  }
}

export function initNet() {
  if (!SERVER_URL && !canResolve()) {
    tutorialReady()
    markLoaded('net')
    return console.info('[net] no server configured; playing offline')
  }
  // The first ready call connects; later ones are sign-in / sign-out.
  subscribeAuth((s) => {
    if (!s.ready) return
    if (!net.connected) return void connect()
    const id = identity()
    if (id.userId === sentId) return send('identify', { username: id.username })
    saveNow() // under the old id, before switching
    net.hydrated = false
    sentId = id.userId
    send('identify', id)
    syncAvatar()
  })
  window.addEventListener('beforeunload', saveNow)
  document.addEventListener('visibilitychange', () => document.hidden && saveNow())
}
