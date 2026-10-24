import * as THREE from 'three'

// Blender exports of the Calgary 1988 ski jump (see public/models/calgary/manifest.json).
export const MODELS = '/models/calgary'
export const DISTANCES = Array.from({ length: 41 }, (_, i) => i * 5)
export const clipFile = (m: number) => `${MODELS}/animations/Jump_${String(m).padStart(3, '0')}m.glb`

export type Manifest = { clips: { distance_m: number; fps: number; landing_frame: number }[] }

// Blender exports sun strength in lux (683 per unit); three expects ~1–3.
export function fixBlenderLights(root: THREE.Object3D) {
  root.traverse((o) => {
    if (o instanceof THREE.DirectionalLight) o.intensity = (o.intensity / 683) * 3
  })
}
