import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { Reflector } from 'three/addons/objects/Reflector.js'
import { fixBlenderLights } from '../lib/skiModels'
import { createSnowOverlay } from '../lib/snowOverlay'
import type { Brick } from './bricks'
import { createSkyline } from './skyline'

const MODEL = '/models/plaza/olympic-plaza-historical.glb'
// On the east brick walkway, phone held up high (any lower and the terrace edge hides the sunken
// rink), tilted down over the named pavers toward the frozen pool and the arcade's south end.
const EYE = new THREE.Vector3(39.4, 2.5, 27)
const LOOK_AT = new THREE.Vector3(15.3, -4.5, -4.9)
const FOV = 42 // a little tighter than a phone's lens, so the distant rink and arcade read
const FILL_LIGHT = new THREE.Vector3(38.5, 3, 24) // just out of frame, so the names nearest the viewer read
const MAX_ENGRAVED = 300 // the bricks close enough to read; the rest of the plaza stays plain
const MAX_ENGRAVED_DISTANCE = 10
const BRICK_HALF_HEIGHT = 0.03 // from the GLB's brick meshes
const BRICK_SPACING = 0.205 // centre to centre along a row, from the GLB
// The GLB's pavers stand 7.5 cm proud of the pavement, so their sides show as walls along the
// walkway's edges and around holes; sink them almost flush with the pavement instead.
const BRICK_DROP = 0.07
const MAX_FILLED_GAP = 3 // missing bricks in a row this short are holes, not where the walkway ends
const HORIZON = new THREE.Color(0x3a3f86) // violet city glow low in the sky; distant buildings fade into it
const COLUMN_LIGHT = 0xffb15c // warm amber, like the arcade's uplights on winter nights
// Extra lamp posts (x, z) along the walkway, so the park reads at night; none stand between the camera and
// the rink, or close enough to the arcade to blow it out.
const NEW_LAMPS: [number, number][] = [[41.2, 12], [41, -6]]
const LIT_LAMP_DISTANCE = 60 // lamps further away only glow, which keeps the light count phone-friendly
// String lights scattered over each tree's canopy, in the tree's own space (from the GLB's tree meshes).
const CANOPY_CENTRE = new THREE.Vector3(0, 5, 0)
const CANOPY = new THREE.Vector3(2, 2.1, 2)
const BULBS_PER_TREE = 70
// Glow around the lamp heads, string lights, uplight fixtures and lit windows; only the brightest pixels bloom.
const BLOOM_STRENGTH = 0.6
const BLOOM_RADIUS = 0.2
const BLOOM_THRESHOLD = 0.92
const AMBIENCE = '/sounds/park.ogg' // the plaza's ambient bed, kept quiet
const AMBIENCE_VOLUME = 0.3
// Settled snow: white lawns, frosted canopies, caps on the arcade, benches and lamps, banks along the paving.
const SNOW = new THREE.MeshStandardMaterial({ color: 0xf2f6ff, roughness: 0.9 })
const SNOW_DEPTH = 0.08
const FROST = new THREE.Color(0xdfe8f5)
const FROSTED_CANOPY = 0.6 // how far the foliage is blended toward white
const BANK_EVERY_ROWS = 2 // brick rows are 10.5 cm apart; overlapping mounds every other row read as one ridge
const BANK_OFFSET = 0.3 // from the last brick's centre out onto the lawn
// The pool basin frozen into a rink: a soft reflection under a thin frosted layer.
const RINK_SIZE = 37 // the basin's footprint in the GLB
const ICE = new THREE.MeshStandardMaterial({ color: 0xe6f0fa, roughness: 0.25, transparent: true, opacity: 0.5 })

// The page's night blue overhead, brightening to the horizon glow, so trees and buildings stand out against it.
function twilight() {
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 256
  const ctx = canvas.getContext('2d')!
  const sky = ctx.createLinearGradient(0, 0, 0, 256)
  sky.addColorStop(0, '#101a33')
  sky.addColorStop(0.35, '#1c275e')
  sky.addColorStop(0.6, '#4b4f9e')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, 1, 256)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}
// "Historical brick tone 2": light enough for dark lettering to read on every engraved brick.
const ENGRAVED_TONE = new THREE.Color(0.45, 0.29, 0.22)
// Text reads away from the viewer: its top points north, or south when the camera faces south.
const PLATE = new THREE.PlaneGeometry(0.188, 0.094)
  .rotateX(-Math.PI / 2)
  .rotateY(LOOK_AT.z > EYE.z ? Math.PI : 0)

type Paver = { position: THREE.Vector3; mesh: THREE.InstancedMesh; index: number }

// Same brick, same shade every time: a slight lift or dip in brightness, never enough to hide the name.
function brightnessOf(id: string) {
  let hash = 0
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) | 0
  return 0.9 + (Math.abs(hash) % 5) * 0.05
}

// Carved letters: dark inside the cut, with light catching its lower lip.
function engraving(name: string, anisotropy: number) {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 256
  const ctx = canvas.getContext('2d')!
  const text = name.toUpperCase()
  const font = getComputedStyle(document.body).fontFamily
  ctx.letterSpacing = '6px'
  ctx.font = `600 100px ${font}`
  const size = Math.min(100, (100 * 450) / ctx.measureText(text).width)
  ctx.font = `600 ${size}px ${font}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = 'rgba(255, 232, 210, 0.35)'
  ctx.fillText(text, 256, 132)
  ctx.fillStyle = 'rgba(38, 20, 12, 0.85)'
  ctx.fillText(text, 256, 128)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = anisotropy
  return new THREE.MeshStandardMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  })
}

// The /bricks plaza: the historical Olympic Plaza model, with racers' names carved into the nearest pavers.
export default function PlazaScene({ bricks }: { bricks: Brick[] }) {
  const mountRef = useRef<HTMLDivElement>(null)
  const bricksRef = useRef(bricks)
  const engraveRef = useRef(() => {})

  useEffect(() => {
    const mount = mountRef.current!
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)) // capped so phones keep up with the bloom pass
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    // GLB doesn't carry Blender's world sky, so add a night sky + dim ambient light here.
    scene.background = twilight()
    scene.fog = new THREE.Fog(HORIZON, 30, 160)
    scene.add(new THREE.HemisphereLight(0x5a6c9c, 0x1a1a22, 0.6))

    const camera = new THREE.PerspectiveCamera(FOV, mount.clientWidth / mount.clientHeight, 0.05, 2000)
    camera.position.copy(EYE)
    camera.lookAt(LOOK_AT)

    const composer = new EffectComposer(renderer)
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(mount.clientWidth, mount.clientHeight),
      BLOOM_STRENGTH,
      BLOOM_RADIUS,
      BLOOM_THRESHOLD,
    )
    composer.addPass(new RenderPass(scene, camera))
    composer.addPass(bloom)
    composer.addPass(new OutputPass())
    // Nothing in the 3D scene moves, so it is only redrawn when something changes (names, size).
    const render = () => composer.render()
    const anisotropy = renderer.capabilities.getMaxAnisotropy()
    const materials = new Map<string, THREE.MeshStandardMaterial>()
    const plates = new THREE.Group()
    scene.add(plates)
    const pavers: Paver[] = []
    let engraved: Paver[] = []
    let disposed = false

    engraveRef.current = () => {
      const names = bricksRef.current
      plates.clear()
      for (const paver of engraved) paver.mesh.setColorAt(paver.index, new THREE.Color(1, 1, 1))
      // The pavers in view nearest the viewer, newest names closest.
      const ndc = new THREE.Vector3()
      engraved = pavers
        .filter((paver) => {
          if (paver.position.distanceTo(EYE) > MAX_ENGRAVED_DISTANCE) return false
          ndc.copy(paver.position).project(camera)
          return Math.abs(ndc.x) < 1.1 && Math.abs(ndc.y) < 1.1 && ndc.z < 1
        })
        .sort((a, b) => a.position.distanceTo(EYE) - b.position.distanceTo(EYE))
        .slice(0, names.length ? MAX_ENGRAVED : 0)
      engraved.forEach((paver, i) => {
        const brick = names[i % names.length]
        // Tint this one paver to the engraved tone, a touch lighter or darker per brick.
        const base = (paver.mesh.material as THREE.MeshStandardMaterial).color
        const tint = ENGRAVED_TONE.clone().multiplyScalar(brightnessOf(brick.id))
        paver.mesh.setColorAt(paver.index, new THREE.Color(tint.r / base.r, tint.g / base.g, tint.b / base.b))
        if (!materials.has(brick.name)) materials.set(brick.name, engraving(brick.name, anisotropy))
        const plate = new THREE.Mesh(PLATE, materials.get(brick.name))
        plate.position.copy(paver.position).setY(paver.position.y + BRICK_HALF_HEIGHT + 0.0005)
        plates.add(plate)
      })
      for (const mesh of new Set(pavers.map((paver) => paver.mesh))) mesh.instanceColor!.needsUpdate = true
      render()
    }

    new GLTFLoader().load(MODEL, (gltf) => {
      if (disposed) return
      fixBlenderLights(gltf.scene)
      const diffusers: THREE.Object3D[] = []
      const lampParts: THREE.Object3D[] = []
      const plinths: THREE.Mesh[] = []
      const trees: THREE.Object3D[] = []
      const capped: THREE.Mesh[] = []
      let basin: THREE.Mesh | undefined
      const frosted = new Map<THREE.Material, THREE.MeshStandardMaterial>()
      const litWindow = new THREE.MeshBasicMaterial({ color: 0xd9b57a })
      gltf.scene.traverse((o) => {
        // The Blender sun becomes moonlight.
        if (o instanceof THREE.DirectionalLight) {
          o.color.set(0x9fb2ff)
          o.intensity *= 0.12
        }
        // (GLTFLoader turns spaces in node names into underscores and drops dots.)
        if (/^Archive-positioned_deciduous_tree\d*$/.test(o.name)) trees.push(o)
        if (!(o instanceof THREE.Mesh)) return
        // Plaza lamps: glowing heads that light the paving around them.
        if (o.name.startsWith('Plaza_light_diffuser')) {
          o.material = new THREE.MeshBasicMaterial({ color: 0xffe2b0 })
          diffusers.push(o)
        }
        // The first lamp post's pieces, to copy for the extra lamps.
        if (/^Plaza_light_(pole|cap|diffuser)$/.test(o.name)) lampParts.push(o)
        if (o.name.startsWith('Arcade_•_column_plinth')) plinths.push(o)
        // Lights on in about a third of the office windows.
        if (o.name.includes('window') && Math.random() < 0.35) o.material = litWindow
        const material = o.material as THREE.MeshStandardMaterial
        if (material.name === 'Grass') o.material = SNOW
        if (material.name.startsWith('Foliage')) {
          if (!frosted.has(material)) {
            const frost = material.clone()
            frost.color.lerp(FROST, FROSTED_CANOPY)
            frosted.set(material, frost)
          }
          o.material = frosted.get(material)!
        }
        if (/^(Arcade_•_(continuous|return)_entablature|Arcade_kiosk_•_wall|Bench_•_seat_slat|Plaza_light_cap)/.test(o.name)) {
          capped.push(o)
        }
        if (o.name === 'Central_original_pool_and_Odeon_floor') basin = o
      })
      // A slab of snow on top of each, the size of its footprint.
      const slab = new THREE.BoxGeometry(1, 1, 1)
      for (const mesh of capped) {
        const box = new THREE.Box3().setFromBufferAttribute(mesh.geometry.getAttribute('position') as THREE.BufferAttribute)
        const size = box.getSize(new THREE.Vector3())
        const cap = new THREE.Mesh(slab, SNOW)
        cap.scale.set(size.x + 0.04, SNOW_DEPTH, size.z + 0.04)
        cap.position.set((box.min.x + box.max.x) / 2, box.max.y + SNOW_DEPTH / 2, (box.min.z + box.max.z) / 2)
        mesh.add(cap)
      }
      // The rink: the reflection sits on the basin floor, with the frosted ice just above it.
      if (basin) {
        const floor = basin.position.y + 0.16
        const flat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2)
        const reflection = new Reflector(new THREE.PlaneGeometry(RINK_SIZE, RINK_SIZE), {
          color: 0xc0d0e8,
          textureWidth: 512,
          textureHeight: 512,
        })
        const ice = new THREE.Mesh(new THREE.PlaneGeometry(RINK_SIZE, RINK_SIZE), ICE)
        reflection.quaternion.copy(basin.quaternion).multiply(flat)
        ice.quaternion.copy(reflection.quaternion)
        reflection.position.copy(basin.position).setY(floor)
        ice.position.copy(basin.position).setY(floor + 0.01)
        scene.add(reflection, ice)
      }
      scene.add(createSkyline())
      for (const [x, z] of NEW_LAMPS) {
        for (const part of lampParts) {
          const copy = part.clone()
          copy.position.set(x, part.position.y, z)
          gltf.scene.add(copy)
          if (part.name === 'Plaza_light_diffuser') diffusers.push(copy)
        }
      }
      const lamps = diffusers
        .filter((diffuser) => diffuser.position.distanceTo(EYE) < LIT_LAMP_DISTANCE)
        .map((diffuser) => {
          const lamp = new THREE.PointLight(0xffc98a, 120)
          lamp.position.copy(diffuser.position)
          return lamp
        })

      // String lights in every tree, like the plaza in winter.
      gltf.scene.updateMatrixWorld()
      const bulbs: number[] = []
      const bulb = new THREE.Vector3()
      for (const tree of trees) {
        for (let i = 0; i < BULBS_PER_TREE; i++) {
          bulb.randomDirection().multiply(CANOPY).add(CANOPY_CENTRE).applyMatrix4(tree.matrixWorld)
          bulbs.push(bulb.x, bulb.y, bulb.z)
        }
      }
      const strings = new THREE.BufferGeometry()
      strings.setAttribute('position', new THREE.Float32BufferAttribute(bulbs, 3))
      scene.add(new THREE.Points(strings, new THREE.PointsMaterial({ color: 0xffe0a8, size: 0.3 })))
      // Arcade uplights: one at the foot of each pillar, on the plaza side, washing up the
      // paired columns and into the capital.
      const fixture = new THREE.BoxGeometry(0.3, 0.05, 0.16)
      const glow = new THREE.MeshBasicMaterial({ color: 0xffd7a0 })
      for (const plinth of plinths) {
        const out = new THREE.Vector3(0, 0, 1).applyQuaternion(plinth.quaternion)
        if (out.dot(plinth.position) > 0) out.negate() // face the plaza centre
        const base = plinth.position.clone().addScaledVector(out, 0.35).setY(0.5)
        const uplight = new THREE.SpotLight(COLUMN_LIGHT, 150, 0, 0.35, 0.5)
        uplight.position.copy(base)
        uplight.target.position.copy(plinth.position).setY(4)
        const box = new THREE.Mesh(fixture, glow)
        box.position.copy(base)
        box.quaternion.copy(plinth.quaternion)
        scene.add(uplight, uplight.target, box)
      }
      // A lamp just out of frame, so the names nearest the viewer read at night.
      const nearby = new THREE.PointLight(0xffd29a, 30)
      nearby.position.copy(FILL_LIGHT)
      scene.add(...lamps, nearby)

      // ~45k brick nodes share six meshes; draw each mesh once, instanced, instead of 45k draw calls.
      const rows = new Map<string, { column: number; mesh: THREE.Mesh }[]>()
      gltf.scene.children = gltf.scene.children.filter((child) => {
        const cell = child.name.match(/^Brick_(\d+)_(\d+)$/)
        if (!(child instanceof THREE.Mesh && cell)) return true
        if (!rows.has(cell[1])) rows.set(cell[1], [])
        rows.get(cell[1])!.push({ column: Number(cell[2]), mesh: child })
        return false
      })
      const byGeometry = new Map<THREE.BufferGeometry, { material: THREE.Material; positions: THREE.Vector3[] }>()
      const lay = (mesh: THREE.Mesh, position: THREE.Vector3) => {
        if (!byGeometry.has(mesh.geometry)) byGeometry.set(mesh.geometry, { material: mesh.material as THREE.Material, positions: [] })
        byGeometry.get(mesh.geometry)!.positions.push(position.setY(position.y - BRICK_DROP))
      }
      const banks: THREE.Vector3[] = []
      for (const [key, row] of rows) {
        row.sort((a, b) => a.column - b.column)
        const banked = Number(key) % BANK_EVERY_ROWS === 0
        row.forEach(({ column, mesh }, i) => {
          lay(mesh, mesh.position.clone())
          // Fill holes in the paving with copies of the brick to their left.
          const gap = i + 1 < row.length ? row[i + 1].column - column - 1 : 0
          // Snow shovelled off the paving piles up just past both ends of each stretch of bricks.
          if (banked && (i === 0 || column - row[i - 1].column - 1 > MAX_FILLED_GAP)) {
            banks.push(mesh.position.clone().setX(mesh.position.x - BANK_OFFSET).setY(0))
          }
          if (banked && (i + 1 === row.length || gap > MAX_FILLED_GAP)) {
            banks.push(mesh.position.clone().setX(mesh.position.x + BANK_OFFSET).setY(0))
          }
          if (gap > MAX_FILLED_GAP) return
          for (let k = 1; k <= gap; k++) lay(mesh, mesh.position.clone().setX(mesh.position.x + k * BRICK_SPACING))
        })
      }
      const matrix = new THREE.Matrix4()
      for (const [geometry, { material, positions }] of byGeometry) {
        const instanced = new THREE.InstancedMesh(geometry, material, positions.length)
        positions.forEach((position, index) => {
          instanced.setMatrixAt(index, matrix.makeTranslation(position))
          instanced.setColorAt(index, new THREE.Color(1, 1, 1))
          pavers.push({ position, mesh: instanced, index })
        })
        scene.add(instanced)
      }
      const bank = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 6), SNOW, banks.length)
      banks.forEach((position, index) => {
        matrix.makeScale(0.25 + Math.random() * 0.1, 0.06 + Math.random() * 0.05, 0.22).setPosition(position)
        bank.setMatrixAt(index, matrix)
      })
      scene.add(bank, gltf.scene)
      document.fonts.ready.then(() => !disposed && engraveRef.current())
    })

    // Snow drifts down over the still plaza; it is a 2D overlay, so the 3D scene isn't redrawn for it.
    const snow = createSnowOverlay(mount)
    const still = { x: 0, y: 0, z: 0 }
    let last = performance.now()
    let frame = requestAnimationFrame(function fall(now) {
      snow.update(Math.min((now - last) / 1000, 0.1), still)
      last = now
      frame = requestAnimationFrame(fall)
    })

    // The park ambience fades in as soon as the browser allows sound: right away if the visitor has already
    // interacted with the site, otherwise on their first tap or key press here.
    const ambience = new Audio(AMBIENCE)
    ambience.loop = true
    ambience.volume = 0
    let fadeFrame = 0
    const fade = (to: number, ms: number, done?: () => void) => {
      cancelAnimationFrame(fadeFrame)
      const from = ambience.volume
      const start = performance.now()
      fadeFrame = requestAnimationFrame(function step(now) {
        const t = Math.min((now - start) / ms, 1)
        ambience.volume = from + (to - from) * t
        if (t < 1) fadeFrame = requestAnimationFrame(step)
        else done?.()
      })
    }
    const listen = () => {
      ambience
        .play()
        .then(() => {
          if (disposed) return ambience.pause()
          window.removeEventListener('pointerdown', listen)
          window.removeEventListener('keydown', listen)
          fade(AMBIENCE_VOLUME, 3000)
        })
        .catch(() => {})
    }
    listen()
    window.addEventListener('pointerdown', listen)
    window.addEventListener('keydown', listen)

    const onResize = () => {
      renderer.setSize(mount.clientWidth, mount.clientHeight)
      composer.setSize(mount.clientWidth, mount.clientHeight)
      snow.resize()
      camera.aspect = mount.clientWidth / mount.clientHeight
      camera.updateProjectionMatrix()
      engraveRef.current()
    }
    window.addEventListener('resize', onResize)

    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      snow.dispose()
      window.removeEventListener('resize', onResize)
      window.removeEventListener('pointerdown', listen)
      window.removeEventListener('keydown', listen)
      fade(0, 800, () => {
        ambience.pause()
        ambience.removeAttribute('src')
        ambience.load()
      })
      for (const material of materials.values()) {
        material.map?.dispose()
        material.dispose()
      }
      bloom.dispose()
      composer.dispose()
      renderer.dispose()
      mount.removeChild(renderer.domElement)
    }
  }, [])

  useEffect(() => {
    bricksRef.current = bricks
    engraveRef.current()
  }, [bricks])

  return <div ref={mountRef} className="plaza-scene" />
}
