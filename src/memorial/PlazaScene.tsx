import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { fixBlenderLights } from '../lib/skiModels'
import { createSnowOverlay } from '../lib/snowOverlay'
import type { Brick } from './bricks'
import { createSkyline } from './skyline'

const MODEL = '/models/plaza/olympic-plaza-historical.glb'
// Crouched on the east brick walkway with a phone near the ground, looking across the pavers to the arcade.
const EYE = new THREE.Vector3(39.4, 0.4, 27)
const LOOK_AT = new THREE.Vector3(29, 1.6, 6)
const MAX_ENGRAVED = 160 // the bricks close enough to read; the rest of the plaza stays plain
const MAX_ENGRAVED_DISTANCE = 7
const BRICK_HALF_HEIGHT = 0.03 // from the GLB's brick meshes
const BRICK_SPACING = 0.205 // centre to centre along a row, from the GLB
// The GLB's pavers stand 7.5 cm proud of the pavement, so their sides show as walls along the
// walkway's edges and around holes; sink them almost flush with the pavement instead.
const BRICK_DROP = 0.07
const MAX_FILLED_GAP = 3 // missing bricks in a row this short are holes, not where the walkway ends
const HORIZON = new THREE.Color(0x3a3f86) // violet city glow low in the sky; distant buildings fade into it
const COLUMN_LIGHT = 0xffb15c // warm amber, like the arcade's uplights on winter nights
// Extra lamp posts (x, z) along both edges of the walkway and out on the lawn, so the park reads at night.
const NEW_LAMPS: [number, number][] = [[41.2, 12], [33.4, 3], [24, 16], [14, 6], [41, -6]]
const LIT_LAMP_DISTANCE = 60 // lamps further away only glow, which keeps the light count phone-friendly
// String lights scattered over each tree's canopy, in the tree's own space (from the GLB's tree meshes).
const CANOPY_CENTRE = new THREE.Vector3(0, 5, 0)
const CANOPY = new THREE.Vector3(2, 2.1, 2)
const BULBS_PER_TREE = 70
// Race-end ceremony (seconds): a beat on the empty pavers, one name every STAGGER, each dropping in over
// DROP, a beat on the finished row, then a slow pull back out to the plaza view.
const CEREMONY = { HOLD: 1, STAGGER: 0.9, DROP: 0.5, LINGER: 1.2, PAN_OUT: 6 }

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
const PLATE = new THREE.PlaneGeometry(0.188, 0.094).rotateX(-Math.PI / 2) // text reads away from the viewer

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
// After a race, `laying` is how many of `bricks` (from the front) were just laid: the camera starts close
// over those pavers, sets each name into the pavement, then pulls back to the plaza view and calls `onLaid`.
export default function PlazaScene({ bricks, laying = 0, onLaid }: { bricks: Brick[]; laying?: number; onLaid?: () => void }) {
  const mountRef = useRef<HTMLDivElement>(null)
  const bricksRef = useRef(bricks)
  const engraveRef = useRef(() => {})
  // Read once: the ceremony is set up when the scene mounts.
  const ceremonyRef = useRef({ laying, onLaid })

  useEffect(() => {
    const mount = mountRef.current!
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    // GLB doesn't carry Blender's world sky, so add a night sky + dim ambient light here.
    scene.background = twilight()
    scene.fog = new THREE.Fog(HORIZON, 30, 160)
    scene.add(new THREE.HemisphereLight(0x5a6c9c, 0x1a1a22, 0.6))
    scene.add(createSkyline())

    // Far enough to reach the westernmost downtown towers, about 1.5 km off.
    const camera = new THREE.PerspectiveCamera(50, mount.clientWidth / mount.clientHeight, 0.05, 2500)
    camera.position.copy(EYE)
    camera.lookAt(LOOK_AT)
    // Which pavers get names is always decided from the plaza view, even while the ceremony camera is elsewhere.
    const home = camera.clone()

    const render = () => renderer.render(scene, camera)
    const anisotropy = renderer.capabilities.getMaxAnisotropy()
    const materials = new Map<string, THREE.MeshStandardMaterial>()
    const plates = new THREE.Group()
    scene.add(plates)
    const pavers: Paver[] = []
    let engraved: Paver[] = []
    let disposed = false
    // The ceremony's new names: their plates drop in and their pavers take the engraved tone as they land.
    const { laying: laidCount, onLaid: whenLaid } = ceremonyRef.current
    let laid: { plate: THREE.Mesh; paver: Paver; tint: THREE.Color }[] = []
    let ceremonyTime = laidCount ? 0 : null

    engraveRef.current = () => {
      const names = bricksRef.current
      plates.clear()
      for (const paver of engraved) paver.mesh.setColorAt(paver.index, new THREE.Color(1, 1, 1))
      // The pavers in view nearest the viewer, newest names closest.
      const ndc = new THREE.Vector3()
      engraved = pavers
        .filter((paver) => {
          if (paver.position.distanceTo(EYE) > MAX_ENGRAVED_DISTANCE) return false
          ndc.copy(paver.position).project(home)
          return Math.abs(ndc.x) < 1.1 && Math.abs(ndc.y) < 1.1 && ndc.z < 1
        })
        .sort((a, b) => a.position.distanceTo(EYE) - b.position.distanceTo(EYE))
        .slice(0, names.length ? MAX_ENGRAVED : 0)
      for (const { plate } of laid) (plate.material as THREE.Material).dispose()
      laid = []
      engraved.forEach((paver, i) => {
        const brick = names[i % names.length]
        // Tint this one paver to the engraved tone, a touch lighter or darker per brick.
        const base = (paver.mesh.material as THREE.MeshStandardMaterial).color
        const engravedTone = ENGRAVED_TONE.clone().multiplyScalar(brightnessOf(brick.id))
        const tint = new THREE.Color(engravedTone.r / base.r, engravedTone.g / base.g, engravedTone.b / base.b)
        if (!materials.has(brick.name)) materials.set(brick.name, engraving(brick.name, anisotropy))
        const plate = new THREE.Mesh(PLATE, materials.get(brick.name))
        plate.position.copy(paver.position).setY(paver.position.y + BRICK_HALF_HEIGHT + 0.0005)
        plates.add(plate)
        if (ceremonyTime !== null && i < laidCount) {
          // Its own material, so it can fade in on its own; the ceremony places it each frame.
          plate.material = materials.get(brick.name)!.clone()
          laid.push({ plate, paver, tint })
        } else paver.mesh.setColorAt(paver.index, tint)
      })
      if (ceremonyTime !== null) layBricks()
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
      const litWindow = new THREE.MeshBasicMaterial({ color: 0xd9b57a })
      const snowCover = new THREE.MeshStandardMaterial({ color: 0xe6ecf7, roughness: 0.9 })
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
        // Snow lies on the lawns; the brick walkways are kept clear so the names read.
        if (o.name.startsWith('Archive-traced_lawn_bed') && !o.name.includes('exclusion')) o.material = snowCover
        // Lights on in about a third of the office windows.
        if (o.name.includes('window') && Math.random() < 0.35) o.material = litWindow
      })
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
      nearby.position.set(38.5, 3, 24)
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
      for (const row of rows.values()) {
        row.sort((a, b) => a.column - b.column)
        row.forEach(({ column, mesh }, i) => {
          lay(mesh, mesh.position.clone())
          // Fill holes in the paving with copies of the brick to their left.
          const gap = i + 1 < row.length ? row[i + 1].column - column - 1 : 0
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
      scene.add(gltf.scene)
      document.fonts.ready.then(() => {
        if (disposed) return
        engraveRef.current()
        if (ceremonyTime !== null) startCeremony()
      })
    })

    // --- Race-end ceremony ---
    const glow = new THREE.PointLight(0xffc070, 0, 1.5) // flares on each name as it lands
    scene.add(glow)
    const closeUp = { pos: new THREE.Vector3(), target: new THREE.Vector3() }
    const target = new THREE.Vector3()
    const landAt = (i: number) => CEREMONY.HOLD + i * CEREMONY.STAGGER + CEREMONY.DROP

    // Puts each new name where it is at the current ceremony time: waiting above, dropping, or set.
    function layBricks() {
      let flare = 0
      laid.forEach(({ plate, paver, tint }, i) => {
        const p = THREE.MathUtils.clamp((ceremonyTime! - (landAt(i) - CEREMONY.DROP)) / CEREMONY.DROP, 0, 1)
        const rest = paver.position.y + BRICK_HALF_HEIGHT + 0.0005
        plate.position.setY(rest + (1 - p) ** 2 * 0.5)
        plate.scale.setScalar(1 + (1 - p) * 0.6)
        ;(plate.material as THREE.MeshStandardMaterial).opacity = p
        paver.mesh.setColorAt(paver.index, p === 1 ? tint : new THREE.Color(1, 1, 1))
        const since = ceremonyTime! - landAt(i)
        if (since >= 0 && since < 1.2 && 1 - since / 1.2 > flare) {
          flare = 1 - since / 1.2
          glow.position.copy(paver.position).setY(paver.position.y + 0.25)
        }
      })
      glow.intensity = flare * 3
      for (const mesh of new Set(laid.map(({ paver }) => paver.mesh))) mesh.instanceColor!.needsUpdate = true
    }

    function startCeremony() {
      if (!laid.length) return finishCeremony()
      // Close over the new names, a little toward the plaza view so they read the same way up.
      laid.forEach(({ paver }) => closeUp.target.add(paver.position))
      closeUp.target.divideScalar(laid.length)
      const towardEye = EYE.clone().sub(closeUp.target).setY(0).setLength(0.5)
      closeUp.pos.copy(closeUp.target).add(towardEye).setY(closeUp.target.y + 1.1)
      let last = performance.now()
      renderer.setAnimationLoop((now) => {
        ceremonyTime! += Math.min((now - last) / 1000, 0.1)
        last = now
        layBricks()
        const panFrom = landAt(laid.length - 1) + CEREMONY.LINGER
        // Only the new names at first; everyone else's fade in around them as the view pulls back.
        const reveal = THREE.MathUtils.smootherstep(ceremonyTime!, panFrom, panFrom + CEREMONY.PAN_OUT / 2)
        for (const material of materials.values()) material.opacity = reveal
        const t = THREE.MathUtils.smootherstep(ceremonyTime!, panFrom, panFrom + CEREMONY.PAN_OUT)
        camera.position.lerpVectors(closeUp.pos, EYE, t)
        camera.lookAt(target.lerpVectors(closeUp.target, LOOK_AT, t))
        render()
        if (ceremonyTime! >= panFrom + CEREMONY.PAN_OUT) finishCeremony()
      })
    }

    function finishCeremony() {
      renderer.setAnimationLoop(null)
      ceremonyTime = null
      glow.intensity = 0
      for (const material of materials.values()) material.opacity = 1
      engraveRef.current() // settle into the plain plaza view
      whenLaid?.()
    }

    // Snow drifts down over the still plaza; the 3D scene itself only redraws when something changes.
    const snow = createSnowOverlay(mount)
    const still = { x: 0, y: 0, z: 0 }
    let last = performance.now()
    let frame = requestAnimationFrame(function fall(now) {
      snow.update(Math.min((now - last) / 1000, 0.1), still)
      last = now
      frame = requestAnimationFrame(fall)
    })

    const onResize = () => {
      renderer.setSize(mount.clientWidth, mount.clientHeight)
      snow.resize()
      camera.aspect = home.aspect = mount.clientWidth / mount.clientHeight
      camera.updateProjectionMatrix()
      home.updateProjectionMatrix()
      engraveRef.current()
    }
    window.addEventListener('resize', onResize)

    // Park ambience on a loop. Browsers block audio until the user interacts, so if autoplay is
    // refused, start it on the first click or key press.
    const park = new Audio('/sounds/park.mp3')
    park.loop = true
    park.volume = 0.1
    const startPark = () => {
      park.play().catch(() => {})
      window.removeEventListener('pointerdown', startPark)
      window.removeEventListener('keydown', startPark)
    }
    park.play().catch(() => {
      if (disposed) return // left the plaza while play() was pending
      window.addEventListener('pointerdown', startPark)
      window.addEventListener('keydown', startPark)
    })

    return () => {
      disposed = true
      park.pause()
      window.removeEventListener('pointerdown', startPark)
      window.removeEventListener('keydown', startPark)
      renderer.setAnimationLoop(null)
      cancelAnimationFrame(frame)
      for (const { plate } of laid) (plate.material as THREE.Material).dispose()
      snow.dispose()
      window.removeEventListener('resize', onResize)
      for (const material of materials.values()) {
        material.map?.dispose()
        material.dispose()
      }
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
