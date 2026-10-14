// Every loot item (ported from the reference game's data/loot.js): name, rarity, glyph and sell
// value. Which dug-up spots drop what is decided in lootDrops.js (see LUCK_LOOT).

// Extra index collectables: [name, rarity, glyph, value in $]. Any of them can spawn, by rarity (see pickItem).
const EXTRA_ITEMS = [
  ['Pirate Hat', 'Rare', '🏴‍☠️', 4900],
  ['Anvil', 'Rare', '⚒️', 5690],
  ['Dagger', 'Rare', '🗡️', 6600],
  ['TNT', 'Rare', '🧨', 7670],
  ['Bomb', 'Rare', '💣', 8900],
  ['Helmet', 'Rare', '🪖', 10300],
  ['Quartz', 'Rare', '🔹', 12000],
  ['Feather', 'Common', '🪶', 10],
  ['Seashell', 'Common', '🐚', 13],
  ['Acorn', 'Common', '🌰', 11],
  ['Pinecone', 'Common', '🌲', 15],
  ['Old Boot', 'Common', '🥾', 17],
  ['Compass', 'Uncommon', '🧭', 130],
  ['Silver Key', 'Uncommon', '🗝️', 150],
  ['Crystal Ball', 'Rare', '🔮', 2000],
  ['Ancient Scroll', 'Rare', '📜', 3130],
  ['Golden Ring', 'Rare', '💍', 4220],
  ['Ruby', 'Rare', '🔴', 2320],
  ['Sapphire', 'Rare', '🔵', 2700],
  ['Pocket Watch', 'Rare', '⌚', 3630],
  ['Jade Idol', 'Epic', '🗿', 28700],
  ['Royal Crown', 'Epic', '👑', 75300],
  ['Viking Helmet', 'Epic', '⛑️', 37800],
  ['War Drum', 'Epic', '🥁', 25000],
  ['Dragon Egg', 'Epic', '🥚', 99200],
  ['Magic Lamp', 'Epic', '🪔', 57200],
  ['Siren Harp', 'Epic', '🪕', 43400],
  ['Pirate Flag', 'Epic', '🏴‍☠️', 32900],
  ['Moon Mask', 'Epic', '🎭', 49800],
  ['Thunder Hammer', 'Epic', '🔨', 86400],
  ['Golden Chalice', 'Epic', '🏆', 65600],
  ['Emerald', 'Epic', '🟢', 150000],
  ['Porcelain Vase', 'Epic', '🏺', 114000],
  ['Amethyst', 'Epic', '🟣', 131000],
  ['Phoenix Feather', 'Legendary', '🔥', 300000],
  ['Excalibur', 'Celestial', '🗡️', 40000000],
  ['Star Fragment', 'Legendary', '🌟', 647000],
  ['Kraken Eye', 'Legendary', '👁️', 1080000],
  ['Titan Gauntlet', 'Legendary', '🥊', 388000],
  ['Sun Medallion', 'Legendary', '🌞', 501000],
  ['Frost Crown', 'Legendary', '❄️', 1800000],
  ['Ancient Dragon Skull', 'Celestial', '🐉', 54300000],
  ['Time Crystal', 'Mythic', '🕰️', 5410000],
  ['Void Orb', 'Celestial', '⚫', 73700000],
  ['Rainbow Diamond', 'Celestial', '🌈', 250000000],
  ['Astral Blade', 'Celestial', '⚔️', 100000000],
  ['Celestial Harp', 'Mythic', '🎶', 12900000],
  ['Golden Rocket', 'Divine', '🚀', 393000000],
  ['Cosmic Cube', 'Divine', '🧊', 624000000],
  ['Infinity Gem', 'Divine', '♾️', 441000000],
  ['Griffin Claw', 'Legendary', '🦅', 835000],
  ['Storm Crown', 'Legendary', '⚡', 1390000],
  ['Obsidian Throne', 'Mythic', '🪑', 8370000],
  ['Phoenix Heart', 'Mythic', '❤️‍🔥', 20000000],
  ['Dream Catcher', 'Mythic', '🕸️', 3500000],
  ['Galaxy Pearl', 'Celestial', '🪐', 184000000],
  ['Aurora Veil', 'Celestial', '🌌', 136000000],
  ['Genesis Seed', 'Divine', '🌱', 495000000],
  ['Eternity Clock', 'Divine', '⏳', 556000000],
  ['Creator Crown', 'Divine', '🔱', 350000000],
  ['Omega Star', 'Divine', '✨', 700000000],
]

// Drop rules (lootDrops.js). The further down the lane (higher luck band), the more items a dug-up
// spot holds and the higher their rarity; band 0 (x1) only ever drops Common + Uncommon.
//   maxItems items per spot in the last band (1 in the first, rising evenly)
//   bonus    chance of a lucky one-tier upgrade on each item (the last band is already the top tier)
//   fullAt   band index (0 = x1) from which every spot drops loot (lower bands drop with a rising chance)
export const LUCK_LOOT = { fullAt: 4, maxItems: 4, bonus: 0.1 }
// The x1 band drops a fixed plan: `piles` spots spread evenly over it, `uncommon` of them Uncommon, the rest Common.
export const X1_DROPS = { piles: 24, uncommon: 6 }
export const LOOT_PICKUP_RANGE = 2.4 // metres, player to the item

// Rarity tiers in order, lowest to highest.
export const RARITIES = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic', 'Secret', 'Celestial', 'Divine']

// Every collectable shown in the Index window: [name, rarity, glyph].
export const ITEM_CATALOG = [
  ['Rock', 'Common', '🪨'],
  ['Coal', 'Common', '⚫'],
  ['Coin', 'Common', '🪙'],
  ['Bone', 'Common', '🦴'],
  ['Skull', 'Common', '💀'],
  ['Mushroom', 'Common', '🍄'],
  ['Iron Bar', 'Uncommon', '🔩'],
  ['Gem', 'Uncommon', '💎'],
  ['Beaded Bracelet', 'Uncommon', '📿'],
  ['Brass Bell', 'Uncommon', '🔔'],
  ['Anchor', 'Uncommon', '⚓'],
  ['Binoculars', 'Uncommon', '🔭'],
  ...EXTRA_ITEMS.map(([name, rarity, glyph]) => [name, rarity, glyph]),
].sort((a, b) => RARITIES.indexOf(a[1]) - RARITIES.indexOf(b[1])) // stable: keeps insertion order within a tier

// Per-item reference: name -> { rarity, value in $ }.
export const ITEM_INFO = {
  Rock: { rarity: 'Common', value: 10 },
  Coal: { rarity: 'Common', value: 12 },
  Bone: { rarity: 'Common', value: 16 },
  Skull: { rarity: 'Common', value: 18 },
  Mushroom: { rarity: 'Common', value: 20 },
  Coin: { rarity: 'Common', value: 14 },
  'Iron Bar': { rarity: 'Uncommon', value: 79 },
  Anchor: { rarity: 'Uncommon', value: 142 },
  Gem: { rarity: 'Uncommon', value: 95 },
  'Beaded Bracelet': { rarity: 'Uncommon', value: 111 },
  'Brass Bell': { rarity: 'Uncommon', value: 126 },
  Binoculars: { rarity: 'Uncommon', value: 158 },
  ...Object.fromEntries(EXTRA_ITEMS.map(([name, rarity, , value]) => [name, { rarity, value }])),
}

// Sell Treasure row background per rarity tier (common = lavender, uncommon = green, ...).
export const RARITY_ROW_BG = {
  Common: '#a2a9e0',
  Uncommon: '#6ccb55',
  Rare: '#4aa6ff',
  Epic: '#c95cff',
  Legendary: '#ffb020',
  Mythic: '#ff5a7a',
  Secret: '#9fe8ff',
  Celestial: '#8a5cf0',
  Divine: '#ffe98a',
}

// Name / halo colours per rarity tier.
export const RARITY = {
  Common: { fill: '#c9c9c9', glow: '#ffffff' },
  Uncommon: { fill: '#4dff3a', glow: '#7dffd0' },
  Rare: { fill: '#2fa8ff', glow: '#7fd0ff' },
  Epic: { fill: '#e43bff', glow: '#d84aff' },
  Legendary: { fill: '#ffb020', glow: '#ffd36a' },
  Mythic: { fill: '#ff4a6a', glow: '#ff8aa0' },
  Secret: { fill: '#9fe8ff', glow: '#d0f4ff' },
  Celestial: { fill: '#7a3df0', glow: '#b48aff' },
  Divine: { fill: '#fff2a0', glow: '#fff8d0' },
}
