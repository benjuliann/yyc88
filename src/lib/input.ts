import { onChildAdded, onChildChanged, onValue, ref, set } from 'firebase/database'
import { rtdb } from './firebase'

// TODO: placeholder payload for the round-trip test; swap for the real controller state once it's designed.
// key is 'tilt' (with tilt from -1 full left to 1 full right), 'start' or 'jump'.
// at is when it was made, in Firebase server time (see serverNow).
export type Input = { key: string; at: number; tilt?: number }

// Every device's clock is off by a different amount; Firebase tells each one how far it is from the
// server's, so phone and screen can compare times.
let serverOffset = 0
onValue(ref(rtdb, '.info/serverTimeOffset'), (snap) => (serverOffset = snap.val() ?? 0))
export const serverNow = () => Date.now() + serverOffset

// The phone overwrites its latest input at input/{room}/{playerId}.
export function sendInput(room: string, playerId: string, key: string, tilt?: number) {
  return set(ref(rtdb, `input/${room}/${playerId}`), { key, tilt: tilt ?? null, at: serverNow() })
}

// What the big screen shows the phones: whose turn it is, the stage of the run, and the two meters
// (balance from -1 to 1, take-off bar from 0 to 1).
export type RunState = { turn: string; phase: string; balance: number; lip: number }

export function sendState(room: string, state: RunState) {
  return set(ref(rtdb, `state/${room}`), state)
}

export function watchState(room: string, onState: (state: RunState | null) => void) {
  return onValue(ref(rtdb, `state/${room}`), (snap) => onState(snap.val()))
}

// Calls back once per input, with the player who sent it.
export function watchInput(room: string, onInput: (playerId: string, input: Input) => void) {
  const inputs = ref(rtdb, `input/${room}`)
  const handle = (snap: { key: string | null; val: () => Input }) => onInput(snap.key!, snap.val())
  const offAdded = onChildAdded(inputs, handle)
  const offChanged = onChildChanged(inputs, handle)
  return () => {
    offAdded()
    offChanged()
  }
}
