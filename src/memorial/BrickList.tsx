import type { CSSProperties } from 'react'
import type { Brick } from './bricks'

const ROWS = 4
const MIN_COLUMNS = 10 // enough bricks per row to stay wider than a big screen
const SECONDS_PER_BRICK = 5

// Same brick, same shade, every time it appears.
function shadeOf(id: string) {
  let hash = 0
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) | 0
  return Math.abs(hash) % 3
}

export default function BrickList({ bricks }: { bricks: Brick[] }) {
  if (bricks.length === 0) return <p className="wall__empty">No bricks yet. Be the first to lay one.</p>

  // Repeat bricks to fill every row, then render each row twice so the drift loops seamlessly.
  const columns = Math.max(MIN_COLUMNS, Math.ceil(bricks.length / ROWS))
  const rows = Array.from({ length: ROWS }, (_, row) =>
    Array.from({ length: columns }, (_, column) => bricks[(row * columns + column) % bricks.length]),
  )

  return (
    <div className="wall" style={{ '--drift-duration': `${columns * SECONDS_PER_BRICK}s` } as CSSProperties}>
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="wall__row">
          {[...row, ...row].map((brick, index) => (
            <div key={index} className={`wall__brick wall__brick--${shadeOf(brick.id)}`}>
              <span className="wall__name">{brick.name}</span>
              {brick.message && <span className="wall__message">{brick.message}</span>}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
