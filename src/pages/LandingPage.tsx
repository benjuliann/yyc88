import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Logo from '../components/Logo'
import JoinRaceButton from '../components/JoinRaceButton'
import { createRoom } from '../lib/room'
import '../styles/landing.css'

const LandingPage = () => {
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const hostRace = async () => {
    if (creating) return
    setCreating(true)
    try {
      navigate(`/game/${await createRoom()}`)
    } catch (err) {
      console.error(err)
      setError("Couldn't create a room. Try again.")
      setCreating(false)
    }
  }

  return (
    <main className="landing">
      <Navbar />
      <section className="landing__hero">
        <p className="landing__eyebrow">Calgary · 1988</p>
        <Logo size="large" />
        <h1 className="landing__tagline">Race the legacy</h1>
        <JoinRaceButton onClick={hostRace} />
        {error && <p className="landing__error">{error}</p>}
      </section>
    </main>
  )
}

export default LandingPage
