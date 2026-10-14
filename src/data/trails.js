// Trails sold at the Trails stall. `mult` multiplies Training strength gains while equipped.
// cost 0 = free reward. Every trail is bought with $ (no gem purchases).
// Colours: [body light, body dark, row bg a, row bg b].
export const TRAILS = [
  { id: 'sand', name: 'Sand Trail', mult: 1.25, cost: 0, colors: ['#ffe3b0', '#f0a548', '#8a6a48', '#6d523a'] },
  { id: 'green', name: 'Green Trail', mult: 1.25, cost: 16e3, colors: ['#9bff7a', '#22b83c', '#3fd24a', '#26a838'] },
  { id: 'blue', name: 'Blue Trail', mult: 1.5, cost: 82e3, colors: ['#9fe0ff', '#2a7cf0', '#4a9bff', '#2f6fe0'] },
  { id: 'goldensand', name: 'Golden Sand Trail', mult: 1.75, cost: 200e3, colors: ['#fff1a0', '#f0a010', '#8a6a48', '#6d523a'] },
  { id: 'lunarsand', name: 'Lunar Sand Trail', mult: 2, cost: 350e3, colors: ['#eaf4ff', '#8ab4f0', '#8a6a48', '#6d523a'] },
  { id: 'purple', name: 'Purple Trail', mult: 2, cost: 564e3, colors: ['#e2b0ff', '#8a3cdc', '#a35cf0', '#7a34c8'] },
  { id: 'red', name: 'Red Trail', mult: 2.5, cost: 2.5e6, colors: ['#ffb0a0', '#e0302a', '#f0504a', '#c02420'] },
  { id: 'yellow', name: 'Yellow Trail', mult: 3, cost: 8.8e6, colors: ['#fff7a0', '#f0c010', '#ffe03a', '#d8b820'] },
  { id: 'orange', name: 'Orange Trail', mult: 3.5, cost: 28.5e6, colors: ['#ffd0a0', '#f07a10', '#ffa850', '#f08a10'] },
  { id: 'teal', name: 'Teal Trail', mult: 4, cost: 240e6, colors: ['#b0ffe8', '#1cb8a0', '#4ae0f8', '#20c0e0'] },
  { id: 'magenta', name: 'Magenta Trail', mult: 4.5, cost: 1.85e9, colors: ['#ffb0e0', '#e83cb0', '#d85cf8', '#b080f0'] },
  { id: 'crimson', name: 'Crimson Trail', mult: 5, cost: 32e9, colors: ['#ff9090', '#c01418', '#ff5a5a', '#d84040'] },
  { id: 'violet', name: 'Violet Trail', mult: 5.5, cost: 280e9, colors: ['#e0a0ff', '#7a24c8', '#a860f8', '#9a78f0'] },
  { id: 'cyan', name: 'Cyan Trail', mult: 6, cost: 2.1e12, colors: ['#c8f4ff', '#28b0e8', '#4af0ff', '#30d0f0'] },
  { id: 'onyx', name: 'Onyx Trail', mult: 6.5, cost: 16e12, colors: ['#8a8a96', '#1a1a22', '#8a8a8a', '#b8b8b8'] },
]
export const TRAILS_BY_ID = Object.fromEntries(TRAILS.map((t) => [t.id, t]))
