import type { CSSProperties } from 'react'
import { motion } from 'motion/react'
import type { Brick } from './bricks'

const COLUMNS = 11 // wider than the floor, so the edges are always covered
const MIN_ROWS = 20 // enough rows that one copy is taller than the floor
const SECONDS_PER_ROW = 4
const LAID_PER_ROW = 5 // about how many bricks fit across the screen near the viewer
const CENTER_OUT = [5, 4, 6, 3, 7] // columns closest to the middle of the screen first

// Same brick, same look, every time it appears: one of five grey shades,
// and now and then a worn or cracked one, like the real 1988 pavers.
// Freshly laid bricks are never worn or cracked.
function looksOf(id: string, fresh = false) {
  let hash = 0
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) | 0
  hash = Math.abs(hash)
  let classes = `plaza__brick plaza__brick--${hash % 5}`
  if (fresh) return classes
  if (hash % 6 === 0) classes += ' plaza__brick--worn'
  if (hash % 9 === 4) classes += ' plaza__brick--cracked'
  return classes
}

type Props = {
  bricks: Brick[]
  // Bricks to lay into the floor one by one: the first after `delay` seconds,
  // then one every `stagger` seconds. While laying, the floor holds still.
  laid?: Brick[]
  delay?: number
  stagger?: number
}

export default function BrickList({ bricks, laid = [], delay = 0, stagger = 0 }: Props) {
  const ceremony = laid.length > 0
  if (bricks.length === 0 && !ceremony) return <p className="plaza__empty">No bricks yet. Race to lay the first one.</p>

  // Repeat bricks to fill the floor; blank paving if there are none yet.
  const rowCount = Math.max(MIN_ROWS, Math.ceil(bricks.length / COLUMNS))
  const rows = Array.from({ length: rowCount }, (_, row) =>
    Array.from({ length: COLUMNS }, (_, column): Brick | null =>
      bricks.length ? bricks[(row * COLUMNS + column) % bricks.length] : null,
    ),
  )
  // New bricks go in the rows nearest the viewer, starting in the middle.
  laid.forEach((brick, i) => {
    rows[rowCount - 2 - Math.floor(i / LAID_PER_ROW)][CENTER_OUT[i % LAID_PER_ROW]] = brick
  })

  // When drifting, lay the floor out twice so the walk loops seamlessly.
  const shown = ceremony ? rows : [...rows, ...rows]

  return (
    <div className="plaza">
      <div className="plaza__floor">
        <div
          className={ceremony ? 'plaza__track plaza__track--still' : 'plaza__track'}
          style={{ '--walk-duration': `${rowCount * SECONDS_PER_ROW}s` } as CSSProperties}
        >
          {shown.map((row, rowIndex) => (
            <div key={rowIndex} className="plaza__row">
              {row.map((brick, index) => {
                if (!brick) return <div key={index} className={looksOf(`${rowIndex}-${index}`)} />
                const order = laid.indexOf(brick)
                const className = looksOf(brick.id)
                if (order === -1) {
                  return (
                    <div key={index} className={className}>
                      <span className="plaza__name">{brick.name}</span>
                    </div>
                  )
                }
                // Drops into place: starts big and faint, springs down onto the floor.
                return (
                  <motion.div
                    key={index}
                    className={`${looksOf(brick.id, true)} plaza__brick--laid`}
                    initial={{ opacity: 0, scale: 1.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: delay + order * stagger, type: 'spring', bounce: 0.4, duration: 0.9 }}
                  >
                    <span className="plaza__name">{brick.name}</span>
                  </motion.div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
