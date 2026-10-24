import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'

export type Brick = { id: string; name: string; message: string }

export const NAME_MAX = 40
export const MESSAGE_MAX = 80

// Newest bricks first.
export function watchBricks(onChange: (bricks: Brick[]) => void) {
  const bricks = query(collection(db, 'bricks'), orderBy('createdAt', 'desc'))
  return onSnapshot(bricks, (snap) =>
    onChange(snap.docs.map((d) => ({ id: d.id, name: d.data().name, message: d.data().message ?? '' }))),
  )
}

export function addBrick(name: string, message: string) {
  return addDoc(collection(db, 'bricks'), { name, message, createdAt: serverTimestamp() })
}
