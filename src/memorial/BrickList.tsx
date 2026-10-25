import type { CSSProperties } from 'react'
import type { Brick } from './bricks'

const COLUMNS = 11 // wider than the floor, so the edges are always covered
const MIN_ROWS = 20 // enough rows that one copy is taller than the floor
const SECONDS_PER_ROW = 4

// Same brick, same shade, every time it appears.
function shadeOf(id: string) {
  let hash = 0
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) | 0
  return Math.abs(hash) % 3
}

export default function BrickList({ bricks }: { bricks: Brick[] }) {
  if (bricks.length === 0) return <p className="plaza__empty">No bricks yet. Be the first to lay one.</p>

  // Repeat bricks to fill the floor, then lay it out twice so the walk loops seamlessly.
  const rowCount = Math.max(MIN_ROWS, Math.ceil(bricks.length / COLUMNS))
  const rows = Array.from({ length: rowCount }, (_, row) =>
    Array.from({ length: COLUMNS }, (_, column) => bricks[(row * COLUMNS + column) % bricks.length]),
  )

  return (
    <div className="plaza">
      <div className="plaza__floor">
        <div className="plaza__track" style={{ '--walk-duration': `${rowCount * SECONDS_PER_ROW}s` } as CSSProperties}>
          {[...rows, ...rows].map((row, rowIndex) => (
            <div key={rowIndex} className="plaza__row">
              {row.map((brick, index) => (
                <div key={index} className={`plaza__brick plaza__brick--${shadeOf(brick.id)}`}>
                  <span className="plaza__name">{brick.name}</span>
                  {brick.message && <span className="plaza__message">{brick.message}</span>}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
