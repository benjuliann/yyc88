import Logo from './Logo'
import JoinRaceButton from './JoinRaceButton'

const Navbar = () => {
  return (
    <nav className="navbar">
      <Logo />
      <JoinRaceButton variant="outline" to="/customize" label="Customize" />
      <JoinRaceButton variant="outline" to="/bricks" label="Memorial" />
    </nav>
  )
}

export default Navbar
