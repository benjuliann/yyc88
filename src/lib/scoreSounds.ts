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

let sad: HTMLAudioElement | null = null

// Crash sound, then the sad trombone once it finishes.
export function playWipeoutSound() {
  wipeout ??= new Audio('/sounds/e_s010.ogg')
  sad ??= new Audio('/sounds/sad.mp3')
  wipeout.onended = () => {
    sad!.currentTime = 0
    sad!.play().catch(() => {})
  }
  wipeout.currentTime = 0
  wipeout.play().catch(() => {})
}

// Countdown: one F1 start-light beep on each of 3, 2, 1.
let beep: HTMLAudioElement | null = null

export function playCountdownBeep() {
  beep ??= new Audio('/sounds/beep.mp3')
  beep.currentTime = 0
  beep.play().catch(() => {})
}

// Clean landing: crowd applause (8s, fades out on its own).
let applause: HTMLAudioElement | null = null

export function playApplause() {
  applause ??= new Audio('/sounds/applause.mp3')
  applause.volume = 0.7
  applause.currentTime = 0
  applause.play().catch(() => {})
}

// Cut off applause / sad trombone still playing from the last jump.
export function stopCrowdSounds() {
  if (wipeout) wipeout.onended = null
  halt(applause)
  halt(sad)
}

// Slope beds: ski loop on the in-run and again after the landing clip, wind loop in the air.
// land.mp3 is the thud cut from the landing effect, starting right at the impact.
type SlopeBed = 'off' | 'ski' | 'air' | 'ground'

let ski: HTMLAudioElement | null = null
let wind: HTMLAudioElement | null = null
let land: HTMLAudioElement | null = null
let bed: SlopeBed = 'off'

function loop(src: string, volume: number) {
  const a = new Audio(src)
  a.loop = true
  a.volume = volume
  return a
}

function halt(a: HTMLAudioElement | null) {
  if (!a) return
  a.pause()
  a.currentTime = 0
}

function startLoop(a: HTMLAudioElement) {
  if (!a.paused) return
  a.currentTime = 0
  a.play().catch(() => {})
}

// Create (and start loading) all three up front, so the wind and landing thud aren't late the
// first time they're needed.
function preload() {
  ski ??= loop('/sounds/ski.mp3', 0.55)
  wind ??= loop('/sounds/wind.ogg', 0.7)
  if (!land) {
    land = new Audio('/sounds/land.mp3')
    land.volume = 0.9
    land.preload = 'auto'
    land.load()
  }
}

export function syncSlopeSounds(next: SlopeBed) {
  if (next === bed) return
  const prev = bed
  bed = next
  if (next !== 'off') preload()

  if (next !== 'ski' && next !== 'ground') halt(ski)
  if (next !== 'air') halt(wind)
  if (next !== 'ground') halt(land)

  if (next === 'ski') {
    startLoop(ski!)
  } else if (next === 'air') {
    startLoop(wind!)
  } else if (next === 'ground' && prev === 'air') {
    halt(ski)
    land!.onended = () => {
      if (bed === 'ground') startLoop(ski!)
    }
    land!.currentTime = 0
    land!.play().catch(() => {})
  }
}
