import type { ReactNode } from 'react'
import { motion } from 'motion/react'

// Fades a page in when it mounts and out when its route is left (needs an AnimatePresence above the routes).
const FadePage = ({ children }: { children: ReactNode }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
    {children}
  </motion.div>
)

export default FadePage
