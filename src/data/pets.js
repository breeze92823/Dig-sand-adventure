// Egg catalog. Eggs are paid for with $ (player.money). Each pet's `power` is added to the pet
// multiplier while equipped (pets.js: 1 + the sum), which scales strength gains and sell payouts.
//   chance — weight of the roll, percentages summing to 100 per egg
//   id     — stable slug (follower models, saves)
export const EGGS = {
  starter: {
    name: 'Starter Egg',
    cost: 400,
    colors: ['#ffe08a', '#ff9a3a'],
    pets: [
      { id: 'piggy', name: 'Piggy', emoji: '🐷', tint: '#ff9ec7', chance: 45, rarity: 'Common', power: 0.1 },
      { id: 'cat', name: 'Cat', emoji: '🐱', tint: '#b9b9c2', chance: 30, rarity: 'Uncommon', power: 0.2 },
      { id: 'bunny', name: 'Bunny', emoji: '🐰', tint: '#f4ecec', chance: 17, rarity: 'Rare', power: 0.4 },
      { id: 'fox', name: 'Fox', emoji: '🦊', tint: '#ff8a2a', chance: 7.5, rarity: 'Epic', power: 1 },
      { id: 'dragon', name: 'Dragon', emoji: '🐲', tint: '#4fd06a', chance: 0.5, rarity: 'Legendary', power: 3 },
    ],
  },
  // Priced ~15x / ~225x the Starter Egg; the pets' power scales up by about the same step.
  forest: {
    name: 'Forest Egg',
    cost: 6000,
    colors: ['#9be37a', '#2f9c4a'],
    pets: [
      { id: 'frog', name: 'Frog', emoji: '🐸', tint: '#5fd05a', chance: 45, rarity: 'Common', power: 0.5 },
      { id: 'panda', name: 'Panda', emoji: '🐼', tint: '#f2f2f2', chance: 30, rarity: 'Uncommon', power: 1 },
      { id: 'wolf', name: 'Wolf', emoji: '🐺', tint: '#8d93a0', chance: 17, rarity: 'Rare', power: 2 },
      { id: 'owl', name: 'Owl', emoji: '🦉', tint: '#b07a4a', chance: 7.5, rarity: 'Epic', power: 5 },
      { id: 'unicorn', name: 'Unicorn', emoji: '🦄', tint: '#ffd6f2', chance: 0.5, rarity: 'Legendary', power: 14 },
    ],
  },
  galaxy: {
    name: 'Galaxy Egg',
    cost: 90000,
    colors: ['#7a5cff', '#2a1a7a'],
    pets: [
      { id: 'koala', name: 'Koala', emoji: '🐨', tint: '#a5a8b8', chance: 45, rarity: 'Common', power: 8 },
      { id: 'tiger', name: 'Tiger', emoji: '🐯', tint: '#ffa23a', chance: 30, rarity: 'Uncommon', power: 16 },
      { id: 'lion', name: 'Lion', emoji: '🦁', tint: '#f0b44a', chance: 17, rarity: 'Rare', power: 32 },
      { id: 'phoenix', name: 'Phoenix', emoji: '🦅', tint: '#ff5a2a', chance: 7.5, rarity: 'Epic', power: 75 },
      { id: 'nebula', name: 'Nebula Dragon', emoji: '🐉', tint: '#9a6cff', chance: 0.5, rarity: 'Legendary', power: 200 },
    ],
  },
}

// Every pet by id, with the egg it hatches from.
export const PETS_BY_ID = Object.fromEntries(
  Object.entries(EGGS).flatMap(([egg, e]) => e.pets.map((p) => [p.id, { ...p, egg }])),
)
