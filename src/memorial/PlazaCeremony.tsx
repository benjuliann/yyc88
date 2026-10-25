import { useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import Logo from '../components/Logo'
import JoinRaceButton from '../components/JoinRaceButton'
import PlazaScene from './PlazaScene'
import { watchBricks, type Brick } from './bricks'
import '../styles/memorial.css'

// After a race: close over the plaza pavement, each racer's name is set into a paver one by one,
// then the view slowly pulls back out to the Memorial Plaza, just as /bricks shows it.
export default function PlazaCeremony({ laid, onFinish }: { laid: Brick[]; onFinish: () => void }) {
  const [bricks, setBricks] = useState<Brick[]>([])
  const [done, setDone] = useState(false)

  useEffect(() => watchBricks(setBricks), [])

  // The new names first, so they take the pavers nearest the viewer; the older ones fill in behind.
  const names = useMemo(() => {
    const laidIds = new Set(laid.map((brick) => brick.id))
    return [...laid, ...bricks.filter((brick) => !laidIds.has(brick.id))]
  }, [laid, bricks])

  return (
    <main className="memorial">
      <PlazaScene bricks={names} laying={laid.length} onLaid={() => setDone(true)} />

      <header className="memorial__header">
        <Logo />
      </header>

      <motion.div
        className="memorial__intro"
        initial={{ opacity: 0, y: 20 }}
        animate={done ? { opacity: 1, y: 0 } : undefined}
        transition={{ duration: 0.8 }}
      >
        <h1 className="memorial__title">The Memorial Plaza</h1>
        <p className="memorial__subtitle">Every racer leaves their name in the plaza.</p>
      </motion.div>

      {done && (
        <motion.div className="memorial__finish" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
          <JoinRaceButton label="Finish" onClick={onFinish} />
        </motion.div>
      )}
    </main>
  )
}
