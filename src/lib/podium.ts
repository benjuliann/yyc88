// Podium ceremony helpers.
//
//   const podium = (await loader.loadAsync('/models/calgary/podium.glb')).scene   // world coords, same as the environment
//   scene.add(podium)
//   const winner = await loader.loadAsync('/models/calgary/cheers/Cheer_ArmsUp.glb')
//   applySkierConfig(winner.scene, accessories, config)                  // from skierCustomization.ts
//   const mixer = putOnPodium(podium, 1, winner)                          // call mixer.update(dt) every frame
//
// Cheer clips: Stand, ArmsUp, Jump, Wave, FistPump, Clap. Each one loops seamlessly, has its root at the
// origin with the boot soles at y = 0, and has no skis or poles.
import * as THREE from 'three'
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js'

export type Place = 1 | 2 | 3

export function podiumSpot(podium: THREE.Object3D, place: Place): THREE.Object3D {
  const spot = podium.getObjectByName(`Podium_|_spot_${place}`)
  if (!spot) throw new Error(`podium spot ${place} not found`)
  return spot
}

/** Stands a loaded Cheer_* clip on a podium step (facing the front) and starts its loop. */
export function putOnPodium(podium: THREE.Object3D, place: Place, cheer: GLTF): THREE.AnimationMixer {
  const spot = podiumSpot(podium, place)
  spot.add(cheer.scene)
  cheer.scene.position.set(0, 0, 0)
  cheer.scene.quaternion.identity()
  // Keys start at Blender frame 1 (t = 1/24 s); shift them to 0 so the loop has no one-frame hold.
  const clip = cheer.animations[0]
  const t0 = Math.min(...clip.tracks.map((t) => t.times[0]))
  if (t0 > 0) {
    clip.tracks.forEach((t) => t.shift(-t0))
    clip.resetDuration()
  }
  const mixer = new THREE.AnimationMixer(cheer.scene)
  const action = mixer.clipAction(clip)
  action.setLoop(THREE.LoopRepeat, Infinity).play()
  action.time = Math.random() * clip.duration // so neighbours don't move in sync
  return mixer
}
