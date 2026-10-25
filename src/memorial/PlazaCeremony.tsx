import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import Logo from '../components/Logo'
import JoinRaceButton from '../components/JoinRaceButton'
import BrickList from './BrickList'
import { watchBricks, type Brick } from './bricks'
import '../styles/memorial.css'

const PAN_SECONDS = 2.5
const SECONDS_BETWEEN_BRICKS = 0.6

// After a race: the view pans down from the skyline onto the plaza,
// then each racer's brick is laid into the floor one by one.
export default function PlazaCeremony({ laid, onFinish }: { laid: Brick[]; onFinish: () => void }) {
  const [bricks, setBricks] = useState<Brick[]>([])

  useEffect(() => watchBricks(setBricks), [])

  // The new bricks are already saved, so keep them out of the background.
  const laidIds = new Set(laid.map((brick) => brick.id))
  const older = bricks.filter((brick) => !laidIds.has(brick.id))
  const doneAt = PAN_SECONDS + laid.length * SECONDS_BETWEEN_BRICKS + 1

  return (
    <main className="memorial">
      <header className="memorial__header">
        <Logo />
      </header>

      <motion.div
        className="memorial__intro"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: PAN_SECONDS, duration: 0.8 }}
      >
        <h1 className="memorial__title">Laid in the plaza</h1>
        <p className="memorial__subtitle">Every racer's name, set into the Memorial Plaza.</p>
      </motion.div>

      <motion.div
        className="memorial__floor"
        initial={{ y: '75%' }}
        animate={{ y: 0 }}
        transition={{ duration: PAN_SECONDS, ease: 'easeInOut' }}
      >
        <BrickList bricks={older} laid={laid} delay={PAN_SECONDS} stagger={SECONDS_BETWEEN_BRICKS} />
      </motion.div>

      <motion.div
        className="memorial__finish"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: doneAt }}
      >
        <JoinRaceButton label="Finish" onClick={onFinish} />
      </motion.div>
    </main>
  )
}
