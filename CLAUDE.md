# Dig Sand Adventure

Three.js (vanilla) + Vite. Foundation ported from `C:\ThreeJS\Clean-leaves-for-loot\Clean-leaves-for-loot` (the reference repo): sand ground, procedural textures/materials, lighting, Bloxity SDK + avatar, loading screen. No digging gameplay yet.

- `npm run dev` / `npm run build`. `VITE_DEV_MODE=true` (see `.env.example`) skips the Bloxity SDK/CDN and our loading overlay.
- All tunables live in `src/config.js` (colors, light, fog, camera, physics, rig/proportions, `ANIM`, `MATERIAL_PBR`).
- `src/textures.js`: canvas painters (`sandTile`, `rockTile`, `sandMacro`), tileable, cached, seeded. `src/world.js`: ground (colour + bump map + non-repeating macro overlay), rocks, gradient sky with sun glow (recentred on the camera each frame), hemisphere + shadow-casting sun (follow point snapped to shadow texels), fog.
- `src/player.js` player singleton + movement; `floorAt` is the single floor lookup (flat now; sample dune/hole height here). `src/camera.js` chase cam. `src/input.js` WASD/arrows, Space, mouse look (pointer lock), wheel zoom, Esc = portal menu.
- `src/bloxity.js` is the only place that touches the SDK and must never throw (SDK may be blocked). `src/avatar/`: `character.js` (player.glb base rig + procedural fallback), `loader.js` (equipped skin/parts/hats from the CDN, SDK proportions), `cdn.js`, `rig.js` + `animator.js` (procedural idle/run/air/land).
- `src/loading.js` + `loading.css`: steps `scene` / `auth` / `avatar` (`markLoaded`). With the SDK present the portal's overlay is used and fed step text; otherwise our sand-themed overlay shows. Optional logo at `public/ui/logo.png`.
