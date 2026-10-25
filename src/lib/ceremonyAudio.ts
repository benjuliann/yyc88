// Ceremony sound. The plaza's brick thud, golden bell and background music are made with the Web Audio
// API (no audio files, nothing to license); the podium's anthem is the public domain United States
// Navy Band recording of "O Canada" (Wikimedia Commons).
let ctx: AudioContext | null = null
const audio = () => {
  ctx ??= new AudioContext()
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}

const C5 = 523.25
// Major pentatonic steps (semitones), so each brick's bell rings a note higher than the last.
const BELL_STEPS = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24]
// A golden bell: a handbell's inharmonic partials [frequency ratio, level, seconds to ring out].
const PARTIALS: [number, number, number][] = [
  [1, 0.5, 2.4],
  [2, 0.22, 1.7],
  [2.76, 0.16, 1.2],
  [5.4, 0.09, 0.7],
  [8.93, 0.05, 0.4],
]

function envelope(g: GainNode, t: number, peak: number, attack: number, decay: number) {
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(peak, t + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay)
}

function bell(c: AudioContext, out: AudioNode, freq: number, t: number, level: number) {
  for (const [ratio, amp, decay] of PARTIALS) {
    const osc = c.createOscillator()
    osc.frequency.value = freq * ratio
    const g = c.createGain()
    envelope(g, t, amp * level, 0.003, decay)
    osc.connect(g).connect(out)
    osc.start(t)
    osc.stop(t + decay + 0.1)
  }
}

/** A name setting into the pavement: a soft stone thud with a golden bell over it. `step` = brick number. */
export function playBrickLand(step: number) {
  const c = audio()
  const t = c.currentTime
  const out = c.createGain()
  out.gain.value = 0.8
  out.connect(c.destination)

  // Thud: a quick downward-swept sine, plus a burst of muffled grit.
  const thud = c.createOscillator()
  thud.frequency.setValueAtTime(150, t)
  thud.frequency.exponentialRampToValueAtTime(45, t + 0.18)
  const tg = c.createGain()
  envelope(tg, t, 0.9, 0.004, 0.24)
  thud.connect(tg).connect(out)
  thud.start(t)
  thud.stop(t + 0.3)

  const len = Math.floor(c.sampleRate * 0.12)
  const grit = c.createBuffer(1, len, c.sampleRate)
  const data = grit.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2
  const noise = c.createBufferSource()
  noise.buffer = grit
  const muffle = c.createBiquadFilter()
  muffle.type = 'lowpass'
  muffle.frequency.value = 900
  const ng = c.createGain()
  ng.gain.value = 0.3
  noise.connect(muffle).connect(ng).connect(out)
  noise.start(t)

  // The bell lands a moment after the thud, a step higher for every brick.
  bell(c, out, C5 * 2 ** (BELL_STEPS[step % BELL_STEPS.length] / 12), t + 0.02, 0.45)
}

// Background music: slow pad chords with a soft bell arpeggio, I-vi-IV-V in C, one chord per bar.
const BAR = 2.4 // seconds
const CHORDS = [
  [261.63, 329.63, 392.0], // C
  [220.0, 261.63, 329.63], // Am
  [174.61, 220.0, 261.63], // F
  [196.0, 246.94, 293.66], // G
]

let music: { gain: GainNode; timer: number } | null = null

function playBar(c: AudioContext, out: AudioNode, chord: number[], t: number) {
  // Pad: two slightly detuned triangles per note through a warm low-pass, swelling in and out.
  const warm = c.createBiquadFilter()
  warm.type = 'lowpass'
  warm.frequency.value = 1200
  warm.connect(out)
  for (const f of chord) {
    for (const detune of [-6, 6]) {
      const osc = c.createOscillator()
      osc.type = 'triangle'
      osc.frequency.value = f
      osc.detune.value = detune
      const g = c.createGain()
      g.gain.setValueAtTime(0.0001, t)
      g.gain.linearRampToValueAtTime(0.05, t + BAR * 0.4)
      g.gain.linearRampToValueAtTime(0.0001, t + BAR * 1.05)
      osc.connect(g).connect(warm)
      osc.start(t)
      osc.stop(t + BAR * 1.1)
    }
  }
  // Arpeggio: the chord's notes an octave up, as quiet bells.
  ;[0, 1, 2, 1].forEach((n, i) => bell(c, out, chord[n] * 2, t + (i * BAR) / 4, 0.12))
}

/** Starts the looping background music (no-op if already playing). */
export function startCeremonyMusic() {
  if (music) return
  const c = audio()
  const gain = c.createGain()
  gain.gain.setValueAtTime(0.0001, c.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.5, c.currentTime + 2)
  gain.connect(c.destination)
  // Schedule bars a little ahead of time so timer jitter never leaves a gap.
  let next = c.currentTime + 0.1
  let bar = 0
  const schedule = () => {
    while (next < c.currentTime + BAR) {
      playBar(c, gain, CHORDS[bar % CHORDS.length], next)
      next += BAR
      bar++
    }
  }
  schedule()
  music = { gain, timer: window.setInterval(schedule, 400) }
}

/** Fades the background music out over `seconds`. */
export function stopCeremonyMusic(seconds = 2) {
  if (!music || !ctx) return
  const { gain, timer } = music
  music = null
  window.clearInterval(timer)
  gain.gain.cancelScheduledValues(ctx.currentTime)
  gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + seconds)
  window.setTimeout(() => gain.disconnect(), seconds * 1000 + 100)
}

let anthem: HTMLAudioElement | null = null

/** "O Canada", once, while the medal podium is shown. */
export function playAnthem() {
  anthem ??= new Audio('/sounds/o-canada.ogg')
  anthem.volume = 0.6
  anthem.currentTime = 0
  anthem.play().catch(() => {})
}

export function stopAnthem() {
  anthem?.pause()
}
