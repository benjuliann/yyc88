import { useEffect, useState } from 'react'
import QRCode from 'react-qr-code'
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
        <div className="memorial__add">
          <p className="memorial__add-text">
            Add your brick at
            <br />
            <strong>{window.location.host}/bricks/add</strong>
          </p>
          <div className="memorial__qr">
            <QRCode value={`${window.location.origin}/bricks/add`} size={88} />
          </div>
        </div>
      </header>

      <div className="memorial__intro">
        <h1 className="memorial__title">The Memorial Wall</h1>
        <p className="memorial__subtitle">Names and memories from Calgary '88, laid brick by brick.</p>
      </div>

      <BrickList bricks={bricks} />
    </main>
  )
}

export default MemorialPage
