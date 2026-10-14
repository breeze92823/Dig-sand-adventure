import { defineConfig } from 'vite'

// src/lootModels.jsx is JSX that builds plain three.js objects through h() in src/r3f.js.
export default defineConfig({
  esbuild: { jsxFactory: '__h', jsxFragment: 'Fragment' },
})
