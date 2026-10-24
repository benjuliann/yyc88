import Navbar from '../components/Navbar'
import Logo from '../components/Logo'
import JoinRaceButton from '../components/JoinRaceButton'
import '../styles/landing.css'

const LandingPage = () => {
  return (
    <main className="landing">
      <Navbar />
      <section className="landing__hero">
        <p className="landing__eyebrow">Calgary · 1988</p>
        <Logo size="large" />
        <h1 className="landing__tagline">Race the legacy</h1>
        <JoinRaceButton />
      </section>
    </main>
  )
}

export default LandingPage
