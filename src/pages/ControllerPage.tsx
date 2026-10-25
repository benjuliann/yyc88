import { useEffect, useState, type SubmitEvent } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import Logo from '../components/Logo'
import JoinRaceButton from '../components/JoinRaceButton'
import TiltPad from '../components/TiltPad'
import RotatePhone from '../components/RotatePhone'
import { isCleanName } from '../lib/nameFilter'
import { MAX_PLAYERS, getPlayerId, isValidRoomCode, joinRoom, leaveRoom, saveSkier, watchPlayer, watchPlayers, watchRoom, type Phase, type Player } from '../lib/room'
import CustomizePage, { type SkierConfig } from './CustomizePage'
import '../styles/controller.css'

export default function Controller() {
  const { room } = useParams()
  return <main className="controller">{room ? <JoinRoom room={room} /> : <EnterCode />}</main>
}

function EnterCode() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const valid = isValidRoomCode(code)

  const submit = (event: SubmitEvent) => {
    event.preventDefault()
    if (valid) navigate(`/play/${code}`)
  }

  return (
    <form className="controller__form" onSubmit={submit}>
      <RotatePhone to="portrait" />
      <Logo />
      <input
        className="controller__input controller__input--code"
        value={code}
        onChange={(event) => setCode(event.target.value.toUpperCase())}
        placeholder="CODE"
        maxLength={4}
        autoCapitalize="characters"
        autoComplete="off"
        aria-label="Room code"
      />
      <button className="join-race join-race--solid" disabled={!valid}>
        Enter
      </button>
    </form>
  )
}

function JoinRoom({ room }: { room: string }) {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase | null | undefined>(undefined)
  const [me, setMe] = useState<Player | null | undefined>(undefined)
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  useEffect(() => watchRoom(room, setPhase), [room])
  // Joined is read from the room, so coming back from customizing doesn't ask for the name again.
  useEffect(() => watchPlayer(room, getPlayerId(), setMe), [room])
  const [playerCount, setPlayerCount] = useState(0)
  useEffect(() => watchPlayers(room, (players) => setPlayerCount(players.length)), [room])

  const submit = async (event: SubmitEvent) => {
    event.preventDefault()
    if (!isCleanName(name)) return setError('Please pick a different name.')
    try {
      if (!(await joinRoom(room, getPlayerId(), name.trim()))) setError(`Maximum limit reached: this room already has ${MAX_PLAYERS} players.`)
    } catch (err) {
      console.error(err)
      setError("Couldn't join. Try again.")
    }
  }

  const leave = async () => {
    try {
      await leaveRoom(room, getPlayerId())
      navigate('/play')
    } catch (err) {
      console.error(err)
      setError("Couldn't leave. Try again.")
    }
  }

  if (phase === undefined || me === undefined) return null
  if (phase === null) {
    return (
      <div className="controller__form">
        <RotatePhone to="portrait" />
        <p className="controller__message">Room {room} doesn't exist.</p>
        <a className="join-race join-race--outline" href="/play">
          Try another code
        </a>
      </div>
    )
  }

  // Full before this phone got in: say so up front instead of asking for a name.
  if (!me && playerCount >= MAX_PLAYERS) {
    return (
      <div className="controller__form">
        <RotatePhone to="portrait" />
        <Logo />
        <p className="controller__message">Maximum limit reached</p>
        <p className="controller__room">Room {room} already has {MAX_PLAYERS} players.</p>
        <a className="join-race join-race--outline" href="/play">
          Try another code
        </a>
      </div>
    )
  }

  if (me) {
    // The controller only appears once the host starts the race.
    if (phase === 'playing') return <TiltPad room={room} />
    return (
      <div className="controller__form">
        <RotatePhone to="portrait" />
        <Logo />
        <p className="controller__message">You're in, {me.name}! Look at the big screen.</p>
        {error && <p className="controller__error">{error}</p>}
        <JoinRaceButton label="Customize skier" to={`/play/${room}/customize`} />
        <button type="button" className="join-race join-race--outline" onClick={leave}>
          Leave room
        </button>
      </div>
    )
  }

  return (
    <form className="controller__form" onSubmit={submit}>
      <RotatePhone to="portrait" />
      <Logo />
      <p className="controller__room">Room {room}</p>
      <input
        className="controller__input"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Your name"
        maxLength={20}
        autoComplete="off"
        aria-label="Your name"
      />
      {error && <p className="controller__error">{error}</p>}
      <button className="join-race join-race--solid" disabled={!name.trim()}>
        Join
      </button>
    </form>
  )
}

// Only for players in a room that's still in the lobby; anyone else goes back to the room.
export function CustomizeSkier() {
  const { room = '' } = useParams()
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase | null | undefined>(undefined)
  const [me, setMe] = useState<Player | null | undefined>(undefined)

  useEffect(() => watchRoom(room, setPhase), [room])
  useEffect(() => watchPlayer(room, getPlayerId(), setMe), [room])

  // Saved to the room too, so the big screen can dress this player's skier. Firestore applies the
  // write locally right away, so go back without waiting for the server to confirm it.
  const done = (skier: SkierConfig) => {
    saveSkier(room, getPlayerId(), skier).catch((err) => {
      console.error(err)
      window.alert("Couldn't save your skier to the room. Customize it again to retry.")
    })
    navigate(`/play/${room}`)
  }

  if (phase === undefined || me === undefined) return null
  if (phase !== 'lobby' || !me) return <Navigate to={`/play/${room}`} replace />
  return <CustomizePage name={me.name} submitLabel="Done" onSubmit={done} />
}
