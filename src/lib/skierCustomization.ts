// Applies a menu SkierConfig to a loaded skier clip (animations/Jump_XXXm.glb or Fall_XXXm.glb).
//
//   const accessories = await loadSkierAccessories('/models/calgary/skier-accessories.glb') // once
//   const clip = await new GLTFLoader().loadAsync('/models/calgary/animations/Jump_100m.glb')
//   applySkierConfig(clip.scene, accessories, loadSkier())
//
// Safe to call again whenever the config changes: it rebuilds the skier's materials and
// accessories from scratch each time. Accessories are parented to the animated skier nodes
// (head, torso, ski), so they follow every Jump and Fall animation with no extra work.
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import type { SkierConfig } from '../pages/CustomizePage'

// Material names in the clip GLBs.
const M = {
  skin: 'Sports mascot • warm skin',
  face: 'Sports mascot • facial features',
  smile: 'Sports mascot • smile',
  hair: 'Sports mascot • chestnut hair',
  helmet: 'Skier • helmet ivory',
  helmetStripe: 'Skier • helmet stripe',
  jacket: 'Skier • vermilion insulated jacket',
  pants: 'Skier • midnight navy pants',
  boots: 'Skier • boots',
  gloves: 'Skier • gloves',
  skis: 'Skier • electric blue skis',
  skiGraphic: 'Skier • ski graphic',
  bindings: 'Skier • bindings',
  poles: 'Skier • pole shafts',
}

const TAG = 'skierAccessory'

export async function loadSkierAccessories(url: string): Promise<THREE.Object3D> {
  return (await new GLTFLoader().loadAsync(url)).scene
}

// GLTFLoader turns "Jump_100m | head pose" into "Jump_100m_|_head_pose"; the original is in userData.name.
function findPart(skier: THREE.Object3D, part: string): THREE.Object3D | undefined {
  const plain = ' | ' + part
  const sanitized = THREE.PropertyBinding.sanitizeNodeName(plain)
  let found: THREE.Object3D | undefined
  skier.traverse((o) => {
    if (found || o.userData[TAG]) return
    if ((o.userData.name as string | undefined)?.endsWith(plain) || o.name.endsWith(sanitized)) found = o
  })
  return found
}

function patternTexture(c: SkierConfig): THREE.CanvasTexture {
  // The torso UVs wrap around the body: u = 0.25 is the chest, v runs bottom to top.
  const W = 128, H = 64
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const g = canvas.getContext('2d')!
  g.fillStyle = c.shirtColor; g.fillRect(0, 0, W, H)
  g.fillStyle = g.strokeStyle = c.patternColor
  if (c.pattern === 'stripes') {
    for (let y = 4; y < H; y += 12) g.fillRect(0, y, W, 5)
  } else if (c.pattern === 'checks') {
    for (let y = 0; y < H; y += 8) for (let x = (y / 8) % 2 ? 8 : 0; x < W; x += 16) g.fillRect(x, y, 8, 8)
  } else if (c.pattern === 'snowflake') {
    g.lineWidth = 2.5; g.lineCap = 'round'
    g.translate(W * 0.25, H * 0.5)
    for (let k = 0; k < 6; k++) {
      g.rotate(Math.PI / 3)
      g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -16)
      g.moveTo(0, -10); g.lineTo(-4, -14); g.moveTo(0, -10); g.lineTo(4, -14)
      g.stroke()
    }
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.magFilter = THREE.NearestFilter
  return tex
}

export function applySkierConfig(skier: THREE.Object3D, accessories: THREE.Object3D, c: SkierConfig): void {
  // Drop accessories from a previous call.
  const old: THREE.Object3D[] = []
  skier.traverse((o) => { if (o.userData[TAG]) old.push(o) })
  for (const o of old) {
    o.removeFromParent()
    o.traverse((m) => { if (m instanceof THREE.Mesh) (m.material as THREE.Material).dispose() })
  }

  const colors: Record<string, string | null> = {
    [M.skin]: c.skin,
    [M.hair]: c.hairColor,
    [M.helmet]: c.hatColor,
    [M.jacket]: c.shirtColor,
    [M.pants]: c.pantsColor,
    [M.boots]: c.bootColor,
    [M.gloves]: c.mittenColor,
    [M.skis]: c.gearColor,
  }
  const hidden = new Set([M.face, M.smile, M.hair]) // replaced by the eyes/mouth/hair accessories
  if (c.hatStyle !== 'helmet') { hidden.add(M.helmet); hidden.add(M.helmetStripe) }
  if (c.gear !== 'skis') [M.skis, M.skiGraphic, M.bindings, M.poles].forEach((n) => hidden.add(n))
  const torso = findPart(skier, 'insulated jacket torso')

  // Give every skier mesh its own material copy, recoloured or hidden. Hiding goes through
  // material.visible so accessories parented to a hidden part (the snowboard on the ski) still show.
  skier.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || o.userData[TAG]) return
    const orig: THREE.MeshStandardMaterial = o.userData.originalMaterial ?? o.material
    o.userData.originalMaterial = orig
    if (o.material !== orig) {
      (o.material as THREE.MeshStandardMaterial).map?.dispose()
      ;(o.material as THREE.Material).dispose()
    }
    const mat = orig.clone()
    if (colors[orig.name]) mat.color.set(colors[orig.name]!)
    mat.visible = !hidden.has(orig.name)
    if (o === torso && c.pattern !== 'none') {
      mat.map = patternTexture(c)
      mat.color.set('#ffffff')
    }
    o.material = mat
  })
  // Pole baskets share a material with other parts, so they are hidden by node.
  skier.traverse((o) => {
    if (o.name.includes('pole_basket')) o.visible = c.gear === 'skis'
  })

  const attach = (name: string, colorFor: Record<string, string | null> = {}) => {
    const src = accessories.getObjectByName(name)
    if (!src) return console.warn('skier accessory missing:', name)
    const part = findPart(skier, src.userData.attach)
    if (!part) return console.warn('skier part missing:', src.userData.attach)
    const acc = src.clone()
    acc.userData[TAG] = true
    acc.traverse((m) => {
      if (!(m instanceof THREE.Mesh)) return
      m.userData[TAG] = true
      const mat = (m.material as THREE.MeshStandardMaterial).clone()
      const col = colorFor[mat.name]
      if (col) mat.color.set(col)
      m.material = mat
    })
    part.add(acc)
  }

  const hair = { 'acc • hair': c.hairColor }
  if (c.hatStyle === 'beanie') {
    attach('hat_beanie', { 'acc • hat': c.hatColor })
    attach(`pom_${c.pomSize}`, { 'acc • hat': c.hatColor })
  }
  if (c.hatStyle === 'cap') attach('hat_cap', { 'acc • hat': c.hatColor })
  if (c.hairStyle !== 'none') attach(`hair_${c.hairStyle}`, hair)
  if (c.beard !== 'none') attach(`beard_${c.beard}`, hair)
  attach(`eyes_${c.eyes}`)
  attach(`mouth_${c.mouth}`)
  if (c.gogglesColor) attach('goggles', { 'acc • goggles lens': c.gogglesColor })
  if (c.shadesColor) attach('shades', { 'acc • shades lens': c.shadesColor })
  if (c.earColor) attach('earmuffs', { 'acc • earmuffs': c.earColor })
  if (c.maskColor) attach('mask', { 'acc • mask': c.maskColor })
  if (c.scarfColor) attach('scarf', { 'acc • scarf': c.scarfColor })
  if (c.packColor) attach('backpack', { 'acc • backpack': c.packColor })
  if (c.gear !== 'skis') attach(`gear_${c.gear}`, { 'acc • gear': c.gearColor })
}
