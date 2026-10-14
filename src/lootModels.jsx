import { DoubleSide, Quaternion, Vector2, Vector3 } from 'three'
import { h as __h, Fragment, useRef, useFrame, plastic, canvasTexture } from './r3f.js'

// 3D models for every loot item, ported from Lift-rock-for-treasure
// (components/world/LootItems.jsx). Each rests on y=0 and is 0.6-1.2 m across.
// MODELS maps item name -> component; rarity colours live in data/loot.js.

const UP = new Vector3(0, 1, 0)

// Flattened blob stuck to the surface of a sphere of radius `r`, facing
// outward along `dir`. Used for coal patches and mushroom spots.
function Spot({ dir, r, size, mat, flat = 0.35, sx = 1 }) {
  const n = new Vector3(...dir).normalize()
  const q = new Quaternion().setFromUnitVectors(UP, n)
  const p = n.clone().multiplyScalar(r)
  return (
    <mesh position={p.toArray()} quaternion={q} scale={[sx, flat, 1]} material={mat}>
      <sphereGeometry args={[size, 12, 8]} />
    </mesh>
  )
}

const COAL_PATCHES = [
  { dir: [0.6, 0.55, 0.6], size: 0.2, sx: 1.2 },
  { dir: [-0.7, 0.4, 0.5], size: 0.17 },
  { dir: [0.1, 0.95, -0.2], size: 0.16 },
  { dir: [-0.3, 0.3, -0.9], size: 0.22, sx: 1.3 },
  { dir: [0.9, 0.25, -0.35], size: 0.14 },
  { dir: [-0.15, 0.1, 1], size: 0.13 },
  { dir: [0.35, 0.9, 0.35], size: 0.11 },
]

function Coal() {
  const rock = plastic('#b4b6c6', { flatShading: true })
  const rock2 = plastic('#a3a5b6', { flatShading: true })
  const black = plastic('#0d0d12', { roughness: 0.4 })
  const shine = plastic('#e8eaf4', { flatShading: true })
  return (
    <group position={[0, 0.42, 0]}>
      <mesh scale={[1.05, 0.82, 0.92]} material={rock}>
        <icosahedronGeometry args={[0.55, 1]} />
      </mesh>
      <mesh position={[-0.38, -0.12, 0.2]} scale={[1, 0.8, 1]} material={rock2}>
        <dodecahedronGeometry args={[0.3, 0]} />
      </mesh>
      <mesh position={[0.35, -0.15, 0.28]} material={rock2}>
        <dodecahedronGeometry args={[0.24, 0]} />
      </mesh>
      <mesh position={[0.05, 0.38, -0.15]} rotation={[0.4, 0.8, 0]} material={shine}>
        <dodecahedronGeometry args={[0.2, 0]} />
      </mesh>
      {COAL_PATCHES.map((p, i) => (
        <Spot key={i} r={0.5} mat={black} {...p} />
      ))}
    </group>
  )
}

function Rock() {
  const stone = plastic('#8f8d88', { flatShading: true })
  const dark = plastic('#76746f', { flatShading: true })
  const light = plastic('#aaa8a1', { flatShading: true })
  return (
    <group position={[0, 0.34, 0]} rotation-y={0.5}>
      <mesh scale={[1.15, 0.7, 0.9]} material={stone}>
        <dodecahedronGeometry args={[0.5, 0]} />
      </mesh>
      <mesh position={[-0.42, -0.14, 0.22]} scale={[1, 0.75, 1]} material={dark}>
        <dodecahedronGeometry args={[0.24, 0]} />
      </mesh>
      <mesh position={[0.4, -0.16, 0.2]} material={dark}>
        <dodecahedronGeometry args={[0.18, 0]} />
      </mesh>
      <mesh position={[0.05, 0.28, -0.12]} rotation={[0.4, 0.7, 0]} material={light}>
        <dodecahedronGeometry args={[0.17, 0]} />
      </mesh>
    </group>
  )
}

function Bone() {
  const bone = plastic('#f4f1e4')
  const shade = plastic('#d9d4bf')
  return (
    <group position={[0, 0.17, 0]} rotation-y={0.6}>
      <mesh rotation-z={Math.PI / 2} material={bone}>
        <cylinderGeometry args={[0.09, 0.09, 1.1, 12]} />
      </mesh>
      {/* Thicker middle ridge, darker flared necks and the paired knobs. */}
      <mesh rotation-z={Math.PI / 2} material={shade}>
        <cylinderGeometry args={[0.1, 0.1, 0.5, 12]} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.58, 0, 0]}>
          <mesh position={[-s * 0.1, 0, 0]} rotation-z={(s * Math.PI) / 2} material={bone}>
            <coneGeometry args={[0.16, 0.22, 12]} />
          </mesh>
          {[-1, 1].map((t) => (
            <mesh key={t} position={[s * 0.04, 0.02, t * 0.13]} material={bone}>
              <sphereGeometry args={[0.15, 14, 10]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

function Skull() {
  const bone = plastic('#e4f1cb')
  const shade = plastic('#c4d3a8')
  const dark = plastic('#101216', { roughness: 0.5 })
  return (
    <group position={[0, 0.02, 0]} rotation-y={0.2}>
      <mesh position={[0, 0.62, 0]} scale={[1, 0.95, 1.08]} material={bone}>
        <sphereGeometry args={[0.45, 22, 16]} />
      </mesh>
      {/* Cheekbones and upper jaw */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.3, 0.42, 0.25]} material={bone}>
          <sphereGeometry args={[0.14, 12, 10]} />
        </mesh>
      ))}
      <mesh position={[0, 0.33, 0.2]} material={bone}>
        <boxGeometry args={[0.48, 0.2, 0.36]} />
      </mesh>
      {/* Eye sockets with a shaded rim */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.19, 0.58, 0.38]}>
          <mesh material={shade}>
            <sphereGeometry args={[0.15, 14, 10]} />
          </mesh>
          <mesh position={[0, 0, 0.04]} material={dark}>
            <sphereGeometry args={[0.12, 14, 10]} />
          </mesh>
        </group>
      ))}
      {/* Nose cavity */}
      <mesh position={[0, 0.42, 0.44]} rotation-x={Math.PI / 2 + 0.2} material={dark}>
        <coneGeometry args={[0.07, 0.14, 3]} />
      </mesh>
      {/* Upper teeth */}
      {[-0.17, -0.085, 0, 0.085, 0.17].map((x) => (
        <mesh key={x} position={[x, 0.2, 0.36]} material={plastic('#fbfff0')}>
          <boxGeometry args={[0.07, 0.1, 0.06]} />
        </mesh>
      ))}
      {/* Lower jaw */}
      <mesh position={[0, 0.1, 0.17]} material={bone}>
        <boxGeometry args={[0.4, 0.16, 0.3]} />
      </mesh>
      {[-0.14, -0.07, 0, 0.07, 0.14].map((x) => (
        <mesh key={x} position={[x, 0.2, 0.3]} material={plastic('#fbfff0')}>
          <boxGeometry args={[0.06, 0.08, 0.05]} />
        </mesh>
      ))}
    </group>
  )
}

const MUSHROOM_SPOTS = [
  { dir: [0, 1, 0], size: 0.15 },
  { dir: [0.75, 0.65, 0.25], size: 0.12 },
  { dir: [-0.7, 0.6, 0.45], size: 0.13 },
  { dir: [0.15, 0.6, -0.85], size: 0.12 },
  { dir: [0.55, 0.45, -0.7], size: 0.09 },
  { dir: [-0.5, 0.5, -0.7], size: 0.1 },
  { dir: [0.35, 0.8, 0.5], size: 0.08 },
]

function Mushroom() {
  const cap = plastic('#e51c28', { roughness: 0.55 })
  const white = plastic('#fffdf5')
  const cream = plastic('#f1dfbf')
  return (
    <group scale={1.1}>
      {/* Stem: flared foot, tapered neck, ring skirt */}
      <mesh position={[0, 0.07, 0]} material={cream}>
        <cylinderGeometry args={[0.2, 0.3, 0.14, 16]} />
      </mesh>
      <mesh position={[0, 0.3, 0]} material={cream}>
        <cylinderGeometry args={[0.15, 0.2, 0.34, 16]} />
      </mesh>
      <mesh position={[0, 0.34, 0]} material={white}>
        <cylinderGeometry args={[0.24, 0.17, 0.07, 16]} />
      </mesh>
      {/* Gills under the cap */}
      <mesh position={[0, 0.47, 0]} rotation-x={Math.PI} material={plastic('#d9c298')}>
        <circleGeometry args={[0.5, 24]} />
      </mesh>
      {/* Cap dome */}
      <group position={[0, 0.47, 0]}>
        <mesh scale={[1, 0.85, 1]} material={cap}>
          <sphereGeometry args={[0.52, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
        <mesh position={[0, 0.02, 0]} rotation-x={Math.PI / 2} material={cap}>
          <torusGeometry args={[0.5, 0.03, 8, 28]} />
        </mesh>
        <group scale={[1, 0.85, 1]}>
          {MUSHROOM_SPOTS.map((s, i) => (
            <Spot key={i} r={0.525} mat={white} flat={0.3} {...s} />
          ))}
        </group>
      </group>
    </group>
  )
}

function Anchor() {
  const steel = plastic('#7f95ab', { roughness: 0.35, metalness: 0.45 })
  const dark = plastic('#566b80', { roughness: 0.4, metalness: 0.45 })
  const rope = plastic('#c9a15a')
  return (
    <group position={[0, 0.1, 0]} rotation-y={0.4}>
      {/* Shank */}
      <mesh position={[0, 0.78, 0]} material={steel}>
        <cylinderGeometry args={[0.065, 0.085, 1.3, 10]} />
      </mesh>
      {/* Ring at the top with a rope loop through it */}
      <mesh position={[0, 1.55, 0]} material={steel}>
        <torusGeometry args={[0.13, 0.04, 8, 16]} />
      </mesh>
      <mesh position={[0.02, 1.7, 0]} rotation-y={Math.PI / 2} material={rope}>
        <torusGeometry args={[0.1, 0.03, 8, 14]} />
      </mesh>
      {/* Stock: crossbar with ball ends and a collar */}
      <mesh position={[0, 1.2, 0]} rotation-z={Math.PI / 2} material={dark}>
        <cylinderGeometry args={[0.05, 0.05, 0.75, 10]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.38, 1.2, 0]} material={dark}>
          <sphereGeometry args={[0.08, 10, 8]} />
        </mesh>
      ))}
      <mesh position={[0, 1.2, 0]} material={steel}>
        <sphereGeometry args={[0.11, 12, 10]} />
      </mesh>
      {/* Crown arc */}
      <mesh position={[0, 0.5, 0]} rotation-z={Math.PI} material={steel}>
        <torusGeometry args={[0.5, 0.07, 10, 28, Math.PI]} />
      </mesh>
      {/* Flukes: pointed palms at each arm tip */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.5, 0.52, 0]} rotation-z={-s * 0.55}>
          <mesh position={[0, 0.02, 0]} scale={[1, 1, 0.45]} material={dark}>
            <coneGeometry args={[0.2, 0.36, 3]} />
          </mesh>
        </group>
      ))}
      {/* Ground contact: crown bulge */}
      <mesh position={[0, 0.0, 0]} material={steel}>
        <sphereGeometry args={[0.09, 10, 8]} />
      </mesh>
    </group>
  )
}

function Gem() {
  const glass = { emissive: '#00b8d9', emissiveIntensity: 0.45, roughness: 0.15, metalness: 0.1, flatShading: true }
  const body = plastic('#19e0ff', glass)
  const light = plastic('#8ff3ff', { ...glass, emissiveIntensity: 0.7 })
  return (
    <group position={[0, 0.02, 0]} rotation-y={0.5}>
      {/* Pavilion (point down), girdle, crown and flat table */}
      <mesh position={[0, 0.3, 0]} rotation-x={Math.PI} material={body}>
        <cylinderGeometry args={[0.55, 0.04, 0.6, 8]} />
      </mesh>
      <mesh position={[0, 0.66, 0]} material={body}>
        <cylinderGeometry args={[0.55, 0.55, 0.12, 8]} />
      </mesh>
      <mesh position={[0, 0.86, 0]} material={light}>
        <cylinderGeometry args={[0.3, 0.55, 0.28, 8]} />
      </mesh>
      <mesh position={[0, 1.0, 0]} rotation-x={-Math.PI / 2} material={plastic('#d5fbff', { emissive: '#7fe9ff', emissiveIntensity: 0.8 })}>
        <circleGeometry args={[0.3, 8]} />
      </mesh>
      {/* Small loose shards */}
      {[
        [0.75, 0.12, 0.3, 0.8],
        [-0.7, 0.1, -0.35, -0.6],
        [0.55, 0.09, -0.6, 0.3],
      ].map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[0.5, r, 0.4]} material={body}>
          <octahedronGeometry args={[0.11 - i * 0.015, 0]} />
        </mesh>
      ))}
    </group>
  )
}

const BEAD_COLORS = ['#e8941f', '#7a3d12', '#d9b050', '#b5561c', '#4a2a14']
const BEADS = 22
function Bracelet() {
  return (
    <group position={[0, 0.1, 0]}>
      <mesh rotation-x={Math.PI / 2} material={plastic('#2a1a10')}>
        <torusGeometry args={[0.5, 0.025, 6, 32]} />
      </mesh>
      {Array.from({ length: BEADS }, (_, i) => {
        const a = (i / BEADS) * Math.PI * 2
        const big = i % 5 === 0
        const r = big ? 0.13 : 0.085 + 0.02 * Math.sin(i * 2.3)
        return (
          <mesh key={i} position={[Math.cos(a) * 0.5, big ? 0.03 : 0, Math.sin(a) * 0.5]} scale={[1, 0.9, 1]} material={plastic(big ? '#d83a2a' : BEAD_COLORS[i % BEAD_COLORS.length], { roughness: 0.45 })}>
            <sphereGeometry args={[r, 14, 10]} />
          </mesh>
        )
      })}
    </group>
  )
}

function Coin() {
  const gold = plastic('#ffc61a', { roughness: 0.3, metalness: 0.5 })
  const deep = plastic('#e29a0b', { roughness: 0.35, metalness: 0.5 })
  return (
    <group position={[0, 0.5, 0]} rotation-x={Math.PI / 2}>
      <mesh material={gold}>
        <cylinderGeometry args={[0.46, 0.46, 0.09, 28]} />
      </mesh>
      {/* Raised rim, recessed face and a star on each side */}
      <mesh material={deep}>
        <torusGeometry args={[0.46, 0.04, 8, 28]} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s} position={[0, s * 0.047, 0]} rotation-x={s * Math.PI / 2}>
          <mesh material={deep}>
            <circleGeometry args={[0.36, 24]} />
          </mesh>
          <mesh position={[0, 0, 0.005]} rotation-z={Math.PI / 2} material={gold}>
            <cylinderGeometry args={[0.2, 0.2, 0.01, 5]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

const BELL_PROFILE = [
  [0, 0.78], [0.1, 0.77], [0.18, 0.7], [0.24, 0.56], [0.29, 0.4], [0.34, 0.26], [0.42, 0.14], [0.52, 0.02],
].map(([r, y]) => new Vector2(r, y))

function BrassBell() {
  const brass = plastic('#f2b81c', { roughness: 0.28, metalness: 0.6, side: DoubleSide })
  const dark = plastic('#b9810f', { roughness: 0.35, metalness: 0.6 })
  return (
    <group position={[0, 0.05, 0]}>
      <mesh material={brass}>
        <latheGeometry args={[BELL_PROFILE, 28]} />
      </mesh>
      {/* Flared lip, shoulder band, crown loop and clapper */}
      <mesh position={[0, 0.03, 0]} rotation-x={Math.PI / 2} material={dark}>
        <torusGeometry args={[0.51, 0.04, 8, 28]} />
      </mesh>
      <mesh position={[0, 0.5, 0]} rotation-x={Math.PI / 2} material={dark}>
        <torusGeometry args={[0.26, 0.025, 8, 24]} />
      </mesh>
      <mesh position={[0, 0.9, 0]} material={dark}>
        <torusGeometry args={[0.09, 0.03, 8, 16]} />
      </mesh>
      <mesh position={[0, 0.0, 0]} material={dark}>
        <sphereGeometry args={[0.11, 12, 10]} />
      </mesh>
    </group>
  )
}

function Binoculars() {
  const body = plastic('#324f9a', { roughness: 0.5 })
  const dark = plastic('#17254a', { roughness: 0.45 })
  const lens = plastic('#7fd6ff', { emissive: '#2a8fd0', emissiveIntensity: 0.5, roughness: 0.1, metalness: 0.2 })
  return (
    <group position={[0, 0.32, 0]} rotation-y={0.3}>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.24, 0, 0]}>
          {/* Barrel along Z: objective bell at the front, eyepiece at the back */}
          <mesh rotation-x={Math.PI / 2} material={body}>
            <cylinderGeometry args={[0.15, 0.17, 0.8, 16]} />
          </mesh>
          <mesh position={[0, 0, 0.5]} rotation-x={Math.PI / 2} material={body}>
            <cylinderGeometry args={[0.24, 0.17, 0.26, 16]} />
          </mesh>
          <mesh position={[0, 0, 0.64]} rotation-x={Math.PI / 2} material={dark}>
            <cylinderGeometry args={[0.25, 0.25, 0.04, 16]} />
          </mesh>
          <mesh position={[0, 0, 0.665]} rotation-x={Math.PI / 2} material={lens}>
            <cylinderGeometry args={[0.2, 0.2, 0.02, 16]} />
          </mesh>
          <mesh position={[0, 0, -0.48]} rotation-x={Math.PI / 2} material={dark}>
            <cylinderGeometry args={[0.13, 0.15, 0.18, 14]} />
          </mesh>
          <mesh position={[0, 0.17, 0.1]} material={dark}>
            <boxGeometry args={[0.12, 0.05, 0.2]} />
          </mesh>
        </group>
      ))}
      {/* Hinge bridge and focus wheel */}
      <mesh position={[0, 0, 0.05]} material={dark}>
        <boxGeometry args={[0.3, 0.1, 0.34]} />
      </mesh>
      <mesh position={[0, 0.07, 0.05]} rotation-z={Math.PI / 2} material={body}>
        <cylinderGeometry args={[0.07, 0.07, 0.16, 12]} />
      </mesh>
    </group>
  )
}

function IronBar() {
  const iron = plastic('#eceff5', { roughness: 0.4, metalness: 0.35 })
  const shade = plastic('#c7ccd8', { roughness: 0.45, metalness: 0.35 })
  return (
    <group position={[0, 0.2, 0]} rotation-y={0.5}>
      <mesh material={iron}>
        <boxGeometry args={[0.46, 0.3, 1.2]} />
      </mesh>
      {/* Bevelled top and end caps, stamped groove along the top */}
      <mesh position={[0, 0.17, 0]} material={shade}>
        <boxGeometry args={[0.34, 0.06, 1.08]} />
      </mesh>
      <mesh position={[0, 0.205, 0]} material={iron}>
        <boxGeometry args={[0.1, 0.02, 0.8]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, 0, s * 0.61]} material={shade}>
          <boxGeometry args={[0.4, 0.24, 0.04]} />
        </mesh>
      ))}
    </group>
  )
}

function PirateHat() {
  const felt = plastic('#14151a', { roughness: 0.8 })
  const trim = plastic('#d7a62b', { roughness: 0.35, metalness: 0.5 })
  const white = plastic('#f6f4ea')
  return (
    <group position={[0, 0.3, 0]} rotation-x={-0.15}>
      {/* Wide brim and domed crown */}
      <mesh scale={[1.15, 0.2, 0.8]} material={felt}>
        <sphereGeometry args={[0.55, 24, 12]} />
      </mesh>
      <mesh position={[0, 0.12, 0]} scale={[1, 0.8, 0.8]} material={felt}>
        <sphereGeometry args={[0.4, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      {/* Brim turned up on both sides */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.5, 0.1, 0]} rotation-z={-s * 0.6} scale={[0.5, 0.14, 0.72]} material={felt}>
          <sphereGeometry args={[0.4, 16, 10]} />
        </mesh>
      ))}
      {/* Gold edge trim */}
      <mesh position={[0, 0.02, 0]} rotation-x={Math.PI / 2} scale={[1.1, 0.78, 1]} material={trim}>
        <torusGeometry args={[0.56, 0.018, 6, 40]} />
      </mesh>
      {/* Skull and crossbones on the front */}
      <group position={[0, 0.14, 0.34]} rotation-x={0.35}>
        <mesh material={white}>
          <sphereGeometry args={[0.1, 12, 10]} />
        </mesh>
        <mesh position={[0, -0.09, 0]} material={white}>
          <boxGeometry args={[0.09, 0.06, 0.07]} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[0, -0.14, -0.01]} rotation-z={s * 0.7} material={white}>
            <boxGeometry args={[0.3, 0.035, 0.03]} />
          </mesh>
        ))}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.04, 0.01, 0.085]} material={felt}>
            <sphereGeometry args={[0.025, 8, 6]} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

function Anvil() {
  const iron = plastic('#7d8593', { roughness: 0.4, metalness: 0.6 })
  const dark = plastic('#565c68', { roughness: 0.45, metalness: 0.6 })
  const face = plastic('#a9b0bd', { roughness: 0.3, metalness: 0.6 })
  return (
    <group position={[0, 0, 0]} rotation-y={0.4}>
      {/* Foot, waist, hardy block, working face, horn */}
      <mesh position={[0, 0.1, 0]} material={dark}>
        <boxGeometry args={[0.75, 0.2, 0.45]} />
      </mesh>
      <mesh position={[0, 0.33, 0]} scale={[1, 1, 1]} material={iron}>
        <cylinderGeometry args={[0.2, 0.3, 0.3, 4]} />
      </mesh>
      <mesh position={[0, 0.58, 0]} material={iron}>
        <boxGeometry args={[0.8, 0.22, 0.42]} />
      </mesh>
      <mesh position={[0, 0.7, 0]} material={face}>
        <boxGeometry args={[0.8, 0.04, 0.42]} />
      </mesh>
      <mesh position={[0.6, 0.6, 0]} rotation-z={-Math.PI / 2} material={iron}>
        <coneGeometry args={[0.2, 0.46, 12]} />
      </mesh>
      <mesh position={[-0.45, 0.55, 0]} material={dark}>
        <boxGeometry args={[0.12, 0.2, 0.32]} />
      </mesh>
      <mesh position={[-0.2, 0.74, 0.12]} material={dark}>
        <cylinderGeometry args={[0.04, 0.04, 0.06, 8]} />
      </mesh>
    </group>
  )
}

function Dagger() {
  const blade = plastic('#eef3fa', { roughness: 0.18, metalness: 0.75 })
  const edge = plastic('#b8c3d3', { roughness: 0.2, metalness: 0.75 })
  const grip = plastic('#c7222c', { roughness: 0.55 })
  const gold = plastic('#e3ac22', { roughness: 0.3, metalness: 0.6 })
  return (
    <group rotation-z={0.55} position={[0, 0.5, 0]}>
      {/* Tapered blade with a fuller down the middle */}
      <mesh position={[0, 0.55, 0]} scale={[1, 1, 0.22]} material={blade}>
        <coneGeometry args={[0.13, 0.9, 4]} />
      </mesh>
      <mesh position={[0, 0.5, 0]} scale={[0.22, 1, 0.26]} material={edge}>
        <coneGeometry args={[0.13, 0.7, 4]} />
      </mesh>
      {/* Crossguard, wrapped grip, pommel */}
      <mesh position={[0, 0.08, 0]} material={gold}>
        <boxGeometry args={[0.42, 0.06, 0.1]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.21, 0.08, 0]} material={gold}>
          <sphereGeometry args={[0.05, 8, 6]} />
        </mesh>
      ))}
      <mesh position={[0, -0.1, 0]} material={grip}>
        <cylinderGeometry args={[0.04, 0.045, 0.3, 10]} />
      </mesh>
      {[-0.16, -0.1, -0.04].map((y) => (
        <mesh key={y} position={[0, y, 0]} material={gold}>
          <torusGeometry args={[0.046, 0.008, 6, 12]} />
        </mesh>
      ))}
      <mesh position={[0, -0.28, 0]} material={gold}>
        <sphereGeometry args={[0.07, 12, 10]} />
      </mesh>
    </group>
  )
}

function tntLabel() {
  return canvasTexture('loot-tnt-label', 128, 64, (ctx, w, h) => {
    ctx.fillStyle = '#f4efe0'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#b3141b'
    ctx.font = '900 44px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('TNT', w / 2, h / 2 + 2)
  })
}

function TNT() {
  const red = plastic('#d42a2a', { roughness: 0.55 })
  const band = plastic('#d9c28a')
  const fuse = plastic('#3a2a1c')
  const spark = plastic('#ffb020', { emissive: '#ff7a00', emissiveIntensity: 1.2 })
  return (
    <group position={[0, 0.02, 0]} rotation-z={0.1}>
      {[[-0.17, 0.06], [0.17, 0.06], [0, -0.14]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.5, 0]} material={red}>
            <cylinderGeometry args={[0.15, 0.15, 1, 14]} />
          </mesh>
          <mesh position={[0, 1.0, 0]} material={band}>
            <cylinderGeometry args={[0.1, 0.1, 0.03, 12]} />
          </mesh>
        </group>
      ))}
      {/* Twine bands and the label */}
      {[0.25, 0.75].map((y) => (
        <mesh key={y} position={[0, y, 0]} material={band}>
          <cylinderGeometry args={[0.34, 0.34, 0.07, 18]} />
        </mesh>
      ))}
      <mesh position={[0, 0.5, 0.34]}>
        <planeGeometry args={[0.36, 0.2]} />
        <meshStandardMaterial map={tntLabel()} roughness={0.7} />
      </mesh>
      {/* Curled fuse with a spark */}
      <mesh position={[0, 1.14, -0.02]} material={fuse}>
        <cylinderGeometry args={[0.018, 0.018, 0.24, 6]} />
      </mesh>
      <mesh position={[0.08, 1.3, -0.02]} rotation-z={-0.9} material={fuse}>
        <cylinderGeometry args={[0.018, 0.018, 0.2, 6]} />
      </mesh>
      <mesh position={[0.17, 1.38, -0.02]} material={spark}>
        <icosahedronGeometry args={[0.07, 0]} />
      </mesh>
    </group>
  )
}

function Bomb() {
  const iron = plastic('#4b52b8', { roughness: 0.3, metalness: 0.35 })
  const cap = plastic('#2b2f6e', { roughness: 0.4, metalness: 0.4 })
  const shine = plastic('#c8ccff', { roughness: 0.2, emissive: '#8a90ff', emissiveIntensity: 0.4 })
  const fuse = plastic('#3a2a1c')
  const spark = plastic('#ffb020', { emissive: '#ff7a00', emissiveIntensity: 1.2 })
  return (
    <group position={[0, 0.55, 0]}>
      <mesh material={iron}>
        <sphereGeometry args={[0.52, 24, 18]} />
      </mesh>
      <mesh position={[0, 0.52, 0]} material={cap}>
        <cylinderGeometry args={[0.15, 0.19, 0.16, 14]} />
      </mesh>
      <mesh position={[0, 0.62, 0]} rotation-x={Math.PI / 2} material={cap}>
        <torusGeometry args={[0.15, 0.025, 8, 16]} />
      </mesh>
      <mesh position={[0.04, 0.8, 0]} rotation-z={-0.25} material={fuse}>
        <cylinderGeometry args={[0.02, 0.02, 0.3, 6]} />
      </mesh>
      <mesh position={[0.14, 0.98, 0]} material={spark}>
        <icosahedronGeometry args={[0.08, 0]} />
      </mesh>
      {/* Glossy highlight and a band around the middle */}
      <mesh position={[-0.2, 0.25, 0.37]} scale={[1, 0.6, 0.4]} material={shine}>
        <sphereGeometry args={[0.1, 10, 8]} />
      </mesh>
      <mesh rotation-x={Math.PI / 2} material={cap}>
        <torusGeometry args={[0.52, 0.02, 6, 30]} />
      </mesh>
    </group>
  )
}

function Helmet() {
  const copper = plastic('#c9631b', { roughness: 0.35, metalness: 0.55 })
  const dark = plastic('#8f410f', { roughness: 0.4, metalness: 0.55 })
  const gold = plastic('#ffc736', { roughness: 0.3, metalness: 0.6 })
  return (
    <group position={[0, 0.04, 0]} rotation-y={0.5}>
      {/* Dome, rim band and the crest running front to back */}
      <mesh position={[0, 0.12, 0]} scale={[1, 0.95, 1.1]} material={copper}>
        <sphereGeometry args={[0.5, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <mesh position={[0, 0.14, 0]} rotation-x={Math.PI / 2} scale={[1, 1.1, 1]} material={gold}>
        <torusGeometry args={[0.5, 0.045, 8, 28]} />
      </mesh>
      <mesh position={[0, 0.52, 0]} scale={[0.1, 0.34, 1.1]} material={dark}>
        <sphereGeometry args={[0.5, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      {/* Neck guard, nose guard and cheek plates */}
      <mesh position={[0, 0.07, -0.5]} rotation-x={-0.35} scale={[1, 0.25, 0.5]} material={copper}>
        <cylinderGeometry args={[0.5, 0.45, 0.4, 20]} />
      </mesh>
      <mesh position={[0, 0.2, 0.55]} material={dark}>
        <boxGeometry args={[0.07, 0.3, 0.05]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.46, 0.0, 0.1]} rotation-y={s * 0.2} material={dark}>
          <boxGeometry args={[0.06, 0.3, 0.4]} />
        </mesh>
      ))}
      {/* Rivets */}
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * 0.5, 0.14, Math.sin(a) * 0.55]} material={gold}>
            <sphereGeometry args={[0.03, 8, 6]} />
          </mesh>
        )
      })}
    </group>
  )
}

// Hexagonal crystal: prism plus a pointed tip, standing on its base at `pos`.
function Crystal({ pos, rot, r, h, mat }) {
  return (
    <group position={pos} rotation={rot}>
      <mesh position={[0, h / 2, 0]} material={mat}>
        <cylinderGeometry args={[r, r * 1.08, h, 6]} />
      </mesh>
      <mesh position={[0, h + r * 0.7, 0]} material={mat}>
        <coneGeometry args={[r, r * 1.4, 6]} />
      </mesh>
    </group>
  )
}

const QUARTZ_SHARDS = [
  { pos: [0, 0, 0], rot: [0, 0, 0], r: 0.2, h: 0.55 },
  { pos: [0.25, 0, 0.05], rot: [0.1, 0.4, -0.5], r: 0.15, h: 0.4 },
  { pos: [-0.25, 0, 0.1], rot: [0.2, 0.9, 0.55], r: 0.16, h: 0.38 },
  { pos: [0.05, 0, -0.25], rot: [-0.5, 0.2, 0.1], r: 0.14, h: 0.34 },
  { pos: [-0.1, 0, 0.28], rot: [0.55, 0.6, -0.1], r: 0.12, h: 0.28 },
  { pos: [0.4, 0, -0.15], rot: [-0.3, 1.2, -0.95], r: 0.1, h: 0.2 },
]

function Quartz() {
  const glass = { emissive: '#4aa8ff', emissiveIntensity: 0.55, roughness: 0.12, metalness: 0.1, flatShading: true }
  const ice = plastic('#b8e6ff', glass)
  const pale = plastic('#e6f6ff', { ...glass, emissiveIntensity: 0.8 })
  return (
    <group position={[0, 0.02, 0]} rotation-y={0.3}>
      {QUARTZ_SHARDS.map((s, i) => (
        <Crystal key={i} {...s} mat={i % 2 ? pale : ice} />
      ))}
      <mesh position={[0, 0.03, 0]} scale={[1, 0.3, 1]} material={ice}>
        <dodecahedronGeometry args={[0.38, 0]} />
      </mesh>
    </group>
  )
}

function Emerald() {
  const mat = plastic('#2fe66a', { emissive: '#18c04a', emissiveIntensity: 0.5, roughness: 0.1, metalness: 0.1, flatShading: true })
  return (
    <group rotation={[0.5, 0, 0.2]} scale={[1, 0.75, 0.8]}>
      <mesh material={mat}>
        <octahedronGeometry args={[0.5, 0]} />
      </mesh>
    </group>
  )
}

const AMETHYST_SHARDS = [
  { pos: [0, 0, 0], rot: [0, 0, 0], r: 0.18, h: 0.5 },
  { pos: [0.28, 0, 0.05], rot: [0.1, 0.4, -0.55], r: 0.14, h: 0.38 },
  { pos: [-0.28, 0, 0.1], rot: [0.2, 0.9, 0.6], r: 0.15, h: 0.4 },
  { pos: [0.05, 0, -0.26], rot: [-0.5, 0.2, 0.1], r: 0.12, h: 0.3 },
  { pos: [-0.1, 0, 0.3], rot: [0.55, 0.6, -0.1], r: 0.11, h: 0.26 },
]

function Amethyst() {
  const glass = { emissive: '#9a3aff', emissiveIntensity: 0.6, roughness: 0.12, metalness: 0.1, flatShading: true }
  const deep = plastic('#a35cff', glass)
  const pale = plastic('#d2a8ff', { ...glass, emissiveIntensity: 0.85 })
  return (
    <group position={[0, -0.1, 0]} rotation-y={0.3}>
      {AMETHYST_SHARDS.map((s, i) => (
        <Crystal key={i} {...s} mat={i % 2 ? pale : deep} />
      ))}
    </group>
  )
}

function PorcelainVase() {
  const white = plastic('#f4f8ff', { roughness: 0.2, metalness: 0.05 })
  const blue = plastic('#2f5fc4', { roughness: 0.3 })
  return (
    <group position={[0, -0.3, 0]}>
      <mesh position={[0, 0.06, 0]} material={blue}>
        <cylinderGeometry args={[0.2, 0.24, 0.12, 20]} />
      </mesh>
      <mesh position={[0, 0.42, 0]} scale={[1, 1.15, 1]} material={white}>
        <sphereGeometry args={[0.38, 20, 16]} />
      </mesh>
      <mesh position={[0, 0.42, 0]} scale={[1.01, 0.18, 1.01]} material={blue}>
        <sphereGeometry args={[0.38, 20, 16]} />
      </mesh>
      <mesh position={[0, 0.88, 0]} material={white}>
        <cylinderGeometry args={[0.15, 0.2, 0.3, 20]} />
      </mesh>
      <mesh position={[0, 1.04, 0]} material={blue}>
        <cylinderGeometry args={[0.22, 0.17, 0.06, 20]} />
      </mesh>
    </group>
  )
}

// Glowing material helper for the Legendary / Mythic models.
const shine = (color, emissive, k = 0.7, extra = {}) =>
  plastic(color, { emissive, emissiveIntensity: k, roughness: 0.25, metalness: 0.2, ...extra })
const metal = (color, extra = {}) => plastic(color, { roughness: 0.3, metalness: 0.75, ...extra })

// Spiky crown: band plus `n` cones, optionally with a jewel on each tip.
function SpikeCrown({ band, spike, jewel, n = 8, tall = 0.4 }) {
  return (
    <group position={[0, -0.15, 0]}>
      <mesh position={[0, 0.1, 0]} material={band}>
        <cylinderGeometry args={[0.42, 0.36, 0.22, 20, 1, true]} />
      </mesh>
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2
        return (
          <group key={i} position={[Math.cos(a) * 0.4, 0.2, Math.sin(a) * 0.4]}>
            <mesh position={[0, tall / 2, 0]} material={spike}>
              <coneGeometry args={[0.07, tall, 6]} />
            </mesh>
            {jewel && (
              <mesh position={[0, tall + 0.04, 0]} material={jewel}>
                <sphereGeometry args={[0.04, 8, 6]} />
              </mesh>
            )}
          </group>
        )
      })}
    </group>
  )
}

function PhoenixFeather() {
  const flame = shine('#ff7a1a', '#ff4a00', 0.9)
  const gold = shine('#ffd23a', '#ffa000', 0.8)
  return (
    <group rotation-z={0.5} position={[0, 0.05, 0]}>
      <mesh position={[0, -0.05, 0]} material={gold}>
        <cylinderGeometry args={[0.02, 0.03, 1.3, 6]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.17, 0.05, 0]} rotation-z={s * 0.18} scale={[0.5, 1.2, 0.12]} material={s > 0 ? flame : gold}>
          <sphereGeometry args={[0.3, 14, 10]} />
        </mesh>
      ))}
      <mesh position={[0, 0.6, 0]} scale={[0.5, 1.2, 0.12]} material={flame}>
        <sphereGeometry args={[0.13, 10, 8]} />
      </mesh>
    </group>
  )
}

function StarFragment() {
  const star = shine('#fff2a0', '#ffd23a', 1.1, { flatShading: true })
  const core = shine('#ffffff', '#fff6c0', 1.4)
  return (
    <group rotation={[0.4, 0, 0.3]}>
      {[0, 1, 2].map((i) => (
        <mesh key={i} rotation={[i === 0 ? 0 : Math.PI / 2, i === 2 ? Math.PI / 2 : 0, 0]} material={star}>
          <coneGeometry args={[0.14, 1.1, 4]} />
        </mesh>
      ))}
      <mesh material={core}>
        <icosahedronGeometry args={[0.2, 0]} />
      </mesh>
    </group>
  )
}

function KrakenEye() {
  const eye = plastic('#f4f1e0', { roughness: 0.15, metalness: 0.05 })
  const iris = shine('#18d6a0', '#00b87a', 0.9)
  const pupil = plastic('#050a0a', { roughness: 0.1 })
  const skin = plastic('#5a2a7a', { roughness: 0.6 })
  return (
    <group>
      <mesh material={eye}>
        <sphereGeometry args={[0.45, 24, 18]} />
      </mesh>
      <mesh position={[0, 0, 0.32]} rotation-x={Math.PI / 2} material={iris}>
        <cylinderGeometry args={[0.25, 0.25, 0.2, 20]} />
      </mesh>
      <mesh position={[0, 0, 0.43]} scale={[0.35, 1, 1]} rotation-x={Math.PI / 2} material={pupil}>
        <cylinderGeometry args={[0.13, 0.13, 0.05, 16]} />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2 + 0.3
        return (
          <mesh key={i} position={[Math.cos(a) * 0.4, Math.sin(a) * 0.4 - 0.1, -0.15]} rotation-z={a} material={skin}>
            <coneGeometry args={[0.08, 0.5, 8]} />
          </mesh>
        )
      })}
    </group>
  )
}

function TitanGauntlet() {
  const steel = metal('#9aa4b4')
  const dark = metal('#4a5260')
  const gem = shine('#ff3b3b', '#d00000', 0.9)
  return (
    <group position={[0, -0.1, 0]}>
      <mesh position={[0, 0.1, 0]} material={dark}>
        <cylinderGeometry args={[0.28, 0.34, 0.4, 12]} />
      </mesh>
      <mesh position={[0, 0.5, 0]} material={steel}>
        <boxGeometry args={[0.62, 0.45, 0.4]} />
      </mesh>
      {[-0.22, -0.075, 0.075, 0.22].map((x, i) => (
        <mesh key={i} position={[x, 0.82, 0.02]} material={steel}>
          <boxGeometry args={[0.13, 0.22, 0.2]} />
        </mesh>
      ))}
      <mesh position={[0.4, 0.55, 0]} rotation-z={-0.6} material={steel}>
        <boxGeometry args={[0.14, 0.32, 0.17]} />
      </mesh>
      <mesh position={[0, 0.5, 0.22]} material={gem}>
        <octahedronGeometry args={[0.1, 0]} />
      </mesh>
    </group>
  )
}

function SunMedallion() {
  const gold = shine('#ffc21a', '#ff9a00', 0.55, { metalness: 0.7 })
  const face = shine('#fff0a0', '#ffd23a', 0.8)
  return (
    <group rotation-x={0.2}>
      <mesh rotation-x={Math.PI / 2} material={gold}>
        <cylinderGeometry args={[0.4, 0.4, 0.1, 28]} />
      </mesh>
      <mesh position={[0, 0, 0.06]} rotation-x={Math.PI / 2} material={face}>
        <cylinderGeometry args={[0.24, 0.24, 0.04, 20]} />
      </mesh>
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * 0.52, Math.sin(a) * 0.52, 0]} rotation-z={a - Math.PI / 2} material={gold}>
            <coneGeometry args={[0.07, 0.24, 4]} />
          </mesh>
        )
      })}
    </group>
  )
}

function FrostCrown() {
  const ice = shine('#bfeaff', '#4ab8ff', 0.7, { flatShading: true })
  const band = shine('#7ecbff', '#2a8cff', 0.6, { metalness: 0.4 })
  return <SpikeCrown band={band} spike={ice} n={7} tall={0.55} />
}

function GriffinClaw() {
  const bone = plastic('#e8d9b0', { roughness: 0.45 })
  const gold = metal('#d9a82b')
  return (
    <group rotation-z={0.5} position={[0, -0.1, 0]}>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} position={[0, 0.08 + i * 0.17, 0]} rotation-z={i * 0.28} scale={[1, 1, 1]} material={bone}>
          <coneGeometry args={[0.2 - i * 0.032, 0.34, 10]} />
        </mesh>
      ))}
      <mesh position={[0.2, 0.95, 0]} rotation-z={Math.PI / 2 + 1.1} material={bone}>
        <coneGeometry args={[0.05, 0.3, 8]} />
      </mesh>
      <mesh position={[0, 0.0, 0]} material={gold}>
        <cylinderGeometry args={[0.22, 0.24, 0.12, 14]} />
      </mesh>
    </group>
  )
}

function StormCrown() {
  const dark = metal('#3a3f55')
  const bolt = shine('#fff36a', '#ffe000', 1.2)
  const band = metal('#58607e')
  return (
    <group>
      <SpikeCrown band={band} spike={dark} jewel={bolt} n={6} tall={0.35} />
      {/* Lightning bolt on the crown's front */}
      <mesh position={[0, 0.0, 0.43]} rotation-z={0.3} material={bolt}>
        <boxGeometry args={[0.07, 0.3, 0.04]} />
      </mesh>
      <mesh position={[0.05, -0.12, 0.43]} rotation-z={-0.5} material={bolt}>
        <boxGeometry args={[0.06, 0.2, 0.04]} />
      </mesh>
    </group>
  )
}

function TimeCrystal() {
  const crystal = shine('#7ad8ff', '#2aa0ff', 0.8, { flatShading: true, transparent: true, opacity: 0.85 })
  const ring = metal('#e0b84a')
  const hand = shine('#ffffff', '#ffffff', 1)
  return (
    <group rotation-z={0.2}>
      <mesh material={crystal}>
        <octahedronGeometry args={[0.45, 0]} />
      </mesh>
      <mesh position={[0, 0.5, 0]} scale={[1, 0.8, 1]} material={crystal}>
        <coneGeometry args={[0.18, 0.35, 6]} />
      </mesh>
      <mesh position={[0, -0.5, 0]} rotation-x={Math.PI} scale={[1, 0.8, 1]} material={crystal}>
        <coneGeometry args={[0.18, 0.35, 6]} />
      </mesh>
      {/* Orbiting clock ring with hands */}
      <mesh rotation-x={Math.PI / 2 - 0.4} material={ring}>
        <torusGeometry args={[0.68, 0.03, 8, 40]} />
      </mesh>
      <mesh position={[0, 0.1, 0]} material={hand}>
        <boxGeometry args={[0.03, 0.26, 0.03]} />
      </mesh>
      <mesh position={[0.07, 0, 0]} rotation-z={-1.2} material={hand}>
        <boxGeometry args={[0.03, 0.18, 0.03]} />
      </mesh>
    </group>
  )
}

function CelestialHarp() {
  const gold = shine('#ffe27a', '#ffbf2a', 0.5, { metalness: 0.6 })
  const string = shine('#ffffff', '#c8e8ff', 1)
  return (
    <group position={[0, -0.05, 0]} rotation-y={0.2}>
      {/* Curved neck, straight pillar and soundboard */}
      <mesh position={[-0.35, 0.45, 0]} rotation-z={-0.35} material={gold}>
        <boxGeometry args={[0.09, 1.05, 0.09]} />
      </mesh>
      <mesh position={[0.1, 0.95, 0]} rotation-z={Math.PI / 2 - 0.35} material={gold}>
        <torusGeometry args={[0.5, 0.045, 8, 24, Math.PI / 2]} />
      </mesh>
      <mesh position={[0.35, 0.4, 0]} material={gold}>
        <boxGeometry args={[0.1, 1.0, 0.1]} />
      </mesh>
      <mesh position={[0, 0, 0]} material={gold}>
        <boxGeometry args={[0.95, 0.1, 0.12]} />
      </mesh>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <mesh key={i} position={[-0.25 + i * 0.1, 0.45 + i * 0.03, 0]} material={string}>
          <boxGeometry args={[0.012, 0.8 - i * 0.07, 0.012]} />
        </mesh>
      ))}
      {/* Wings */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.6, 0.85, 0]} rotation-z={s * 0.9} scale={[0.5, 1.4, 0.12]} material={string}>
          <sphereGeometry args={[0.15, 10, 8]} />
        </mesh>
      ))}
    </group>
  )
}

function ObsidianThrone() {
  const rock = plastic('#14101c', { roughness: 0.15, metalness: 0.4, flatShading: true })
  const vein = shine('#b04aff', '#8a1aff', 1)
  return (
    <group position={[0, -0.3, 0]}>
      <mesh position={[0, 0.2, 0]} material={rock}>
        <boxGeometry args={[0.75, 0.4, 0.7]} />
      </mesh>
      <mesh position={[0, 0.85, -0.28]} material={rock}>
        <boxGeometry args={[0.7, 1.0, 0.14]} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * 0.36, 0.5, 0.02]} material={rock}>
            <boxGeometry args={[0.1, 0.3, 0.6]} />
          </mesh>
          <mesh position={[s * 0.3, 1.45, -0.28]} material={rock}>
            <coneGeometry args={[0.1, 0.4, 4]} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 1.55, -0.28]} material={rock}>
        <coneGeometry args={[0.12, 0.6, 4]} />
      </mesh>
      <mesh position={[0, 0.9, -0.2]} material={vein}>
        <boxGeometry args={[0.06, 0.8, 0.02]} />
      </mesh>
      <mesh position={[0, 0.42, 0.36]} material={vein}>
        <boxGeometry args={[0.6, 0.03, 0.02]} />
      </mesh>
    </group>
  )
}

function PhoenixHeart() {
  const heart = shine('#ff2a4a', '#ff1030', 1)
  const flame = shine('#ffb030', '#ff6a00', 1)
  return (
    <group>
      {/* Heart = two lobes + a cone */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.17, 0.12, 0]} material={heart}>
          <sphereGeometry args={[0.24, 16, 12]} />
        </mesh>
      ))}
      <mesh position={[0, -0.18, 0]} rotation-x={Math.PI} material={heart}>
        <coneGeometry args={[0.38, 0.6, 16]} />
      </mesh>
      {/* Flames licking upward */}
      {[-0.25, 0, 0.25].map((x, i) => (
        <mesh key={i} position={[x, 0.5 + (i === 1 ? 0.12 : 0), 0]} material={flame}>
          <coneGeometry args={[0.1, 0.4 + (i === 1 ? 0.2 : 0), 8]} />
        </mesh>
      ))}
    </group>
  )
}

function DreamCatcher() {
  const wood = plastic('#8a5a2a', { roughness: 0.7 })
  const web = shine('#e8e0ff', '#a98aff', 0.6)
  const feather = ['#5ad6ff', '#c06aff', '#ff7ac8']
  return (
    <group position={[0, 0.1, 0]} rotation-x={0.1}>
      <mesh material={wood}>
        <torusGeometry args={[0.42, 0.04, 8, 32]} />
      </mesh>
      {/* Web: spokes and an inner ring */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <mesh key={i} rotation-z={(i / 6) * Math.PI} material={web}>
          <boxGeometry args={[0.8, 0.012, 0.012]} />
        </mesh>
      ))}
      <mesh material={web}>
        <torusGeometry args={[0.2, 0.012, 6, 24]} />
      </mesh>
      {/* Hanging feathers */}
      {feather.map((c, i) => (
        <group key={i} position={[(i - 1) * 0.25, -0.5, 0]}>
          <mesh position={[0, -0.12, 0]} material={wood}>
            <cylinderGeometry args={[0.006, 0.006, 0.25, 4]} />
          </mesh>
          <mesh position={[0, -0.4, 0]} scale={[0.5, 1.5, 0.15]} material={shine(c, c, 0.6)}>
            <sphereGeometry args={[0.1, 10, 8]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// ---- Epic models ----

function JadeIdol() {
  const jade = shine('#3fbf7a', '#1a8a4a', 0.35, { roughness: 0.3 })
  const dark = plastic('#1f6b45', { roughness: 0.4 })
  return (
    <group position={[0, -0.35, 0]}>
      <mesh position={[0, 0.1, 0]} material={dark}>
        <boxGeometry args={[0.6, 0.2, 0.5]} />
      </mesh>
      <mesh position={[0, 0.5, 0]} scale={[1, 1.2, 0.8]} material={jade}>
        <sphereGeometry args={[0.28, 16, 12]} />
      </mesh>
      <mesh position={[0, 0.98, 0]} material={jade}>
        <boxGeometry args={[0.38, 0.38, 0.34]} />
      </mesh>
      <mesh position={[0, 1.22, 0]} material={dark}>
        <boxGeometry args={[0.44, 0.1, 0.4]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.09, 1.0, 0.18]} material={dark}>
          <boxGeometry args={[0.08, 0.06, 0.03]} />
        </mesh>
      ))}
      <mesh position={[0, 0.9, 0.18]} material={dark}>
        <boxGeometry args={[0.07, 0.12, 0.05]} />
      </mesh>
    </group>
  )
}

function RoyalCrown() {
  const gold = metal('#f2c230', { emissive: '#8a5a00', emissiveIntensity: 0.25 })
  const red = shine('#e0203a', '#b00020', 0.7)
  const blue = shine('#2a6aff', '#1040c0', 0.7)
  return (
    <group position={[0, 0.05, 0]}>
      <SpikeCrown band={gold} spike={gold} jewel={red} n={6} tall={0.38} />
      {/* Jewels on the band */}
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4
        return (
          <mesh key={i} position={[Math.cos(a) * 0.4, -0.04, Math.sin(a) * 0.4]} material={i % 2 ? blue : red}>
            <sphereGeometry args={[0.05, 8, 6]} />
          </mesh>
        )
      })}
      {/* Velvet cap */}
      <mesh position={[0, 0.05, 0]} scale={[1, 0.7, 1]} material={plastic('#8a1230', { roughness: 0.9 })}>
        <sphereGeometry args={[0.36, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
    </group>
  )
}

function VikingHelmet() {
  const steel = metal('#9ba3ad')
  const bone = plastic('#efe6cc', { roughness: 0.5 })
  const dark = metal('#555c66')
  return (
    <group position={[0, -0.1, 0]}>
      <mesh position={[0, 0.25, 0]} material={steel}>
        <sphereGeometry args={[0.45, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <mesh position={[0, 0.27, 0]} rotation-x={Math.PI / 2} material={dark}>
        <torusGeometry args={[0.45, 0.04, 6, 28]} />
      </mesh>
      <mesh position={[0, 0.2, 0.43]} material={dark}>
        <boxGeometry args={[0.07, 0.3, 0.04]} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.45, 0.5, 0]}>
          <mesh rotation-z={-s * 0.9} position={[s * 0.1, 0.05, 0]} material={bone}>
            <coneGeometry args={[0.08, 0.5, 10]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function WarDrum() {
  const wood = plastic('#7a4a22', { roughness: 0.7 })
  const skin = plastic('#f0e2c0', { roughness: 0.8 })
  const rope = plastic('#d8b070')
  const stick = plastic('#c89a5a')
  return (
    <group position={[0, -0.2, 0]}>
      <mesh position={[0, 0.4, 0]} material={wood}>
        <cylinderGeometry args={[0.42, 0.42, 0.6, 24]} />
      </mesh>
      {[0.1, 0.7].map((y) => (
        <mesh key={y} position={[0, y, 0]} material={skin}>
          <cylinderGeometry args={[0.45, 0.45, 0.04, 24]} />
        </mesh>
      ))}
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * 0.43, 0.4, Math.sin(a) * 0.43]} rotation-z={(i % 2 ? 1 : -1) * 0.25} material={rope}>
            <boxGeometry args={[0.025, 0.7, 0.025]} />
          </mesh>
        )
      })}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.15, 0.85, 0.05]} rotation-z={s * 0.7} material={stick}>
          <cylinderGeometry args={[0.02, 0.03, 0.55, 6]} />
        </mesh>
      ))}
    </group>
  )
}

function DragonEgg() {
  const shell = shine('#a8142a', '#6a0010', 0.35, { roughness: 0.35, flatShading: true })
  const scale = shine('#ffb02a', '#ff7a00', 0.6)
  return (
    <group>
      <mesh scale={[0.8, 1.15, 0.8]} material={shell}>
        <sphereGeometry args={[0.5, 20, 16]} />
      </mesh>
      {[[0, 0.1, 0.4], [0.3, -0.15, 0.3], [-0.3, -0.1, 0.32], [0.15, 0.4, 0.3], [-0.2, 0.35, 0.3], [0, -0.4, 0.28]].map((p, i) => (
        <mesh key={i} position={p} rotation={[0.3, 0, 0.8]} scale={[1, 1.3, 0.4]} material={scale}>
          <octahedronGeometry args={[0.1, 0]} />
        </mesh>
      ))}
    </group>
  )
}

function MagicLamp() {
  const gold = shine('#f2bd2a', '#a86a00', 0.4, { metalness: 0.8 })
  const smoke = shine('#9ae0ff', '#4ab8ff', 0.8, { transparent: true, opacity: 0.75 })
  return (
    <group position={[0, -0.2, 0]}>
      <mesh position={[0, 0.2, 0]} scale={[1, 0.55, 0.7]} material={gold}>
        <sphereGeometry args={[0.45, 20, 12]} />
      </mesh>
      <mesh position={[0, 0.02, 0]} material={gold}>
        <cylinderGeometry args={[0.16, 0.2, 0.1, 14]} />
      </mesh>
      <mesh position={[0, 0.46, 0]} material={gold}>
        <sphereGeometry args={[0.08, 10, 8]} />
      </mesh>
      {/* Spout and handle */}
      <mesh position={[0.52, 0.34, 0]} rotation-z={-0.9} material={gold}>
        <coneGeometry args={[0.09, 0.55, 10]} />
      </mesh>
      <mesh position={[-0.5, 0.3, 0]} rotation-z={0} material={gold}>
        <torusGeometry args={[0.16, 0.035, 8, 16, Math.PI * 1.4]} />
      </mesh>
      {/* Smoke wisp */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0.75 + Math.sin(i * 1.8) * 0.08, 0.65 + i * 0.2, 0]} material={smoke}>
          <sphereGeometry args={[0.1 - i * 0.02, 10, 8]} />
        </mesh>
      ))}
    </group>
  )
}

function SirenHarp() {
  const shell = shine('#4fd6c8', '#10a89a', 0.5, { metalness: 0.3 })
  const pearl = shine('#fff0f8', '#ffc0e8', 0.5)
  return (
    <group position={[0, -0.05, 0]} rotation-y={0.2}>
      {/* Frame is a half-open shell fan */}
      <mesh position={[-0.35, 0.45, 0]} rotation-z={0.15} material={shell}>
        <boxGeometry args={[0.09, 1.0, 0.09]} />
      </mesh>
      <mesh position={[0.4, 0.35, 0]} material={shell}>
        <boxGeometry args={[0.09, 0.8, 0.09]} />
      </mesh>
      <mesh position={[0.02, 0.88, 0]} rotation-z={-0.38} material={shell}>
        <boxGeometry args={[0.95, 0.09, 0.09]} />
      </mesh>
      <mesh position={[0.02, -0.02, 0]} material={shell}>
        <boxGeometry args={[0.85, 0.09, 0.09]} />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} position={[-0.22 + i * 0.15, 0.43 + i * 0.01, 0]} material={pearl}>
          <boxGeometry args={[0.012, 0.8 - i * 0.12, 0.012]} />
        </mesh>
      ))}
      <mesh position={[-0.35, 0.95, 0]} material={pearl}>
        <sphereGeometry args={[0.09, 12, 10]} />
      </mesh>
    </group>
  )
}

function PirateFlag() {
  const wood = plastic('#6a4524', { roughness: 0.7 })
  const cloth = plastic('#15161c', { roughness: 0.9, side: DoubleSide })
  const white = plastic('#f6f4ea')
  return (
    <group position={[0, -0.5, 0]}>
      <mesh position={[-0.35, 0.7, 0]} material={wood}>
        <cylinderGeometry args={[0.03, 0.04, 1.5, 8]} />
      </mesh>
      <mesh position={[-0.35, 1.47, 0]} material={wood}>
        <sphereGeometry args={[0.06, 8, 6]} />
      </mesh>
      <mesh position={[0.15, 1.05, 0]} material={cloth}>
        <boxGeometry args={[1.0, 0.65, 0.02]} />
      </mesh>
      <group position={[0.15, 1.05, 0.02]}>
        <mesh position={[0, 0.06, 0]} material={white}>
          <sphereGeometry args={[0.1, 12, 10]} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[0, -0.1, 0]} rotation-z={s * 0.6} material={white}>
            <boxGeometry args={[0.38, 0.04, 0.01]} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

function MoonMask() {
  const silver = shine('#dfe6ff', '#8aa0ff', 0.45, { metalness: 0.5 })
  const dark = plastic('#0a0c1c')
  const star = shine('#fff6a0', '#ffd23a', 1)
  return (
    <group rotation-x={-0.1}>
      <mesh scale={[0.85, 1.05, 0.5]} material={silver}>
        <sphereGeometry args={[0.5, 22, 16]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.18, 0.1, 0.24]} rotation-z={s * 0.3} scale={[1, 0.45, 0.3]} material={dark}>
          <sphereGeometry args={[0.1, 10, 8]} />
        </mesh>
      ))}
      <mesh position={[0, -0.12, 0.25]} material={silver}>
        <coneGeometry args={[0.06, 0.2, 6]} />
      </mesh>
      <mesh position={[0, -0.3, 0.2]} scale={[1, 0.3, 0.3]} material={dark}>
        <sphereGeometry args={[0.12, 10, 8]} />
      </mesh>
      <mesh position={[0, 0.38, 0.2]} material={star}>
        <octahedronGeometry args={[0.07, 0]} />
      </mesh>
    </group>
  )
}

function ThunderHammer() {
  const steel = metal('#8a94a8')
  const wood = plastic('#7a5028', { roughness: 0.7 })
  const bolt = shine('#fff36a', '#ffe000', 1.2)
  return (
    <group rotation-z={0.6} position={[0, -0.05, 0]}>
      <mesh position={[0, -0.1, 0]} material={wood}>
        <cylinderGeometry args={[0.05, 0.06, 1.1, 8]} />
      </mesh>
      <mesh position={[0, 0.5, 0]} material={steel}>
        <boxGeometry args={[0.8, 0.4, 0.4]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.41, 0.5, 0]} material={bolt}>
          <boxGeometry args={[0.03, 0.3, 0.3]} />
        </mesh>
      ))}
      <mesh position={[0, 0.5, 0.21]} rotation-z={0.3} material={bolt}>
        <boxGeometry args={[0.06, 0.28, 0.02]} />
      </mesh>
      <mesh position={[0, -0.7, 0]} material={steel}>
        <sphereGeometry args={[0.07, 8, 6]} />
      </mesh>
    </group>
  )
}

function GoldenChalice() {
  const gold = metal('#f2c230', { emissive: '#8a5a00', emissiveIntensity: 0.3 })
  const wine = shine('#9a1030', '#600010', 0.4)
  const gem = shine('#3aa0ff', '#1060d0', 0.8)
  return (
    <group position={[0, -0.4, 0]}>
      <mesh position={[0, 0.04, 0]} material={gold}>
        <cylinderGeometry args={[0.3, 0.34, 0.08, 20]} />
      </mesh>
      <mesh position={[0, 0.3, 0]} material={gold}>
        <cylinderGeometry args={[0.05, 0.08, 0.5, 10]} />
      </mesh>
      <mesh position={[0, 0.42, 0]} material={gem}>
        <sphereGeometry args={[0.08, 10, 8]} />
      </mesh>
      <mesh position={[0, 0.88, 0]} material={gold}>
        <cylinderGeometry args={[0.38, 0.12, 0.5, 20, 1, true]} />
      </mesh>
      <mesh position={[0, 1.08, 0]} rotation-x={-Math.PI / 2} material={wine}>
        <circleGeometry args={[0.35, 20]} />
      </mesh>
      <mesh position={[0, 1.13, 0]} rotation-x={Math.PI / 2} material={gold}>
        <torusGeometry args={[0.38, 0.025, 6, 24]} />
      </mesh>
    </group>
  )
}

// ---- Shared helpers for the remaining models ----

// Group that keeps spinning about one axis (orbiting rings, sparkles, ...).
function Spin({ speed = 1, axis = 'y', children, ...props }) {
  const ref = useRef()
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation[axis] += dt * speed
  })
  return (
    <group ref={ref} {...props}>
      {children}
    </group>
  )
}

// Brilliant-cut gem: flat table on top, pointed pavilion below. With an array
// of materials each facet slice gets the next one (used for the rainbow gem).
function CutGem({ mats, r = 0.4, crown = 0.16, pavilion = 0.42, table = 0.55, seg = 8 }) {
  const list = Array.isArray(mats) ? mats : [mats]
  const n = list.length === 1 ? 1 : seg
  const step = (Math.PI * 2) / n
  const radial = n === 1 ? seg : 1
  return (
    <group>
      {Array.from({ length: n }, (_, i) => (
        <group key={i}>
          <mesh position={[0, crown / 2, 0]} material={list[i % list.length]}>
            <cylinderGeometry args={[r * table, r, crown, radial, 1, false, i * step, step]} />
          </mesh>
          <mesh position={[0, -pavilion / 2, 0]} material={list[i % list.length]}>
            <cylinderGeometry args={[r, 0, pavilion, radial, 1, false, i * step, step]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// Tiny glowing diamonds scattered at fixed spots.
function Sparkles({ spots, mat, size = 0.035 }) {
  return spots.map((p, i) => (
    <mesh key={i} position={p} rotation={[0.6, i, 0.4]} material={mat}>
      <octahedronGeometry args={[size * (1 + (i % 3) * 0.4), 0]} />
    </mesh>
  ))
}

// ---- Common ----

function Feather() {
  const vane = plastic('#f4f2ec', { roughness: 0.85 })
  const tip = plastic('#3a6ad8', { roughness: 0.8 })
  const shaft = plastic('#d8cfb8', { roughness: 0.5 })
  const stripe = plastic('#8a8478', { roughness: 0.9 })
  return (
    <group rotation={[0.2, 0, 0.55]}>
      {/* Quill: bare calamus at the bottom, rachis running up the middle */}
      <mesh position={[0, -0.05, 0]} material={shaft}>
        <cylinderGeometry args={[0.012, 0.025, 1.2, 8]} />
      </mesh>
      {/* Two vane halves, the right one a little wider */}
      <mesh position={[-0.07, 0.12, 0]} rotation-z={0.06} scale={[0.32, 1.45, 0.05]} material={vane}>
        <sphereGeometry args={[0.3, 16, 12]} />
      </mesh>
      <mesh position={[0.08, 0.1, 0]} rotation-z={-0.06} scale={[0.38, 1.4, 0.05]} material={vane}>
        <sphereGeometry args={[0.3, 16, 12]} />
      </mesh>
      {/* Dark barb stripes and blue tip */}
      {[-0.12, 0.05, 0.22].map((y, i) => (
        <mesh key={i} position={[0, y, 0.012]} rotation-z={0.35} material={stripe}>
          <boxGeometry args={[0.24, 0.025, 0.01]} />
        </mesh>
      ))}
      <mesh position={[0, 0.48, 0]} scale={[0.4, 0.7, 0.06]} material={tip}>
        <sphereGeometry args={[0.18, 12, 10]} />
      </mesh>
      {/* Ragged notch on one edge */}
      <mesh position={[0.2, -0.1, 0]} rotation-z={0.8} material={vane}>
        <boxGeometry args={[0.12, 0.03, 0.02]} />
      </mesh>
    </group>
  )
}

function Seashell() {
  const pink = plastic('#f7b8a8', { roughness: 0.45 })
  const cream = plastic('#fff0dc', { roughness: 0.45 })
  const ribs = 9
  return (
    <group rotation-x={-0.6} position={[0, -0.1, 0]}>
      {/* Scallop: ribs fanning out from the hinge */}
      {Array.from({ length: ribs }, (_, i) => {
        const a = -1.15 + (i / (ribs - 1)) * 2.3
        return (
          <group key={i} rotation-z={a}>
            <mesh position={[0, 0.3, 0.02 - Math.abs(a) * 0.03]} scale={[0.13, 0.36, 0.07]} material={i % 2 ? cream : pink}>
              <sphereGeometry args={[1, 12, 10]} />
            </mesh>
          </group>
        )
      })}
      {/* Hinge with its two ears */}
      <mesh position={[0, 0.02, 0]} material={pink}>
        <boxGeometry args={[0.32, 0.1, 0.08]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.15, 0.04, 0]} rotation-z={s * 0.3} material={cream}>
          <boxGeometry args={[0.1, 0.12, 0.06]} />
        </mesh>
      ))}
    </group>
  )
}

function Acorn() {
  const nut = plastic('#b5702a', { roughness: 0.35 })
  const cap = plastic('#6b4a2a', { roughness: 0.95 })
  const bump = plastic('#5a3c20', { roughness: 0.95 })
  return (
    <group position={[0, -0.05, 0]} rotation-z={0.25}>
      <mesh scale={[1, 1.25, 1]} material={nut}>
        <sphereGeometry args={[0.3, 20, 16]} />
      </mesh>
      <mesh position={[0, -0.4, 0]} rotation-x={Math.PI} material={nut}>
        <coneGeometry args={[0.04, 0.08, 8]} />
      </mesh>
      {/* Scaly cap */}
      <mesh position={[0, 0.2, 0]} scale={[1, 0.65, 1]} material={cap}>
        <sphereGeometry args={[0.34, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <mesh position={[0, 0.2, 0]} rotation-x={Math.PI / 2} material={cap}>
        <torusGeometry args={[0.32, 0.04, 8, 28]} />
      </mesh>
      {[0, 1].map((row) =>
        Array.from({ length: 12 - row * 4 }, (_, i) => {
          const n = 12 - row * 4
          const a = (i / n) * Math.PI * 2 + row * 0.3
          const r = row ? 0.2 : 0.3
          return (
            <mesh key={`${row}-${i}`} position={[Math.cos(a) * r, 0.26 + row * 0.1, Math.sin(a) * r]} material={bump}>
              <sphereGeometry args={[0.045, 6, 5]} />
            </mesh>
          )
        }),
      )}
      {/* Stem */}
      <mesh position={[0.02, 0.48, 0]} rotation-z={-0.3} material={cap}>
        <cylinderGeometry args={[0.025, 0.035, 0.16, 6]} />
      </mesh>
    </group>
  )
}

function Pinecone() {
  const scale = plastic('#7a4f2a', { roughness: 0.9 })
  const tip = plastic('#a8784a', { roughness: 0.9 })
  const core = plastic('#5a3a1e', { roughness: 0.9 })
  const layers = 8
  return (
    <group position={[0, -0.45, 0]}>
      <mesh position={[0, 0.45, 0]} material={core}>
        <cylinderGeometry args={[0.06, 0.1, 0.9, 8]} />
      </mesh>
      {/* Rings of overlapping scales, widest just below the middle */}
      {Array.from({ length: layers }, (_, l) => {
        const t = (l + 0.5) / layers
        const r = 0.08 + Math.sin(Math.PI * Math.pow(t, 0.8)) * 0.24
        const n = 7
        return Array.from({ length: n }, (_, i) => {
          const a = (i / n) * Math.PI * 2 + (l % 2) * (Math.PI / n)
          return (
            <group key={`${l}-${i}`} position={[0, 0.06 + t * 0.85, 0]} rotation-y={-a}>
              <mesh position={[r * 0.6, 0, 0]} rotation-z={-(Math.PI / 2 + 0.45)} scale={[1, 1, 0.45]} material={l % 2 ? tip : scale}>
                <coneGeometry args={[0.08, r + 0.08, 5]} />
              </mesh>
            </group>
          )
        })
      })}
      {/* Little woody stalk */}
      <mesh position={[0, 0.98, 0]} material={core}>
        <cylinderGeometry args={[0.02, 0.03, 0.12, 6]} />
      </mesh>
    </group>
  )
}

function OldBoot() {
  const leather = plastic('#6a4428', { roughness: 0.85 })
  const worn = plastic('#8a5e3a', { roughness: 0.9 })
  const sole = plastic('#2a1e16', { roughness: 0.95 })
  const lace = plastic('#d8c8a0', { roughness: 0.8 })
  const hole = plastic('#0a0806')
  return (
    <group position={[0, -0.4, 0]} rotation-y={0.4}>
      {/* Sole and heel */}
      <mesh position={[0, 0.03, 0.05]} material={sole}>
        <boxGeometry args={[0.34, 0.06, 0.8]} />
      </mesh>
      <mesh position={[0, 0.08, -0.27]} material={sole}>
        <boxGeometry args={[0.32, 0.08, 0.22]} />
      </mesh>
      {/* Foot and toe cap */}
      <mesh position={[0, 0.17, 0.12]} scale={[0.17, 0.13, 0.32]} material={leather}>
        <sphereGeometry args={[1, 18, 12]} />
      </mesh>
      <mesh position={[0, 0.15, 0.3]} scale={[0.15, 0.1, 0.14]} material={worn}>
        <sphereGeometry args={[1, 14, 10]} />
      </mesh>
      {/* Shaft, slumped a little, with a folded cuff */}
      <mesh position={[0, 0.45, -0.17]} rotation-x={-0.1} material={leather}>
        <cylinderGeometry args={[0.17, 0.18, 0.62, 16]} />
      </mesh>
      <mesh position={[0, 0.76, -0.2]} rotation-x={Math.PI / 2 - 0.1} material={worn}>
        <torusGeometry args={[0.17, 0.035, 8, 20]} />
      </mesh>
      {/* Criss-cross laces up the front */}
      {[0.28, 0.4, 0.52, 0.64].map((y, i) => (
        <mesh key={i} position={[0, y, -0.0 + i * -0.01]} rotation-z={i % 2 ? 0.5 : -0.5} material={lace}>
          <boxGeometry args={[0.2, 0.02, 0.02]} />
        </mesh>
      ))}
      {/* Hole worn through the toe and a patch on the side */}
      <mesh position={[0.05, 0.2, 0.42]} rotation-x={0.4} material={hole}>
        <circleGeometry args={[0.04, 10]} />
      </mesh>
      <mesh position={[0.18, 0.4, -0.16]} rotation-y={Math.PI / 2} material={worn}>
        <boxGeometry args={[0.14, 0.12, 0.01]} />
      </mesh>
    </group>
  )
}

// ---- Uncommon ----

function Compass() {
  const brass = metal('#c9973a')
  const face = plastic('#f6efd8', { roughness: 0.6 })
  const ink = plastic('#2a2218')
  const red = shine('#e0281e', '#a00000', 0.4)
  const glass = plastic('#cfefff', { transparent: true, opacity: 0.25, roughness: 0.05 })
  return (
    <group rotation-x={0.9}>
      <mesh material={brass}>
        <cylinderGeometry args={[0.42, 0.44, 0.12, 32]} />
      </mesh>
      <mesh position={[0, 0.065, 0]} rotation-x={Math.PI / 2} material={brass}>
        <torusGeometry args={[0.41, 0.03, 8, 32]} />
      </mesh>
      <mesh position={[0, 0.062, 0]} rotation-x={-Math.PI / 2} material={face}>
        <circleGeometry args={[0.37, 32]} />
      </mesh>
      {/* 16 ticks, the four cardinal ones long */}
      {Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2
        const long = i % 4 === 0
        return (
          <mesh key={i} position={[Math.sin(a) * 0.31, 0.066, Math.cos(a) * 0.31]} rotation-y={a} material={ink}>
            <boxGeometry args={[0.015, 0.004, long ? 0.1 : 0.05]} />
          </mesh>
        )
      })}
      {/* Needle: red north, white south */}
      <group position={[0, 0.075, 0]} rotation-y={0.5}>
        <mesh position={[0, 0, -0.13]} rotation-x={-Math.PI / 2} scale={[1, 1, 0.3]} material={red}>
          <coneGeometry args={[0.045, 0.26, 4]} />
        </mesh>
        <mesh position={[0, 0, 0.13]} rotation-x={Math.PI / 2} scale={[1, 1, 0.3]} material={face}>
          <coneGeometry args={[0.045, 0.26, 4]} />
        </mesh>
        <mesh material={brass}>
          <cylinderGeometry args={[0.03, 0.03, 0.03, 10]} />
        </mesh>
      </group>
      <mesh position={[0, 0.07, 0]} scale={[1, 0.18, 1]} material={glass}>
        <sphereGeometry args={[0.38, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      {/* Hanging bow */}
      <mesh position={[0, 0, -0.5]} rotation-x={Math.PI / 2} material={brass}>
        <torusGeometry args={[0.07, 0.022, 8, 16]} />
      </mesh>
    </group>
  )
}

function SilverKey() {
  const silver = metal('#d8dde6', { roughness: 0.2 })
  const blue = shine('#5ab0ff', '#2a7aff', 0.6)
  return (
    <group rotation-z={0.35}>
      {/* Ornate bow: big ring with a cross of bars and a gem */}
      <mesh position={[0, 0.42, 0]} material={silver}>
        <torusGeometry args={[0.17, 0.035, 10, 28]} />
      </mesh>
      {[0, Math.PI / 2].map((r) => (
        <mesh key={r} position={[0, 0.42, 0]} rotation-z={r} material={silver}>
          <boxGeometry args={[0.32, 0.025, 0.025]} />
        </mesh>
      ))}
      <mesh position={[0, 0.42, 0]} material={blue}>
        <sphereGeometry args={[0.055, 12, 10]} />
      </mesh>
      {/* Collar rings and shaft */}
      {[0.22, 0.17].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation-x={Math.PI / 2} material={silver}>
          <torusGeometry args={[0.04, 0.015, 6, 14]} />
        </mesh>
      ))}
      <mesh position={[0, -0.12, 0]} material={silver}>
        <cylinderGeometry args={[0.03, 0.03, 0.72, 10]} />
      </mesh>
      {/* Bit with teeth */}
      <mesh position={[0.08, -0.38, 0]} material={silver}>
        <boxGeometry args={[0.14, 0.2, 0.03]} />
      </mesh>
      {[[0.17, -0.32], [0.17, -0.43]].map(([x, y], i) => (
        <mesh key={i} position={[x, y, 0]} material={silver}>
          <boxGeometry args={[0.05, 0.05, 0.03]} />
        </mesh>
      ))}
    </group>
  )
}

// ---- Rare ----

function CrystalBall() {
  const glass = shine('#c8b0ff', '#7a3aff', 0.35, { transparent: true, opacity: 0.45, roughness: 0.05 })
  const mist = shine('#e0c8ff', '#b06aff', 1.2, { transparent: true, opacity: 0.7 })
  const gold = metal('#d9a82b')
  const wood = plastic('#3a2416', { roughness: 0.6 })
  return (
    <group position={[0, -0.1, 0]}>
      <mesh position={[0, 0.3, 0]} material={glass}>
        <sphereGeometry args={[0.36, 32, 24]} />
      </mesh>
      {/* Swirling mist inside */}
      <Spin speed={1.5} position={[0, 0.3, 0]}>
        <mesh rotation-x={0.6} material={mist}>
          <torusGeometry args={[0.15, 0.03, 8, 24]} />
        </mesh>
        <mesh rotation-z={0.9} material={mist}>
          <torusGeometry args={[0.1, 0.025, 8, 20]} />
        </mesh>
        <mesh material={mist}>
          <sphereGeometry args={[0.06, 12, 10]} />
        </mesh>
      </Spin>
      {/* Stand: wooden base, gold ring and three claws */}
      <mesh position={[0, -0.22, 0]} material={wood}>
        <cylinderGeometry args={[0.24, 0.3, 0.14, 20]} />
      </mesh>
      <mesh position={[0, -0.08, 0]} material={gold}>
        <cylinderGeometry args={[0.2, 0.22, 0.12, 20]} />
      </mesh>
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2
        return (
          <group key={i} rotation-y={a}>
            <mesh position={[0.24, 0.05, 0]} rotation-z={0.5} material={gold}>
              <coneGeometry args={[0.04, 0.3, 6]} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

function AncientScroll() {
  const paper = plastic('#e8d4a2', { roughness: 0.9, side: DoubleSide })
  const roll = plastic('#d8c08a', { roughness: 0.85 })
  const wood = plastic('#5a3820', { roughness: 0.6 })
  const ink = plastic('#3a2a1a')
  const wax = shine('#b01818', '#600000', 0.3, { roughness: 0.4 })
  return (
    <group rotation={[0.2, 0, 0.1]}>
      {/* Two rolls with the open sheet stretched between them */}
      {[0.38, -0.38].map((y) => (
        <group key={y} position={[0, y, 0]}>
          <mesh rotation-z={Math.PI / 2} material={roll}>
            <cylinderGeometry args={[0.1, 0.1, 0.78, 16]} />
          </mesh>
          {[-1, 1].map((s) => (
            <group key={s}>
              <mesh position={[s * 0.44, 0, 0]} rotation-z={Math.PI / 2} material={wood}>
                <cylinderGeometry args={[0.035, 0.035, 0.12, 8]} />
              </mesh>
              <mesh position={[s * 0.52, 0, 0]} material={wood}>
                <sphereGeometry args={[0.055, 10, 8]} />
              </mesh>
            </group>
          ))}
        </group>
      ))}
      <mesh position={[0, 0, 0.06]} material={paper}>
        <boxGeometry args={[0.72, 0.74, 0.01]} />
      </mesh>
      {/* Lines of faded writing */}
      {[0.2, 0.12, 0.04, -0.04, -0.12, -0.2].map((y, i) => (
        <mesh key={y} position={[i % 3 === 2 ? -0.08 : 0, y, 0.068]} material={ink}>
          <boxGeometry args={[i % 3 === 2 ? 0.4 : 0.56, 0.018, 0.002]} />
        </mesh>
      ))}
      {/* Wax seal */}
      <mesh position={[0.2, -0.28, 0.072]} rotation-x={Math.PI / 2} material={wax}>
        <cylinderGeometry args={[0.065, 0.07, 0.02, 14]} />
      </mesh>
    </group>
  )
}

function GoldenRing() {
  const gold = metal('#f2c230', { roughness: 0.2, emissive: '#6a4000', emissiveIntensity: 0.2 })
  const diamond = shine('#f4fbff', '#bfe4ff', 0.6, { roughness: 0.05, flatShading: true })
  return (
    <group position={[0, -0.1, 0]}>
      <mesh material={gold}>
        <torusGeometry args={[0.32, 0.055, 14, 40]} />
      </mesh>
      {/* Setting: cup plus four prongs holding the stone */}
      <mesh position={[0, 0.38, 0]} material={gold}>
        <cylinderGeometry args={[0.1, 0.06, 0.1, 12]} />
      </mesh>
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4
        return (
          <mesh key={i} position={[Math.cos(a) * 0.11, 0.48, Math.sin(a) * 0.11]} material={gold}>
            <boxGeometry args={[0.025, 0.12, 0.025]} />
          </mesh>
        )
      })}
      <group position={[0, 0.52, 0]}>
        <CutGem mats={diamond} r={0.13} crown={0.06} pavilion={0.12} />
      </group>
    </group>
  )
}

function Ruby() {
  const ruby = shine('#ff2244', '#c0001a', 0.55, { roughness: 0.08, flatShading: true })
  const pale = shine('#ff8aa0', '#ff2a4a', 0.8, { roughness: 0.08, flatShading: true })
  return (
    <group rotation={[0.5, 0, 0.25]}>
      <CutGem mats={[ruby, pale]} r={0.42} crown={0.16} pavilion={0.44} seg={10} />
    </group>
  )
}

function Sapphire() {
  const sapphire = shine('#1a4aff', '#0a2acc', 0.55, { roughness: 0.08, flatShading: true })
  const pale = shine('#6a9aff', '#2a5aff', 0.8, { roughness: 0.08, flatShading: true })
  const silver = metal('#d8dde6')
  return (
    <group rotation={[0.55, 0, -0.2]}>
      {/* Oval cut in a thin silver bezel */}
      <group scale={[1.25, 1, 0.85]}>
        <CutGem mats={[sapphire, pale]} r={0.36} crown={0.14} pavilion={0.38} seg={12} />
        <mesh position={[0, 0, 0]} rotation-x={Math.PI / 2} material={silver}>
          <torusGeometry args={[0.37, 0.025, 6, 36]} />
        </mesh>
      </group>
    </group>
  )
}

function PocketWatch() {
  const gold = metal('#e8b830', { roughness: 0.25 })
  const face = plastic('#fbf7ea', { roughness: 0.5 })
  const ink = plastic('#1a1a1a')
  const glass = plastic('#dff4ff', { transparent: true, opacity: 0.2, roughness: 0.05 })
  return (
    <group rotation-x={-0.15}>
      <mesh rotation-x={Math.PI / 2} material={gold}>
        <cylinderGeometry args={[0.38, 0.38, 0.12, 36]} />
      </mesh>
      <mesh position={[0, 0, 0.06]} material={gold}>
        <torusGeometry args={[0.36, 0.03, 8, 36]} />
      </mesh>
      <mesh position={[0, 0, 0.062]} material={face}>
        <circleGeometry args={[0.34, 36]} />
      </mesh>
      {/* Hour marks, numerals at 12/3/6/9 drawn as thicker bars */}
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2
        const big = i % 3 === 0
        return (
          <mesh key={i} position={[Math.sin(a) * 0.28, Math.cos(a) * 0.28, 0.065]} rotation-z={-a} material={ink}>
            <boxGeometry args={[big ? 0.03 : 0.015, big ? 0.07 : 0.045, 0.004]} />
          </mesh>
        )
      })}
      {/* Hands */}
      <mesh position={[0.05, 0.06, 0.07]} rotation-z={-0.7} material={ink}>
        <boxGeometry args={[0.02, 0.16, 0.004]} />
      </mesh>
      <mesh position={[-0.08, 0.06, 0.072]} rotation-z={0.9} material={ink}>
        <boxGeometry args={[0.014, 0.22, 0.004]} />
      </mesh>
      <mesh position={[0, 0, 0.075]} rotation-x={Math.PI / 2} material={gold}>
        <cylinderGeometry args={[0.02, 0.02, 0.01, 10]} />
      </mesh>
      <mesh position={[0, 0, 0.07]} scale={[1, 1, 0.15]} material={glass}>
        <sphereGeometry args={[0.34, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      {/* Crown and bow on top */}
      <mesh position={[0, 0.43, 0]} material={gold}>
        <cylinderGeometry args={[0.04, 0.04, 0.08, 12]} />
      </mesh>
      <mesh position={[0, 0.53, 0]} rotation-y={Math.PI / 2} material={gold}>
        <torusGeometry args={[0.07, 0.018, 8, 18]} />
      </mesh>
      {/* Chain drooping off to the side */}
      {Array.from({ length: 8 }, (_, i) => {
        const t = i / 7
        return (
          <mesh
            key={i}
            position={[0.08 + t * 0.45, 0.58 - Math.sin(t * Math.PI) * 0.35 - t * 0.2, 0]}
            rotation={[i % 2 ? Math.PI / 2 : 0, 0, t * 1.2]}
            material={gold}
          >
            <torusGeometry args={[0.035, 0.012, 6, 12]} />
          </mesh>
        )
      })}
    </group>
  )
}

// ---- Celestial ----

function Excalibur() {
  const steel = shine('#e8f4ff', '#7ac8ff', 0.35, { metalness: 0.85, roughness: 0.15 })
  const fuller = metal('#9ab0c8')
  const gold = metal('#f2c230')
  const grip = plastic('#1a3a8a', { roughness: 0.6 })
  const gem = shine('#3aa0ff', '#1060ff', 1)
  const rock = plastic('#7a7a80', { roughness: 0.95, flatShading: true })
  const moss = plastic('#4a7a3a', { roughness: 1, flatShading: true })
  return (
    <group position={[0, -0.45, 0]}>
      {/* The stone it's drawn from */}
      <mesh position={[0, 0.08, 0]} scale={[1, 0.5, 0.85]} material={rock}>
        <dodecahedronGeometry args={[0.38, 0]} />
      </mesh>
      <mesh position={[0.15, 0.2, 0.15]} scale={[1, 0.3, 1]} material={moss}>
        <dodecahedronGeometry args={[0.12, 0]} />
      </mesh>
      {/* Blade, fuller and point */}
      <mesh position={[0, 0.65, 0]} material={steel}>
        <boxGeometry args={[0.11, 0.9, 0.03]} />
      </mesh>
      <mesh position={[0, 0.65, 0.016]} material={fuller}>
        <boxGeometry args={[0.025, 0.8, 0.005]} />
      </mesh>
      {/* Crossguard with curled ends */}
      <mesh position={[0, 1.12, 0]} material={gold}>
        <boxGeometry args={[0.46, 0.06, 0.08]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.25, 1.15, 0]} material={gold}>
          <sphereGeometry args={[0.045, 10, 8]} />
        </mesh>
      ))}
      <mesh position={[0, 1.12, 0.045]} material={gem}>
        <octahedronGeometry args={[0.045, 0]} />
      </mesh>
      {/* Wrapped grip and pommel */}
      <mesh position={[0, 1.3, 0]} material={grip}>
        <cylinderGeometry args={[0.035, 0.04, 0.3, 10]} />
      </mesh>
      {[1.2, 1.27, 1.34, 1.41].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation-x={Math.PI / 2} material={gold}>
          <torusGeometry args={[0.04, 0.008, 6, 14]} />
        </mesh>
      ))}
      <mesh position={[0, 1.5, 0]} material={gold}>
        <sphereGeometry args={[0.065, 14, 10]} />
      </mesh>
      <mesh position={[0, 1.5, 0.05]} material={gem}>
        <sphereGeometry args={[0.03, 10, 8]} />
      </mesh>
    </group>
  )
}

function AncientDragonSkull() {
  const bone = plastic('#e4d8b8', { roughness: 0.7 })
  const dark = plastic('#b8a882', { roughness: 0.8 })
  const socket = plastic('#120a1a')
  const eye = shine('#c06aff', '#9a2aff', 1.6)
  const tooth = plastic('#fffaf0', { roughness: 0.4 })
  return (
    <group position={[0, 0, -0.1]}>
      {/* Cranium and long snout */}
      <mesh scale={[0.36, 0.3, 0.42]} material={bone}>
        <sphereGeometry args={[1, 20, 16]} />
      </mesh>
      <mesh position={[0, -0.05, 0.48]} rotation-x={Math.PI / 2} scale={[1, 1, 0.65]} material={bone}>
        <cylinderGeometry args={[0.2, 0.12, 0.6, 12]} />
      </mesh>
      {/* Brow ridges and glowing sockets */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * 0.17, 0.1, 0.3]} rotation-z={s * 0.4} scale={[1, 0.45, 0.6]} material={dark}>
            <sphereGeometry args={[0.12, 12, 8]} />
          </mesh>
          <mesh position={[s * 0.17, 0.03, 0.31]} material={socket}>
            <sphereGeometry args={[0.08, 12, 10]} />
          </mesh>
          <mesh position={[s * 0.17, 0.03, 0.36]} material={eye}>
            <sphereGeometry args={[0.035, 10, 8]} />
          </mesh>
          {/* Nostril */}
          <mesh position={[s * 0.06, 0.04, 0.78]} material={socket}>
            <sphereGeometry args={[0.03, 8, 6]} />
          </mesh>
          {/* Swept-back horns, built from tapering segments */}
          {[0, 1, 2, 3].map((k) => (
            <mesh
              key={k}
              position={[s * (0.22 + k * 0.05), 0.18 + k * 0.06 - k * k * 0.012, -0.25 - k * 0.16]}
              rotation={[-1.2 + k * 0.25, 0, -s * 0.35]}
              material={k % 2 ? dark : bone}
            >
              <coneGeometry args={[0.075 - k * 0.015, 0.2, 8]} />
            </mesh>
          ))}
        </group>
      ))}
      {/* Upper teeth */}
      {[-1, 1].map((s) =>
        [0.3, 0.42, 0.54, 0.66].map((z, k) => (
          <mesh key={`${s}${k}`} position={[s * (0.15 - k * 0.015), -0.2, z]} rotation-x={Math.PI} material={tooth}>
            <coneGeometry args={[0.025, k === 0 ? 0.14 : 0.08, 6]} />
          </mesh>
        )),
      )}
      {/* Lower jaw hanging slightly open */}
      <mesh position={[0, -0.3, 0.36]} rotation-x={0.18} scale={[1, 0.4, 1]} material={dark}>
        <boxGeometry args={[0.32, 0.18, 0.6]} />
      </mesh>
    </group>
  )
}

function VoidOrb() {
  const core = plastic('#05020c', { roughness: 0.05, metalness: 0.9, emissive: '#1a0030', emissiveIntensity: 0.6 })
  const shell = shine('#6a2aff', '#5a00ff', 0.6, { transparent: true, opacity: 0.25, depthWrite: false })
  const ring = shine('#c06aff', '#a020ff', 1.3)
  const ring2 = shine('#ff4ad8', '#ff00c0', 1.1)
  const mote = shine('#e8d0ff', '#c08aff', 1.5)
  return (
    <group>
      <mesh material={core}>
        <sphereGeometry args={[0.3, 32, 24]} />
      </mesh>
      <mesh material={shell}>
        <sphereGeometry args={[0.4, 28, 20]} />
      </mesh>
      {/* Event-horizon rings */}
      <Spin speed={1.2} rotation-x={1.2}>
        <mesh material={ring}>
          <torusGeometry args={[0.5, 0.02, 8, 48]} />
        </mesh>
      </Spin>
      <Spin speed={-0.9} rotation={[0.4, 0, 0.9]}>
        <mesh material={ring2}>
          <torusGeometry args={[0.58, 0.014, 8, 48]} />
        </mesh>
      </Spin>
      {/* Matter being pulled in */}
      <Spin speed={2}>
        {Array.from({ length: 7 }, (_, i) => {
          const a = (i / 7) * Math.PI * 2
          const r = 0.45 + (i % 3) * 0.08
          return (
            <mesh key={i} position={[Math.cos(a) * r, Math.sin(a * 2) * 0.12, Math.sin(a) * r]} material={mote}>
              <sphereGeometry args={[0.025 + (i % 2) * 0.012, 8, 6]} />
            </mesh>
          )
        })}
      </Spin>
    </group>
  )
}

const RAINBOW = ['#ff3a3a', '#ff9a2a', '#ffe83a', '#4aff6a', '#3ad8ff', '#3a6aff', '#a04aff', '#ff4ac8']

function RainbowDiamond() {
  const mats = RAINBOW.map((c) => shine(c, c, 0.6, { roughness: 0.05, metalness: 0.2, flatShading: true }))
  const sparkle = shine('#ffffff', '#ffffff', 1.5)
  return (
    <group>
      <Spin speed={0.6}>
        <group rotation-x={0.35}>
          <CutGem mats={mats} r={0.45} crown={0.18} pavilion={0.5} table={0.5} seg={8} />
        </group>
      </Spin>
      <Sparkles
        mat={sparkle}
        spots={[[0.5, 0.25, 0.1], [-0.45, 0.3, -0.15], [0.2, 0.45, -0.3], [-0.3, -0.25, 0.3], [0.4, -0.2, -0.25]]}
      />
    </group>
  )
}

function AstralBlade() {
  const blade = shine('#9ae8ff', '#3ab8ff', 1, { transparent: true, opacity: 0.85 })
  const edge = shine('#e0d0ff', '#a06aff', 1.3)
  const gold = metal('#f2d060', { emissive: '#8a6a00', emissiveIntensity: 0.3 })
  const grip = plastic('#1a1440', { roughness: 0.5 })
  const star = shine('#fff6c0', '#ffe060', 1.5)
  const segs = 6
  return (
    <group position={[0, -0.55, 0]} rotation-z={0.15}>
      {/* Curved blade from short angled segments */}
      {Array.from({ length: segs }, (_, i) => {
        const t = i / segs
        const bend = t * t * 0.35
        return (
          <group key={i} position={[bend, 0.42 + i * 0.15, 0]} rotation-z={-t * 0.5}>
            <mesh material={blade}>
              <boxGeometry args={[0.13 - t * 0.05, 0.16, 0.025]} />
            </mesh>
            <mesh position={[0.065 - t * 0.025, 0, 0]} material={edge}>
              <boxGeometry args={[0.012, 0.16, 0.03]} />
            </mesh>
          </group>
        )
      })}
      <mesh position={[0.38, 1.33, 0]} rotation-z={-0.55} scale={[1, 1, 0.25]} material={edge}>
        <coneGeometry args={[0.045, 0.18, 4]} />
      </mesh>
      {/* Crescent-moon guard with a star at its heart */}
      <mesh position={[0, 0.32, 0]} rotation-z={Math.PI} material={gold}>
        <torusGeometry args={[0.2, 0.035, 8, 24, Math.PI]} />
      </mesh>
      <mesh position={[0, 0.32, 0.03]} material={star}>
        <octahedronGeometry args={[0.07, 0]} />
      </mesh>
      <mesh position={[0, 0.12, 0]} material={grip}>
        <cylinderGeometry args={[0.035, 0.04, 0.32, 10]} />
      </mesh>
      <mesh position={[0, -0.07, 0]} material={gold}>
        <octahedronGeometry args={[0.06, 0]} />
      </mesh>
      {/* Stardust trailing the blade */}
      <Sparkles mat={star} spots={[[-0.15, 0.9, 0.05], [0.5, 0.8, -0.05], [-0.08, 1.3, 0], [0.6, 1.2, 0.08], [0.15, 1.5, 0]]} size={0.03} />
    </group>
  )
}

function GalaxyPearl() {
  const pearl = shine('#f0e4ff', '#8a5aff', 0.35, { roughness: 0.12, metalness: 0.35 })
  const shellIn = plastic('#ffe8f4', { roughness: 0.25, metalness: 0.3, side: DoubleSide })
  const shellOut = plastic('#3a2a6a', { roughness: 0.6 })
  const blue = shine('#7ad0ff', '#3aa8ff', 1.4)
  const pink = shine('#ff9ae0', '#ff4ac0', 1.4)
  const arms = 2
  const dots = 12
  return (
    <group position={[0, -0.1, 0]}>
      {/* Open clam it rests in */}
      <mesh position={[0, -0.15, 0]} scale={[1, 0.35, 0.9]} material={shellOut}>
        <sphereGeometry args={[0.45, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
      </mesh>
      <mesh position={[0, -0.15, 0]} rotation-x={Math.PI} scale={[0.96, 0.3, 0.86]} material={shellIn}>
        <sphereGeometry args={[0.45, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <mesh position={[0, 0.0, -0.32]} rotation-x={-1.1} scale={[1, 0.35, 0.9]} material={shellOut}>
        <sphereGeometry args={[0.45, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <mesh position={[0, 0.08, 0]} material={pearl}>
        <sphereGeometry args={[0.24, 28, 20]} />
      </mesh>
      {/* Spiral galaxy arms swirling round it */}
      <Spin speed={0.8} position={[0, 0.08, 0]} rotation-x={0.35}>
        {Array.from({ length: arms }, (_, a) =>
          Array.from({ length: dots }, (_, i) => {
            const t = i / dots
            const ang = a * Math.PI + t * Math.PI * 1.6
            const r = 0.3 + t * 0.25
            return (
              <mesh key={`${a}-${i}`} position={[Math.cos(ang) * r, 0, Math.sin(ang) * r]} material={i % 2 ? blue : pink}>
                <sphereGeometry args={[0.03 - t * 0.015, 8, 6]} />
              </mesh>
            )
          }),
        )}
      </Spin>
    </group>
  )
}

const AURORA = ['#3affa0', '#3ae8d0', '#3ab8ff', '#7a6aff', '#c06aff', '#ff6ad0']

function AuroraVeil() {
  const silver = metal('#e8eef8', { roughness: 0.2 })
  const gem = shine('#7affd8', '#3affb0', 1.2)
  const panels = AURORA.map((c) => shine(c, c, 0.9, { transparent: true, opacity: 0.55, side: DoubleSide, depthWrite: false }))
  const w = 0.17
  return (
    <group position={[0, -0.1, 0]}>
      {/* Folded curtain of light hanging from a tiara */}
      {AURORA.map((_, i) => {
        const x = (i - (AURORA.length - 1) / 2) * w * 0.9
        return (
          <mesh
            key={i}
            position={[x, -0.05 - (i % 2) * 0.05, 0]}
            rotation-y={i % 2 ? 0.55 : -0.55}
            material={panels[i]}
          >
            <planeGeometry args={[w, 0.9 - Math.abs(i - 2.5) * 0.08]} />
          </mesh>
        )
      })}
      <mesh position={[0, 0.42, 0]} rotation-z={Math.PI} material={silver}>
        <torusGeometry args={[0.5, 0.03, 8, 32, Math.PI]} />
      </mesh>
      <mesh position={[0, 0.42, 0]} material={silver}>
        <boxGeometry args={[0.9, 0.04, 0.04]} />
      </mesh>
      <mesh position={[0, 0.5, 0]} material={gem}>
        <octahedronGeometry args={[0.08, 0]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.25, 0.47, 0]} material={gem}>
          <octahedronGeometry args={[0.04, 0]} />
        </mesh>
      ))}
    </group>
  )
}

// ---- Divine ----

function GoldenRocket() {
  const gold = metal('#f6c830', { roughness: 0.2, emissive: '#7a5000', emissiveIntensity: 0.3 })
  const red = shine('#e02a2a', '#a00000', 0.3, { metalness: 0.4 })
  const porthole = shine('#7ad8ff', '#3aa8ff', 0.8)
  const flame = shine('#ffb030', '#ff6a00', 1.4, { transparent: true, opacity: 0.9 })
  const core = shine('#fff6c0', '#ffffff', 1.6)
  return (
    <group rotation-z={0.35} position={[0, -0.05, 0]}>
      <mesh position={[0, 0.05, 0]} material={gold}>
        <cylinderGeometry args={[0.2, 0.22, 0.7, 24]} />
      </mesh>
      <mesh position={[0, 0.58, 0]} material={red}>
        <coneGeometry args={[0.2, 0.36, 24]} />
      </mesh>
      {[0.36, -0.22].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation-x={Math.PI / 2} material={red}>
          <torusGeometry args={[0.205, 0.02, 8, 24]} />
        </mesh>
      ))}
      {/* Porthole */}
      <mesh position={[0, 0.17, 0.2]} material={gold}>
        <torusGeometry args={[0.07, 0.02, 8, 18]} />
      </mesh>
      <mesh position={[0, 0.17, 0.205]} material={porthole}>
        <circleGeometry args={[0.065, 18]} />
      </mesh>
      {/* Three fins */}
      {[0, 1, 2].map((i) => (
        <group key={i} rotation-y={(i / 3) * Math.PI * 2}>
          <mesh position={[0.27, -0.25, 0]} rotation-z={0.25} material={red}>
            <boxGeometry args={[0.16, 0.3, 0.03]} />
          </mesh>
        </group>
      ))}
      {/* Nozzle and flame */}
      <mesh position={[0, -0.36, 0]} material={gold}>
        <cylinderGeometry args={[0.12, 0.17, 0.1, 18]} />
      </mesh>
      <mesh position={[0, -0.58, 0]} rotation-x={Math.PI} material={flame}>
        <coneGeometry args={[0.13, 0.4, 14]} />
      </mesh>
      <mesh position={[0, -0.52, 0]} rotation-x={Math.PI} material={core}>
        <coneGeometry args={[0.07, 0.25, 10]} />
      </mesh>
    </group>
  )
}

function CosmicCube() {
  const glass = shine('#7ad0ff', '#2a6aff', 0.4, { transparent: true, opacity: 0.22, depthWrite: false })
  const frame = metal('#f2d060', { emissive: '#a07a00', emissiveIntensity: 0.4 })
  const inner = shine('#ff6ae0', '#e020c0', 1.2, { flatShading: true })
  const star = shine('#ffffff', '#ffffff', 1.5)
  const s = 0.35
  const edges = []
  for (const axis of [0, 1, 2])
    for (const a of [-1, 1])
      for (const b of [-1, 1]) {
        const pos = [0, 0, 0]
        const size = [0.04, 0.04, 0.04]
        pos[(axis + 1) % 3] = a * s
        pos[(axis + 2) % 3] = b * s
        size[axis] = s * 2 + 0.04
        edges.push({ pos, size })
      }
  return (
    <group rotation={[0.5, 0.6, 0]}>
      <mesh material={glass}>
        <boxGeometry args={[s * 2, s * 2, s * 2]} />
      </mesh>
      {edges.map((e, i) => (
        <mesh key={i} position={e.pos} material={frame}>
          <boxGeometry args={e.size} />
        </mesh>
      ))}
      {/* Tesseract core turning inside */}
      <Spin speed={1.4} axis="x">
        <Spin speed={1}>
          <mesh rotation={[Math.PI / 4, 0, Math.PI / 4]} material={inner}>
            <boxGeometry args={[0.28, 0.28, 0.28]} />
          </mesh>
        </Spin>
      </Spin>
      <Sparkles mat={star} spots={[[0.2, 0.22, -0.18], [-0.22, -0.15, 0.2], [0.15, -0.25, 0.1], [-0.18, 0.2, -0.05]]} size={0.025} />
    </group>
  )
}

const INFINITY_STONES = ['#3a6aff', '#ffd83a', '#ff2a3a', '#a03aff', '#3aff6a', '#ff8a2a']

function InfinityGem() {
  const gold = metal('#f6cc3a', { emissive: '#8a6000', emissiveIntensity: 0.4 })
  const core = shine('#ffffff', '#e8d0ff', 1.3, { flatShading: true })
  const halo = shine('#fff2c0', '#ffd860', 1.2)
  return (
    <group>
      {/* Infinity loop: two rings meeting at the centre gem */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.26, 0, 0]} material={gold}>
          <torusGeometry args={[0.24, 0.05, 12, 36]} />
        </mesh>
      ))}
      <group rotation-x={Math.PI / 2}>
        <CutGem mats={core} r={0.12} crown={0.06} pavilion={0.12} />
      </group>
      {/* Six coloured stones set around the loops */}
      {INFINITY_STONES.map((c, i) => {
        const side = i < 3 ? -1 : 1
        const a = ((i % 3) - 1) * 1.1 + (side < 0 ? Math.PI : 0)
        return (
          <mesh key={c} position={[side * 0.26 + Math.cos(a) * 0.24, Math.sin(a) * 0.24, 0.05]} material={shine(c, c, 1)}>
            <octahedronGeometry args={[0.055, 0]} />
          </mesh>
        )
      })}
      <Spin speed={1} rotation-x={Math.PI / 2 - 0.3}>
        <mesh material={halo}>
          <torusGeometry args={[0.66, 0.012, 6, 48]} />
        </mesh>
      </Spin>
    </group>
  )
}

function GenesisSeed() {
  const seed = shine('#d8b860', '#b08a20', 0.45, { roughness: 0.3, metalness: 0.4 })
  const vein = shine('#9aff6a', '#4aff2a', 1.3)
  const leaf = shine('#5ae05a', '#2ab02a', 0.5)
  const root = plastic('#8a6a40', { roughness: 0.8 })
  const light = shine('#e8ffc0', '#c0ff6a', 1.5)
  return (
    <group position={[0, -0.12, 0]}>
      <mesh scale={[0.75, 1, 0.75]} material={seed}>
        <sphereGeometry args={[0.32, 24, 18]} />
      </mesh>
      {/* Glowing seams of life */}
      {[0, Math.PI / 3, (2 * Math.PI) / 3].map((r) => (
        <mesh key={r} rotation-y={r} scale={[0.76, 1.01, 0.76]} material={vein}>
          <torusGeometry args={[0.32, 0.01, 6, 36]} />
        </mesh>
      ))}
      {/* Sprout with two leaves */}
      <mesh position={[0.02, 0.45, 0]} rotation-z={-0.1} material={leaf}>
        <cylinderGeometry args={[0.02, 0.03, 0.3, 8]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.13, 0.6, 0]} rotation-z={-s * 0.9} scale={[0.4, 1, 0.12]} material={leaf}>
          <sphereGeometry args={[0.15, 12, 10]} />
        </mesh>
      ))}
      {/* Roots */}
      {[-0.6, 0, 0.6].map((r, i) => (
        <mesh key={i} position={[r * 0.2, -0.38, 0]} rotation-z={r} rotation-x={Math.PI} material={root}>
          <coneGeometry args={[0.025, 0.2, 6]} />
        </mesh>
      ))}
      {/* Orbiting motes of light */}
      <Spin speed={1.3}>
        {Array.from({ length: 6 }, (_, i) => {
          const a = (i / 6) * Math.PI * 2
          return (
            <mesh key={i} position={[Math.cos(a) * 0.5, Math.sin(a * 3) * 0.12, Math.sin(a) * 0.5]} material={light}>
              <sphereGeometry args={[0.03, 8, 6]} />
            </mesh>
          )
        })}
      </Spin>
    </group>
  )
}

function EternityClock() {
  const gold = metal('#f2c230', { emissive: '#7a5000', emissiveIntensity: 0.3 })
  const glass = plastic('#e0f4ff', { transparent: true, opacity: 0.3, roughness: 0.05, depthWrite: false })
  const sand = shine('#ffe8a0', '#ffc040', 0.9)
  const tick = shine('#fff6d0', '#ffe080', 1.3)
  return (
    <group>
      {/* Hourglass: two plates, three pillars, two glass bulbs */}
      {[0.5, -0.5].map((y) => (
        <mesh key={y} position={[0, y, 0]} material={gold}>
          <cylinderGeometry args={[0.3, 0.3, 0.07, 24]} />
        </mesh>
      ))}
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * 0.25, 0, Math.sin(a) * 0.25]} material={gold}>
            <cylinderGeometry args={[0.022, 0.022, 0.95, 8]} />
          </mesh>
        )
      })}
      <mesh position={[0, 0.24, 0]} material={glass}>
        <cylinderGeometry args={[0.2, 0.025, 0.46, 20]} />
      </mesh>
      <mesh position={[0, -0.24, 0]} material={glass}>
        <cylinderGeometry args={[0.025, 0.2, 0.46, 20]} />
      </mesh>
      {/* Sand: what's left on top, the stream, the pile below */}
      <mesh position={[0, 0.12, 0]} material={sand}>
        <cylinderGeometry args={[0.12, 0.02, 0.18, 16]} />
      </mesh>
      <mesh position={[0, -0.12, 0]} material={sand}>
        <cylinderGeometry args={[0.008, 0.008, 0.3, 6]} />
      </mesh>
      <mesh position={[0, -0.38, 0]} material={sand}>
        <coneGeometry args={[0.17, 0.18, 16]} />
      </mesh>
      {/* Clock dial ring orbiting the hourglass */}
      <Spin speed={0.5}>
        <group rotation-x={Math.PI / 2 - 0.25}>
          <mesh material={gold}>
            <torusGeometry args={[0.55, 0.02, 8, 48]} />
          </mesh>
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * Math.PI * 2
            return (
              <mesh key={i} position={[Math.cos(a) * 0.55, Math.sin(a) * 0.55, 0]} rotation-z={a} material={tick}>
                <boxGeometry args={[0.09, 0.025, 0.025]} />
              </mesh>
            )
          })}
        </group>
      </Spin>
    </group>
  )
}

function CreatorCrown() {
  const gold = metal('#ffd84a', { roughness: 0.15, emissive: '#a07000', emissiveIntensity: 0.4 })
  const white = shine('#ffffff', '#e8f4ff', 1, { flatShading: true })
  const velvet = plastic('#5a1aa0', { roughness: 0.9 })
  const halo = shine('#fff8d0', '#ffe890', 1.6)
  const gems = RAINBOW.map((c) => shine(c, c, 0.9, { flatShading: true }))
  return (
    <group position={[0, -0.25, 0]}>
      <mesh position={[0, 0.1, 0]} material={gold}>
        <cylinderGeometry args={[0.42, 0.38, 0.24, 28, 1, true]} />
      </mesh>
      <mesh position={[0, 0.1, 0]} scale={[1, 0.85, 1]} material={velvet}>
        <sphereGeometry args={[0.38, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      {/* Rainbow jewels round the band */}
      {gems.map((m, i) => {
        const a = (i / gems.length) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.sin(a) * 0.42, 0.1, Math.cos(a) * 0.42]} rotation-y={a} material={m}>
            <octahedronGeometry args={[0.05, 0]} />
          </mesh>
        )
      })}
      {/* Trident points: tall centre, two curved sides, around the crown */}
      {[0, 1, 2, 3].map((k) => (
        <group key={k} rotation-y={(k / 4) * Math.PI * 2}>
          <mesh position={[0, 0.48, 0.4]} material={gold}>
            <coneGeometry args={[0.05, 0.5, 6]} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.1, 0.36, 0.39]} rotation-z={-s * 0.3} material={gold}>
              <coneGeometry args={[0.035, 0.28, 6]} />
            </mesh>
          ))}
          <mesh position={[0, 0.76, 0.4]} material={white}>
            <octahedronGeometry args={[0.04, 0]} />
          </mesh>
        </group>
      ))}
      {/* Arches over the top, orb and cross */}
      {[0, Math.PI / 2].map((r) => (
        <mesh key={r} position={[0, 0.22, 0]} rotation-y={r} material={gold}>
          <torusGeometry args={[0.38, 0.025, 8, 24, Math.PI]} />
        </mesh>
      ))}
      <mesh position={[0, 0.64, 0]} material={gold}>
        <sphereGeometry args={[0.07, 14, 10]} />
      </mesh>
      <mesh position={[0, 0.77, 0]} material={white}>
        <boxGeometry args={[0.03, 0.16, 0.03]} />
      </mesh>
      <mesh position={[0, 0.79, 0]} material={white}>
        <boxGeometry args={[0.1, 0.03, 0.03]} />
      </mesh>
      {/* Floating halo */}
      <Spin speed={0.8} position={[0, 1.0, 0]}>
        <mesh rotation-x={Math.PI / 2} material={halo}>
          <torusGeometry args={[0.32, 0.02, 8, 40]} />
        </mesh>
      </Spin>
    </group>
  )
}

function OmegaStar() {
  const star = shine('#fff2b0', '#ffd23a', 1.3, { flatShading: true })
  const core = shine('#ffffff', '#ffffff', 2)
  const omega = metal('#ffffff', { emissive: '#bfe4ff', emissiveIntensity: 1 })
  const ring = shine('#ffe890', '#ffb020', 1.3)
  return (
    <group>
      <Spin speed={0.5} axis="z">
        {/* Five-point star, each point a flattened cone */}
        {Array.from({ length: 5 }, (_, i) => {
          const a = (i / 5) * Math.PI * 2
          return (
            <group key={i} rotation-z={a}>
              <mesh position={[0, 0.32, 0]} scale={[1, 1, 0.35]} material={star}>
                <coneGeometry args={[0.16, 0.45, 4]} />
              </mesh>
            </group>
          )
        })}
      </Spin>
      <mesh scale={[1, 1, 0.5]} material={star}>
        <sphereGeometry args={[0.2, 16, 12]} />
      </mesh>
      {/* Omega symbol on the front */}
      <group position={[0, 0.0, 0.11]}>
        <mesh position={[0, 0.02, 0]} rotation-z={-Math.PI * 0.2} material={omega}>
          <torusGeometry args={[0.09, 0.018, 8, 24, Math.PI * 1.4]} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.08, -0.07, 0]} material={omega}>
            <boxGeometry args={[0.07, 0.025, 0.025]} />
          </mesh>
        ))}
      </group>
      <mesh position={[0, 0, -0.06]} material={core}>
        <sphereGeometry args={[0.12, 14, 10]} />
      </mesh>
      {/* Orbiting ring with sparkles */}
      <Spin speed={1.2} rotation-x={1.1}>
        <mesh material={ring}>
          <torusGeometry args={[0.65, 0.015, 6, 48]} />
        </mesh>
        <Sparkles mat={core} spots={[[0.65, 0, 0], [-0.65, 0, 0], [0, 0.65, 0], [0, -0.65, 0]]} size={0.04} />
      </Spin>
    </group>
  )
}

// Stand-in for items that don't have a dedicated 3D model yet.
export function GenericItem() {
  return (
    <mesh position={[0, 0.5, 0]}>
      <octahedronGeometry args={[0.4]} />
      <meshStandardMaterial color="#c9c9c9" roughness={0.35} metalness={0.4} />
    </mesh>
  )
}

export const MODELS = {
  Rock, Coal, Bone, Skull, Mushroom, Anchor, Gem, 'Beaded Bracelet': Bracelet,
  Coin, 'Brass Bell': BrassBell, Binoculars, 'Iron Bar': IronBar, 'Pirate Hat': PirateHat,
  Anvil, Dagger, TNT, Bomb, Helmet, Quartz, Emerald, Amethyst, 'Porcelain Vase': PorcelainVase,
  // Common / Uncommon
  Feather, Seashell, Acorn, Pinecone, 'Old Boot': OldBoot, Compass, 'Silver Key': SilverKey,
  // Rare
  'Crystal Ball': CrystalBall, 'Ancient Scroll': AncientScroll, 'Golden Ring': GoldenRing,
  Ruby, Sapphire, 'Pocket Watch': PocketWatch,
  // Epic
  'Jade Idol': JadeIdol, 'Royal Crown': RoyalCrown, 'Viking Helmet': VikingHelmet, 'War Drum': WarDrum,
  'Dragon Egg': DragonEgg, 'Magic Lamp': MagicLamp, 'Siren Harp': SirenHarp, 'Pirate Flag': PirateFlag,
  'Moon Mask': MoonMask, 'Thunder Hammer': ThunderHammer, 'Golden Chalice': GoldenChalice,
  // Legendary
  'Phoenix Feather': PhoenixFeather, 'Star Fragment': StarFragment, 'Kraken Eye': KrakenEye,
  'Titan Gauntlet': TitanGauntlet, 'Sun Medallion': SunMedallion, 'Frost Crown': FrostCrown,
  'Griffin Claw': GriffinClaw, 'Storm Crown': StormCrown,
  // Mythic
  'Time Crystal': TimeCrystal, 'Celestial Harp': CelestialHarp, 'Obsidian Throne': ObsidianThrone,
  'Phoenix Heart': PhoenixHeart, 'Dream Catcher': DreamCatcher,
  // Celestial
  Excalibur, 'Ancient Dragon Skull': AncientDragonSkull, 'Void Orb': VoidOrb,
  'Rainbow Diamond': RainbowDiamond, 'Astral Blade': AstralBlade, 'Galaxy Pearl': GalaxyPearl,
  'Aurora Veil': AuroraVeil,
  // Divine
  'Golden Rocket': GoldenRocket, 'Cosmic Cube': CosmicCube, 'Infinity Gem': InfinityGem,
  'Genesis Seed': GenesisSeed, 'Eternity Clock': EternityClock, 'Creator Crown': CreatorCrown,
  'Omega Star': OmegaStar,
}
