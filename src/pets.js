import { player } from './player.js'
import { EGGS, PETS_BY_ID } from './data/pets.js'

// Pet logic (no DOM): ownership, equipping, the boost, and egg hatching. The Pets window is
// petsWindow.js, the egg window eggWindow.js, the animation hatchOverlay.js, the 3D followers
// petFollowers.js. Equipped pets add their `power` to petMultiplier(), which train.js applies to
// strength gains (and so digging speed) and sell.js to payouts.

export const PETS = { storage: 60, equipSlots: 3 }

export const petInfo = (pet) => PETS_BY_ID[pet.pid]
export const equippedPets = () => player.pets.filter((p) => p.equipped)

// 1 + the summed power of every equipped pet, e.g. 1.7 = "x1.7".
export const petMultiplier = () => equippedPets().reduce((m, p) => m + petInfo(p).power, 1)

export function toggleEquip(pet) {
  if (pet.equipped) pet.equipped = false
  else if (equippedPets().length < PETS.equipSlots) pet.equipped = true
}

export function equipBest() {
  const best = [...player.pets].sort((a, b) => petInfo(b).power - petInfo(a).power).slice(0, PETS.equipSlots)
  player.pets.forEach((p) => (p.equipped = best.includes(p)))
}

export function removePets(ids) {
  player.pets = player.pets.filter((p) => !ids.has(p.id))
}

function roll(pets) {
  let r = Math.random() * 100
  return pets.find((p) => (r -= p.chance) < 0) ?? pets[pets.length - 1]
}

// Pay for `count` eggs from player.money, roll them and add the pets (filling free equip slots).
// Returns { egg, pets: [{ id, pid, isNew }] }, or { error } when it can't go ahead.
export function tryHatch(eggKey, count = 1) {
  const egg = EGGS[eggKey]
  if (!egg) return { error: 'Unknown egg' }
  if (player.pets.length + count > PETS.storage) return { error: 'Pet storage full! Delete some pets.' }
  const price = egg.cost * count
  if (player.money < price) return { error: `Not enough money! Need $${price.toLocaleString('en-US')}` }
  player.money -= price
  let free = Math.max(0, PETS.equipSlots - equippedPets().length)
  const hatched = Array.from({ length: count }, () => {
    const info = roll(egg.pets)
    const pet = { id: player.nextPetId++, pid: info.id, equipped: free-- > 0 }
    const isNew = !player.discovered.has(info.id)
    player.discovered.add(info.id)
    player.pets.push(pet)
    return { ...pet, isNew }
  })
  return { egg: eggKey, pets: hatched }
}
