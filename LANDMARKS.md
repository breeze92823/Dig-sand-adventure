# Dig Sand Adventure: Landmarks Map

Axes: **+X east, +Z south, +Y up** (metres). North (-Z) is where the dig lane runs to the sea. Coordinates come from `src/hub.js` and `src/config.js` (`HUB`, `SPAWN`).

## Overview (top-down, not to scale)

```
                              N (-Z)
                      ~~~~~~~~ OPEN SEA ~~~~~~~~
                      z=-246  BEACH LINE
          +--------+                         +--------+
          | cliff  |   x3 Luck  (z -130..-162)| cliff  |
          | terrace|   x2 Luck  (z  -80..-130)| terrace|
          | steps  |   x1 Luck  (z  -14.. -80)| steps  |
          |        |        DIG LANE          |        |
          |        |        (x -13..13)       |        |
 z=-14    +--------+--+---------------------+-+--------+
          | Quest Drill  Portal              |
 W (-X)   | (-24,-11)    (10,-10)            |  Training Area       E (+X)
  +-------+-------------------------------+--+------------------+
  |LEADER-|  Sell Loot            Digging |  |  pay pads        |
  |BOARDS |  (-27.5,3)   * SPAWN   Tools  |  |  (32..38,-6..0)  |
  |platf. |              (0,4)  (27.5,3) |  |  purple 1000x    |
  |boards |            Shovel             |  |  stage (37,8)    |
  |(-44,  |            showcase (0,8)     |  |                  |
  | 8.5/  |                               |  |  rebirth pads    |
  | 15.5) |  Trails                Upgrades  |  (31..40,17..24) |
  |       |  (-27.5,24)          (27.5,24)|  |                  |
  |Worlds |    PICNIC RUG + STANDS        |  |                  |
  |(-45,  |    x -20..10, z 22..32        |  | benches (17,24)  |
  | 31.5) |                               |  | pink strip 13..28|
  +-------+-------------------------------+--+------------------+
                      S (-> +Z)  chequered cliff wall, z = 34
```

## Plaza (x -50..50, z -14..34)

Stud-tile floor, walled by grass-capped orange cliffs on the east, west and south. The south wall has a chequered middle. Grey outline strips mark the courts.

| Landmark | Position (x, z) | Notes |
|---|---|---|
| **Spawn** | (0, 4) | Player starts here, facing north (-Z) |
| **Shovel showcase** | (0, 8) | Shovel FX display (`shovelFx.js`) |
| **Sell Loot** stall | (-27.5, 3) | Yellow, on a glowing yellow pad at (-23, 3) |
| **Digging Tools** stall | (27.5, 3) | Green, on a glowing green pad at (23, 3) |
| **Trails** stall | (-27.5, 24) | Pink, on a glowing pink pad at (-23, 24) |
| **Upgrades** stall | (27.5, 24) | Blue, on a glowing cyan pad at (23, 24) |
| **Limited-time Quests** drill | (-24, -11) | Hovering yellow drill in an orange barricade pen, with countdown, progress sign and sand motes |
| **Swirl Portal** | (10, -10) | Blue rotating frame with a swirl shader and a "+300% Strength" label |

## West side: Leaderboards and Worlds

| Landmark | Position | Notes |
|---|---|---|
| **Leaderboards platform** | x -50..-31, z -2..34, 1.6 high | Pink platform against the west wall with a "Leaderboards" banner at (-49.4, 12) |
| Leaderboard board 1 | (-44, 8.5) | Wooden board on blue pillars (blue header) |
| Leaderboard board 2 | (-44, 15.5) | Same, pink header |
| **Stairs** | x -31..-27, z 9.5..18.5 | Grey, 3 steps, between the Sell Loot and Trails stalls |
| **Worlds ring** | (-45, 31.5) | Purple octagon ring on a pad at the platform's south end. It wobbles gently |

## East side: Training Area (x 28..50, z -10..34)

Navy stepped blocks on the east and south edges. The light-blue "Training Area" sign sits on the east wall at (49.35, 13), 7.5 to 11.5 high.

| Landmark | Position (x, z) | Notes |
|---|---|---|
| Pay pad 10x (59) | (32, -6) | Orange |
| Pay pad 25x (169) | (38, -6) | Yellow |
| Pay pad 100x (799) | (32, 0) | Red-pink |
| Pay pad 300x (1699) | (38, 0) | Teal |
| **1000x Strength stage** | (37, 8) | Raised purple stage (x 32..42, z 4.2..11.8) with a violet light beam and motes (3999) |
| Rebirth FREE (1.5x) | (31.5, 17.5) | Cream |
| Rebirth 1 (2x) | (35.5, 17.5) | Orange |
| Rebirth 2 (3x) | (39.5, 17.5) | Pale blue |
| Rebirth 3 (4x) | (33.5, 23.5) | Mint |
| Rebirth 4 (5x) | (37.5, 23.5) | Lilac |
| **Purple-lit stair** | x 42.5..50, z 10..16 | Climbs the navy steps |
| **Pink bench strip** | x 13..28, z 29..34 | Benches at (17, 31.5) and (24, 31.5) |

## South: Picnic Rug and Stands (x -20..10, z 22.5..32)

Pink checker rug with a navy edge strip. Wooden benches sit at (-17, 30.6), (-9.5, 30.9), (-14.5, 26), (-7.5, 25.2) and (2.5, 24.6). Each stand sits on a sand pad with a name, rarity and price sign.

| Stand | Position (x, z) | Rarity | Price |
|---|---|---|---|
| Shooting Star | (-3.5, 28.2) | Mythic | $25K |
| Dragon Egg | (0.8, 28.2) | Mythic | $25K |
| Royal Scepter | (5.2, 28.2) | Legendary | $7.4K |
| Worker Crate | (9, 28.2) | Legendary | $7.4K |

## North: Dig Lane (x -13..13, z -14..-248)

Runs from the plaza's north edge to the beach. Each coloured band marks a luck zone.

| Zone | z range | Colour | Sign |
|---|---|---|---|
| Start | -14 to -80 | Pale sand | **x1 Luck** (0, 7, -42) |
| Zone 2 | -80 to -112 | Gold | **x2 Luck** (0, 8, -96), covers -80 to -130 |
| Zone 2b | -112 to -130 | Amber | (still x2) |
| Zone 3 | -130 to -146 | Orange | **x3 Luck** (0, 9, -138) |
| Zone 3b | -146 to -162 | Red | (still x3) |
| Far lane | -162 to -240 | Pale sand | Runs to the beach at z -246 |

- **Dig spots:** 90 scattered rocks, small gold-banded chests and glowing gems. The lane mouth stays clear.
- **Loot at the lane mouth** (each with a pickup glow): sand dollar (6, -24), spyglass (-0.5, -26), wooden tankard (-6.5, -23), starfish on the west terraces (about -31, -27).
- **Terraces:** 6 steps each side, 4.4 wide and 1.0 high. They are flanked by two cliff tiers (9.5 and 15 high).
- **Beach umbrellas:** red on the west terrace (z -74), orange on the east terrace (z -118), blue on the west lower terrace (z -128).

## Scenery

- **Island:** x -110..110, z up to 46. Open sea all round, with palms along the cliffs and drifting clouds.
- **World bounds:** x -110..110, z -254..46. Falling below y -30 respawns the player.

## Quick distance reference (from spawn at 0, 4)

| To | Approx. distance |
|---|---|
| Shovel showcase | 4 m |
| Portal | 16 m |
| Sell Loot / Digging Tools | 28 m |
| Picnic stands | 25 m |
| Lane mouth loot | 28 m |
| Training Area pads | 35 to 40 m |
| x1 Luck sign | 46 m |
| x3 Luck sign | 142 m |
| Beach | 250 m |
