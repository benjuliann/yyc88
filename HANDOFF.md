# HANDOFF: 3D Memorial Plaza (`/bricks`)

Branch: `olympicplaza`. Nothing from this work is committed yet.

## What exists now

`/bricks` renders the historical Olympic Plaza Blender model in three.js at night, with racers' names engraved into the bricks nearest the camera. It replaces the old CSS 3D brick floor on this page only.

| File | Change |
| --- | --- |
| `public/models/plaza/olympic-plaza-historical.glb` | New, 13 MB. Copied from `OlympicPlazaHistorical.zip` (the zip is untouched and still tracked). |
| `src/memorial/PlazaScene.tsx` | New. All the 3D work lives here. |
| `src/pages/MemorialPage.tsx` | Renders `<PlazaScene bricks={bricks} />` instead of `<BrickList>`. |
| `src/styles/memorial.css` | Added `.plaza-scene` (full-screen, navy fade at the top so the title reads). |

`BrickList.tsx` and the old `.plaza*` CSS are still used by `PlazaCeremony.tsx` (post-race). Do not delete them.

### How `PlazaScene.tsx` works

- **Camera:** fixed, crouched at `EYE` (39.4, 0.4, 27) looking at `LOOK_AT` (29, 1.6, 6), low on the east brick walkway looking toward the arcade. Tweak these two constants to reframe.
- **Bricks:** the GLB has ~45k separate brick nodes (`Brick_<row>_<col>`) sharing 6 meshes. They are pulled out of the scene and drawn as 6 `InstancedMesh`es. Never render them as 45k meshes.
- **Holes and walls:** the model's pavers stand 7.5 cm proud of the pavement, so their sides showed as walls. Every brick is lowered by `BRICK_DROP` (0.07). Gaps of up to `MAX_FILLED_GAP` (3) bricks in a row are filled with copies of the neighbouring brick. Longer gaps are where the walkway really ends, so they are left alone.
- **Engraving:** the `MAX_ENGRAVED` (160) bricks nearest the camera and inside the view get a name. A flat plane with a canvas-text texture sits on each brick. The brick is tinted via `setColorAt` to `ENGRAVED_TONE`, with a ±10% brightness shift per brick (`brightnessOf`). Tones are uniform on purpose so dark lettering stays legible. Names repeat if there are fewer bricks than names. `engraveRef` re-runs on resize, new data and font load. Materials are cached per name.
- **Night:** a `twilight()` canvas gradient is the sky background (navy overhead, violet at the horizon). Fog is `HORIZON`. A dim hemisphere light plus the model's sun, recoloured and dimmed to moonlight.
- **Lights:**
  - **Arcade uplights:** one amber `SpotLight` plus a small glowing box per arcade plinth (13 in total, one per column pair), aimed up into the capital. Colour is `COLUMN_LIGHT`.
  - **Plaza lamps:** the model's 8 lamp heads are made emissive. Lamps within `LIT_LAMP_DISTANCE` (60 m) of the camera also get a `PointLight`, and farther ones only glow. This keeps the light count phone-friendly.
  - **Extra lamps:** 5 more lamp posts, cloned from the model's first lamp, are placed at `NEW_LAMPS`.
  - **Foreground fill:** one extra `PointLight` at (38.5, 3, 24) so the nearest names read. Without it the foreground is too dark.
  - **Lit windows:** about 35% of the office windows use an emissive material. Which ones is random per page load.
  - **String lights:** `BULBS_PER_TREE` (70) glowing `Points` per tree (24 trees) inside `CANOPY`.
- **Snow:** reuses `createSnowOverlay` from `src/lib/snowOverlay.ts` (the ski-jump snow), driven by a `requestAnimationFrame` loop with zero camera velocity. This is a 2D canvas over the 3D view, so the flakes are not in the scene.
- **Render loop:** the 3D scene is rendered on demand (`render()` after engraving or resize), not every frame. Anything animated in the scene needs a real animation loop, so switch to `renderer.setAnimationLoop`.

### Gotchas learned the hard way

- **GLTFLoader renames nodes:** spaces become `_` and dots are dropped (`Plaza light diffuser.001` becomes `Plaza_light_diffuser001`). Match with `startsWith` or a regex on the underscore form. The names in the GLB JSON itself still have spaces. `•` is kept.
- **Meshes are positioned by node transform:** brick, lamp and tree meshes have an identity geometry and a node translation, and trees also have rotation and scale. Use `matrixWorld` after `updateMatrixWorld()` when you need world positions, as the string-light code does.
- **Walkway extents:** it is only ~4 m wide (x ≈ 36–41 at z 14–36). A camera placed even 1 m off it clips into the lawn.
- **Brick materials:** the six brick materials are `Historical brick tone 0–5`. `ENGRAVED_TONE` equals tone 2.
- **Blender sun units:** the exported sun is in lux (683 per unit). `fixBlenderLights` from `src/lib/skiModels.ts` handles it.
- **Verifying visually:** headless Chrome with software GL works:
  `chrome.exe --headless=new --ignore-certificate-errors --use-angle=swiftshader --enable-unsafe-swiftshader --window-size=1600,860 --virtual-time-budget=30000 --screenshot=out.png https://localhost:5173/bricks`
  The dev server is HTTPS (basic-ssl), so `--ignore-certificate-errors` is required.
- **Dead code left on purpose:** `PlazaScene.tsx` no longer uses anything from `BrickList`, and `memorial.css` still has the old `.plaza__*` rules for the ceremony.

### Known issues

- At phone width the title "The Memorial Plaza" runs off the edge. This comes from the existing `.memorial__title` styles, not this work. It has not been fixed.
- The 13 MB GLB is fetched with no loading state, so the page is just the sky colour until it arrives.
- The floor no longer drifts toward the viewer as the old page did. The camera is fixed.
- The `gltf.scene` is rebuilt per mount with no `dispose()` of its geometries and materials on unmount. This is harmless for a single page but worth fixing if the route is revisited often.

## Next steps (in this order)

### 1. Wind sound (`wind.ogg`)
- `public/sounds/wind.ogg` is already in the repo and is already used by the ski jump, so reuse it. See `src/lib/scoreSounds.ts` and `src/pages/SkiJumpPage.tsx` for how that code plays it.
- Loop it quietly as an ambient bed.
- Browsers block audio until a user gesture, so add a small "tap to listen" prompt, or start on the first pointer or key event. Do not autoplay on load.
- Stop and clean it up on unmount. Fade in and out.
- Later ideas for the same system: distant traffic hum, a CTrain bell (the 7 Avenue transit line is in the model), a City Hall clock chime.

### 2. Bloom (three.js `UnrealBloomPass`)
- Use `EffectComposer` + `RenderPass` + `UnrealBloomPass` + `OutputPass` from `three/addons/postprocessing/*`.
- Target the lamp heads, string lights, uplight fixtures and lit windows. They are already bright emissive or `MeshBasicMaterial`. Start with a high threshold (~0.85), strength ≈ 0.6–0.8, low radius.
- The render loop must change from on-demand to a real animation loop (see above). Keep `renderer.setPixelRatio` capped at 2 for phones.
- Check that the engraved names stay legible (bloom softens thin text) and that the navy fade over the title still works.

### 3. Ice rink
- The pool basin is in the model (`Pool basin` material, `Pool perimeter coping` nodes around (-11…15, -1.3, -14…14)). The camera currently faces away from it, toward the arcade. Decide whether to turn the camera or add a rink-style foreground.
- Freeze it: replace the basin material with a pale, glossy ice surface (high smoothness, light blue-white), and reflect coloured light. A `Reflector` or a fake reflection plane both work, so pick the cheapest.
- Optional: a few skater silhouettes on the ice.

### 4. Settled snow (needed)
- The snow currently falls but never lands, because it is a 2D overlay. The ground needs white cover:
  - White lawns (the `Grass` material, `Archive-traced lawn bed *`).
  - A snow cap on the arcade entablature and capitals, benches and fence tops.
  - Snow on tree canopies.
  - Snowbanks along the walkway edges, like the reference photos.
- Cheapest approach: retint materials and add a flat white plane or decals. Avoid new geometry in the 45k-brick area.
- Keep the engraved bricks clear of snow so the names stay readable.

### 5. Calgary 1988 skyline (the Calgary Tower is required)
- The reference photo (the 1988 night aerial with fireworks) shows the skyline behind the plaza, with the Calgary Tower on the left.
- The model only has the plaza block and the Arts Commons massing, so everything beyond it needs adding as simple lit boxes far away, fogged into `HORIZON`.
- The Calgary Tower is the key landmark: a tall slender shaft with the bulbous observation pod and the lit top, about 191 m tall. Place it so it is visible from `EYE` looking toward the arcade. The first photos suggest it sits behind and to the left of the arcade, but check the real bearing against the model's north.
- Add the other towers as plain lit blocks with window grids, using the reference photo for positions and heights. The Hyatt and TD Square are visible in the model's own view. Verify each building's completion year before adding it: Bankers Hall, for example, was finished after 1988, so it must not appear.
- Keep it cheap: instanced boxes plus an emissive window texture. Skip real lights.

## Not done / out of scope so far

- No tests. There is no test framework in this repo, and verification has been visual (screenshots) plus `npx tsc -b` and `oxlint`.
- No commit. Everything above is in the working tree on `olympicplaza`.
