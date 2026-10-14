// The tutorial's step machine, free of game imports so it can be unit-tested (tutorial.js feeds it the live
// numbers each frame). Steps:
//   0 walk to the dig lane            1 dig a cell                    2 dig until loot comes up
//   3 pick the loot up (E / tap)      4 walk to the Sell Loot pad     5 sell the bag
//   6 walk to a training pad          7 train there a few seconds     8 walk to Digging Tools
//   9 buy + equip a better shovel     10 dig again with it            `done` = finished.
//
// c = { inLane, dugNew, bag, hasLoot, sold, atSell, sellOpen, padOn, trained, shopOpen, canBuy, hasNew, done }
//   dugNew: a cell was dug through since the step began; bag: items carried; hasLoot: a freed item lies in
//   the lane; sold: the bag was sold since the loot step; trained: enough time spent on a pad; canBuy: $ covers
//   the next shovel; hasNew: a shovel other than the starter is equipped.
// Returns the step to be on now (it may go back, e.g. when the player leaves the pad).
export function nextStep(step, c) {
  if (step >= c.done) return step
  switch (step) {
    case 0:
      return c.inLane ? 1 : 0
    case 1:
      if (!c.inLane) return 0
      return c.dugNew ? 2 : 1
    case 2:
      if (c.bag > 0) return 4
      if (c.hasLoot) return 3
      return c.inLane ? 2 : 0
    case 3:
      if (c.bag > 0) return 4
      if (!c.hasLoot) return c.inLane ? 2 : 0
      return 3
    case 4:
      if (c.sold) return 6
      if (c.bag === 0) return 2
      return c.atSell ? 5 : 4
    case 5:
      if (c.sold) return 6
      if (c.sellOpen) return 5
      if (c.bag === 0) return 2
      return c.atSell ? 5 : 4
    case 6:
    case 7:
      if (c.trained) return 8
      return c.padOn ? 7 : 6
    case 8:
      if (c.hasNew) return 10
      return c.shopOpen && c.canBuy ? 9 : 8
    case 9:
      if (c.hasNew) return 10
      return c.shopOpen ? 9 : 8
    case 10:
      return c.dugNew ? c.done : 10
    default:
      return step
  }
}
