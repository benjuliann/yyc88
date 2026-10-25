import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { db } from './firebase'

// No I or O, so codes can't be misread as 1 or 0.
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'

export type Phase = 'lobby' | 'playing'
export type Player = { id: string; name: string }

export function isValidRoomCode(code: string) {
  return /^[A-HJ-NP-Z]{4}$/.test(code)
}

function randomCode() {
  return Array.from({ length: 4 }, () => LETTERS[Math.floor(Math.random() * LETTERS.length)]).join('')
}

export async function createRoom() {
  for (;;) {
    const code = randomCode()
    const ref = doc(db, 'rooms', code)
    if (!(await getDoc(ref)).exists()) {
      await setDoc(ref, { phase: 'lobby', createdAt: serverTimestamp() })
      return code
    }
  }
}

export function startRace(code: string) {
  return updateDoc(doc(db, 'rooms', code), { phase: 'playing' })
}

// Call once a race is finished. Firestore doesn't delete a document's subcollections
// along with it, so the players are deleted first, all in one batch.
export async function deleteRoom(code: string) {
  const batch = writeBatch(db)
  const players = await getDocs(collection(db, 'rooms', code, 'players'))
  players.forEach((player) => batch.delete(player.ref))
  batch.delete(doc(db, 'rooms', code))
  await batch.commit()
}

export function joinRoom(code: string, playerId: string, name: string) {
  return setDoc(doc(db, 'rooms', code, 'players', playerId), { name, joinedAt: serverTimestamp() })
}

export function leaveRoom(code: string, playerId: string) {
  return deleteDoc(doc(db, 'rooms', code, 'players', playerId))
}

// Calls back with null when the room doesn't exist.
export function watchRoom(code: string, onChange: (phase: Phase | null) => void) {
  return onSnapshot(doc(db, 'rooms', code), (snap) => onChange(snap.exists() ? snap.data().phase : null))
}

export function watchPlayers(code: string, onChange: (players: Player[]) => void) {
  const players = query(collection(db, 'rooms', code, 'players'), orderBy('joinedAt'))
  return onSnapshot(players, (snap) => onChange(snap.docs.map((d) => ({ id: d.id, name: d.data().name }))))
}

// Not crypto.randomUUID(): it's missing on plain-HTTP pages, like a phone testing over the LAN.
export function getPlayerId() {
  const newId = () => Math.random().toString(36).slice(2, 12)
  try {
    let id = sessionStorage.getItem('playerId')
    if (!id) {
      id = newId()
      sessionStorage.setItem('playerId', id)
    }
    return id
  } catch {
    return newId()
  }
}
