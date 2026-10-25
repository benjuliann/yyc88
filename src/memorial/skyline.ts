import * as THREE from 'three'

// Downtown Calgary as it stood for the 1988 Games, beyond the edge of the plaza model. Positions are
// metres on the model's own grid (+x east, -z north, from its origin at 51.04586 N, 114.05900 W),
// converted from each building's coordinates on Wikipedia's list of tallest buildings in Calgary.
// Only towers finished by 1987: Bankers Hall (1989) and Canterra Tower (1988) are left out.
const TOWERS: [x: number, z: number, height: number][] = [
  [-400, -244, 215], // Petro-Canada Centre west (1984), now Suncor Energy Centre
  [-303, -244, 130], // Petro-Canada Centre east (1984)
  [-770, -152, 167], // First Canadian Centre (1982)
  [-1275, 34, 164], // Western Canadian Place north (1983)
  [-1256, 65, 128], // Western Canadian Place south (1983)
  [-595, -59, 155], // Scotia Centre (1976), now Stephen Avenue Place
  [-1411, -90, 153], // 801 Seventh (1982)
  [-478, -275, 143], // Bow Valley Square 2 (1975)
  [-556, -213, 134], // Bow Valley Square 4 (1981)
  [-556, -275, 123], // Bow Valley Square 3 (1979)
  [-711, -59, 141], // Dome Tower (1977)
  [-711, 3, 137], // Home Oil Tower (1977)
  [-1081, -306, 140], // Fifth and Fifth (1980)
  [-828, -461, 140], // Shell Centre (1977)
  [-478, -368, 133], // Fifth Avenue Place east (1981)
  [-556, -368, 133], // Fifth Avenue Place west (1981)
  [-906, -430, 126], // Altius Centre (1973)
  [-381, 96, 125], // The Edison (1982)
  [-653, -337, 124], // Stock Exchange Tower (1979)
  [-1275, -306, 124], // Hewlett Packard Tower (1975)
  [-342, -430, 117], // Ampersand east (1984)
  [-381, -461, 113], // Ampersand north (1982)
  [-1431, -213, 116], // AMEC Place (1982)
  [-128, -337, 114], // First Tower (1980)
  [-711, -337, 113], // One Calgary Place (1968)
  [-984, -59, 109], // WaterMark Tower (1983)
  [-420, 250, 101], // Mount Royal House (1969)
]
const CALGARY_TOWER = new THREE.Vector3(-286, 0, 173) // 101 9 Avenue SW, 51.04431 N, 114.06309 W
// The Calgary Tower's outline (radius, height) in metres, turned on a lathe: tapering shaft, flared
// observation pod at about 160 m, and the lantern on top at 191 m.
const TOWER_PROFILE: [number, number][] = [
  [0, 0], [9, 0], [6.5, 148], [8, 151], [14, 156], [14, 166], [12.5, 170], [9, 172], [9, 176], [4, 178],
  [2.2, 185], [1.2, 191], [0, 191],
]
const FOOTPRINT = 32 // metres; real footprints vary, this reads right from the plaza
const FLOOR = 3.8 // metres per storey
const WALL = 0x0d1330

// One storey of lit and dark office windows, tiled up each tower.
function windows() {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 512
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = `#${WALL.toString(16).padStart(6, '0')}`
  ctx.fillRect(0, 0, 128, 512)
  for (let y = 0; y < 512; y += 8) {
    for (let x = 0; x < 128; x += 8) {
      const lit = Math.random()
      ctx.fillStyle = lit < 0.3 ? '#ffd89a' : lit < 0.45 ? '#7a6644' : '#1a2346'
      ctx.fillRect(x + 1, y + 2, 6, 5)
    }
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  return texture
}

// The skyline is far past the scene's fog, so it ignores fog and is tinted toward the night haze instead.
export function createSkyline() {
  const skyline = new THREE.Group()
  const box = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0)
  const roof = new THREE.MeshBasicMaterial({ color: WALL, fog: false })
  const grid = windows()
  for (const [x, z, height] of TOWERS) {
    const width = FOOTPRINT * (0.85 + Math.random() * 0.35)
    const map = grid.clone()
    map.repeat.set(width / 48, height / (64 * FLOOR))
    map.offset.set(Math.random(), Math.random())
    const side = new THREE.MeshBasicMaterial({ map, color: 0xb4b4d8, fog: false })
    const tower = new THREE.Mesh(box, [side, side, roof, roof, side, side])
    tower.position.set(x, 0, z)
    tower.scale.set(width, height, FOOTPRINT)
    skyline.add(tower)
  }

  // The Calgary Tower: floodlit shaft, a ring of lit pod windows, and the torch that burned on top for the Games.
  const shaft = new THREE.Mesh(
    new THREE.LatheGeometry(TOWER_PROFILE.map(([r, y]) => new THREE.Vector2(r, y)), 24),
    new THREE.MeshBasicMaterial({ color: 0x5a5470, fog: false }),
  )
  const pod = new THREE.Mesh(
    new THREE.CylinderGeometry(14.1, 14.1, 6, 24, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffe2b0, fog: false }),
  )
  pod.position.y = 161
  const torch = new THREE.Mesh(
    new THREE.ConeGeometry(2.2, 9, 12),
    new THREE.MeshBasicMaterial({ color: 0xff9a3c, fog: false }),
  )
  torch.position.y = 195.5
  const calgaryTower = new THREE.Group().add(shaft, pod, torch)
  calgaryTower.position.copy(CALGARY_TOWER)
  skyline.add(calgaryTower)
  return skyline
}
