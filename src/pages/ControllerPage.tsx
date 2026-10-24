import { useEffect, useState, type SubmitEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Logo from '../components/Logo'
import ArrowPad from '../components/ArrowPad'
import { getPlayerId, isValidRoomCode, joinRoom, watchRoom, type Phase } from '../lib/room'
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
  const [phase, setPhase] = useState<Phase | null | undefined>(undefined)
  const [name, setName] = useState('')
  const [joined, setJoined] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => watchRoom(room, setPhase), [room])

  const submit = async (event: SubmitEvent) => {
    event.preventDefault()
    try {
      await joinRoom(room, getPlayerId(), name.trim())
      setJoined(true)
    } catch (err) {
      console.error(err)
      setError("Couldn't join. Try again.")
    }
  }

  if (phase === undefined) return null
  if (phase === null) {
    return (
      <div className="controller__form">
        <p className="controller__message">Room {room} doesn't exist.</p>
        <a className="join-race join-race--outline" href="/play">
          Try another code
        </a>
      </div>
    )
  }

  if (joined) {
    // The controller only appears once the host starts the race.
    if (phase === 'playing') return <ArrowPad room={room} />
    return (
      <div className="controller__form">
        <Logo />
        <p className="controller__message">You're in, {name.trim()}! Look at the big screen.</p>
      </div>
    )
  }

  return (
    <form className="controller__form" onSubmit={submit}>
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
