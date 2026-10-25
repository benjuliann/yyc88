import { onChildAdded, onChildChanged, ref, set } from 'firebase/database'
import { rtdb } from './firebase'

// TODO: placeholder payload for the round-trip test; swap for the real controller state once it's designed.
// key is 'tilt' (with tilt from -1 full left to 1 full right), 'jump' or 'restart'.
export type Input = { key: string; at: number; tilt?: number }

// The phone overwrites its latest input at input/{room}/{playerId}.
export function sendInput(room: string, playerId: string, key: string, tilt?: number) {
  return set(ref(rtdb, `input/${room}/${playerId}`), { key, tilt: tilt ?? null, at: Date.now() })
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
