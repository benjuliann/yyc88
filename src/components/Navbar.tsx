import Logo from './Logo'
import JoinRaceButton from './JoinRaceButton'

const Navbar = () => {
  return (
    <nav className="navbar">
      <Logo />
      <JoinRaceButton variant="outline" to="/bricks" label="Olympic Plaza" />
    </nav>
  )
}

export default Navbar
