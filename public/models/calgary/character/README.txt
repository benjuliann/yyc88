SKIER — STANDALONE CHARACTER (skier.glb)

The ski-jump skier on its own: no hill, environment, camera or lights. Built from the "Skier" scene in
../calgary-jump-variants-5m-steerable.blend (backup of the file before this change: backups/).

CONVENTIONS
- glTF Y-up, metres. "Skier | root" is the top node: at the origin, identity transform, NO animation.
- The skier faces +Z. Skis rest on y = 0 (ski undersides at y = 0 in Idle/Tuck/Takeoff/Land).
- Size: 2.51 m from ski underside to helmet top standing upright (Idle); ~1.95 m in the in-run crouch.
  This is the original model scale (big-headed mascot proportions; the helmet alone is ~0.5 m).
  For a 1.9 m upright skier, scale "Skier | root" by 0.757 in three.js.
- The static (no clip playing) pose is Idle frame 1.

NODE HIERARCHY (three.js sanitises names: spaces -> "_", dots removed, e.g. "Skier_|_head_pose")
Skier | root
  Skier | steer                      identity, never animated (set position.x / rotation for steering)
    Skier | trick pivot              animated by Takeoff, Flight, Land, Fall (Fall carries the slide here)
      Skier | articulated body coordinates   static (0, -0.91, 0)
        body parts: pants pelvis, insulated jacket torso, head pose (> helmet shell), thigh(.001), shin(.001),
        upper arm(.001), forearm(.001), glove(.001), ski boot(.001), boot cuff stripe(.001),
        blue ski(.001), ski binding(.001), ski graphic(.001), pole(.001), pole basket(.001)
  ("" = skier's right, ".001" = left.) Accessory attach nodes kept: head pose, insulated jacket torso, blue ski.

MATERIALS (one per part)
Sports mascot • warm skin / facial features / smile / chestnut hair; Skier • helmet ivory / helmet stripe /
vermilion insulated jacket / midnight navy pants / boots / gloves / electric blue skis / ski graphic / bindings /
pole shafts. Plus "Skier • boots and gloves", still used by the two pole baskets (as in the jump clips).

ANIMATIONS (24 fps, keys start at t = 0; every clip drives all 28 animated nodes — trick pivot + 27 parts —
with translation, rotation and scale, so switching/crossfading clips never leaves a part stranded)
  Idle     2.0 s  loop   upright on skis, poles planted, breathing                         (IK-built)
  Tuck     1.0 s  loop   in-run crouch from the jump clips (action frame 60) + slight bob   (source pose)
  Takeoff  0.5 s  once   source action frames 100 -> 118 (crouch -> extension), easing into the Flight pose
  Flight   1.0 s  loop   V-style: skis in a V (±12°), body leaning ~56-62°, slight wobble   (IK-built)
  Land     1.0 s  once   telemark absorb (feet split ±0.24 m, arms out) -> rises to the Idle stance (IK-built)
  Fall     5.0 s  once   the Fall_100m crash from landing to rest: edge catch, face plant, somersault,
                         slide on the back, rest, arm raise; skis and poles fly off.
Limb lengths are animated through scale (thigh, shin, upper arm, forearm); every other part keeps scale 1.

FALL TRAVEL
The slide is on "Skier | trick pivot", not the root: 26.16 m forward (+Z), 0.01 m sideways, measured along the
landing slope and laid flat (ground stays at y = 0). It ends 26.16 m ahead of where it starts; move/re-parent the
character afterwards if the next clip should start where the skier came to rest.

THREE.JS
  const gltf = await loader.loadAsync('skier.glb')
  applySkierConfig(gltf.scene, accessories, config)            // ../character-customization, unchanged
  const mixer = new THREE.AnimationMixer(gltf.scene)
  mixer.clipAction(THREE.AnimationClip.findByName(gltf.animations, 'Idle')).play()
Loop the Idle/Tuck/Flight clips; play Takeoff/Land/Fall with LoopOnce + clampWhenFinished = true.

VERIFIED
- Re-imported into an empty Blender: 6 animations, 0 cameras, 0 lights, root at the origin with no animation
  channels, steer with no channels, gloves 0.22 x 0.25 x 0.28 m, skis at y = 0.
- three.js r170: all six clips play with skier-accessories.glb + applySkierConfig (preview-threejs.png).

FILES
  skier.glb                 the character with the six animations
  preview-poses-front.png   the six poses side by side (Idle, Tuck, Takeoff, Flight, Land, Fall), Blender render
  preview-poses-side.png    same, in profile (right to left)
  preview-threejs.png       the six clips in three.js with accessories and colours applied
  build-stats.json          numbers from the last build
  scripts/                  charpipe.py (build actions + save + export), charexport.py (export + GLB fixes),
                            charverify.py (re-import check), charpreview.py (renders), charbuild.py (shared code).
                            Run headless: blender -b <blend> --python scripts/charpipe.py -- <this folder>,
                            then scripts/charexport.py the same way (it re-exports and patches skier.glb).
