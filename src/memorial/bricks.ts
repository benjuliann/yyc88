import { collection, doc, onSnapshot, orderBy, query, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from '../lib/firebase'

export type Brick = { id: string; name: string }

// Newest bricks first.
export function watchBricks(onChange: (bricks: Brick[]) => void) {
  const bricks = query(collection(db, 'bricks'), orderBy('createdAt', 'desc'))
  return onSnapshot(bricks, (snap) => onChange(snap.docs.map((d) => ({ id: d.id, name: d.data().name }))))
}

// Lays one brick per racer in a single write, and returns them so the ceremony can show them.
export async function addBricks(names: string[]) {
  const batch = writeBatch(db)
  const laid = names.map((name) => {
    const ref = doc(collection(db, 'bricks'))
    batch.set(ref, { name, createdAt: serverTimestamp() })
    return { id: ref.id, name }
  })
  await batch.commit()
  return laid
}
