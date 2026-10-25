import { AnimatePresence, motion } from 'motion/react'
import { Flake } from './Logo'

// Covers the screen while something heavy (a 3D model) loads, then fades out.
const Loader = ({ loading }: { loading: boolean }) => (
  <AnimatePresence>
    {loading && (
      <motion.div className="loader" role="status" aria-label="Loading" exit={{ opacity: 0 }} transition={{ duration: 0.6 }}>
        <Flake className="loader__flake" />
      </motion.div>
    )}
  </AnimatePresence>
)

export default Loader
