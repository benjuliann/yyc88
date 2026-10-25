import { useEffect, useState } from 'react'
import Logo from '../components/Logo'
import BrickList from '../memorial/BrickList'
import { watchBricks, type Brick } from '../memorial/bricks'
import '../styles/memorial.css'

const MemorialPage = () => {
  const [bricks, setBricks] = useState<Brick[]>([])

  useEffect(() => watchBricks(setBricks), [])

  return (
    <main className="memorial">
      <header className="memorial__header">
        <Logo />
      </header>

      <div className="memorial__intro">
        <h1 className="memorial__title">The Memorial Plaza</h1>
        <p className="memorial__subtitle">Every racer leaves their name in the plaza.</p>
      </div>

      <BrickList bricks={bricks} />
    </main>
  )
}

export default MemorialPage
