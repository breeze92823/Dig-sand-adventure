// Digging Tools catalog (the reference's full list). `bonus` is added to the player's strength when
// digging (dig.js), `cost` is $. Look of the 3D model (heldShovel.js) and the shop icon:
//   shaft / grip = pole + D-grip colours, blade / trim = blade face + rim, ferrule and rivets,
//   shape = blade outline (spade | square | wide | flame | disc | wave | leaf | fang | drill),
//   gem = optional glowing stone on the socket, glow = emissive trim + blade.
// `locked` entries are quest / daily rewards: shown in the shop but not buyable or equippable.
const S = (id, name, rarity, bonus, cost, look) => ({ id, name, rarity, bonus, cost, shape: 'spade', ...look })

export const SHOVELS = [
  { id: 'eclipse', name: 'Eclipse Shovel', rarity: 'Celestial', bonus: 0, cost: Infinity, locked: 'Daily Rewards', desc: '2x your best regular shovel', shape: 'disc', shaft: '#1c1c22', grip: '#b8662a', blade: '#14141a', trim: '#ffb040', glow: true },

  S('wooden', 'Wooden Shovel', 'Common', 1, 0, { shaft: '#8a5a32', grip: '#8a5a32', blade: '#a8683a', trim: '#7a4a28' }),
  S('driftwood', 'Driftwood Shovel', 'Common', 3, 40, { shaft: '#e0cf9e', grip: '#e0cf9e', blade: '#d9c493', trim: '#2e8f8a' }),
  S('rusty', 'Rusty Shovel', 'Common', 8, 110, { shaft: '#5a4a45', grip: '#5a4a45', blade: '#8a3a24', trim: '#4a3a35' }),
  S('bronze', 'Bronze Shovel', 'Common', 20, 240, { shaft: '#5a4640', grip: '#2f8f90', blade: '#c8892e', trim: '#2f8f90' }),

  S('steel', 'Steel Shovel', 'Uncommon', 50, 510, { shaft: '#2d323c', grip: '#3a5c7a', blade: '#8fb4d6', trim: '#4a5a70' }),
  S('iron', 'Iron Shovel', 'Uncommon', 100, 1000, { shaft: '#2a2d33', grip: '#3a3f48', blade: '#25282e', trim: '#555b66' }),
  S('verdant', 'Verdant Shovel', 'Uncommon', 200, 1900, { shaft: '#6a4a38', grip: '#2d6a45', blade: '#2f7a3f', trim: '#5a4535' }),
  S('jade', 'Jade Shovel', 'Uncommon', 450, 4000, { shaft: '#23272e', grip: '#1fa86a', blade: '#1fa86a', trim: '#1b6a4a' }),

  S('gold', 'Gold Shovel', 'Rare', 750, 7100, { shaft: '#2a2c32', grip: '#8a6a4a', blade: '#e8b020', trim: '#a8780f' }),
  S('amber', 'Amber Shovel', 'Rare', 1100, 13000, { shaft: '#2a2c32', grip: '#d85a2a', blade: '#e8651c', trim: '#a8400c' }),
  S('sunstone', 'Sunstone Shovel', 'Rare', 1500, 22000, { shaft: '#2a2c32', grip: '#d84a2a', blade: '#f08a3a', trim: '#c85a22' }),
  S('sapphire', 'Sapphire Shovel', 'Rare', 2100, 40000, { shaft: '#252a36', grip: '#2a3560', blade: '#1c3fc0', trim: '#17297a' }),

  S('diamond', 'Diamond Shovel', 'Epic', 3100, 71000, { shaft: '#252a30', grip: '#4a5058', blade: '#7fe0f5', trim: '#b8f0ff' }),
  S('amethyst', 'Amethyst Shovel', 'Epic', 5300, 130000, { shaft: '#25222e', grip: '#3a2a5a', blade: '#7a2fd0', trim: '#4a1a8a' }),
  S('frost', 'Frost Shovel', 'Epic', 9500, 220000, { shaft: '#2a3340', grip: '#4a8ac0', blade: '#7fc0f0', trim: '#c8ecff' }),
  S('storm', 'Storm Shovel', 'Epic', 17000, 400000, { shaft: '#22262e', grip: '#2a2f3a', blade: '#162040', trim: '#2a3a6a', shape: 'square' }),

  S('obsidian', 'Obsidian Shovel', 'Legendary', 36000, 700000, { shaft: '#1c1c22', grip: '#25252c', blade: '#14141a', trim: '#6a3acf', shape: 'square', gem: '#9a4cff' }),
  S('inferno', 'Inferno Shovel', 'Legendary', 71000, 1200000, { shaft: '#2a2224', grip: '#6a3a3a', blade: '#5a1410', trim: '#ff5a1a', shape: 'flame', glow: true }),
  S('phoenix', 'Phoenix Shovel', 'Legendary', 153000, 2200000, { shaft: '#2a2224', grip: '#e8453a', blade: '#e8651c', trim: '#ffb020', shape: 'flame' }),
  S('rune', 'Rune Shovel', 'Legendary', 329000, 3900000, { shaft: '#2b2f36', grip: '#2b3a3a', blade: '#1c3a35', trim: '#37e0b0', gem: '#37e0b0', glow: true }),

  S('nebula', 'Nebula Shovel', 'Mythic', 707000, 7000000, { shaft: '#2b2f3a', grip: '#4a3a8f', blade: '#2a1a5e', trim: '#c46bff', shape: 'wide', glow: true }),
  S('relic', 'Relic Shovel', 'Mythic', 1520000, 12000000, { shaft: '#2e2e32', grip: '#a8884a', blade: '#6b4a1e', trim: '#35c9b5', shape: 'square', gem: '#35c9b5' }),
  S('aurora', 'Aurora Shovel', 'Mythic', 3000000, 22000000, { shaft: '#2b2f3a', grip: '#3fb0e0', blade: '#1fb89a', trim: '#7a5cf0', shape: 'wide', glow: true }),

  S('solar', 'Solar Shovel', 'Secret', 6200000, 39000000, { shaft: '#2a2224', grip: '#ff7a3a', blade: '#e0501c', trim: '#ffc83a', shape: 'disc', glow: true }),
  S('comet', 'Comet Shovel', 'Secret', 12000000, 69000000, { shaft: '#2a3040', grip: '#2a5ac0', blade: '#2a7ad8', trim: '#9fe8ff', shape: 'wide' }),
  S('genesis', 'Genesis Shovel', 'Secret', 24000000, 120000000, { shaft: '#2a2e32', grip: '#c8a840', blade: '#5aa890', trim: '#e8c860', shape: 'leaf', gem: '#5af0c0' }),

  S('dunecrest', 'Dunecrest Shovel', 'Godly', 50000000, 240000000, { shaft: '#2e2a28', grip: '#b86a3a', blade: '#c8782a', trim: '#f0c070', shape: 'wave', gem: '#35c9b5' }),
  S('jadefang', 'Jadefang Shovel', 'Godly', 100000000, 480000000, { shaft: '#2a2e2a', grip: '#2a3a30', blade: '#10201a', trim: '#2fe08a', shape: 'fang', gem: '#2fe08a', glow: true }),

  // Was a quest reward; now sold for $ (+50% over the best regular shovel, Jadefang 100M, at ~4.7 $ per strength).
  S('drill', 'Construction Drill', 'Celestial', 150000000, 700000000, { desc: '50% better than your best digging tool', shape: 'drill', shaft: '#2a2c32', grip: '#f2c81a', blade: '#aeb6c2', trim: '#f2c81a' }),

  // Sold from the galaxy showcase pedestal in the hub (shovelFx.js): "+300% Strength" = 4x the best
  // regular shovel (Jadefang 100M). Price follows the catalog curve (Jadefang is ~4.8 $ per strength).
  S('galaxy', 'Galaxy Shovel', 'Godly', 400000000, 1600000000, { shaft: '#1a1230', grip: '#4a2a8f', blade: '#2a1a5e', trim: '#ff5ad8', shape: 'wide', gem: '#35e0ff', glow: true }),
]
export const SHOVELS_BY_ID = Object.fromEntries(SHOVELS.map((s) => [s.id, s]))
export const START_SHOVEL = 'wooden'

// Shop row colours (rarity -> row background); Secret / Celestial / Godly differ from the loot tiers.
export const SHOVEL_ROW_BG = {
  Common: '#a2a9e0',
  Uncommon: '#6ccb55',
  Rare: '#4aa6ff',
  Epic: '#c95cff',
  Legendary: '#ffb020',
  Mythic: '#ff5a7a',
  Secret: '#c46cf0',
  Celestial: '#59b8ff',
  Godly: '#ffd96a',
}
