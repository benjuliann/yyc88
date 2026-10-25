// Landing sounds: a rising scale (each file a semitone up), so longer jumps sound higher.
// SOUNDS[i] plays from MIN_DISTANCE[i] metres up to the next entry.
const SOUNDS = ['e_s004', 'e_s005', 'e_s006', 'e_s007', 'e_s008', 'e_s009']
const MIN_DISTANCE = [0, 35, 70, 105, 140, 175]

let audio: HTMLAudioElement[] | null = null

// `rate` < 1 plays it slower and lower (pitch isn't preserved), e.g. 0.8 ≈ 4 semitones down.
export function playScoreSound(distance: number, rate = 1) {
  audio ??= SOUNDS.map((f) => new Audio(`/sounds/${f}.ogg`))
  const band = MIN_DISTANCE.filter((min) => distance >= min).length - 1
  const sound = audio[Math.max(0, band)]
  sound.preservesPitch = false
  sound.playbackRate = rate
  sound.currentTime = 0
  // Browsers block audio until the user has interacted; the player has pressed keys by now.
  sound.play().catch(() => {})
}

let wipeout: HTMLAudioElement | null = null

export function playWipeoutSound() {
  wipeout ??= new Audio('/sounds/e_s010.ogg')
  wipeout.currentTime = 0
  wipeout.play().catch(() => {})
}
