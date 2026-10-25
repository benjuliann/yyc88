import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Logo from '../components/Logo'
import PlazaScene from '../memorial/PlazaScene'
import { watchBricks, type Brick } from '../memorial/bricks'
import '../styles/memorial.css'

const MemorialPage = () => {
  const [bricks, setBricks] = useState<Brick[]>([])

  useEffect(() => watchBricks(setBricks), [])

  return (
    <main className="memorial">
      <PlazaScene bricks={bricks} />

      <header className="memorial__header">
        <Logo />
        <Link to="/" className="memorial__back">
          ← Back
        </Link>
      </header>

      <div className="memorial__intro">
        <h1 className="memorial__title">The Memorial Plaza</h1>
        <p className="memorial__subtitle">Every racer leaves their name in the plaza.</p>
      </div>
    </main>
  )
}

export default MemorialPage
