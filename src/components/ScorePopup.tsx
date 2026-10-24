import { useEffect, useState } from 'react'
import '../styles/score-popup.css'

const COUNT_MS = 600

// Retro arcade distance readout: slams in, then tallies up to `distance`.
export default function ScorePopup({ distance }: { distance: number }) {
  const [shown, setShown] = useState(0)

  useEffect(() => {
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - start) / COUNT_MS, 1)
      setShown(distance * p)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [distance])

  return (
    <div className="score-popup">
      <div className="score-popup__label">DISTANCE</div>
      <div className="score-popup__value">{shown.toFixed(1)} M</div>
    </div>
  )
}
